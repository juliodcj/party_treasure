# Fase 4 — Ingestão: feats, magias, ações, condições

**Modelo:** Sonnet · **Depende de:** fase 1 · **Ler antes:** espec §3, §5

## Arquivos

- `scripts/build-lore.mjs` (novo)
- `scripts/build-traits.mjs` (estender)
- `server/entries.js` (novo) — leitura por offset
- `server/index.js` — rotas
- `src/data/index.spells.json`, `src/data/conditions.json` (gerados)
- `server/data/entries.bin`, `server/data/entries.idx.json` (gerados)

## Por que não vai tudo no bundle

Medidos: `feats` 31 MB, `spells` 8,4 MB, `class-features` 4,7 MB, `actions`
3,0 MB, `heritages` 1,6 MB, `ancestry-features` 444 KB, `conditions` 176 KB. O
`equipment` já ocupa 10,9 MB no bundle. Somar tudo daria ~32 MB num Android
baratinho. Por isso o corpus fica no servidor.

## Passos

1. **`build-lore.mjs`** lê `vendor/pf2e/packs/pf2e/{feats,spells,actions,
   class-features,heritages,ancestry-features,conditions}` e gera:
   - **`src/data/index.spells.json`** — por magia: nome, slug, círculo, tradição,
     custo em ações, traços, raridade. **Sem descrição.** ~1.994 entradas, alvo
     ~400 KB. Vai no bundle porque o compêndio navega tudo, offline.
   - **`src/data/conditions.json`** — as 43 condições inteiras, com descrição.
     Pequeno e usado o tempo todo.
   - **`server/data/entries.bin`** — todos os verbetes sanitizados, concatenados.
   - **`server/data/entries.idx.json`** — `slug → [offset, tamanho]`.

   **Não** gerar 9.000 arquivos soltos e **não** carregar o corpus em memória: o
   servidor pode estar num Termux em Android.
2. **Sanitização**, igual à que o `foundryImport.js` já faz para equipamento:
   `@UUID[...]`, `[[/act ...]]`, `[[/r ...]]`, `@Damage[...]`, `@Check[...]` viram
   texto legível. Manter `<table class="pf2e remaster">`. Guardar
   `descriptionHtml` original e `descriptionText` limpo. Preservar `publication`
   (requisito de licença).
3. **Índice de nomes para resolução**, com a **ordem de prioridade obrigatória no
   empate**: `class-features` → `heritages` → `ancestry-features` → `feats` →
   `actions`. Sem ordem fixa, `Rage` ora vira a ação, ora a feature de classe.
4. **Sentidos não estão em pack.** `Darkvision` e `Low-Light Vision` estão em
   `static/lang/en.json` sob `PF2E.NPC.Abilities.Glossary.*`. Indexar essa árvore
   junto, senão 2 de 10 nomes do Rurik ficam sem descrição.
5. **Estender `build-traits.mjs`** para cobrir traços de magia, feat, ação e
   condição — mesmo `en.json`, `PF2E.Trait*` e `PF2E.TraitDescription*`. Logar
   todo slug que não resolver.
6. **`server/entries.js`**: abre o `.bin` uma vez, lê por `fs.read(fd, buf,
   0, tamanho, offset)`. Sem cache do arquivo inteiro.
7. **Rotas em `server/index.js`:**
   ```
   GET /api/entry/:slug     → { name, slug, traits, actionCost, rank, descriptionHtml, source }
   GET /api/entries?slugs=  → lote (usado na importação)
   ```
   404 com corpo JSON quando o slug não existe. Sem autenticação — o app não tem.
8. **`resolveNames(names[]) → { resolved, unresolved }`** em
   `src/lib/loreResolve.js`, usado pela importação. Casamento por nome exato,
   normalizando caixa e espaço. Não inventar fuzzy matching.
9. **Rodar contra os feats + specials do Rurik** e conferir a taxa medida: 7 de
   10 resolvem; `Darkvision` e `Low-Light Vision` só resolvem depois do passo 4;
   `Sailing Lore` não resolve e está correto — é perícia, não feat.

## Não fazer nesta fase

Nenhuma tela. Não mexer no `catalog.equipment.json`. Não ingerir bestiários,
`spell-effects`, `feat-effects` nem `equipment-effects`.

## Pronto quando

- [ ] `npm run build:lore` gera os quatro artefatos
- [ ] `index.spells.json` abaixo de ~600 KB e sem descrição
- [ ] `entries.bin` legível por offset, sem carregar em memória
- [ ] Rotas respondem, inclusive 404
- [ ] `resolveNames` acerta 9 de 10 do Rurik (2 vindos do `en.json`)
- [ ] Slugs não resolvidos aparecem no log, nunca em silêncio
- [ ] `vendor/` e `server/data/` no `.gitignore` conforme a política do README
- [ ] `npm run build` e `npm run lint:visual` passam
- [ ] Commit e push
