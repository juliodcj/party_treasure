# PF2e — Party Treasure

App web para gerenciar **inventário, dinheiro e lojas** de uma mesa presencial
de Pathfinder 2e. O mestre roda o servidor no PC; os jogadores acessam pelo
navegador do celular Android na mesma rede Wi-Fi.

Repositório: `https://github.com/juliodcj/party_treasure`

---

## 0. Instruções de Git para o Claude Code

**Eu sou leigo em Git e GitHub. Você cuida disso inteiramente por mim.**

Não me peça para rodar comandos de Git, não me explique rebase, não me mande
resolver conflito. Faça você, e me diga em português simples o que aconteceu.

### Regras

- **Sempre manter um clone local no PC.** É a cópia de trabalho principal.
- **No começo de cada sessão de trabalho**: `git pull` antes de qualquer coisa.
  Se o repo local não existir ainda, clonar.
- **Commit ao final de cada tarefa concluída** (não a cada arquivo salvo).
  Mensagens em português, no imperativo, descrevendo o efeito prático.
  Ex.: `Adiciona importador em massa dos packs do Foundry`
- **Push logo após o commit.** Não deixar trabalho só no local.
- **Conflitos**: resolva você. Se for ambíguo e envolver decisão de produto
  (qual versão da regra vale), pergunte em linguagem simples — sem jargão
  de Git. Nunca descarte trabalho meu sem avisar.
- **Nunca** `push --force`, `reset --hard` em coisa não commitada, nem
  reescrita de histórico já enviado.
- Antes de mudança grande e arriscada, criar branch. Merge de volta na `main`
  quando estiver funcionando. Não me faça gerenciar branches.
- Se algo der errado, você conserta e me conta depois — não me deixe com o
  repositório num estado quebrado.

### Primeira execução

Se o repo remoto estiver vazio: inicializar, subir a estrutura inicial e o
protótipo. Se já tiver conteúdo: clonar e trabalhar em cima.

Criar `.gitignore` cobrindo: `node_modules/`, `vendor/`, `*.sqlite`,
`*.sqlite-journal`, `.env`, `dist/`, `.DS_Store`.

---

## 1. Ponto de partida: o protótipo do Claude Design

*(Registro de onde o projeto saiu. As Fases 1 a 3 já resolveram o que está
descrito aqui — ver o roadmap na seção 7.)*

O protótipo existe e a **UI está do jeito que eu quero** — preservar a
aparência e os fluxos. O problema é tudo que está por baixo.

Hoje é **um componente React único de ~2000 linhas**, com `this.state`, estilos
inline, sem backend, sem persistência, sem multiusuário. Interface em português.
Está travado numa **moldura de iPhone** — precisa virar layout responsivo
mobile-first para **Android**.

### Modelo de dados atual (em memória)

- **Jogador**: `{ id, name, gold, silver, copper, items: { [itemId]: qty }, customItems: [] }`
  — 3 mocks: Valeros, Seelah, Ezren.
- **Item de catálogo** (`CATALOG`, ~15 itens hardcoded):
  `{ id, name, level, category, priceCp, weight, traits[], description }`
- **Item de campanha** (`campaignItems`): criado pelo mestre ou importado de JSON.
- **Item custom**: avulso no inventário de um jogador, não entra no catálogo.
- **Loja**: `{ id, name, itemIds[], search, filterCategory, filterLevel }` — 4 mocks.
- Dinheiro sempre normalizado em **cobre** (`1 po = 10 pp = 100 pc`).
  UI mostra 3 badges (ouro/prata/cobre).

### O que já funciona (preservar)

**Inventário** — seletor de jogador em chips; lista agrupada em Equipamentos /
Consumíveis / Outros; busca + filtro por tipo e nível; item expansível com
traits clicáveis (popup com descrição); +/- quantidade (edição livre, não mexe
na carteira — comprar é na Loja, vender é o botão dedicado), excluir, vender,
enviar item a outro personagem, editar itens custom; adicionar item manual ou
do catálogo. Carteira no header com ajuste de moedas, envio de dinheiro e
"Simplificar moedas".

**Loja** — dropdown de loja; lista de itens registrados com stepper de carrinho;
compra valida saldo, debita e adiciona ao inventário.

