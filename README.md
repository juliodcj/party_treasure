# PF2e — Party Treasure

**Ficha de personagem de Pathfinder 2e importada do Pathbuilder 2e, com gestor
de condições e gestor de inventário, para uma mesa presencial.** O mestre roda o
servidor no PC; cada jogador abre no navegador do celular, na mesma rede — ou de
longe, por um Cloudflare Tunnel.

A ficha calcula o que se lê na mesa (CA, ataques, dano, salvamentos, perícias) a
partir do que o personagem está vestindo agora. As condições valem para todos os
aparelhos. O inventário, o dinheiro e as lojas continuam onde sempre estiveram.

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

Criar `.gitignore` cobrindo: `node_modules/`, `vendor/`, `dist/`, `.env`,
`.DS_Store`, `data/` (a sua mesa) e `server/data/` (o corpus gerado).

---

## 1. De onde o projeto saiu

*(Um parágrafo de contexto. Nada aqui descreve o programa de hoje.)*

Isto começou como um protótipo do Claude Design: um componente React único de
~2000 linhas, com estado no próprio componente, estilos inline, sem servidor,
sem persistência, travado numa moldura fixa de iPhone. Dele ficaram a aparência
e os fluxos, que eram o que estava certo. Todo o resto foi refeito: arquivos
separados, tokens de estilo, servidor dono do estado, catálogo real dos packs do
Foundry e, por último, a ficha de personagem. O protótipo saiu do repositório
depois de cumprir o papel de referência de layout.

O que o programa faz hoje está nas seções 2 a 8. A árvore de arquivos, no fim.

---

## 2. Escopo

Este programa **não é um character builder**. É uma ficha melhorada do
Pathbuilder, com gestão de inventário, loja e ações do mestre. Quem constrói
o personagem é o Pathbuilder; subir de nível é reimportar.

### Dentro do escopo

**A ficha de personagem** importada do Pathbuilder 2e — atributos, CA, HP,
salvamentos, percepção, perícias, DC de classe, conjuração, ataques e dano
montados a partir do que o personagem está vestindo e empunhando —, o **gestor
de condições**, e o **inventário, dinheiro, lojas e biblioteca de itens** que já
existiam. Texto de regra vindo dos packs do Foundry, nunca escrito à mão.

Tudo que a ficha do Pathbuilder traz é dado de ficha, e portanto escopo. Vale
distinguir o que a interface **usa em cálculo ou exibe** do que ela apenas
**guarda no import** — a seção 6.2 detalha campo por campo.

A ficha entra colando o JSON do Pathbuilder (*Export to Foundry VTT*) na tela do
Mestre. Personagem sem ficha continua funcionando como sempre: carteira e
inventário, sem cálculo e sem controle de equipar.

Como a ficha funciona: seção 6. Espec completa:
[docs/ESPEC_Ficha.md](docs/ESPEC_Ficha.md).

### As quatro abas, e o que cada uma faz

*(Descrição do programa de hoje, não do protótipo.)*

**Inventário** — seletor de personagem em chips; lista agrupada por categoria
real do PF2e (arma, armadura, escudo, consumível, equipamento…); busca e filtro
por tipo e nível; item expansível com traços clicáveis que abrem a descrição
oficial; `+`/`−` na quantidade (edição livre, não mexe na carteira — comprar é na
Loja, vender é o botão dedicado); excluir; vender; enviar item a outro
personagem; editar item avulso; adicionar item manual ou do catálogo. Quem tem
ficha ainda equipa armadura, escudo e armas daqui, e define modificador manual
por item.

**Carteira**, no cabeçalho — ajuste de moedas, envio de dinheiro a outro
personagem e "Simplificar moedas". Toda quantia circula em cobre
(`1 po = 10 pp = 100 pc`) e aparece como o número mais o pontinho da denominação.

**Ficha** — cinco sub-abas. Seção 6.

**Loja** — dropdown de loja; itens registrados com stepper de carrinho; a compra
valida o saldo **no servidor**, debita e entrega no inventário. O carrinho é de
cada aparelho, então dois jogadores compram ao mesmo tempo sem se atrapalhar.

**Biblioteca** (tela filha do Mestre, não é aba) — itens de campanha e catálogo
em pastas colapsáveis com busca; criar item manual; **importador de JSON dos
packs do Foundry** (cola o texto e ele converte nome, nível, preço, bulk, traços
e descrição); editar e excluir.

**Mestre** — jogadores com carteira; dar moedas a um ou distribuir ao grupo; dar
item; adicionar e renomear jogadores; cadastrar e remover itens nas lojas;
vincular, atualizar ou remover ficha; aplicar condição; e o "Reverter" do
histórico.

A barra de abas tem **quatro**: Inventário · Ficha · Loja · Mestre.

### Fora do escopo — não implementar

**Iniciativa, combate e bestiário.** A lista é essa, e é completa.

Se surgir uma ideia fora disso, anote como sugestão e siga em frente — não
implemente por conta própria.

