import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const SRC = path.join(ROOT, 'sources', 'channels.json')
const OUT = path.join(ROOT, 'public')

const CATALOG_ID = 'tvaberta'
const TYPE = 'tv'

const UF_ORDER = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SP','SE','TO']
const UF_NAMES = {
  AC:'Acre', AL:'Alagoas', AP:'Amapá', AM:'Amazonas', BA:'Bahia', CE:'Ceará', DF:'Distrito Federal',
  ES:'Espírito Santo', GO:'Goiás', MA:'Maranhão', MG:'Minas Gerais', MS:'Mato Grosso do Sul', MT:'Mato Grosso',
  PA:'Pará', PB:'Paraíba', PE:'Pernambuco', PI:'Piauí', PR:'Paraná', RJ:'Rio de Janeiro', RN:'Rio Grande do Norte',
  RO:'Rondônia', RR:'Roraima', RS:'Rio Grande do Sul', SC:'Santa Catarina', SP:'São Paulo', SE:'Sergipe', TO:'Tocantins',
}

const sources = JSON.parse(readFileSync(SRC, 'utf8'))
const all = sources.channels.filter((c) => !c._check || c._check.status !== 'dead')
const national = all.filter((c) => !c.uf)
const regionalOf = (uf) => all.filter((c) => c.uf && c.uf.includes(uf))

rmSync(OUT, { recursive: true, force: true })

function writeJson(dir, name, obj) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, name), JSON.stringify(obj, null, 2))
}
function writeText(dir, name, text) {
  mkdirSync(dir, { recursive: true })
  writeFileSync(path.join(dir, name), text)
}

function buildManifest(addonId, version, name, description) {
  return {
    id: addonId,
    version,
    name,
    description,
    catalogs: [{ type: TYPE, id: CATALOG_ID, name }],
    resources: ['catalog', 'stream', 'meta'],
    types: [TYPE],
    idPrefixes: ['tv'],
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/TV_icon.png/512px-TV_icon.png',
    behaviorHints: { adult: false, configurable: true },
  }
}

function buildSite(siteDir, label, addonId, channels, ufTag) {
  const manifest = buildManifest(
    addonId,
    sources.version,
    label,
    `Canais de TV aberta${ufTag ? ` de ${ufTag + ' '}` : ' '}(pública, educativa e emissoras abertas) filtrados para você. Lista curada e verificada automaticamente toda semana.`,
  )
  writeJson(path.join(siteDir), 'manifest.json', manifest)

  const metas = channels.map((ch, i) => ({
    id: `tv:${ch.id}`,
    type: 'tv',
    name: ch.name,
    poster: ch.logo || fallbackPoster(ch.name),
    posterShape: 'landscape',
    logo: ch.logo || undefined,
    description: `${ch.name}${ufTag ? ` — TV aberta de ${ufTag}.` : ' — TV aberta.'} Categoria: ${(i % 3 === 0) ? 'educativa' : (i % 3 === 1) ? 'pública' : 'aberta'}.`,
  }))
  writeJson(path.join(siteDir, 'catalog', TYPE), `${CATALOG_ID}.json`, { metas })

  for (const ch of channels) {
    writeJson(path.join(siteDir, 'stream', TYPE), `${ch.id}.json`, {
      streams: [{ title: ch.name, url: ch.url }],
    })
    writeJson(path.join(siteDir, 'meta', TYPE), `${ch.id}.json`, {
      meta: metas.find((m) => m.id === `tv:${ch.id}`),
    })
  }
  return { channelCount: channels.length, regionalCount: channels.filter((c) => c.uf).length }
}

const stateData = UF_ORDER.map((uf) => {
  const set = [...national, ...regionalOf(uf)]
  return { uf, name: UF_NAMES[uf], total: set.length, regional: set.filter((c) => c.uf).length }
})
const rootTotal = all.length

buildSite(OUT, 'TV Aberta (Todas)', 'tvaberta-br', all, null)

for (const uf of UF_ORDER) {
  const set = [...national, ...regionalOf(uf)]
  buildSite(path.join(OUT, uf), `TV Aberta — ${uf}`, `tvaberta-br-${uf}`, set, UF_NAMES[uf])
}

const base = siteBase()
writeConfigure(OUT, stateData, rootTotal, base)
writeIndex(OUT, stateData, rootTotal)
for (const uf of UF_ORDER) {
  writeConfigure(path.join(OUT, uf), stateData, rootTotal, base)
}

console.log(`Build OK: raiz (${rootTotal}) + ${UF_ORDER.length} estados -> public/`)