**Biblioteca** — itens de campanha + catálogo em pastas colapsáveis com busca;
criar item manual ou via **importador de JSON do Foundry** (cola texto, converte
nome, nível, preço, bulk, traits, descrição); editar/excluir.

**Mestre** — lista de jogadores com carteira; dar moedas a um jogador ou ao
grupo; dar item; adicionar/renomear jogadores; cadastrar/remover itens nas lojas.

### Navegação hoje

A barra de abas tem **quatro**: **Inventário · Ficha · Loja · Mestre**. A
Biblioteca não é aba: é tela filha do Mestre, aberta de lá. (Antes da ficha eram
três — este parágrafo é a descrição correta, não o histórico.)

---

## 2. Escopo

Este programa **não é um character builder**. É uma ficha melhorada do
Pathbuilder, com gestão de inventário, loja e ações do mestre. Quem constrói
o personagem é o Pathbuilder; subir de nível é reimportar.

### Dentro do escopo

Inventário, dinheiro, lojas, biblioteca de itens, papéis mestre/jogador, e a
**ficha de personagem** importada do Pathbuilder: HP e condições, defesas,
perícias, ataques montados a partir do inventário, feats, ações e magias — tudo
com o texto vindo dos packs do Foundry.

A ficha entra colando o JSON do Pathbuilder (*Export to Foundry VTT*) na tela do
Mestre. Personagem sem ficha continua funcionando como sempre: carteira e
inventário, sem cálculo.

Espec da ficha: [docs/ESPEC_Ficha.md](docs/ESPEC_Ficha.md).
Fases de implementação: [docs/ficha/README.md](docs/ficha/README.md).

### Fora do escopo — não implementar

**Level-up, escolha de feat, distribuição de atributo, rolagem de dado,
iniciativa, controle de combate e bestiário.**

Se surgir uma ideia fora disso, anote como sugestão e siga em frente — não
implemente por conta própria.

---

## 3. Arquitetura

```
┌─────────────────────────────────┐
│  PC do Mestre (servidor)        │
│  Node.js + Express + Socket.IO  │
│  ├── serve o frontend           │
│  ├── WebSocket: estado da mesa  │
│  └── data/mesa.json: a mesa     │
└──────────────┬──────────────────┘
               │ Wi-Fi local — http://192.168.x.x:3000
     ┌─────────┼─────────┬─────────┐
     ▼         ▼         ▼         ▼
  Android   Android   Android   Android
  (jogador) (jogador) (jogador) (mestre)
```

### Requisitos não-negociáveis

- **100% offline** depois da ingestão inicial. Deve rodar em hotspot sem dados.
- **Zero custo / zero nuvem.** Sem Firebase, Supabase, Auth0, nada.
- **Jogador não instala nada.** Abre a URL no Chrome. PWA (manifest + service
  worker) para "Adicionar à tela inicial".
- **Mobile-first Android**, retrato. Mestre pode usar tela maior.

### Stack

| Camada | Escolha |
|---|---|
| Frontend | React (do protótipo), refatorado em arquivos |
| Servidor | Node.js + Express |
| Tempo real | Socket.IO |
| Persistência | arquivo JSON atômico (`data/mesa.json`) — ver seção 6 |
| Ingestão | scripts Node standalone que geram `src/data/` |

Nenhuma dependência nativa em lugar nenhum: `npm install` não tem como pedir
compilador no PC do mestre.

---

## 4. Fonte de dados: `foundryvtt/pf2e`

`https://github.com/foundryvtt/pf2e` — dataset mais completo disponível,
mantido pela comunidade com acordo entre Foundry Gaming e Paizo.

A meta antiga era "~100 itens oficiais". **Descartar essa meta: quero o
catálogo completo de equipamentos.**

### Números reais (medidos, branch `master`)

384 MB descompactado · ~34.000 arquivos JSON · ~41 MB comprimido.

Por isso, **sparse checkout** — não clonar o repo inteiro:

```bash
git clone --depth 1 --filter=blob:none --sparse \
  https://github.com/foundryvtt/pf2e.git vendor/pf2e
cd vendor/pf2e
git sparse-checkout set packs/pf2e static/lang
```