Quem constrói o personagem continua sendo o Pathbuilder: este app não escolhe
feat, não distribui atributo e não sobe de nível — subir de nível é reimportar.
Isso não é uma proibição de escopo, é uma consequência de a ficha ser importada.

---

## 3. Arquitetura

```
┌─────────────────────────────────────────────────┐
│  PC do Mestre — e SÓ o PC do Mestre             │
│  Node.js + Express + Socket.IO                  │
│  ├── serve o frontend                           │
│  ├── WebSocket: estado da mesa                  │
│  ├── data/mesa.json: a mesa                     │
│  │     jogadores (carteira, mochila, FICHA,     │
│  │     HP, CONDIÇÕES, equipado, favoritas),     │
│  │     itens de campanha, lojas, histórico      │
│  └── server/data/: o corpus do Foundry          │
│        descrição de feat, magia, ação, condição │
└───────────┬───────────────────────┬─────────────┘
            │                       │
   Wi-Fi local                Cloudflare Tunnel
   192.168.x.x:3000           (mesa a distância)
            │                       │
     ┌──────┴──────┐           ┌────┴────┐
     ▼             ▼           ▼         ▼
  Android      Android     Android (fora de casa)
  (jogador)    (mestre)    (jogador)
     └── localStorage do aparelho: personagem em
         foco, loja atual, carrinho — e nada mais
```

O servidor roda **no PC**, nunca num celular. Isso foi decidido em 13/08 e
simplifica a vida: memória e disco ali são baratos, então o corpus inteiro do
Foundry fica no servidor sem economia nenhuma.

Os celulares são só tela. Na mesa presencial eles entram pelo Wi-Fi; quando
alguém joga de fora, entram por um **Cloudflare Tunnel** apontando para o mesmo
processo.

**Onde a ficha mora.** A ficha importada é campo do jogador dentro da mesa
(`player.sheet`), no servidor, e por isso é igual em todos os aparelhos. O mesmo
vale para o que acontece com o personagem — HP, HP temporário, condições, escudo
erguido, pontos de foco, magias preparadas, favoritas (`player.vitals`) — e para
o que ele está vestindo (`player.gear`) e os modificadores manuais
(`player.itemMods`).

**O que o servidor NÃO guarda:** os números calculados. CA, ataque, dano,
salvamentos e perícias não existem em `mesa.json` — saem de `buildSheet()` a cada
render, do que está vestido e das condições ativas agora. HP é fato de mesa e
persiste; CA é cálculo e se refaz. Na dúvida, o critério é: foi **decidido** ou
foi **derivado**?

### Requisitos não-negociáveis

- **O celular não instala nada e não guarda a mesa.** Toda a verdade está no PC.
- **Zero custo / zero nuvem para os dados.** Sem Firebase, Supabase, Auth0. O
  Cloudflare Tunnel é só um cano até o seu PC — a mesa continua sendo um arquivo
  no seu disco.
- **Sem internet, a mesa presencial continua funcionando** pelo Wi-Fi local. O
  túnel é o extra, não a base.
- **Jogador não instala nada.** Abre a URL no Chrome — a do Wi-Fi ou a do
  túnel. PWA (manifest + service worker) para "Adicionar à tela inicial".
- **Mobile-first Android**, retrato. Mestre pode usar tela maior.

### Stack

| Camada | Escolha |
|---|---|
| Frontend | React (do protótipo), refatorado em arquivos |
| Servidor | Node.js + Express |
| Tempo real | Socket.IO |
| Persistência | arquivo JSON atômico (`data/mesa.json`) — ver seção 7 |
| Ingestão | scripts Node standalone que geram `src/data/` |

Nenhuma dependência nativa em lugar nenhum: `npm install` não tem como pedir
compilador no PC do mestre.

---

## 4. Fonte de dados: `foundryvtt/pf2e`

`https://github.com/foundryvtt/pf2e` — dataset mais completo disponível,
mantido pela comunidade com acordo entre Foundry Gaming e Paizo.

O catálogo é o **completo de equipamentos**: 5.739 itens, não uma seleção.

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
| `server/data/entries.bin` (15 MB) | 10.205 verbetes com descrição completa. Não vai no bundle porque atravessaria a internet a cada celular que abre o app — e no PC ele é barato: o servidor lê por offset e guarda em memória o que já leu |
| `server/data/entries.idx.json` (1,3 MB) | `slug → [offset, tamanho]`; o servidor lê um verbete por vez com `fs.read`, sem carregar o arquivo |

O servidor expõe `GET /api/entry/:ref` e `GET /api/entries?slugs=…` ou `?names=…`.
Sem a ingestão, essas rotas respondem 503 dizendo o que rodar — **o resto do app
funciona igual**, porque inventário, loja e carteira não dependem do corpus.

`vendor/` vai no `.gitignore`, e `server/data/` também — o corpus tem 15 MB e é
derivado. Versionado é o **script de ingestão** mais o que ele gera em
`src/data/`, que precisa ir no bundle.

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

É o motor de automação do Foundry — seletores, predicados e sintaxe própria.
Interpretar aquilo aqui seria escrever meio Foundry. Fica guardado no campo `raw`
do item, sem interpretação.

