# Auditoria e limpeza para versão final

Levantamento feito antes de tocar em qualquer arquivo. Três níveis:

- **A — morto com certeza.** Prova de não-uso completa, remoção sem risco.
- **B — suspeito.** Provavelmente inútil, mas há acesso dinâmico, feature em
  andamento, arquivo protegido pela própria tarefa ou decisão de produto.
  Cada item traz a pergunta que precisa de resposta.
- **C — parece sobra, mas fica.** Registrado para não ser reexaminado depois.

---

## Linha de base (antes de qualquer alteração)

| Verificação | Resultado |
|---|---|
| `npm ci` | ok |
| `npm run build` | ok (`lint:visual` sem violação nova; 4 antigas toleradas) |
| `npm run smoke` | 11 de 11 passando |
| `npm test` | 177 casos: 164 passam, 0 falham, 13 pulados |

Os 13 pulados são de `test/loreResolve.test.js`, presos atrás de
`npm run build:lore` (precisa do clone em `vendor/pf2e`). É o comportamento
declarado no próprio teste, não uma quebra.

**Gabarito guardado.** Além dos comandos, foi gravado um despejo de 29.434
linhas com todo valor computado da ficha — Rurik e o mago dos fixtures reais,
em 20 cenários de condição, mais 7 variantes de equipamento, os limites de HP e
14 fluxos do reducer. É contra esse arquivo que a Etapa 5 compara, valor por
valor. Alguns números do gabarito, para referência rápida:

```
Rurik, nível 1, HP 24/24, deslocamento 20
  atributos  str +4  dex +2  con +2  int +0  wis +1  cha +0
  CA 15  (Base 10 · DEX 2 · Proficiência trained 3)
  Fortitude +7 · Reflex +5 · Will +6 · Percepção +6 · DC de classe 17
  Longsword  ataque +7  dano 1d8+4   MAP 2 / −3
  Dagger     ataque +7  dano 1d4+4   MAP 3 / −1
  Unarmed    ataque +7  dano 1d4+4   MAP 3 / −1

Frightened 2  ->  CA 13, Fortitude +5, Longsword +5   (tudo marcado "altered")

Equipamento entrando na CA:
  nada equipado ................ 15
  + Leather Armor .............. 16
  + Steel Shield abaixado ...... 16
  + Steel Shield erguido ....... 18
  + escudo erguido e QUEBRADO .. 16   (não dá bônus, como manda a regra)
  mod manual "Rage" (+2 dano, +1 dado) -> Longsword 2d8+6
```

Uma `data/mesa.json` de referência também foi gravada, exercitando o servidor
de verdade com dois clientes Socket.IO: 27 ações aceitas, 1 recusada
(ação desconhecida), os dois celulares recebendo os 27 patches na mesma ordem,
`resync` devolvendo mesa idêntica, e o arquivo final em versão 6 com 4
jogadores, 5 lojas e 12 entradas de histórico.

---

## O estado das branches

Levantado antes de decidir qualquer consolidação, como pedido.

| Branch | Situação |
|---|---|
| `main` | **é a canônica e está na frente.** Aponta para `cfdc8fd`. |
| `claude/pf2e-inventory-design-7i0far` | `2978cd2`, **já incorporada** na `main`. |
| `claude/party-treasure-audit-cleanup-7elwk2` | branch desta limpeza, saiu da `main`. |

Em português simples: aquela branch que o GitHub estava exibindo é passado. Tudo
que ela tinha já está na `main`, e a `main` tem mais 30 commits em cima. Não há
trabalho para resgatar e não há nada a consolidar. A branch em si é entulho, mas
não apago nada sem confirmação — está no nível B.

---

## Nível A — morto com certeza

Cada item foi procurado no repositório inteiro **como palavra**, não só como
`import`: código, JSON de dados, CSS, HTML, documentação e testes. Também foram
levantados todos os `await import()` do repositório (13 deles, todos em testes),
justamente porque busca por `import` estático não prova nada sozinha — foi assim
que `MAX_FOCO` apareceu como "sem uso" e se revelou vivo (ver nível C).

### A1. Cálculo de moeda duplicado — o apelido que ninguém chamava

`src/lib/money.js` tinha uma função que era só um apelido de outra do mesmo
arquivo:

| Função | Linhas | O que era | Quem chamava | Destino |
|---|---|---|---|---|
| `walletCopper` | 22–25 (4) | `return toCopper(wallet)` | ninguém | **removida** |
| `toPriceInput` | 4 | `return formatCopper(totalCp)` | ninguém | **fica** (ver C12) |
| `parsePriceInput` | 24 | lê preço digitado à mão ("1 po 5 pp") | ninguém | **fica** (ver C12) |
| `formatCopper` | 8 | "12 po 3 pp" | só `toPriceInput` | **fica** (ver C12) |