Os packs mudaram de lugar: hoje são `packs/pf2e/equipment/…`, não `packs/…`.
Existe também `packs/sf2e/` (Starfinder), que este app ignora.

Com o clone em `vendor/pf2e`, a ingestão é:

```bash
npm run build:catalog   # src/data/catalog.equipment.json (5.739 itens)
npm run build:lore      # feats, magias, ações, condições e o Punho
npm run build:traits    # src/data/traits.json — rode por último
```

Sem o clone, os scripts param com a instrução de como cloná-lo, em vez de gravar
um catálogo vazio por cima do bom.

O `build:lore` divide o que gera segundo quem precisa e quando:

| Vai no bundle | Por quê |
|---|---|
| `src/data/index.spells.json` (445 KB) | o compêndio navega 1.993 magias offline, e navegar precisa ser instantâneo — por isso vai **sem descrição** |
| `src/data/conditions.json` (50 KB) | as 43 condições aparecem em toda rolagem; pedir ao servidor seria ida à rede no meio do combate |
| `src/data/unarmed.json` | o Punho, que não é item |

| Fica no servidor | Por quê |
|---|---|
| `server/data/entries.bin` (15 MB) | 10.205 verbetes com descrição completa. Mandar isso para um Android baratinho no primeiro carregamento é o que não pode acontecer |
| `server/data/entries.idx.json` (1,3 MB) | `slug → [offset, tamanho]`; o servidor lê um verbete por vez com `fs.read`, sem carregar o arquivo |

O servidor expõe `GET /api/entry/:ref` e `GET /api/entries?slugs=…` ou `?names=…`.
Sem a ingestão, essas rotas respondem 503 dizendo o que rodar — **o resto do app
funciona igual**, porque inventário, loja e carteira não dependem do corpus.

`vendor/` vai no `.gitignore`. Versionado é o **script de ingestão** (e
opcionalmente o `.sqlite` gerado, se couber).

### Packs relevantes para este app

| Pasta (dentro de `packs/pf2e/`) | Conteúdo | Qtd |
|---|---|---|
| `equipment/` | itens, armas, armaduras, escudos, consumíveis | ~5.700 |
| `conditions/` | as condições da ficha e dos efeitos de item | 43 |
| `feats/` | feats de classe, ancestralidade, perícia, geral | ~6.300 |
| `class-features/` | features de classe (Rage, Giant Instinct…) | ~880 |
| `heritages/` · `ancestry-features/` | heranças e traços de ancestralidade | ~385 |
| `actions/` | ações básicas e de perícia | ~575 |
| `spells/` | magias e truques | ~2.000 |

**Ignorar** bestiários, `classes/` e tudo que sirva a construir personagem — quem
constrói é o Pathbuilder.

O `equipment/` vira `src/data/catalog.equipment.json` e viaja no bundle. O resto
somaria ~32 MB, então não vai no bundle: `scripts/build-lore.mjs` gera um índice
de magias e as condições para o bundle, e um arquivo indexado que o **servidor**
lê sob demanda (`/api/entry/:slug`).

---

## 5. Modelagem dos dados — o ponto crítico

### 5.1 O schema é polimórfico

Cada arquivo tem `type` na raiz e um `system` cujos campos **mudam por tipo**.
Dentro de `equipment/`:

```
equipment 2342 | consumable 1684 | weapon 991 | ammo 204
armor 202 | treasure 153 | shield 115 | backpack 46 | kit 2
```

**Runa não é um `type` do Foundry** — é `equipment` com `system.usage.value`
começando em `etched-onto` (`etched-onto-a-weapon`, `etched-onto-armor`,
`etched-onto-a-shield`...). O app separa isso numa categoria própria (`rune`,
176 itens) pra não misturar com baú, kit, óculos e o resto que também é
`equipment`. Ver `readCategory` em `src/lib/foundryImport.js`.

Campos de `system` por tipo (levantamento real):

- **shield**: `acBonus`, `hardness`, `hp{max,value}`, `speedPenalty`, `runes`,
  `specific`, `subitems`, `material`, `grade`, `baseItem`
- **weapon**: `damage`, `group`, `category`, `range`, `reload`, `bonus`,
  `bonusDamage`, `splashDamage`, `meleeUsage`, `ammo`, `expend`, `staff`, `apex`