É essa decisão que explica por que só **oito** condições têm efeito automático
(seção 6.6): o efeito das outras está em `system.rules`, e o app prefere mostrar
a descrição oficial e deixar o jogador aplicar a regra a fingir que calcula.

### 5.7 Casos de borda do importador

Tratados: traços ausentes, `bulk` como `"L"` ou `"—"` (negligible), preço em
formatos variantes, runas (categoria própria, derivada do `usage`
`etched-onto-*`), containers (`backpack`) e `subitems`. `lib/bulk.js` e
`lib/foundryImport.js` são onde isso vive.

### 5.8 As estruturas que a ficha trouxe

A ficha acrescentou cinco campos a cada jogador na mesa. Todos nascem vazios,
para personagem sem ficha ser caso de primeira classe e não estado de transição.

| Campo | O que guarda |
|---|---|
| `sheet` | a ficha importada, ou **`null`**. Todo código que a lê trata o nulo. |
| `vitals` | o que está acontecendo com o personagem: `hp`, `tempHp`, `conditions`, `focusPoints`, `shieldHp`, `shieldRaised`, `slotsUsed`, `preparedSpells`, `extraSpells`, `bookSpells`, `forgottenSpells`, `extraFocusSpells`, `forgottenFocusSpells`, `favorites` |
| `gear` | os slots do que está vestido: `wornArmorId`, `heldShieldId`, `equippedWeaponIds[]` |
| `itemMods` | por item, a lista de modificadores manuais `{ label, atk, dmg, extraDice }` |
| `statMods` | por número da ficha, a lista de modificadores manuais `{ label, target, value, enabled }` |

Três detalhes que são decisão, não descuido:

- **`hp: null` de propósito.** Sem ficha não existe HP máximo, e zero seria
  mentira — um personagem sem ficha não está morrendo. Quem importa ficha recebe
  `hp = sheet.hpMax` na hora.
- **`vitals`, `gear`, `itemMods` e `statMods` sobrevivem** à reimportação e até
  à remoção da ficha. São fato de mesa: o que a pessoa está vestindo, o que o
  mestre concedeu e o modificador que ela declarou não se perdem porque a ficha
  foi trocada.
- **Slots nomeados, não uma marca `equipped` em cada item.** Com slot, "duas
  armaduras vestidas ao mesmo tempo" não é um estado representável.

`itemMods` tem uma limitação aceita: `player.items` é `{ id: quantidade }`, não
instâncias, então o modificador vale para a pilha inteira — não dá para ter uma
adaga com runa e outra sem. Mudar isso reescreveria compra, venda, transferência
e a Loja.

**Versão do schema: 7.** `state/migrations.js` migra em cadeia da versão de
origem até a atual, e **nunca descarta a mesa** porque um campo mudou de forma.

---

## 6. A ficha de personagem

A ficha é importada, não construída. Quem monta o personagem é o Pathbuilder 2e;
este app lê o export, calcula o que se lê na mesa e deixa o mestre e os jogadores
mexerem no que muda durante a sessão.

### 6.1 Como a ficha entra

Na aba **Mestre**, escolha o personagem → **Vincular ficha**, e cole o JSON que o
Pathbuilder gera em *Export to Foundry VTT*. O texto pode vir com ou sem o
invólucro `{ success, build }`.

O leitor (`src/lib/pathbuilder.js`) **nunca lança exceção**. Ele devolve sempre
uma ficha, com dois campos que dizem como foi: `ok` (havia um `build`
reconhecível?) e `warnings` (tudo que ele não entendeu, em português, para
aparecer na tela da importação). Um export de verdade já produz um aviso — o
Pathbuilder exporta proficiências de Starfinder (`piloting`, `computers`) mesmo
em personagem de Pathfinder, e elas viram:

> Proficiências ignoradas por não serem do PF2e: piloting, computers.

Campo em branco no Pathbuilder chega como o texto `"Not set"`. Isso vira
**ausência**, não a palavra "Not set" na tela.

Reimportar substitui a ficha inteira, mas **não** mexe no que é da mesa: HP,
condições, escudo, o que está vestido e os modificadores manuais sobrevivem à
reimportação e até à remoção da ficha. São fato de mesa, não cálculo.

#### Os itens e as moedas vêm junto — uma vez só

Na **primeira vinculação**, o que estava na mochila e na carteira do Pathbuilder
(`equipment`, `weapons`, `armor`, `money`) entra no inventário do personagem,
**somando** ao que ele já tiver. A tela de conferência lista item por item antes
de confirmar, e a moeda aparece com o desenho de moeda do app — a platina vira
ouro, porque a carteira daqui tem três denominações.

**Atualizar a ficha depois não traz nada disso de novo.** Subir de nível é
reimportar, e reimportar não pode ressuscitar a poção que o grupo bebeu nem
devolver o ouro já gasto: depois da primeira vez, quem manda no inventário é a
mesa. Quem quiser um item novo usa a Loja ou o **Dar item** do mestre.