Em uso hoje: `toCopper` (7 arquivos). O formulário de item não digita preço em
texto livre — `ItemForm.jsx` usa três campos numéricos e soma com `toCopper`.

**Correção de classificação feita durante a execução.** As outras três estavam
neste nível na primeira versão deste relatório, e foram rebaixadas para C ao
conferir o `docs/design-system.md`, que registra a decisão de mantê-las. Detalhe
em C12.

### A2. `canAfford` — o mesmo teste de saldo, escrito duas vezes

`src/state/reducer.js:1052–1054`

```js
export function canAfford(player, totalCp) {
  return toCopper(player) >= totalCp
}
```

Quem está em uso é a versão escrita à mão na Loja, `ShopScreen.jsx:39–40`:

```js
const walletCp = toCopper(player)
const affordable = walletCp >= totalCp
```

A do reducer não tem chamador nenhum. **Não unifico as duas** — só removo a que
não é chamada, como pedido. 3 linhas.

### A3. `CATALOG_IDS` — validação da época do `localStorage`

`src/state/initialState.js:136–137`. O comentário diz para que servia: "Ids do
catálogo semente, para validar referências vindas do armazenamento". Essa
validação hoje é do servidor, em `sanitizeTable` (`server/table.js`). Zero
menções em qualquer lugar. 2 linhas.

### A4. `COIN_ORDER` — lista de denominações que nenhuma tela lê

`src/components/Coins.jsx:40–44`. O próprio `Coins` monta a lista dele inline
(linhas 14–18) e nunca lê esta constante. Zero menções fora da declaração.
5 linhas.

### A5. Constante morta num teste

`test/pathbuilder.test.js:20` — `const WIZARD = JSON.parse(WIZARD_TEXT)`, nunca
usada. A linha 249 reparseia `WIZARD_TEXT` em vez de usá-la. 1 linha.
(`RURIK`, a irmã dela na linha 18, é usada — essa fica.)

### A6. `.gitignore` apontando para o SQLite que nunca existiu

```
*.sqlite
*.sqlite-journal
```

O SQLite foi decisão abandonada (a seção 6 do README explica por quê). Não
existe nem existiu arquivo `.sqlite` no repositório, e nenhuma dependência de
banco em `package.json`. 2 linhas.

### A7. Dois comentários que descrevem um programa que não é mais este

| Onde | O que diz | Por que está errado |
|---|---|---|
| `src/lib/foundryImport.js:5` | "da Fase 2 vai usar no SQLite" | SQLite foi descartado |
| `src/screens/CharacterSheet/index.jsx:20` | "As cinco sub-abas chegam nas fases 8 a 11. Até lá elas aparecem desabilitadas" | as fases acabaram; as abas estão ligadas |

Correção de texto, sem efeito no comportamento.

### Tamanho do nível A — o que foi removido

| Grupo | Arquivos | Linhas |
|---|---|---|
| A1 `walletCopper` | 1 | 4 |
| A2 `canAfford` | 1 | 4 |
| A3 `CATALOG_IDS` (mais o import que existia só para ela) | 1 | 4 |
| A4 `COIN_ORDER` | 1 | 6 |
| A5 const morta em teste | 1 | 1 |
| A6 `.gitignore` | 1 | 2 |
| A7 comentários vencidos | 2 | 2 reescritas |
| **Total** | **8** | **21 linhas apagadas** |

## Nível B — respondido, e o que foi feito

**As decisões chegaram.** Cada item abaixo mantém a pergunta original, para o
registro, e traz a resposta no fim.

| Item | Decisão |
|---|---|
| B1 `activeConditions` | **removida** |
| B2 `fetchSpellByName` | **removida** |
| B3 `totalBulk` | fica — pode ser meio caminho da Fase 5 |
| B4 `RANKS` | fica |
| B5 `.charsheet` (CSS morto) | fica — não vale quebrar a garantia de que nenhum estilo foi tocado |
| B6 `docs/ficha/` | **removida** |
| B7 `docs/design/` | **removido** |
| B8 fichas duplicadas | ficam as duas cópias |
| B9 `export` redundante | fica como está |
| B10 identidade em metadados | **corrigidos** `package.json` e `index.html` |
| B11 branch já incorporada | **apagar** |


### B1. `activeConditions` — condição sem chamador

`src/lib/conditions.js:85–93` (9 linhas). Devolve toda condição ativa no formato
`{ key, value, mechanical }`.

**Por que não classifiquei como morto:** é código de condição, e a tarefa manda
não classificar isso como morto sem perguntar. E há um candidato a herdeiro:
`ConditionChips` (`ConditionsSheet.jsx:127–131`) faz o mesmo filtro à mão, mas
percorrendo a lista de condições do pack — assim ele tem o **nome** de cada
condição para escrever no chip, que é o que a tela precisa. `activeConditions`
percorre o objeto e devolve só a chave, sem nome.

