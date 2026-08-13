# Fase 0 — Fundação: importar design, `main`, README, `lint:visual`

**Modelo:** Sonnet · **Depende de:** nada · **Ler antes:** espec §2, §12.1

Nenhum código de ficha nesta fase. É desobstrução.

## Contexto

O repositório não tem branch `main` — são seis branches, todas `claude/…`, e o
`HEAD` remoto aponta para `claude/pf2e-inventory-design-7i0far`, que é a mais
adiantada (tem o servidor em tempo real).

O README proíbe explicitamente fichas de personagem na seção 2. Sem reescrever
isso, as próximas fases trabalham contra o próprio repositório.

## Passos

1. **Importar o design.** Se ainda não foi feito nesta sessão, usar o MCP
   `claude_design` para importar `Ficha PF2e.dc.html` (e o `support.js` que ele
   importa) do projeto do Claude Design, e salvar em `docs/design/` no
   repositório, versionado. Sem isso, as fases seguintes não têm de onde ler o
   layout.
3. **Criar `main`** a partir de `claude/pf2e-inventory-design-7i0far` e apontar o
   `HEAD` padrão do repositório para ela.
4. **Perguntar ao Julio, em português simples**, se as outras branches
   (`lista-full-bleed-e-simplificar`, `padroniza-identidade-visual`,
   `ui-layout-improvements-x6psa8`, `vscode-session-commit-check-tk5gmx`,
   `servidor-mesa-tempo-real`) têm trabalho que ainda não entrou. **Não apagar
   branch nenhuma sem resposta.**
5. **Criar a branch de trabalho** `feat/ficha-pf2e` a partir de `main`.
6. **Reescrever a seção 2 do `README.md`** para admitir a ficha, e colar nela:

   > Este programa **não é um character builder**. É uma ficha melhorada do
   > Pathbuilder, com gestão de inventário, loja e ações do mestre. Quem constrói
   > o personagem é o Pathbuilder; subir de nível é reimportar.

   Continuam fora: level-up, escolha de feat, rolagem de dado, iniciativa,
   controle de combate, bestiário.
7. **Corrigir a navegação descrita no README.** Ele fala em quatro abas com
   Biblioteca; o código (`src/App.jsx`) tem três — Inventário, Loja, Mestre — e a
   Biblioteca já é tela filha do Mestre. Com a Ficha, voltam a ser quatro.
8. **Corrigir o sparse-checkout documentado** no README: os packs do Foundry
   agora estão em `packs/pf2e/…`, não em `packs/…`.
9. **Colar o adendo no `CLAUDE.md`** (arquivo `CLAUDE_adendo.md`).
10. **Criar `scripts/lint-visual.mjs`** e o script `npm run lint:visual`.

## `lint:visual`

Varre `src/**/*.{jsx,js,css}` e falha, com arquivo e linha, se achar **fora de
`src/styles/tokens.css`**:

- `#` seguido de 3, 4, 6 ou 8 dígitos hex
- `rgb(` `rgba(` `hsl(` `oklch(`
- `style={{` contendo qualquer de: `color` `background` `fontSize` `fontWeight`
  `borderRadius` `padding` `margin` `boxShadow` `letterSpacing` `lineHeight`
- em CSS: `font-size:` com valor literal em vez de `var(--t-*)`

Ignorar: comentários, `currentColor`, `transparent`, `inherit`, `none`, e valores
calculados em runtime dentro de `style={{}}` que não estejam na lista acima
(`transform`, `width` percentual).

Rodar dentro do `npm run build`.

Rodar uma vez sobre o código atual: se o repositório já tiver violações, **não
corrigir nesta fase** — apenas listar no commit e usar `--baseline` ou equivalente
para não travar as fases seguintes.

## Não fazer nesta fase

Não tocar em `src/`, exceto se o `lint:visual` exigir. Não começar parser, schema
nem tela.

## Pronto quando

- [ ] `docs/design/Ficha PF2e.dc.html` e `docs/design/support.js` importados e
      versionados no repositório
- [ ] `main` existe e é o padrão do repositório
- [ ] `feat/ficha-pf2e` criada a partir de `main`
- [ ] README sem a proibição, com a frase do character builder, com a navegação e
      o sparse-checkout corretos
- [ ] `CLAUDE.md` com o adendo
- [ ] `npm run lint:visual` roda e reporta
- [ ] `npm run build` passa
- [ ] Commit e push