O nome é casado com o catálogo **exato**, com uma única exceção escrita e
testada: quem vem da lista `armor` também tenta com o sufixo `Armor`, porque o
Pathbuilder grava `"Hide"` onde o catálogo publica `"Hide Armor"`. Nome que não
casa **não é aproximado e não some**: entra como item avulso, com o nome que
veio, sem preço e sem nível, e aparece destacado na conferência. Runa, material,
potência e tamanho não entram no item — viram aviso na leitura, e a resposta
continua sendo o modificador manual (§ ficha). Contêiner também não: bulk está
adiado, e todo item entra direto na mochila.

O que está vestido no Pathbuilder chega **na mochila, não no corpo** — vestir é
ato da mesa, feito na tela do inventário.

### 6.2 O que é lido do export, e o que é ignorado

Levantado do código, campo por campo.

**Lido e usado em cálculo:**

| Campo do export | Para quê |
|---|---|
| `level` | entra em toda proficiência |
| `abilities` | os seis modificadores, base de tudo |
| `proficiencies` | perícias, salvamentos, percepção, armas, armaduras, DC de classe, conjuração |
| `specificProficiencies` | "você é expert em Longsword" — sobrepõe a categoria quando é maior |
| `lores` | perícias de Lore, com o grau |
| `keyability` | o atributo do DC de classe |
| `attributes` | `ancestryhp`, `classhp`, `bonushp`, `bonushpPerLevel` → HP máximo; `speed` + `speedBonus` → deslocamento |
| `spellCasters` + `focus` | tradição, atributo, grau, slots por dia, grimório, preparadas iniciais, magias de foco |

**Lido e exibido, sem entrar em cálculo:** `name`, `class`, `dualClass`,
`ancestry`, `heritage`, `background`, `deity`, `size`/`sizeName`, `languages`,
`resistances`, `feats`, `specials`.

**Lido e entregue uma vez, na primeira vinculação:** `equipment`, `weapons`,
`armor` (viram itens da mochila) e `money` (soma à carteira). Ver logo acima.

**Ignorado de propósito:**

| Campo | Por que não entra |
|---|---|
| `acTotal` | a CA é **calculada** do que está vestido agora; um número pronto ficaria errado no instante em que alguém trocasse de armadura |
| `focusPoints` | é a foto do momento da exportação; a reserva de foco é calculada da lista de magias de foco atual |
| `xp`, `alignment`, `gender`, `age` | nada na tela usa |
| `equipmentContainers` | bulk e contêiner estão adiados; todo item entra direto na mochila, e a leitura avisa |
| `rituals`, `formula`, `pets`, `familiars`, `inventorMods`, `mods` | sem tela que os mostre; se um dia houver, o campo está no export |

`feats` e `specials` chegam só com o nome — o Pathbuilder não exporta descrição.
O texto de regra vem depois, dos packs do Foundry, pelo servidor. Nome que não
resolve **aparece na tela do jeito que veio** e entra em `unresolved`; sumir em
silêncio é o erro que este projeto não aceita.

### 6.3 Os valores calculados, e de onde saem

Tudo isto vive em `src/lib/sheet.js`, numa função pura: entram a ficha, o
inventário, o que está vestido e o que está acontecendo; saem os números. Sem
React, sem rede, sem disco — o que faz o motor testável e igual no celular e no
servidor.

**A regra que manda em tudo: nenhuma função devolve número solto.** Cada
estatística devolve as parcelas rotuladas que somam, mais a marca `altered`
quando alguma parcela veio de condição. Disso saem de graça o popup de
detalhamento, o modificador manual como parcela nomeada, e o número em vermelho
quando uma condição mexeu nele.

| Valor | Fórmula |
|---|---|
| Modificador de atributo | `(valor − 10) / 2`, arredondado para baixo |
| **Proficiência** | `rank === 0 ? 0 : nível + rank` |
| HP máximo | `ancestryhp + (classhp + conMod) × nível + bonushp + bonushpPerLevel × nível` |
| **CA** | `10 + DEX (limitado pelo dexCap da armadura) + proficiência da categoria + bônus da armadura + escudo, se erguido e não quebrado` |
| Salvamentos, Percepção | `modificador do atributo + proficiência` |
| DC de classe | `10 + atributo-chave + proficiência` |
| DC de magia / Ataque de magia | `10 + atributo + proficiência` / `atributo + proficiência` |
| Perícias | `atributo + proficiência + penalidade da armadura (se aplicável)` |
| Ataque | `atributo + proficiência da arma + modificadores manuais` |
| Dano | `dados da arma + atributo + modificadores manuais` |
| MAP | `−5 / −10`, ou `−4 / −8` com o traço `agile` |
| Deslocamento | `speed da ficha + penalidade da armadura (se aplicável)` |
| Reserva de foco | um ponto por magia de foco, no máximo 3 |

Em cima de qualquer linha desta tabela ainda entram os modificadores manuais que
apontam para ela — é o parágrafo abaixo.

**Destreinado não soma o nível.** É o erro mais comum do PF2e: a Arcana de um
personagem de nível 1 e destreinado é +0, não +1. A regra mora num lugar só
(`profBonus`) e vale para perícia, salvamento, arma e armadura.