**Pergunta:** os chips já resolvem o que essa função faria, e ela pode sair? Ou
ela é a peça de uma tela que ainda vai existir (uma lista de condições do
personagem em outro lugar, por exemplo)?

> **Resposta: remover.** Feito. Os chips resolvem, e `MECHANICAL` continua vivo
> (é lido pelo próprio `conditionMods` e pela tela de condições).

### B2. `fetchSpellByName` — busca de magia sem chamador

`src/lib/loreResolve.js:205–213` (9 linhas). Busca **uma** magia no servidor por
nome. Ao lado dela, em uso, está `fetchSpellCostsByName`, que busca **várias** de
uma vez — e é o que a importação usa.

**Pergunta:** a busca em lote substituiu a individual de vez, ou a individual
serve para alguma tela abrir uma magia solta que a aba Magias ainda não mostra?

> **Resposta: remover.** Feito. `spellRef`, que ela usava, continua vivo — é
> chamado por `lib/spells.js`, pelo `SpellPicker` e pela busca em lote.

### B3. `totalBulk` — soma de Bulk que nenhuma tela exibe

`src/lib/items.js:91–94` (4 linhas). Funciona, é chamada por ninguém, e o
Inventário não mostra Bulk total em lugar nenhum.

**Por que não é nível A:** o Roadmap (Fase 5) prevê "cálculo de Bulk conforme as
regras, com limite de carga". Isto pode ser a metade já pronta disso.

**Pergunta:** apago, ou fica esperando a Fase 5?

> **Resposta: fica.** Segue sem chamador, de propósito.

### B4. `RANKS` — tabela de graus de proficiência sem leitor

`src/lib/pathbuilder.js:31`, 1 linha:

```js
export const RANKS = { untrained: 0, trained: 2, expert: 4, master: 6, legendary: 8 }
```

Ninguém lê. Quem está em uso é a irmã dela, `RANK_NAMES` (o caminho inverso,
número → nome). E `sheet.js`, dentro de `weaponRank`, escreve a mesma tabela
inline — **sem** o `untrained: 0`.

**Por que não é nível A:** é dado de regra do PF2e, e a tarefa manda mandar
regra-sem-chamador para o nível B, nunca para o A.

**Pergunta:** apago a `RANKS`? (Não vou unificar com a tabela inline do
`sheet.js` — unificar é refatoração, que esta tarefa proíbe. Só registro que a
duplicidade existe.)

> **Resposta: fica.** A duplicidade com a tabela inline do `sheet.js` continua
> registrada aqui, sem unificação.

### B5. Uma regra de CSS morta — mas mexer em CSS é proibido nesta tarefa

`src/styles/screens.css:1184–1187`:

```css
.charsheet {
  display: flex;
  flex-direction: column;
}
```

Todo uso na interface é `charsheet__algo` (elemento); a classe `charsheet` pelada
não aparece em nenhum JSX. Varri as 397 classes das quatro folhas contra todo o
JS/HTML, tratando nome montado em tempo de execução (`coins--${size}`,
`coin-dot--${coin}`) por prefixo — **esta é a única órfã**, e os 56 tokens de
`tokens.css` estão todos em uso.

**Por que não removi:** a tarefa proíbe alterar folhas de estilo, e a Etapa 5
pede para eu provar que nenhum pixel mudou. Não vou abrir exceção sozinho.

**Pergunta:** quer que eu remova essas 4 linhas, ou o CSS fica intocado de
verdade? (Recomendo intocado: 4 linhas não pagam quebrar a garantia de que
nenhum estilo foi tocado.)

> **Resposta: fica.** Nenhuma folha de estilo foi tocada nesta limpeza. A regra
> `.charsheet` continua lá, morta e inofensiva — quem quiser removê-la um dia
> sabe por este parágrafo que ela é seguramente órfã.

### B6. Os pacotes de implementação das fases da ficha

`docs/ficha/` — 14 arquivos, **968 linhas**: `README.md` mais `fase-00.md` a
`fase-12.md`. Cada um é o roteiro de uma fase: quais arquivos tocar, o que não
fazer, quando a fase está pronta. As treze fases estão concluídas (o próprio
Roadmap do README marca "fases 0 a 12 ✔").

Cumpriram o papel. `CLAUDE.md` ainda manda ler o arquivo da fase antes de abrir
sessão, e `README.md` linka a pasta em dois lugares — os dois textos precisam de
ajuste de qualquer forma na Etapa 4.

**Pergunta:** removo `docs/ficha/` inteira? O que vale a pena guardar dela é o
que já está no `ESPEC_Ficha.md`, que fica.