- **armor**: `acBonus`, `dexCap`, `checkPenalty`, `speedPenalty`, `strength`,
  `group`, `category`
- **consumable**: `uses{max,value,autoDestroy}`, `spell`, `usage`, `damage`

Comuns a quase todos: `bulk`, `level`, `price`, `traits`, `description`,
`publication`, `size`, `rules`.

### 5.2 Preservar TUDO

**Quero todos os dados pertinentes de cada item, inclusive os que aparentemente
não serão usados agora.** Escudo tem que trazer `hardness`, `hp.max` e o **BT**.
Outros tipos trazem outros campos. Nada de achatar num denominador comum.

**O livro de origem é obrigatório.** `system.publication`:

```json
"publication": {
  "license": "ORC",
  "remaster": true,
  "title": "Pathfinder Player Core"
}
```

Vai ser usado no futuro (filtrar por livros que eu possuo, remaster vs legacy).
**Persistir integralmente.**

#### Estratégia

Tabela `items` com colunas normalizadas para o que é comum e consultável
(`id`, `name`, `slug`, `type`, `level`, `price_cp`, `bulk`, `rarity`,
`source_title`, `source_license`, `is_remaster`, `img`), **mais `raw_json` com o
`system` inteiro serializado**. Nada se perde, e campos específicos de tipo
podem virar colunas indexadas depois sem re-ingerir.

O protótipo já normaliza preço em cobre — manter, e mapear `price` do Foundry
(objeto com `pp`/`gp`/`sp`/`cp`) para `price_cp` na ingestão.

### 5.3 BT é derivado, não existe no JSON

Confirmado em `steel-shield.json`: `hardness: 5`, `hp.max: 20`, e a tabela HTML
da descrição mostra BT 10 — mas **não há campo `bt`**.

Regra: `BT = floor(hp.max / 2)`. Calcular na ingestão e gravar como coluna.
**Não fazer parsing do HTML** para extrair isso.

### 5.4 Traços vêm de outro arquivo

Os itens guardam só **slugs**:

```json
"traits": { "rarity": "uncommon", "value": ["consumable", "gadget"] }
```

Nomes e descrições estão em **`static/lang/en.json`**, sob `PF2E`:

- `PF2E.TraitAgile` → `"Agile"`
- `PF2E.TraitDescriptionAgile` → texto da regra

Reais: **1.435** chaves `Trait*`, **532** `TraitDescription*` (nem todo traço
tem descrição). Conversão slug → chave: `agile` → `TraitAgile`,
`two-hand-d10` → `TraitTwoHandD10` (kebab → Pascal). **Validar contra a lista
real e logar os slugs que não resolverem** — não falhar em silêncio.

Criar tabelas `traits` e `item_traits` (N:N). Isso alimenta o popup de trait
clicável que já existe no protótipo.

### 5.5 Descrições têm sintaxe do Foundry

Exemplo real:

```html
<p>You gain a +1 circumstance bonus to checks to [[/act make-an-impression]].
You gain the @UUID[Compendium.pf2e.actionspf2e.Item.Set Free] reaction.</p>
```

Sanitizar na ingestão: `@UUID[...]`, `[[/act ...]]`, `[[/r ...]]`,
`@Damage[...]`, `@Check[...]` → texto legível. Manter
`<table class="pf2e remaster">` (renderiza bem).

Guardar **duas versões**: `description_html` (original intacto) e
`description_text` (limpo, para busca). Nunca destruir o original.

### 5.6 Ignorar `system.rules`

É o motor de automação do Foundry. Complexo e desnecessário aqui. Fica dentro
do `raw_json`, sem interpretação.

### 5.7 Casos de borda do importador

O importador atual é frágil. Tratar: traits ausentes, `bulk` como `"L"` ou
`"—"` (negligible), preços variantes, itens com runas e variantes, containers
(`backpack`), `subitems`.

---

## 6. Sincronização em tempo real — **feito**

O servidor no PC do mestre é o **dono único** da mesa. Cada celular é uma tela:
despacha a ação, o servidor aplica e devolve o resultado para todos. Ninguém
aplica nada sozinho, então não existe aparelho com a contagem errada.