**Onde o app não sabe, ele admite.** O motor não conhece Rage, Giant Instinct,
weapon specialization nem a interação de feat que só o livro explica. Para isso
existem os modificadores manuais, em dois níveis: o de item (na linha da arma) e
o da ficha — o botão **Adicionar modificador**, no fim da aba Resumo, que põe um
ajuste fixo, positivo ou negativo, em qualquer número: atributo, CA, salvamento,
percepção, deslocamento, PV máximo, DCs e perícias. Ele entra com o rótulo que a
pessoa escreveu e aparece no detalhamento como qualquer outra parcela.
Modificador em atributo vale para tudo que depende dele — perícia, ataque e dano
junto. Os alvos vivem em `src/lib/statMods.js`.

Cada um **liga e desliga pela caixa na lista do Resumo**, como a magia
preparada: desligado continua guardado, com o rótulo e o número, e não entra em
conta nenhuma. É o que a Fúria pede — ela começa e acaba várias vezes por
combate, e apagar para reescrever depois perderia o que já estava escrito.

### 6.4 Como o equipamento entra nos números

O que o personagem está vestindo são **slots nomeados** em `player.gear`:
`wornArmorId`, `heldShieldId` e `equippedWeaponIds`. Com slot, o estado inválido
— duas armaduras vestidas ao mesmo tempo — não é representável.

- **Armadura**: soma o bônus de CA e limita a Destreza pelo `dexCap`. Se o
  personagem não alcança a Força que a armadura pede, a penalidade de teste pesa
  nas perícias de Força e Destreza, e a de deslocamento no movimento. Alcançando,
  nenhuma das duas se aplica.
- **Escudo**: só entra na CA **erguido**, e só se não estiver quebrado. Abaixo do
  Ponto de Ruptura ele quebra e para de dar bônus — erguer escudo quebrado não
  devolve CA. Guardar o escudo na mochila baixa a guarda junto.
- **Armas**: cada arma da mochila vira uma linha de ataque, equipada ou não (as
  equipadas primeiro). De qual atributo sai o ataque e o dano vem dos **traços do
  próprio item**, vindos dos packs: corpo a corpo usa Força, `finesse` usa o
  melhor entre Força e Destreza, à distância usa Destreza no ataque e atributo
  nenhum no dano, `thrown` usa Destreza no ataque e Força no dano, `propulsive`
  soma metade da Força.
- **O Punho** existe sempre, não é item e não está na mochila.

**Item que sai do inventário sai do slot.** Vender, transferir, excluir ou zerar
a quantidade desequipa o item e limpa os modificadores manuais e as favoritas
dele. Slot apontando para item inexistente seria bônus fantasma na CA.

**Onde o app não sabe, ele admite.** O motor não acerta Rage, Giant Instinct,
weapon specialization nem runa. A saída é o **modificador manual**: o jogador
declara rótulo, ataque, dano e dados extra, e aquilo aparece no detalhamento como
qualquer outra parcela. O app não chuta.

### 6.5 HP

HP é **fato de mesa**: persiste em `player.vitals.hp` e todos veem o mesmo
número. Quem não tem ficha não tem HP — `null`, porque zero seria mentira.

- **Dano** come o HP temporário antes do real, e o HP **não passa de zero para
  baixo**: morrendo é a condição Dying, não HP negativo.
- **Cura** não passa do máximo.
- **HP temporário não empilha**: vale o maior entre o que já havia e o novo.
  Definir zero zera.
- **Descanso noturno** repõe foco e slots preparados, cura `conMod × nível` com
  mínimo de 1 por nível, e **reduz Doomed em 1 — Doomed não zera**. Wounded
  desaparece quando o HP volta ao máximo.

### 6.6 O gestor de condições

As **43 condições** do PF2e vêm do pack do Foundry, em inglês, com a descrição
que a Paizo publicou (`src/data/conditions.json`). Nenhum texto de regra é
escrito à mão.

**Oito têm efeito automático.** As outras 35 são marcação e referência: aparecem
no chip, abrem a descrição, e o jogador aplica a regra na mesa. Essa é a fronteira
honesta — o que o app sabe fazer, ele faz; o resto ele mostra e não finge.

| Condição | O que faz nos números |
|---|---|
| **Frightened** *(valor)* | penalidade de status a **todo** teste e **toda** CD, inclusive a CA |
| **Sickened** *(valor)* | idem |
| **Clumsy** *(valor)* | penalidade ao que depende de Destreza: CA, Reflexos, perícias de Destreza |
| **Enfeebled** *(valor)* | penalidade ao que depende de Força, **inclusive o dano** |
| **Drained** *(valor)* | penalidade ao que depende de Constituição: Fortitude |
| **Slowed** *(valor)* | **não muda número nenhum** — tira ações, e ação é coisa de mesa. Fica exposto para a tela avisar |
| **Prone** | −2 de circunstância nas **jogadas de ataque** |
| **Off-Guard** | −2 de circunstância na **CA** |