> **Resposta: remover.** Feito, com as referências ajustadas no README, no
> `CLAUDE.md` e nas §12.2 e §15 do ESPEC, para não sobrar link quebrado.

### B7. O protótipo do Claude Design

`docs/design/` — 216 KB em dois arquivos:

- `Ficha PF2e.dc.html` (148 KB) — o protótipo de layout da ficha
- `support.js` (68 KB) — runtime gerado do Claude Design, "do not edit"

A ficha está implementada. `CLAUDE.md:125` ainda cita o protótipo como
"referência de layout, nunca de conteúdo", e o `ESPEC_Ficha.md:426` diz que ele
dá o layout enquanto o `design-system.md` dá o estilo.

**Pergunta:** o protótipo ainda serve para consulta em ajuste de tela, ou já pode
sair? (Se sair, tiro as menções a ele no `CLAUDE.md` e no `ESPEC_Ficha.md` na
Etapa 4.)

> **Resposta: remover.** Feito. A §12.2 do ESPEC passou a registrar o que sobrou
> do protótipo (nada de aparência como literal) em vez de instruir o que
> descartar dele.

### B8. Duas cópias byte a byte das mesmas fichas de exemplo

Confirmado por soma de verificação — são idênticas:

| Arquivo | Quem usa |
|---|---|
| `docs/fixtures/rurik.json` · `wizard.json` | os 6 arquivos de teste |
| `src/data/seed-sheets/rurik.json` · `wizard.json` | `initialState.js`, a mesa de exemplo |

As duas cópias estão em uso, então nenhuma é removível hoje. Fazer os testes
lerem de `src/data/seed-sheets/` seria mexer em import — reorganização, que esta
tarefa proíbe.

**Pergunta:** deixo as duas cópias (é o que a restrição da tarefa manda), ou você
libera essa mudança de import como exceção? Recomendo deixar: 6 KB duplicados
não valem uma exceção à regra.

> **Resposta: ficam as duas.** Nenhum import foi mexido.

### B9. Catorze `export` que ninguém importa — a função é viva, a palavra é que sobra

Estes identificadores **são usados**, mas só dentro do próprio arquivo. O
`export` na frente não serve a ninguém:

| Arquivo | Identificador |
|---|---|
| `server/net.js` | `lanAddresses` |
| `src/state/session.js` | `createSession` |
| `src/lib/money.js` | `formatCopper` |
| `src/lib/conditions.js` | `SLUG_TO_KEY` |
| `src/lib/loreResolve.js` | `slugify` |
| `src/lib/sheet.js` | `stat`, `profBonus` |
| `src/lib/pathbuilder.js` | `SKILL_ABILITY`, `SKILL_NAMES`, `SAVE_KEYS`, `ARMOR_KEYS`, `WEAPON_KEYS`, `CASTING_KEYS` |
| `src/data/traits.js` | `TRAITS` |
| `src/components/ItemFilters.jsx` | `LevelPicker` |
| `src/screens/CharacterSheet/index.jsx` | `SUBABAS` |
| `src/screens/CharacterSheet/Compendio.jsx` | `rankEfetivo` |
| `src/lib/foundryImport.js` | `convertFoundryItem` |

**Pergunta:** tirar a palavra `export` desses? Não muda comportamento nenhum,
mas também não apaga uma linha — só fecha a porta de um módulo. **Recomendo não
mexer:** vários deles (`stat`, `profBonus`, `SKILL_ABILITY`) são exatamente o
tipo de coisa que um teste novo vai querer importar, e `MAX_FOCO` já provou que
teste importa por `await import()`.

> **Resposta: fica como está.** Os catorze `export` continuam abertos.

### B10. A identidade desatualizada em dois lugares que não são documentação

| Onde | Texto atual |
|---|---|
| `package.json` | `"description": "Gerenciador de inventario, dinheiro e lojas para mesas de Pathfinder 2e"` |
| `index.html:11` | `<meta name="description" content="Inventario, dinheiro e lojas para mesas de Pathfinder 2e" />` |

Os dois descrevem o app sem a ficha e sem as condições — o erro de identidade que
a Etapa 4 conserta no README. Mas `index.html` é **markup**, que a tarefa protege
explicitamente, e `package.json` não está na lista de arquivos a corrigir.

**Pergunta:** corrijo esses dois textos? (O `<title>Tesouro do Grupo</title>`
deixo em paz de qualquer forma — é o nome do app, não uma descrição errada.)

> **Resposta: corrigir os dois.** Feito: as duas descrições passaram a citar a
> ficha e as condições. O `<title>` ficou intacto, e é a **única** alteração de
> markup desta limpeza — um atributo de texto, nada visual.

### B11. A branch já incorporada

`claude/pf2e-inventory-design-7i0far`, local e no GitHub. Está inteira dentro da
`main` — nenhum commit exclusivo, nada a perder.

