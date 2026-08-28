# TV Aberta BR — Addon de Stremio

Addon **estático** de TV aberta (pública, educativa e emissoras abertas) para o Stremio, com **filtro por estado**.
Hospedado de graça no **GitHub Pages** e atualizado automaticamente toda segunda (cron via GitHub Actions).

## Instalar no Stremio (com filtro por estado)

1. Abra o **Instalador do addon** no navegador:

```
https://wagnecorreia.github.io/stremio-tv-aberta/configure
```

2. Escolha seu **estado** (ou "Todas as emissoras").
3. Clique em **Instalar no Stremio** (ou copie o link e cole em **Community Addons**).

Cada estado é um addon separado, montado na hora: `https://SEU_USUARIO.github.io/stremio-tv-aberta/SP/manifest.json`.

Também dá pra instalar direto, só com as emissoras nacionais:
`https://SEU_USUARIO.github.io/stremio-tv-aberta/manifest.json`

## Como funciona

| Arquivo | Papel |
| --- | --- |
| `sources/channels.json` | Lista curada: cada canal com `uf` (regional) ou sem (nacional) |
| `scripts/verify.mjs` | Checa cada canal; `--prune` remove mortos, `--strict` remove duvidosos |
| `scripts/build.mjs` | Gera addon raiz (todas) + 1 addon por UF + página `/configure` |
| `.github/workflows/**` | Cron semanal (verificação) + deploy automático no Pages |

As URLs seguem o protocolo Stremio (por estado): `/SP/manifest.json`, `/SP/catalog/tv/tvaberta.json`, `/SP/stream/tv/{id}.json`, `/SP/meta/tv/{id}.json`.

## Adicionar / remover canais

Edite `sources/channels.json` e **publique** (`git push`). O GitHub Actions rebuida e o deploy sai sozinho.

```json
{
  "id": "globo",
  "name": "Globo (Sinal Aberto)",
  "logo": "https://...",
  "url": "https://exemplo.com/stream.m3u8"
}
```
- Sem campo `uf` → canal **nacional** (aparece em todos os estados).
- Com `"uf": ["MG"]` → canal **regional** (aparece só no catálogo de MG).

## Verificação manual local

```sh
npm run verify                    # status de cada canal
npm run verify -- --prune         # remove mortos (padrão do cron)
npm run verify -- --prune --strict  # remove mortos e duvidosos (curadoria inicial)
npm run build                     # regera public/ (teste: npm run start)
```

## Deploy (uma vez só)

1. Repo no GitHub:
   ```sh
   git init && git add -A && git commit -m "tv aberta"
   gh repo create stremio-tv-aberta --public --source=. --push
   ```
2. Ative Pages como build por **Actions**:
   ```sh
   gh api --method POST repos/SEU_USUARIO/stremio-tv-aberta/pages -f build_type=workflow
   ```
3. Rode o workflow **deploy-pages** (ou faça um push). URL:
   `https://SEU_USUARIO.github.io/stremio-tv-aberta/manifest.json`

## Cron

- `update-channels`: **toda segunda 04:00 UTC** — verifica os links e poda mortos.
- O commit da poda dispara `deploy-pages`, que rebuida e republica sozinho.

## Aviso

Fontes de TV aberta caem do nada. O cron poda semanalmente; se um canal sumir do catálogo, é isso. Contribua novos links no `channels.json` (prefira streams públicos e estáveis).