**Penalidade de status não empilha**: entre Frightened 2 e Sickened 1 vale 2,
nunca 3. É a regra do PF2e e a segunda fonte de erro mais comum, depois da
proficiência.

Penalidade por atributo só atinge o que depende daquele atributo — Clumsy pesa na
CA e nos Reflexos, e não encosta em Atletismo.

Condição em zero **desaparece** do objeto em vez de virar `0`: "Frightened 0" não
é uma condição ativa, é a ausência dela. Condições com valor têm stepper; as
outras são um liga-desliga.

Aplicar condição é ação de mesa, então **vale para todos os aparelhos** — o
mestre marca Frightened 2 no celular dele e o jogador vê o ataque cair para +5 na
hora, em vermelho, com a parcela nomeada no detalhamento.

Encumbered aparece na lista sem efeito de propósito: o cálculo de Bulk foi adiado
(Roadmap, Fase 5), então marcá-la não muda número nenhum — e prometer que muda
seria pior.

### 6.7 As cinco sub-abas

**Resumo** (atributos, defesas com detalhamento por toque, outras estatísticas,
perícias, proficiências, resistências/sentidos/idiomas, HP, condições, escudo e
descanso) · **Ataques** (uma linha por arma, com MAP e modificadores manuais) ·
**Magias** (conjuração preparada com truques, círculos, grimório, foco e lista
especial, mais o compêndio filtrável) · **Feats** · **Ações**.

Quem não conjura **não vê a aba Magias** — não é uma aba vazia, é uma aba que não
existe para aquele personagem.

---

## 7. Sincronização em tempo real

O servidor no PC do mestre é o **dono único** da mesa. Cada celular é uma tela:
despacha a ação, o servidor aplica e devolve o resultado para todos. Ninguém
aplica nada sozinho, então não existe aparelho com a contagem errada.

Compartilhado (mora no servidor): jogadores com carteira e mochila, **a ficha
importada, o HP, o HP temporário, as condições, o escudo erguido, os pontos de
foco, as magias preparadas e as favoritas**, o que cada um está vestindo e os
modificadores manuais, mais os itens de campanha, as lojas, o filtro de conteúdo
e o histórico.

Do aparelho (mora no `localStorage` de cada um): em qual personagem se está
olhando, em qual loja, e o carrinho. Se fossem compartilhados, trocar de
personagem num celular trocaria a tela de todos e dois jogadores dividiriam o
mesmo carrinho.

**Na prática, com a ficha:** o mestre aplica 7 de dano no celular dele e o HP cai
nos outros aparelhos no mesmo instante. Marca Frightened 2, e a CA, os
salvamentos e os ataques daquele personagem caem em todas as telas, em vermelho,
com a parcela nomeada no detalhamento. Equipar armadura, erguer escudo, preparar
magia, gastar foco, descansar — tudo é ação de mesa e vale para todos.

**Ninguém aplica condição "só no meu celular".** Isso é de propósito: numa mesa
presencial, uma condição que só um aparelho vê é pior que condição nenhuma. O que
é ponto de vista fica no aparelho; o que é fato do personagem, na mesa.

**Os números calculados não viajam.** O servidor manda o que mudou — HP,
condições, o que está vestido — e cada aparelho recalcula CA, ataque e dano com o
mesmo `buildSheet()`. É a mesma função nos dois lados, então não há como dois
celulares discordarem sobre a CA.

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

## 8. Roadmap

Conferido fase por fase contra o código, não contra a memória.

### O que está feito

| | Entrega |
|---|---|
| **Fundação** ✔ | O componente de ~2000 linhas virou arquivos; a moldura de iPhone virou layout responsivo Android; a aparência e os fluxos do protótipo foram preservados. |
| **Ingestão** ✔ | `build-catalog.mjs`, `build-traits.mjs` e `build-lore.mjs` leem os packs do Foundry, sanitizam e geram `src/data/`. Não virou banco: o catálogo é imutável, então arquivo pronto é mais simples e mais rápido. |
| **Servidor** ✔ | Express + Socket.IO, mesa compartilhada em tempo real, persistência em arquivo JSON atômico com backup. Sem papéis, por decisão (seção 7). |
| **Ficha de personagem** ✔ | Importação do JSON do Pathbuilder, motor de cálculo (`lib/sheet.js`) e as cinco sub-abas: Resumo, Ataques, Magias, Feats e Ações. Detalhe na seção 6. |
| **Gestor de condições** ✔ | As 43 condições do pack, 8 com efeito automático nos números, compartilhadas por todos os aparelhos. Seção 6.6. |
| **HP** ✔ | Dano, cura, HP temporário e descanso noturno, com as regras das pontas (seção 6.5). |
| **Histórico com desfazer** ✔ | O mestre reverte uma alteração perigosa, ou até ela. `UNDO_TO`, na aba Mestre. |
| **Divisão de tesouro** ✔ | "Distribuir" divide a quantia igualmente entre os jogadores. |
| **Preço de venda** ✔ | Vender devolve **metade** do preço (`SELL_RATE`), que é a regra do PF2e — no reducer, na tela de confirmação e na Loja. *(O alerta antigo "a venda parece devolver o valor cheio" era infundado: foi conferido e está correto.)* |
| **Filtro por livros** ✔ | Filtro de conteúdo por livro que o mestre possui e por remaster/legado, persistido na mesa. |
| **Compêndio de magias** ✔ | 1.993 magias navegáveis offline, filtráveis por tradição, círculo e conteúdo. |