**Pergunta:** apago? (É a que o GitHub estava exibindo; apagar faz o GitHub
mostrar a `main`, que é a certa.)

> **Resposta: apagar.** Feito depois do merge desta limpeza na `main`.

### Tamanho do nível B

| Grupo | Arquivos | Linhas / tamanho |
|---|---|---|
| B1 `activeConditions` | 1 | 9 |
| B2 `fetchSpellByName` | 1 | 9 |
| B3 `totalBulk` | 1 | 4 |
| B4 `RANKS` | 1 | 1 |
| B5 `.charsheet` | 1 | 4 |
| B6 `docs/ficha/` | 14 | 968 |
| B7 `docs/design/` | 2 | 216 KB |
| B8 fichas duplicadas | 2 | 6 KB |
| B9 `export` redundante | 14 | 14 palavras |
| B10 identidade em metadados | 2 | 2 |
| B11 branch incorporada | — | — |
| **Total, se tudo for liberado** | **~39** | **~1.010 linhas + 222 KB** |

---

## Nível C — parece sobra, mas fica

### C1. A mesa de exemplo (Valeros, Seelah, Ezren e as quatro lojas)

`src/state/initialState.js`. **Não é mock esquecido: é feature.** O comentário
do próprio arquivo diz — "mesa de exemplo, usada na primeira vez que o servidor
sobe (quando ainda não existe `data/mesa.json`)". Além disso:

- `server/table.js` cai nela quando não há arquivo no disco;
- `npm run smoke` depende dela nos 11 casos;
- as duas fichas de exemplo entram pelo mesmo `IMPORT_SHEET` que a tela usa, de
  propósito, para a mesa de exemplo não poder divergir de uma importação real.

O catálogo hardcoded de ~15 itens que a tarefa mandava procurar **não existe
mais**: `src/data/catalog.js` só reexporta o `catalog.equipment.json` gerado, com
os ~5.700 itens. Essa limpeza já aconteceu.

### C2. Tudo em `src/data/` gerado

`catalog.equipment.json` (10,4 MB), `traits.json`, `conditions.json`,
`index.spells.json`, `index.actions.json`, `unarmed.json`. Gerados pelos scripts,
com os campos `publication`/`license`/`source` que as licenças Paizo/ORC exigem.
Intocáveis por decisão da tarefa, e corretamente ignorados na auditoria.

### C3. As oito dependências — todas em uso

Levantado percorrendo o grafo a partir de **todos** os pontos de entrada reais
(`src/main.jsx`, `server/index.js`, os seis scripts, `vite.config.js`,
`index.html` e os sete arquivos de teste):

| Dependência | Quem usa |
|---|---|
| `express` | `server/index.js` |
| `socket.io` | `server/index.js` |
| `socket.io-client` | `src/state/store.jsx`, `scripts/smoke-sync.mjs` |
| `qrcode-terminal` | `server/net.js` |
| `react` | 28 arquivos |
| `react-dom` | `src/main.jsx` |
| `vite` · `@vitejs/plugin-react` | `vite.config.js` |

Nenhuma dependência para remover. Nenhum script de `package.json` inútil — os
dez fazem algo, inclusive `vendor-pf2e.mjs`, que não é script npm mas é o módulo
compartilhado dos três `build:*`.

**Nenhum módulo órfão no repositório.** Os 89 arquivos alcançáveis são todos os
arquivos de código que existem.

### C4. O que parecia export morto e está vivo por caminho torto

| Identificador | Como está vivo |
|---|---|
| `MAX_FOCO` | `await import()` em `test/sheet.test.js:435` — invisível para busca por `import` estático |
| `focusPool` | idem, `test/spells.test.js:304` |
| `SLUG_TO_KEY` | lido por `conditionKey` na linha logo abaixo |
| `slugify` | lido por `spellRef` na linha logo abaixo |
| `stat` | 8 chamadas dentro do próprio `sheet.js` |
| `profBonus` | 6 chamadas dentro do próprio `sheet.js` |
| `MECHANICAL` | indexado por chave dinâmica: `MECHANICAL[chaveDe(c)]` |
| `ABILITY_CONDITION` | indexado por atributo: `ABILITY_CONDITION[opts.ability]` |

Os dois últimos são o caso exato que a tarefa avisou: tabela lida por chave
montada em tempo de execução, que nenhuma busca por `import` encontraria.

### C5. `readDeviceTable` e `STORAGE_KEY` — `localStorage` que fica de propósito

`src/state/store.jsx:146` e `src/config.js:8`. Parece resto da persistência
antiga, mas é a porta de entrada do botão "Importar a mesa deste aparelho", em
uso por `SettingsSheet.jsx:17`. Sem ela, quem montou campanha no celular antes do
servidor existir perderia tudo.