function siteBase() {
  return ''
}

function fallbackPoster(name) {
  const n = encodeURIComponent(name.split(' ').slice(0, 2).join('+'))
  return `https://ui-avatars.com/api/?name=${n}&background=0d47a1&color=fff&size=512&bold=true`
}

function writeConfigure(dir, states, rootTotal, _base) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TV Aberta BR — Escolha seu estado</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #101220; color: #e9e9f2; min-height: 100vh; }
  header { padding: 40px 20px 24px; text-align: center; }
  header h1 { font-size: 26px; font-weight: 800; }
  header p { color: #9aa0b5; margin-top: 8px; }
  .search { max-width: 420px; margin: 8px auto 0; }
  .search input { width: 100%; padding: 12px 16px; border-radius: 10px; border: 1px solid #2b2f42; background: #171a2b; color: #fff; font-size: 15px; }
  .search input:focus { outline: 2px solid #3f6cff; }
  main { max-width: 960px; margin: 24px auto 60px; padding: 0 20px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
  .card { background: #171a2b; border: 1px solid #2b2f42; border-radius: 12px; padding: 16px; cursor: pointer; transition: .15s; text-align: left; }
  .card:hover, .card.sel { border-color: #3f6cff; background: #1c2140; transform: translateY(-2px); }
  .card h3 { font-size: 15px; }
  .card .sub { font-size: 12px; color: #9aa0b5; margin-top: 4px; }
  .card .tag { display:inline-block; background:#e91e63; color:#fff; border-radius:99px; font-size:10px; padding:2px 8px; margin-top:8px; }
  #panel { position: fixed; left: 0; right: 0; bottom: 0; background: #12152a; border-top: 1px solid #2b2f42; padding: 16px 20px 20px; display: none; }
  #panel.show { display: block; }
  #panel .wrap { max-width: 960px; margin: 0 auto; }
  #panel .url { font-family: ui-monospace, monospace; font-size: 12.5px; background: #171a2b; color: #7ee2a8; border: 1px solid #2b2f42; border-radius: 8px; padding: 10px 12px; word-break: break-all; margin-top:10px; }
  .btn { display:inline-block; background:#3f6cff; color:#fff; border:none; border-radius:10px; padding:12px 18px; font-size:14px; font-weight:700; cursor:pointer; margin-top:12px; }
  .btn.ghost { background:#262a3f; margin-left:8px; }
  footer { text-align:center; color:#5a6076; font-size:12px; padding: 20px; }
  .hide { display: none; }
</style>
</head>
<body>
<header>
  <h1>📺 TV Aberta BR</h1>
  <p>Escolha seu estado e monte sua TV aberta — os canais vêm pré-filtrados.</p>
  <div class="search"><input id="q" placeholder="Buscar estado ex: Ceará, MG, Rio..."></div>
</header>
<main>
  <div class="grid" id="grid"></div>
</main>
<div id="panel"><div class="wrap">
  <strong id="pname"></strong> &middot; <span id="pinfo"></span>
  <div class="url" id="purl"></div>
  <button class="btn" id="pstremio">Instalar no Stremio</button>
  <button class="btn ghost" id="pcopy">Copiar link</button>
  <button class="btn ghost" id="pclose">Fechar</button>
</div></div>
<footer>Addon estático — hospedado de graça no GitHub Pages. Verificação automática toda segunda.</footer>
<script>
const DATA = ${JSON.stringify(states)};
const ROOT_COUNT = ${rootTotal};
const stremioBtn = document.getElementById('pstremio');
const copyBtn = document.getElementById('pcopy');
const panel = document.getElementById('panel');
const q = document.getElementById('q');

const here = new URL('.', location.href).href;      // .../repo/
const stremioRoot = 'stremio://' + location.host + new URL('.', location.href).pathname;
const urlFor = (s) => s ? here + s + '/manifest.json' : here + 'manifest.json';

function mk(name, sub, extra, onPick, isAll) {
  const d = document.createElement('div');
  d.className = 'card';
  const tag = isAll ? '<span class="tag">Sem filtro</span>' : '';
  d.innerHTML = '<h3>' + name + '</h3><div class="sub">' + sub + '</div>' + tag;
  d.onclick = onPick;
  return d;
}

const grid = document.getElementById('grid');
function render(filter) {
  grid.innerHTML = '';
  grid.appendChild(mk('🌎 Todas as emissoras', ROOT_COUNT + ' canais nacionais e regionais', '', () => pick(null), true));
  for (const s of DATA) {
    const f = (s.name + ' ' + s.uf).toLowerCase();
    if (filter && !f.includes(filter)) continue;
    const sub = s.regional ? s.total + ' canais (' + s.regional + ' da sua região)' : s.total + ' canais (regionais do estado ainda não cadastrados)';
    grid.appendChild(mk(s.uf + ' — ' + s.name, sub, '', () => pick(s.uf)));
  }
}
render('');

q.addEventListener('input', () => render(q.value.trim().toLowerCase()));

function pick(uf) {
  const s = DATA.find(x => x.uf === uf);
  document.getElementById('pname').textContent = uf ? (uf + ' — ' + s.name) : 'Todas as emissoras';
  document.getElementById('pinfo').textContent = uf ? (s.regional ? s.total + ' canais (' + s.regional + ' regionais)' : s.total + ' canais (só nacionais)') : ROOT_COUNT + ' canais';
  const url = urlFor(uf);
  document.getElementById('purl').textContent = url;
  stremioBtn.href = stremioRoot + (uf ? uf + '/' : '') + 'manifest.json';
  panel.classList.add('show');
  panel.scrollIntoView({ behavior: 'smooth' });
}
copyBtn.onclick = () => {
  const url = document.getElementById('purl').textContent;
  navigator.clipboard.writeText(url).then(() => { copyBtn.textContent = 'Copiado!'; setTimeout(() => copyBtn.textContent = 'Copiar link', 1500); });
};
document.getElementById('pclose').onclick = () => panel.classList.remove('show');
</script>
</body>
</html>`
  writeText(dir, 'configure.html', html)
  writeText(path.join(dir, 'configure'), 'index.html', html)
}

function writeIndex(dir, states, rootTotal) {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>TV Aberta BR — Addon para Stremio</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; background: #101220; color: #e9e9f2; min-height: 100vh; display: flex; flex-direction: column; }
  main { flex: 1; max-width: 620px; margin: 0 auto; padding: 60px 20px; text-align: center; }
  h1 { font-size: 30px; font-weight: 800; }
  h1 span { color: #3f6cff; }
  p.lead { color: #9aa0b5; margin-top: 12px; line-height: 1.6; }
  .stats { display: flex; gap: 12px; justify-content: center; margin: 28px 0; flex-wrap: wrap; }
  .stat { background: #171a2b; border: 1px solid #2b2f42; border-radius: 12px; padding: 14px 22px; }
  .stat b { display: block; font-size: 22px; }
  .stat span { font-size: 12px; color: #9aa0b5; }
  .btn { display:inline-block; background:#3f6cff; color:#fff; border:none; border-radius:12px; padding:15px 28px; font-size:16px; font-weight:700; cursor:pointer; text-decoration:none; margin-top:8px; }
  .btn.ghost { background:#262a3f; margin-left:8px; }
  .tip { margin-top: 26px; font-size: 12.5px; color: #5a6076; line-height: 1.6; }
  .tip code { background:#171a2b; border:1px solid #2b2f42; border-radius:6px; padding:2px 6px; color:#7ee2a8; }
  footer { text-align:center; color:#5a6076; font-size:12px; padding: 20px; }
</style>
</head>
<body>
<main>
  <h1>📺 TV <span>Aberta</span> BR</h1>
  <p class="lead">Addon de TV aberta para o Stremio: nacionais, educativas e canais regionais do seu estado. Lista curada e verificada automaticamente toda semana.</p>
  <div class="stats">
    <div class="stat"><b>${rootTotal}</b><span>canais no total</span></div>
    <div class="stat"><b>${states.filter((s) => s.regional > 0).length}</b><span>estados com regionais</span></div>
    <div class="stat"><b>100%</b><span>gratuito e estático</span></div>
  </div>
  <a class="btn" id="install" href="#">Instalar no Stremio</a>
  <a class="btn ghost" href="./configure">Escolher estado</a>
  <p class="tip">Não apareceu? Copie e cole no Stremio (Addons → botão ➕):
    <br><code id="manifestUrl">carregando…</code></p>
</main>
<footer>Addon estático — hospedado de graça no GitHub Pages. Verificação automática toda segunda.</footer>
<script>
const root = new URL('.', location.href);
const url = root.href + 'manifest.json';
const stremio = 'stremio://' + location.host + root.pathname + 'manifest.json';
document.getElementById('install').href = stremio;
document.getElementById('manifestUrl').textContent = url;
</script>
</body>
</html>`
  writeText(dir, 'index.html', html)
}