### O que falta

**PWA** — manifest e service worker para "Adicionar à tela inicial" e cache
offline. Não existe nada disso ainda; o que já funciona é o IP da LAN e o QR code
saindo no `npm start`.

**Bulk conforme as regras** — o cálculo por item existe (`lib/bulk.js`, usado para
exibir o Bulk de cada item), mas **não há soma carregada nem limite de carga na
tela**. É por isso que a condição Encumbered está na lista sem efeito.

**Estoque finito nas lojas** — hoje uma loja é uma lista de itens
(`shop.itemIds`), sem quantidade: comprar não esgota.

**Conjuração espontânea e inata** — a aba Magias cobre conjuração **preparada**.
Espontânea ou inata mostra a lista de magias conhecidas em modo leitura, porque
nenhum export real desse tipo foi testado. Não é limitação de projeto, é a regra
de zero placeholder: sem fixture de verdade, não se implementa por adivinhação.

**Ideias sem data** — ícones e imagens de item, exportação JSON/PDF, i18n,
descanso do grupo numa ação só.

---

## 9. Convenções

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

## 10. Licenciamento

Dados do PF2e usados sob a **Paizo Community Use Policy** e **ORC / OGL 1.0a**
conforme cada item (`publication.license` indica qual). Uso pessoal e não
comercial. Preservar campos de licença e atribuição na ingestão — é requisito
das licenças, não só zelo.

---

## 11. Como rodar

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

Toda vez que a mesa **fecha** — o `Ctrl+C` do fim da sessão, ou uma mesa
importada substituindo a que estava aqui — fica também uma cópia datada em
`data/backups/mesa-AAAA-MM-DDThh-mm-ss.json`. O `.bak` só cobre queda de energia
no meio da gravação (ele é sempre a versão de uma gravação atrás); a pasta
`backups/` é a que ainda tem a mesa da sessão passada quando o problema só
aparece na semana seguinte. Nada é apagado de lá automaticamente.

Pela engrenagem da aba **Mestre** dá para **exportar a mesa** para um arquivo
JSON e **importar** um de volta — é o mesmo formato do `data/mesa.json`, e serve
tanto de backup manual quanto de mudança de PC. Importar substitui a mesa de
todo mundo, então pede confirmação e deixa antes o backup datado.

Enquanto o servidor estiver no ar, o que um aparelho faz aparece nos outros na
hora. Se o Wi-Fi cair, o celular avisa em vermelho e para de aceitar alterações
até voltar — melhor não acontecer nada do que um item que some sozinho depois.

### Quando alguém joga de fora (Cloudflare Tunnel)

O mesmo `npm start`, mais um cano da Cloudflare até o seu PC. Nada muda no app,
e a mesa continua sendo um arquivo no seu disco:

```bash
cloudflared tunnel --url http://localhost:3000
```

O comando imprime um endereço `https://…trycloudflare.com`. Quem abrir esse
endereço vê a mesma mesa que quem está na sala.

O WebSocket atravessa o túnel sem configuração extra — a Cloudflare faz o
upgrade de protocolo sozinha.

> **Leia antes de mandar o link.** O app **não tem login nem papéis**: foi feito
> assim de propósito, para uma mesa de amigos numa rede fechada (seção 7). Com o
> túnel no ar, **qualquer pessoa com o endereço mexe na mesa** — dá dinheiro,
> apaga item, troca ficha. O histórico registra o que aconteceu, mas não impede.
>
> Na prática: ligue o túnel só durante a sessão e desligue depois. Se um dia a
> mesa ficar exposta de forma permanente, o certo é pôr o Cloudflare Access na
> frente (autenticação por e-mail, de graça no plano gratuito) — é uma
> configuração do túnel, não do app.

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

Depois da limpeza, arquivo por arquivo.