Compartilhado (mora no servidor): jogadores com carteira e mochila, itens de
campanha, lojas, filtro de conteúdo e o histórico.
Do aparelho (mora no `localStorage` de cada um): em qual personagem se está
olhando, em qual loja, e o carrinho. Se fossem compartilhados, trocar de
personagem num celular trocaria a tela de todos e dois jogadores dividiriam o
mesmo carrinho.

Protocolo: `action` do celular para o servidor (com confirmação), `table:full`
na conexão e `table:patch` com só as fatias que mudaram, numerados em sequência
— número fora de ordem faz o celular pedir a mesa inteira de novo.

Persistência em **arquivo JSON** (`data/mesa.json`), gravado de forma atômica
com cópia de segurança. Não virou SQLite: o dado mutável de uma mesa são dezenas
de KB, o catálogo de 5.700 itens já vem pronto no bundle, e módulo nativo seria
risco de `npm install` que não compila.

**Sem papéis e sem login**, por decisão: é uma mesa de amigos. Qualquer aparelho
troca de personagem, edita qualquer um e abre a aba Mestre. O histórico registra
de qual celular veio cada alteração ("por Ezren"), que é o que resolve na
prática — saber quem mexeu, não impedir.

---

## 7. Roadmap

**Fase 1 — Fundação** ✔
Quebrar o componente de ~2000 linhas em arquivos. Sair da moldura de iPhone
para layout responsivo Android. Persistência local mínima. Preservar a UI.

**Fase 2 — Ingestão** ✔
`scripts/build-catalog.mjs` e `scripts/build-traits.mjs` leem os packs,
sanitizam e geram o catálogo que vai junto com o app. Não virou banco: o
catálogo é imutável, então ser um arquivo pronto é mais simples e mais rápido.

**Fase 3 — Servidor** ✔
Express + Socket.IO, mesa compartilhada em tempo real, persistência em arquivo.
Sem papéis, por decisão (ver seção 6). Falta ainda a API de busca e filtro no
servidor — hoje o catálogo inteiro vai no bundle e a busca é no próprio celular,
o que funciona bem e evita uma ida à rede por tecla digitada.

**Fase 4 — PWA**
Manifest, service worker, cache offline para "Adicionar à tela inicial".
(O IP da LAN e o QR code já saem no `npm start`.)

**Fase 5 — Regras e economia**
Cálculo de Bulk conforme as regras (com limite de carga), estoque finito nas
lojas, preço de compra vs venda diferenciado (**conferir: hoje a venda parece
devolver o valor cheio**), histórico de transações com desfazer, divisão de
tesouro entre o grupo.

**Fase 6 — Futuro**
Ícones/imagens de item, filtro por livros que eu possuo (daí a importância do
`publication`), exportação JSON/PDF, i18n.

**Ficha de personagem — em andamento**
Importação do JSON do Pathbuilder, motor de cálculo e as cinco sub-abas. Tem
roadmap próprio, em treze fases: [docs/ficha/README.md](docs/ficha/README.md).
A espec é [docs/ESPEC_Ficha.md](docs/ESPEC_Ficha.md).

---

## 8. Convenções

- Comentários e commits em português; nomes de código em inglês.
- Dados do PF2e ficam em inglês no banco — não bloquear tradução futura no schema.
- Na interface, **moldura nossa é traduzida** (categoria, botão, mensagem);
  **dado do pack não é** (nome de item, ficha técnica, traço).
- `npm run dev` com hot reload; **testar em celular Android real na LAN** antes
  de considerar qualquer coisa pronta.
- Não commitar `vendor/` nem os packs baixados.

### Sistema visual

Cor, tipografia, botões, espaçamento e ordem das ações são regidos por
**[docs/design-system.md](docs/design-system.md)**, e as regras que valem em toda
sessão de código estão no **[CLAUDE.md](CLAUDE.md)**.

A regra que resume as outras: **nenhum valor visual literal fora de
`src/styles/tokens.css`** — sem tamanho de fonte solto, sem `#hex`, sem raio
cravado, sem `style={{}}` de aparência. Foi assim que o projeto acumulou 12
tamanhos de fonte e 8 cinzas de texto para os mesmos poucos papéis.

## 9. Licenciamento