O `localStorage` que **é** do aparelho e deve continuar — personagem em foco,
loja atual, carrinho — está em `src/state/session.js`, decisão registrada na
seção 6 do README. Nada disso é entulho.

### C6. Os 56 tokens e 395 das 397 classes

Zero tokens declarados e nunca lidos. Das 397 classes, 395 em uso (a 397ª,
`.woff2`, era falso positivo da minha varredura — é o fim de um nome de arquivo
de fonte, não uma classe). O sistema visual está limpo.

### C7. A fonte em `public/`

`public/fonts/pathfinder-2e-actions.woff2` — um arquivo, um `@font-face`
(`base.css:4–8`), um peso, usado em `screens.css:747` e citado por
`Feats.jsx:222`. Nada a remover.

### C8. As quatro violações toleradas do `lint:visual`

`scripts/visual-baseline.json` lista 4 valores literais que já existiam quando o
lint nasceu (dois `#fff`, dois `rgba()`). São dívida visual anterior, em folhas
de estilo que esta tarefa protege. Ficam.

### C9. O comentário da moldura de iPhone

`src/styles/screens.css:10` — "No protótipo o topo era a barra de status do
iPhone (58px fixos)". Não é resto de código: é o comentário que explica de onde
saiu o valor da linha seguinte. É exatamente o tipo de comentário que a
`CLAUDE.md` pede. Fica.

Da moldura de iPhone em si não sobrou nada: nenhuma classe, nenhum estilo,
nenhum componente.

### C10. `/claude design/` e `/.claude/` no `.gitignore`

As pastas não existem no clone, mas as duas linhas são preventivas — impedem que
o handoff do protótipo e a configuração local do Claude Code entrem no Git por
acidente. Diferente das linhas de SQLite (A6), que protegem contra um arquivo que
nunca vai existir.

### C11. Os 13 testes pulados

`test/loreResolve.test.js` pula 13 casos quando o corpus de verbetes não foi
gerado, com a mensagem "rode `npm run build:lore` primeiro". Comportamento
declarado, não quebra.

---

### C12. As três funções de preço que o design system manda manter

`formatCopper`, `toPriceInput` e `parsePriceInput`, em `src/lib/money.js` (36
linhas somadas). Nenhuma tem chamador. **Ficam por decisão registrada**, e foi o
`docs/design-system.md` que a registrou primeiro:

> **Qualquer quantia na tela usa `<Coins>`/`<Price>` — nunca o texto "po/pp/pc".**
> `formatCopper` (`lib/money.js`) ainda existe, mas só para o que não pode ser um
> componente (o `toPriceInput` de um campo de texto editável, se algum dia for
> usado) […]

`parsePriceInput` é o par de ida do mesmo campo hipotético: ele lê "1 po 5 pp" e
devolve cobre. O design system nomeia só a volta, mas o campo é o mesmo.

Foi este o único item que mudou de nível durante a execução: estava em A na
primeira versão deste relatório. Na dúvida entre remover e manter registrando,
mantive.

## Bugs e inconsistências encontradas — relatados, não consertados

### 1. O preço de venda está certo. O alerta do README está errado.

O Roadmap, Fase 5, diz: "preço de compra vs venda diferenciado (**conferir: hoje
a venda parece devolver o valor cheio**)". **Conferido: não devolve.**

`src/config.js:5` define `SELL_RATE = 0.5`, e `reducer.js:391` faz
`Math.floor(item.priceCp * SELL_RATE) * sold`. Medido no gabarito: vender uma
Longsword (1 po = 100 pc) creditou **50 pc**, a metade exata. A Loja também
mostra a metade antes de confirmar (`InventoryScreen.jsx:107` usa a mesma
`SELL_RATE`). É a regra do PF2e, e está implementada nos três lugares que
importam.

O que sobra é o texto do README, que a Etapa 4 corrige.

### 2. Mesa em versão 1 pula a migração em silêncio

`src/state/migrations.js` tem migração para as versões 2, 3, 4 e 5. Não tem para
a 1. Uma mesa em versão 1 entra em `migrate`, não encontra `MIGRATIONS[1]`, sai
do laço ainda na versão 1 — e então `sanitizeTable` (`server/table.js:96`) grava
`version: 6` por cima.

Na prática a mesa é salva, porque `sanitizeTable` preenche `settings`, `history`,
`itemNotes` e os campos de ficha logo depois. Mas o pulo de versão acontece calado,
e "errar em silêncio" é o erro que a `CLAUDE.md` chama de inaceitável. Não
consertei: mexer em migração é proibido nesta tarefa. Provavelmente nunca houve
mesa em versão 1 gravada em disco (o disco começou na Fase 3, já em versão 5).

### 3. `CLAUDE.md` aponta para uma branch que não existe

