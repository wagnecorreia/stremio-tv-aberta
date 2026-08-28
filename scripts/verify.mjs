import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'sources', 'channels.json')
const PRUNE = process.argv.includes('--prune')
const TIMEOUT_MS = 12000

const sources = JSON.parse(readFileSync(SRC, 'utf8'))
const channels = sources.channels

async function check(channel) {
  const url = new URL(channel.url)
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    Referer: url.origin + '/',
    Accept: 'application/vnd.apple.mpegurl, application/x-mpegURL, */*',
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)

  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, redirect: 'follow' })
    const body = await res.text()
    const okStatus = res.ok || res.status === 206
    const looksHls = body.includes('#EXTM3U') || /^#EXT/i.test(body)

    if (okStatus && looksHls) return { status: 'ok', error: null }
    if (okStatus) return { status: 'hmm', error: `HTTP ${res.status}, corpo sem #EXTM3U` }
    return { status: 'hmm', error: `HTTP ${res.status} (${res.statusText})` }
  } catch (err) {
    const reason = err.name === 'AbortError' ? 'timeout' : err.cause?.code || err.message
    return { status: 'dead', error: `erro: ${reason}` }
  } finally {
    clearTimeout(timer)
  }
}

let ok = 0, hmm = 0, dead = 0
for (const ch of channels) {
  const r = await check(ch)
  ch._check = r
  if (r.status === 'ok') ok++
  else if (r.status === 'hmm') hmm++
  else dead++
  console.log(`[${r.status.padEnd(4)}] ${ch.id.padEnd(14)} ${ch.name}${r.error ? '  -> ' + r.error : ''}`)
}

console.log(`\n${ok} ok | ${hmm} em duvida | ${dead} mortos (de ${channels.length})`)

if (PRUNE && dead > 0) {
  const kept = channels.filter((c) => c._check.status !== 'dead')
  deleteActually(kept)
  sources.channels = kept
  writeFileSync(SRC, JSON.stringify(sources, null, 2) + '\n', 'utf8')
  console.log(`\nPodando ${dead} canais mortos. channels.json atualizado (${kept.length})`)
}

function deleteActually(chans) {
  for (const c of chans) delete c._check
}

process.exit(hmm > 0 || dead > 0 ? 1 : 0)