```
README.md               este arquivo
CLAUDE.md               regras obrigatórias de código e de estilo
index.html              a página única; o ícone vai embutido nela
vite.config.js          porta 3000, host na LAN, proxy do WebSocket
package.json            scripts e as 8 dependências
tunel.bat               atalho do Cloudflare Tunnel, para jogo a distância

docs/
  design-system.md      cor, tipografia, componentes, ordem das ações
  ESPEC_Ficha.md        a espec da ficha, para consulta por seção
  limpeza-relatorio.md  a auditoria desta limpeza, com o que ficou e por quê
  fixtures/             rurik.json e wizard.json — export real do Pathbuilder,
                        usados pelos testes

server/
  index.js              Express + Socket.IO; serve o app, imprime o QR e
                        atende /api/entry e /api/entries
  table.js              a mesa: estado autoritativo, quais ações são aceitas,
                        os patches do que mudou, e o saneamento de mesa vinda
                        de fora
  storage.js            data/mesa.json — gravação atômica, .bak e a
                        cópia datada de cada mesa que fecha
  entries.js            lê um verbete por offset, sem carregar os 15 MB
  net.js                endereço da LAN e o QR code do terminal

scripts/
  dev.mjs               sobe Vite e servidor juntos
  smoke-sync.mjs        dois clientes de mentira provando a sincronização
  build-catalog.mjs     gera o catálogo a partir dos packs do Foundry
  build-lore.mjs        feats, magias, ações, condições e o Punho
  build-traits.mjs      nomes e descrições de traço, do en.json oficial
  vendor-pf2e.mjs       onde estão os packs, e o recado quando não estão
  lint-visual.mjs       guarda da identidade visual, roda dentro do build
  visual-baseline.json  as violações visuais antigas ainda toleradas

public/
  fonts/                a fonte oficial dos ícones de ação do PF2e

src/
  main.jsx              entrada
  App.jsx               abas e navegação
  config.js             taxa de venda e chave de armazenamento

  data/                 gerado pelos scripts — não editar à mão
    catalog.equipment.json   5.739 itens de equipamento
    catalog.js               categorias e a ordem de exibição
    traits.json / traits.js  dicionário de traços
    conditions.json          as 43 condições, com a descrição da Paizo
    index.spells.json        1.993 magias, sem descrição (o compêndio);
                             `focus: true` nas 545 da pasta spells/focus/
    index.actions.json       ações básicas, de perícia e de classe,
                             com a perícia de cada uma e o "(Trained)"
    unarmed.json             o Punho, que não é item
    seed-sheets/             as duas fichas da mesa de exemplo

  lib/                  cálculo puro, sem React
    sheet.js            O MOTOR: CA, salvamentos, perícias, ataques, dano,
                        conjuração, foco e descanso — em parcelas rotuladas
    pathbuilder.js      lê o JSON do Pathbuilder e nunca lança
    startingGear.js     casa a bagagem do Pathbuilder com o catálogo (uma vez só)
    conditions.js       o efeito mecânico das oito condições que mexem em número
    spells.js           casa nome de magia com o verbete do compêndio
    loreResolve.js      resolve nome de feat/magia nos packs, pelo servidor
    foundryImport.js    importador de JSON dos packs (a Biblioteca usa)
    money.js            tudo em cobre: converter, somar, gastar, simplificar
    bulk.js             o Bulk do PF2e, com "L" e "—"
    items.js            resolver, agrupar, buscar e filtrar item
    sourceCategory.js   de qual livro veio o item, para o filtro de conteúdo
    tableFile.js        a mesa em arquivo: exportar e ler o JSON de volta
    html.js / text.js   sanitização de descrição e plural/título

  state/
    reducer.js          as regras da mesa — rodam no SERVIDOR
    initialState.js     a mesa de exemplo da primeira execução, e as
                        chaves que formam uma mesa (`TABLE_KEYS`)
    migrations.js       migra a mesa de uma versão do schema para a seguinte
    history.js          o log de "Reverter" do mestre
    session.js          o que é do aparelho: personagem, loja, carrinho
    store.jsx           a ponte com o servidor por WebSocket

  components/           peças reutilizadas: Coins, Stepper, Sheet, ItemRow,
                        ItemForm, ItemFilters, TraitList, Icons, e as folhas
                        de carteira, ajuste de moedas e configuração

  screens/              Inventário, Loja, Mestre e a Biblioteca
                        (tela filha do Mestre, não é aba)
    CharacterSheet/     a ficha:
      index.jsx           monta a view com buildSheet e escolhe a sub-aba
      Resumo.jsx          atributos, defesas, perícias, HP, condições, escudo
      Ataques.jsx         uma linha por arma, com MAP
      Magias.jsx          conjuração preparada, foco e grimório
      Feats.jsx           feats e features, com o texto dos packs
      Acoes.jsx           ações básicas, de classe e de perícia
      Compendio.jsx       as 1.993 magias, filtráveis
      SpellPicker.jsx     escolher magia para preparar ou aprender
      ImportSheet.jsx     colar o JSON do Pathbuilder
      HpSheet.jsx         dano, cura e HP temporário
      ConditionsSheet.jsx as 43 condições
      ItemModsSheet.jsx   modificador manual por item
      BreakdownSheet.jsx  o detalhamento: de onde veio cada parcela

  styles/               tokens.css (a única fonte de valor visual),
                        base.css, components.css, screens.css

test/                   node --test nativo, sem dependência nova
  sheet.test.js         o motor, contra o fixture do Rurik
  pathbuilder.test.js   o leitor do export, com metade dos casos em entrada torta
  gear.test.js          equipar, desequipar e os invariantes de slot
  startingGear.test.js  a bagagem do Pathbuilder: casamento com o catálogo,
                        entra somando e só na primeira vinculação
  spells.test.js        conjuração, grimório e foco
  spellDefense.test.js  defesa das magias
  migrations.test.js    migração de schema e o histórico
  loreResolve.test.js   resolução nos packs (pula sem o corpus gerado)
```
