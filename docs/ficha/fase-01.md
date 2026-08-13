# Fase 1 — Consertar a ingestão do catálogo

**Modelo:** Sonnet · **Depende de:** fase 0 · **Ler antes:** espec §5.1

Conserto de bug pré-existente, não feature.

## Contexto

O repositório `foundryvtt/pf2e` mudou de layout: os packs agora estão em
`packs/pf2e/…` e `packs/sf2e/…`, não mais em `packs/…`. O
`scripts/build-catalog.mjs` e o `scripts/build-traits.mjs` apontam para o caminho
antigo e **não acham nada hoje**.

## Arquivos

- `scripts/build-catalog.mjs`
- `scripts/build-traits.mjs`
- `README.md` (se ainda restar caminho antigo depois da fase 0)

## Passos

1. Fazer o sparse-checkout na estrutura nova:
   ```
   git clone --depth 1 --filter=blob:none --sparse \
     https://github.com/foundryvtt/pf2e.git vendor/pf2e
   cd vendor/pf2e && git sparse-checkout set packs/pf2e static/lang
   ```
2. Corrigir os caminhos nos dois scripts. **Ignorar `packs/sf2e`** — é Starfinder.
3. Rodar a ingestão e comparar o resultado com o `src/data/catalog.equipment.json`
   atual: 5.739 itens, 10,9 MB. Divergência grande é sinal de caminho errado ou de
   mudança de schema — investigar antes de commitar.
4. Falhar com mensagem clara se `vendor/pf2e/packs/pf2e` não existir, em vez de
   gerar catálogo vazio.

## Não fazer nesta fase

Não ingerir feats, magias, ações nem condições — isso é a fase 4. Não mudar o
formato de saída do catálogo.

## Pronto quando

- [ ] `build-catalog.mjs` e `build-traits.mjs` rodam no layout novo
- [ ] Catálogo regerado bate em contagem e tamanho com o versionado
- [ ] Script falha com mensagem útil quando o `vendor/` não existe
- [ ] `npm run build` e `npm run lint:visual` passam
- [ ] Commit e push