Linhas 108–110: "A ficha PF2e está sendo implementada na branch de trabalho da
sessão (`claude/execute-prompt-with-files-04lj69`)". Essa branch não existe em
lugar nenhum, e a ficha não está "sendo implementada" — está pronta. Corrigido na
Etapa 4.

### 4. A árvore de arquivos do README está errada em três pontos

Na seção "Estrutura": `server/` aparece **duas vezes** (a segunda só com
`entries.js`); `styles/` aparece indentado dentro de `test/`, quando é
`src/styles/`; e `CharacterSheet/` não lista `Magias.jsx` nem `Compendio.jsx`.
Corrigido na Etapa 4.

### 5. A lista de "fora do escopo" do README é maior que a definitiva

Hoje o README veta "level-up, escolha de feat, distribuição de atributo, rolagem
de dado, iniciativa, controle de combate e bestiário". A lista definitiva desta
tarefa é **iniciativa, combate e bestiário** — e nada mais. Corrigido na Etapa 4.

### 6. Uma observação sobre o README que o briefing não previa

O briefing dizia que a seção 2 descreve "um gerenciador de tesouro e economia que
proíbe explicitamente HP, condições e fichas de personagem". **Não é o que está lá
hoje.** A seção 2 atual já abre com "É uma ficha melhorada do Pathbuilder", e o
"dentro do escopo" já lista ficha, HP, condições, defesas, perícias, ataques,
feats, ações e magias. A abertura do README (linha 3) também já diz "ficha,
inventário, dinheiro e lojas".

Ou seja: essa correção de identidade já foi feita, em algum momento das fases da
ficha. O que sobrou de errado é bem menor do que o briefing supunha — os itens 4
e 5 acima, a seção 1 (que ainda descreve o protótipo no presente, "hoje é um
componente React único de ~2000 linhas"), a Fase 3 do Roadmap (que trata a busca
no cliente como pendência) e a meta revogada dos "~100 itens" na seção 4.

Registro isso porque muda o tamanho da Etapa 4: é ajuste, não reescrita de
identidade.

---

## Verificação final

### Os comandos, a partir de um clone limpo da `main`

| Verificação | Antes da limpeza | Depois |
|---|---|---|
| `npm ci` | ok | ok |
| `npm run build` (com `lint:visual`) | ok, sem violação nova | ok, sem violação nova |
| `npm run smoke` | 11 de 11 | 11 de 11 |
| `npm test` | 164 passam, 0 falham, 13 pulados | 164 passam, 0 falham, 13 pulados |

### Os valores da ficha, um por um

O gabarito da Etapa 0 foi regerado depois da limpeza e comparado com o de antes:
**28.882 linhas idênticas, zero diferença de valor.** As únicas divergências eram
o `importedAt` e os ids gerados a partir de `Date.now()`, que não são
determinísticos por natureza — normalizados os dois lados, o arquivo bate
byte a byte.

### A `mesa.json` de referência

Carregada no servidor a partir da cópia gravada na Etapa 0. Tudo intacto: os 4
jogadores (inclusive o Amiri criado lá), a renomeação "Ezren, o Velho", a
carteira 70/9/3 do Valeros, a Greataxe comprada, o que estava equipado, o HP 19
com 4 temporários, as condições Frightened 2 e Off-Guard, as 5 lojas, o item de
campanha "Selo do Conde" e as 12 entradas de histórico. Nenhuma migração
silenciosa, nenhuma perda.

### A lista percorrida no navegador

Percorrida clicando, em Chromium a 390×844, com **dois contextos abertos** — dois
celulares de verdade — contra o servidor rodando a mesa de referência. **82 de 82
verificações passaram, sem um único erro de JavaScript em nenhum dos dois.**

Alguns resultados que provam o que importa:

```
CA 14, e o detalhamento mostrando de onde vem cada ponto:
  Base +10 · DEX +2 · Proficiência (trained) +3 · Leather Armor +1
  Steel Shield (circumstance) +2 · Frightened (status) −2 · Off-Guard −2

Fortitude +5 · Reflex +3 · Will +4 · Percepção +4 · Athletics T +5
Sub-abas do bárbaro: Resumo · Ataques · Feats · Ações   (sem Magias, correto)

Condições, nos dois sentidos:
  remover Off-Guard ....... CA 14 → 16
  reaplicar Off-Guard ..... CA 16 → 14
  Frightened 2 → 3 ........ CA 14 → 13
  Blinded (sem efeito) .... marca e a CA segue 14
  e cada uma dessas apareceu no segundo celular

HP:
  dano 3 com 4 temporários .... HP segue 19/24 (come o temporário primeiro)
  cura 999 .................... 24/24 (não passa do máximo)
  dano 999 .................... 0/24 (não passa de zero)
  e o segundo celular acompanhou

Venda pela metade, medida na carteira:
  "Deseja vender 1x Longsword por 5 pp?"  →  70/9/3 → 71/4/3  = +50 pc
  (Longsword custa 1 po = 100 pc; recebeu 50)

Loja:
  "Comprar" vira stepper quando entra no carrinho
  carrinho: CARTEIRA 70 9 3 → DEPOIS DA COMPRA 70 5 3
  compra de 2 Daggers debitou 40 pc e entregou no inventário, nos dois celulares
  carrinho impossível de pagar: botão desabilitado

Biblioteca: 10 pastas colapsáveis (Weapon 721, Armor 161, Shield 89, Rune 135…)

Queda de conexão (servidor derrubado de verdade):
  "Sem conexão com a mesa" apareceu nos DOIS celulares
  alteração recusada enquanto offline
  reconectou sozinho quando o servidor voltou, com a mesa íntegra
```

