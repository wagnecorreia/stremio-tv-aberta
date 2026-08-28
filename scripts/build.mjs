import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'sources', 'channels.json')
const OUT = path.join(ROOT, 'public')

const sources = JSON.parse(readFileSync(SRC, 'utf8'))
const channels = sources.channels.filter((c) => !c._check || c._check.status !== 'dead')

const ID_PREFIX = 'tvaberta'
const CATALOG_ID = 'tvaberta'
const TYPE = 'tv'

rmSync(OUT, { recursive: true, force: true })
mkdirSync(path.join(OUT, 'catalog', TYPE), { recursive: true })
mkdirSync(path.join(OUT, 'stream', TYPE), { recursive: true })

const manifest = {
  id: 'tvaberta-br',
  version: sources.version || '1.0.0',
  name: 'TV Aberta BR',
  description: 'Canais de TV aberta (TV publica, Cultura, TV Brasil, internacionais abertos). Lista curada e verificada automaticamente.',
  catalogs: [
    {
      type: 'tv',
      id: CATALOG_ID,
      name: 'TV Aberta',
    },
  ],
  resources: ['catalog', 'stream', 'meta'],
  types: ['tv'],
  idPrefixes: [ID_PREFIX],
  logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/TV_icon.png/512px-TV_icon.png',
  behaviorHints: { adult: false },
}

const metas = channels.map((ch, i) => ({
  id: `${ID_PREFIX}:${ch.id}`,
  type: 'tv',
  name: ch.name,
  poster: ch.logo,
  posterShape: 'landscape',
  logo: ch.logo,
  description: `Canal aberto #${i + 1} adicionado a TV Aberta BR.`,
}))

writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2))
writeFileSync(
  path.join(OUT, 'catalog', TYPE, `${CATALOG_ID}.json`),
  JSON.stringify({ metas }, null, 2),
)

for (const ch of channels) {
  const streamFile = path.join(OUT, 'stream', TYPE, `${ch.id}.json`)
  writeFileSync(
    streamFile,
    JSON.stringify({
      streams: [
        {
          title: ch.name,
          url: ch.url,
        },
      ],
    }, null, 2),
  )

  const metaFile = path.join(OUT, 'meta', TYPE, `${ch.id}.json`)
  mkdirSync(path.join(OUT, 'meta', TYPE), { recursive: true })
  const m = metas.find((m) => m.id === `${ID_PREFIX}:${ch.id}`)
  writeFileSync(metaFile, JSON.stringify({ meta: m }, null, 2))
}

console.log(`Build OK: ${channels.length} canais -> public/`)