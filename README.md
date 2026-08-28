# TV Aberta BR — Addon de Stremio

Addon **estático** de TV aberta (pública/educativa) para o Stremio.
Hospedado de graça no **GitHub Pages** e atualizado automaticamente toda segunda (cron via GitHub Actions).

## Instalar no Stremio

1. Abra o Stremio → engrenagem (⚙️) → **Addons**
2. Botão do sinal de mais (+) de **Community Addons**
3. Cole a URL do seu addon e clique **Adicionar**:

```
https://SEU_USUARIO.github.io/stremio-tv-aberta/manifest.json
```

4. Vá em **Discover** → veja o catálogo **TV Aberta** e clique em um canal pra assistir.

## Como funciona

| Arquivo | Papel |
| --- | --- |
| `sources/channels.json` | Lista currada (id, nome, logo, URL do stream) |
| `scripts/verify.mjs` | Checa cada canal, marca mortos (`--prune` remove) |
| `scripts/build.mjs` | Gera os JSON estáticos em `public/` |
| `.github/workflows/**` | Cron semanal + deploy no Pages |

As URLs servidas seguem o protocolo:
`/manifest.json`, `/catalog/tv/tvaberta.json`, `/meta/tv/{id}.json`, `/stream/tv/{id}.json`.

## Adicionar / remover canais

Edite `sources/channels.json` e **publique** (`git push`). O GitHub Actions rebuida e o deploy sai sozinho.

```json
{
  "id": "meucanal",
  "name": "Meu Canal",
  "logo": "https://exemplo.com/logo.png",
  "url": "https://exemplo.com/stream.m3u8"
}
```

Dica: adicione `"referrer": "https://siteexigido.com"` se o stream exigir cabeçalho `Referer`.

## Verificação manual local

```sh
npm run verify        # mostra status de cada canal
npm run verify -- --prune   # remove os mortos do channels.json
npm run build         # gera public/ (teste: npm run start)
```

## Deploy (uma vez só)

1. Crie o repo e suba:
   ```sh
   git init && git add -A && git commit -m "tv aberta"
   gh repo create stremio-tv-aberta --public --source=. --push
   ```
2. Ative o Pages como build por **Actions**:
   ```sh
   gh api --method POST repos/SEU_USUARIO/stremio-tv-aberta/pages \
     -f build_type=workflow -f source=actions
   ```
3. Rode o workflow **deploy-pages** uma vez ou faça um push. A URL fica em
   `https://SEU_USUARIO.github.io/stremio-tv-aberta/manifest.json`.

## Aviso

Canais abertos dependem de fontes públicas que caem do nada. O cron semanal poda os mortos — se um canal sumir do catálogo, é isso. Contribua novos links no `channels.json` quando souber de fonte nova.