Dados do PF2e usados sob a **Paizo Community Use Policy** e **ORC / OGL 1.0a**
conforme cada item (`publication.license` indica qual). Uso pessoal e não
comercial. Preservar campos de licença e atribuição na ingestão — é requisito
das licenças, não só zelo.

---

## 10. Como rodar

Precisa do [Node.js](https://nodejs.org) instalado no PC. Uma vez só:

```bash
npm install
```

### Na mesa

Um comando, no PC que vai ficar ligado durante a sessão:

```bash
npm start
```

O terminal imprime o endereço e um **QR code**. Os jogadores apontam a câmera do
celular para ele, ou digitam no Chrome o endereço que começa com
`http://192.168.` — todo mundo no mesmo Wi-Fi.

Na primeira vez o Windows pergunta se libera o Node.js na rede: **aceite em
"redes privadas"**, senão os celulares não enxergam o PC.

A mesa fica salva em `data/mesa.json`, no PC. `Ctrl+C` encerra sem perder nada,
e `npm start` de novo continua de onde parou. Se algum dia o arquivo corromper,
existe um `data/mesa.bak.json` com a versão anterior.

Enquanto o servidor estiver no ar, o que um aparelho faz aparece nos outros na
hora. Se o Wi-Fi cair, o celular avisa em vermelho e para de aceitar alterações
até voltar — melhor não acontecer nada do que um item que some sozinho depois.

### Para mexer no código

```bash
npm run dev          # o mesmo endereço, com recarga automática ao salvar
npm test             # testes (node --test nativo, sem dependência nova)
npm run smoke        # prova que a sincronização entre dois aparelhos funciona
npm run lint:visual  # guarda da identidade visual (roda dentro do build)
npm run build        # confere a identidade visual e compila
```

Enquanto a ficha está sendo construída, `test/sheet.test.js` **falha de
propósito**: é o gabarito do motor de cálculo, escrito antes do motor, conferido
à mão contra o export do Pathbuilder. Ele fica vermelho até a fase 5 e é assim
que tem que ser. `test/pathbuilder.test.js` tem que estar sempre verde.

O `lint:visual` reclama de cor crua, tamanho de fonte cravado e `style={{}}` de
aparência em qualquer lugar fora de `src/styles/tokens.css`. As doze violações
que já existiam quando ele nasceu estão congeladas em
`scripts/visual-baseline.json` — essa lista só encolhe, e violação nova trava o
build.

### Estrutura

```
CLAUDE.md             regras obrigatórias de código e de estilo
docs/
  design-system.md    cor, tipografia, componentes, ordem das ações
  ESPEC_Ficha.md      a espec da ficha de personagem
  ficha/              uma fase por arquivo, do 0 ao 12
  design/             o protótipo do Claude Design, como veio
  fixtures/           JSON do Pathbuilder usado nos testes
server/
  index.js            Express + Socket.IO, serve o app e imprime o QR
  table.js            a mesa: estado autoritativo, ordem das ações, patches
  storage.js          data/mesa.json — gravação atômica com backup
  net.js              endereço da LAN e o QR code do terminal
scripts/
  dev.mjs             sobe Vite e servidor juntos
  smoke-sync.mjs      dois clientes de mentira provando a sincronização
  build-catalog.mjs   gera o catálogo a partir dos packs do Foundry
  build-lore.mjs      feats, magias, ações, condições e o Punho
  build-traits.mjs    nomes e descrições de traço, do en.json oficial
  vendor-pf2e.mjs     onde estão os packs, e o recado quando não estão
  lint-visual.mjs     guarda da identidade visual, roda dentro do build
server/
  entries.js          lê um verbete por offset, sem carregar os 15 MB
src/
  main.jsx            entrada
  App.jsx             abas e navegação
  config.js           taxa de venda e chave de armazenamento
  data/               catálogo e verbetes de traços, já prontos
  lib/                moeda, bulk, itens, importador do Foundry, texto
  state/              regras da mesa (rodam no servidor), sessão e a
                      ponte com o servidor (store.jsx)
  components/         peças reutilizadas pelas telas
  screens/            Inventário, Ficha, Loja, Mestre
                      (a Biblioteca é tela filha do Mestre)
  styles/             tokens e folhas de estilo
```
