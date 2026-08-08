# PF2e Tunado — Party Treasure

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

## 1. Estado atual: protótipo do Claude Design

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

---

## 2. Escopo

### Dentro do escopo

Inventário, dinheiro, lojas, biblioteca de itens, papéis mestre/jogador.

### Fora do escopo — não implementar

**HP, iniciativa, condições, combate, fichas de personagem, magias, feats,
classes, ancestralidades, bestiário.** Este app é sobre **tesouro e economia**.

Se surgir uma ideia fora disso, anote como sugestão e siga em frente — não
implemente por conta própria.

---

## 3. Arquitetura alvo

```
┌─────────────────────────────────┐
│  PC do Mestre (servidor)        │
│  Node.js + Express + Socket.IO  │
│  ├── serve o frontend           │
│  ├── WebSocket: estado da mesa  │
│  └── SQLite: itens + campanha   │
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
| Banco | SQLite (`better-sqlite3`) |
| Ingestão | script Node standalone (`npm run ingest`) |

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

`vendor/` vai no `.gitignore`. Versionado é o **script de ingestão** (e
opcionalmente o `.sqlite` gerado, se couber).

### Packs relevantes para este app

| Pasta | Conteúdo | Qtd |
|---|---|---|
| `equipment/` | itens, armas, armaduras, escudos, consumíveis | ~5.700 |
| `conditions/` | condições (só para descrever traits/efeitos de item) | 43 |

**Ignorar** `feats/`, `spells/`, `classes/`, bestiários — fora do escopo.

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

## 6. Sincronização em tempo real

Estado compartilhado via Socket.IO:

- Inventário e carteira de cada jogador
- Itens de campanha e catálogo
- Estoque e composição das lojas
- Log de transações

Modelo: estado em memória no servidor, broadcast a cada mudança, persistência
em SQLite para sobreviver a restart.

**Papéis reais**: hoje a aba "Mestre" é só uma tela que qualquer um abre.
Precisa de separação de verdade — o mestre entra por um caminho distinto
(URL/PIN simples), o jogador escolhe seu personagem ao entrar e só enxerga o
próprio inventário. Sem login formal: é a minha mesa.

---

## 7. Roadmap

**Fase 1 — Fundação**
Quebrar o componente de ~2000 linhas em arquivos. Sair da moldura de iPhone
para layout responsivo Android. Persistência local mínima. Preservar a UI.

**Fase 2 — Ingestão**
Script idempotente (`npm run ingest`) que lê os packs, sanitiza e popula o
SQLite. Reportar contagens por tipo ao final.

**Fase 3 — Servidor**
Express + Socket.IO, estado compartilhado, papéis mestre/jogador, API de busca
e filtro (tipo, nível, traço, fonte).

**Fase 4 — PWA**
Manifest, service worker, cache offline. Script de start que imprime o IP da
LAN e um QR code para os jogadores escanearem.

**Fase 5 — Regras e economia**
Cálculo de Bulk conforme as regras (com limite de carga), estoque finito nas
lojas, preço de compra vs venda diferenciado (**conferir: hoje a venda parece
devolver o valor cheio**), histórico de transações com desfazer, divisão de
tesouro entre o grupo.

**Fase 6 — Futuro**
Ícones/imagens de item, filtro por livros que eu possuo (daí a importância do
`publication`), exportação JSON/PDF, i18n.

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

## 10. Como rodar (estado atual — Fase 1)

Precisa do [Node.js](https://nodejs.org) instalado no PC. Uma vez só:

```bash
npm install
```

Para usar na mesa:

```bash
npm run dev
```

O terminal imprime dois endereços. O que começa com `http://192.168.` é o que
os jogadores digitam no Chrome do celular, com todo mundo no mesmo Wi-Fi.

Os dados ficam salvos no navegador de cada aparelho (Fase 1 ainda não tem
servidor). Limpar os dados do site zera a mesa e volta aos personagens de
exemplo.

### Estrutura

```
CLAUDE.md             regras obrigatórias de código e de estilo
docs/
  design-system.md    cor, tipografia, componentes, ordem das ações
src/
  main.jsx            entrada
  App.jsx             abas e navegação
  config.js           taxa de venda e chave de armazenamento
  data/               catálogo semente e verbetes de traços
  lib/                moeda, bulk, itens, importador do Foundry, texto
  state/              estado da mesa (reducer + contexto + persistência)
  components/         peças reutilizadas pelas telas
  screens/            Inventário, Loja, Biblioteca, Mestre
  styles/             tokens e folhas de estilo
```