Três coisas que pareciam falha e eram comportamento certo, registradas para não
assustarem depois:

1. **"Simplificar moedas" não aparece** com 9 pp e 3 pc. É a regra do
   `canSimplify`: o atalho só surge com 10 ou mais de prata ou de cobre.
2. **A aba Magias não existe** para o Rurik. Ele é bárbaro; `subAbasDe` esconde a
   aba de quem não conjura, em vez de mostrar uma aba vazia.
3. **O aviso de conexão cobre o conteúdo** da tela. É proposital — está escrito no
   `ConnectionBanner`: "quem está sem conexão precisa ler isto, não espiar por
   baixo".

### Nenhum pixel mudou

`git diff` da limpeza inteira, conferido linha por linha:

- **Zero alterações** em `src/styles/` — nem `tokens.css`, nem `base.css`, nem
  `components.css`, nem `screens.css`.
- **Zero alterações** em `src/data/` — catálogo, traços, condições, magias, ações
  e as fichas semente intactos, com os campos de licença e atribuição.
- Em `.jsx`, duas mudanças e nada mais: a remoção do `COIN_ORDER` (uma constante
  no fim do arquivo, fora do JSX) e a reescrita de um comentário.
- Em `index.html`, uma linha: o texto do `<meta name="description">`. Nenhuma
  tag, nenhuma classe, nenhum estilo.
- Todo o resto do diff de código é **remoção pura**.

---

## Duas coisas que a Etapa 4 fez e você precisa saber

### As seções do README foram renumeradas

A ficha ganhou seção própria, e ela entrou como **6**. Isso empurrou as
seguintes:

| Antes | Agora |
|---|---|
| 6. Sincronização em tempo real | **7** |
| 7. Roadmap | **8** |
| 8. Convenções | **9** |
| 9. Licenciamento | **10** |
| 10. Como rodar | **11** |

O **conteúdo** do licenciamento e do "como rodar" não foi tocado — só o número do
título. Fiz assim porque a alternativa era enfiar a ficha como subseção de outra
coisa, e ela é metade do programa. Todas as referências cruzadas internas foram
atualizadas junto.

### Uma linha da seção 0 foi corrigida, apesar de a seção ser preservada

A seção 0 mandava criar o `.gitignore` cobrindo `*.sqlite` e `*.sqlite-journal`.
Como o nível A removeu essas duas linhas do `.gitignore` de verdade, a instrução
passaria a contradizer o repositório — criada pela própria limpeza.

Corrigi só essa lista de nomes de arquivo, para incluir o que hoje é ignorado de
fato (`data/` e `server/data/`). O resto da seção 0 — as regras de Git — está
intacto, palavra por palavra.

---

## Resumo do tamanho — resultado final

| Nível | Arquivos | Efeito |
|---|---|---|
| **A — removido** | 8 | 21 linhas apagadas, 2 comentários corrigidos |
| **B — removido com autorização** | 18 | 26 linhas de código + 4.921 linhas de documentação de fase + 216 KB de protótipo |
| **B — mantido por decisão** | — | `totalBulk`, `RANKS`, `.charsheet`, as duas cópias de fixture, os 14 `export` |
| **C — fica, com motivo registrado** | 12 grupos | — |

Somando: **47 linhas de código morto** saíram, mais **4.921 linhas** de
documentação que já tinha cumprido o papel e **216 KB** de protótipo. Nenhuma
folha de estilo, nenhum token e nenhum arquivo gerado de `src/data/` foi tocado.

O nível A é pequeno porque o repositório já estava limpo. Nada de módulo órfão,
nada de dependência sem uso, nada de `TODO` vencido, nada de arquivo `.bak`, nada
de bloco comentado, nada de ramo inalcançável, nada de token de CSS morto, e o
catálogo hardcoded do protótipo já removido antes desta limpeza. O que sobrou de
código morto eram funções pequenas — quase todas duplicatas cuja versão em uso
está escrita em outro lugar.
