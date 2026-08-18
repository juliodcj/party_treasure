# Estudo: como o Pathmuncher casa Pathbuilder com Foundry

Leitura completa de [MrPrimate/pathmuncher](https://github.com/MrPrimate/pathmuncher)
(MIT, ~5.600 linhas), medida contra o **nosso** corpus e contra a **nossa** mesa
(`data/mesa.json`, 4 personagens reais). O objetivo era responder três perguntas:

1. Como eles resolvem o problema de o nome do Pathbuilder não bater com o do Foundry?
2. O que eles importam que nós não importamos?
3. Isso está contemplado lá? — **Sim, em cinco camadas.** Uma delas nós já temos;
   três nós não temos; e há uma sexta que nós podemos fazer *melhor que eles*.

---

## 1. O tamanho do problema, medido aqui

Rodado contra `server/data/entries.idx.json` (10.021 nomes indexados) e a mesa real:

| Medida | Resultado |
|---|---|
| Nomes de `feats` + `specials` na mesa | 45 |
| Resolvem hoje (nome exato normalizado) | **32 — 71,1 %** |
| Resolveriam com as estratégias deste estudo | **37 — 82,2 %** |
| Sobram, e destes 5 são perícia e 1 é o Spellbook | 8 |
| Cobertura depois de tratar perícia e Spellbook | **43/45 — 95,6 %** |

E o risco que ainda não nos mordeu porque nenhum jogador ligou conteúdo legado
no Pathbuilder:

| Tabela do Pathmuncher | Pares | Nome do Pathbuilder **não** resolve no nosso corpus |
|---|---|---|
| Magias legado → remaster (`spells.js`) | 109 | **109 (100 %)** |
| Features/feats (`features.js`) | 161 | 84 (mais 64 que não temos em pack nenhum) |

Ou seja: **hoje, uma ficha exportada com nomes legados perde 100 % das 109 magias
renomeadas na remasterização.** `True Strike` → `Sure Strike`, `Magic Missile` →
`Force Barrage`, `Burning Hands` → `Breathe Fire`. A magia entra na ficha com o
nome que veio e sem custo em ação, sem descrição e sem `defense` — e sem
`defense` a aba Ataques não sabe escolher entre mostrar DC ou bônus de ataque.

Os oito nomes que a mesa não resolve hoje, com o diagnóstico de cada um:

| Nome | Personagem | O que é | Como se resolve |
|---|---|---|---|
| `Arcane School: School of Unified Magical Theory` | Ezren | prefixo de categoria | prefixo → `School of Unified Magical Theory` ✔ existe |
| `Arcane Thesis: Experimental Spellshaping` | Ezren | prefixo de categoria | prefixo → `Experimental Spellshaping` ✔ existe |
| `Thief Racket` | Merisiel | sufixo de categoria | sufixo → `Thief` ✔ existe |
| `Justice Cause` | Seelah | sufixo de categoria | sufixo → `Justice` ✔ existe |
| `Anathema` | Seelah | nome ambíguo entre classes | qualificar por classe ✔ existe como `Anathema (Cleric)` / `(Druid)` — **mas não há versão de Champion**; permanece não resolvido, corretamente |
| `Crafting`, `Intimidation`, `Society`, `Stealth`, `Survival` | vários | **não são feats** — são aumentos de perícia que o Pathbuilder despeja em `specials` | rotear para perícia, nunca procurar em pack |
| `Spellbook` | Ezren | item, não feature | ignorar (é o grimório, que a ficha já trata) |
| `Deity Skill`, `Holy Aura` | Seelah | não existem em pack nenhum | decisão explícita de apelido, ou fica não resolvido com o nome que veio |

---

## 2. As cinco camadas do Pathmuncher

### 2.1 Slug, não nome (`Seasoning.slug`)

Eles nunca comparam nome com nome. Comparam `game.pf2e.system.sluggify(nome)`
contra `item.system.slug` do compêndio — e caem para `sluggify(item.name)` quando
o item não tem slug. É o que nós fazemos em `normalizeName`, com uma diferença:
**nós comparamos nome normalizado, eles comparam slug**, e o slug do Foundry é o
campo que a Paizo publica. Nosso `slugify()` em `loreResolve.js` já admite isso
no comentário — "aproximação do slug do Foundry, não o slug em si".

*Já temos, em forma equivalente.* O ganho de trocar é pequeno; o índice
`idx.slugs` que geramos já é o slug de verdade (vem do nome do arquivo).

### 2.2 Tabela estática de renome

Três listas escritas à mão, alimentadas por anos de relatos de usuário:

- `data/features.js` — 161 pares (`Thief Racket`, `Lightning Reflexes` → `Reflex Expertise`,
  `Divine Ally (Shield)` → `Shield Ally`, os 20 dragões, os elementos do Kineticist).
- `data/equipment.js` — ~110 pares (`Hide` → `Hide Armor`, `Bag of Holding` → `Spacious Pouch`,
  `Thieves' Tools` → `Thieves' Toolkit`), mais `RUNE_ITEM_MAP`.
- `data/spells.js` — 109 pares legado → remaster, aplicados **só quando o módulo
  `pf2e-legacy-content` não está ativo**.

*Não temos nada disso.* É a camada que explica os 109 e os 84 da tabela acima.

### 2.3 Regras dinâmicas por regex

Antes de olhar a tabela, geram candidatos a partir da forma do nome
(`features.js`, `generateDynamicNames`):

| Classe de regra | Exemplo | Vira |
|---|---|---|
| Sufixo de categoria | `X Racket`, `X Style`, `X Doctrine`, `X Mystery`, `X Element`, `X Patron` | `X` |
| Prefixo de categoria | `Arcane Thesis: X`, `Arcane School: X`, `The X` | `X` |
| Split genérico | `A: B` | `B` |
| Parênteses | `Aquatic Eyes (Darkvision)` | `Aquatic Eyes` |
| Swap de grau | `Greater X` | `X (Greater)` |
| Equipamento | `Axe Musket - Melee` | `Axe Musket` |

Cada regra devolve também o `details` — a parte removida —, que vira a **dica de
escolha** (`choiceHint`) usada depois para resolver o `ChoiceSet` do item. Ou
seja: o pedaço do nome não é jogado fora, ele vira o dado que faltava.

*Não temos.* É o que resolve `Thief Racket` e os dois do Ezren.

### 2.4 Nome qualificado pelo contexto do personagem

`#slugNameMatch` e `#indexFind` não testam um nome: testam **seis**, montados com
o contexto da ficha:

```
Anathema                     → anathema
Anathema (Cleric)            → anathema-cleric      ← casa
Anathema (Dwarf)             → anathema-dwarf       (ancestralidade)
Anathema (Ancient-Blooded)   → …                    (herança)
Anathema (<classe dupla>)    → …
+ as mesmas cinco sobre o nome original, antes do renome
```

É a camada mais elegante do módulo, e a que eu recomendo com mais convicção:
**o desambiguador é o próprio personagem.** `Bite (Gnoll)`, `Tusks (Orc)`,
`Deity (Champion)`, `Incredible Luck (Halfling)` — o Foundry desambigua no nome,
o Pathbuilder não, e quem sabe a resposta é a ficha.

*Não temos.* Ver §4 para por que isso **não** pode virar apelido no build.

### 2.5 Listas de ignorados

`IGNORED_FEATS` contém, entre outras coisas, **as 16 perícias**. O Pathbuilder
manda aumento de perícia dentro de `feats`/`specials`, e procurar `Crafting` no
pack de feats é procurar o que nunca esteve lá. Também ignoram `Spellbook`,
`Unarmored`, `Sanctification`, `Imprecise Sense` — coisas que o Foundry concede
sozinho ou que não são item.

`IGNORED_SPECIALS` tem `Low-Light Vision` e `Darkvision`, porque eles viram
`system.traits.senses` do ator, não item. (Nós resolvemos esses dois pelo
glossário do `en.json` — solução diferente e igualmente correta para o nosso caso,
já que nós mostramos a descrição.)

*Não temos.* São 5 dos 8 nomes que sobram na nossa mesa.

### 2.6 A sexta camada, que não é casamento de nome

O Pathmuncher cria **atores temporários** no Foundry, larga os itens dentro e
deixa o próprio sistema PF2e executar as regras `ChoiceSet` e `GrantItem`. Depois
lê o que foi concedido e cruza com a lista do Pathbuilder. É assim que
`Cause` → escolha `Justice` → concede `Justice` funciona sem ninguém escrever
"Justice" em lugar nenhum.

Isso depende de rodar dentro do Foundry, e nós não rodamos. **Mas os dados que
o motor consome estão nos packs que vendorizamos** — e é daí que sai a §4.

---

## 3. Cobertura: o que eles importam e nós não

| Dado do Pathbuilder | Pathmuncher | Nós | Observação |
|---|---|---|---|
| nome, nível, atributos, proficiências, perícias, lores, idiomas, tamanho, HP | ✔ | ✔ | paridade |
| feats, specials, features de classe | ✔ | ✔ parcial | 71 % de resolução hoje |
| **ancestralidade, herança, background, classe, divindade como verbete** | ✔ (item de compêndio, com descrição e regras) | ✖ **só o texto do nome** | `build-lore.mjs` não indexa os packs `ancestries`, `heritages` (indexa), `backgrounds`, `classes`, `deities` |
| magias, grimório, preparadas, foco, tradição, DC | ✔ | ✔ | nosso mapeamento é bom; falta o renome legado |
| **rituais** (`build.rituals`) | ✔ | ✖ | `pathbuilder.js` declara fora de escopo |
| **fórmulas de criação** (`build.formula`) | ✔ | ✖ | idem |
| **spell blending / slots misturados** | ✔ | ✖ | ajusta `perDay` por círculo |
| equipamento, armas, armadura, contêineres, runas, materiais | ✔ | ✖ **por decisão** (D2) | o inventário é da mesa; não mexer |
| dinheiro | ✔ | ✖ **por decisão** (D3) | idem |
| familiares, pets, mods de Inventor | ✔ | ✖ | fora de escopo declarado |
| **relatório do que falhou** | ✔ diálogo ao fim, por categoria | ✔ `sheet.unresolved` | paridade conceitual |

As três linhas em negrito são as que valem revisitar. **Rituais e fórmulas são
listas de nome que o Pathbuilder já manda e que nós descartamos no leitor** — é
exatamente o "feature que não é importada do Pathbuilder" que você quer eliminar,
e são as duas mais baratas de fechar.

---

## 4. O que nós podemos fazer melhor que o Pathmuncher

O Pathmuncher roda dentro do Foundry e só enxerga o **índice** dos compêndios
(nome, tipo, slug). Por isso ele precisa de 161 pares escritos à mão.

Nós temos **os arquivos JSON inteiros em disco, no build**. E os packs carregam a
taxonomia que o Pathbuilder codifica em sufixo e prefixo de nome:

```
class-features/justice.json      traits.otherTags = ["champion-cause"]
class-features/thief.json        traits.otherTags = ["rogue-racket"]
class-features/warpriest.json    traits.otherTags = ["cleric-doctrine"]
…/experimental-spellshaping.json traits.otherTags = ["wizard-arcane-thesis"]
```

São **51 tags** cobrindo cause, racket, doctrine, mystery, patron, instinct,
bloodline, muse, thesis, school, order, style, way, methodology, gate,
research field, hunter's edge, implement, conscious mind, ikon, lesson…

Daí sai um **índice de apelidos gerado, não escrito**: para cada verbete com a tag
`<classe>-<categoria>`, registre `"<Nome> <Categoria>"` e `"<Categoria>: <Nome>"`.

Medido:

```
chaves de apelido geradas: 1.556
colisões com nome já existente: 0
apelidos ambíguos (dois alvos):  0
```

**Zero ambiguidade.** E, o mais importante para as regras deste projeto: isso
respeita "zero placeholder" — nenhum nome de jogo é escrito por nós, o apelido é
*derivado do dado do pack*. Se a Paizo renomear uma categoria, o índice acompanha
no próximo `npm run build:lore` em vez de apodrecer numa lista.

**O que NÃO pode virar apelido de build:** remover o parêntese do nome do Foundry.
Medido: 42 apelidos assim, **37 deles ambíguos** — `anathema` aponta para dois
verbetes, `deity` para dois, `initiate benefit` para dez. Isso tem que ser
**estratégia de consulta com o contexto do personagem** (§2.4), nunca entrada de
índice. É a diferença entre "o Pathbuilder disse Anathema e este personagem é
Cleric" e "Anathema é alguma coisa" — a primeira é determinística, a segunda erra
calado, que é o único erro que a espec proíbe.

---

## 5. O que o Pathmuncher também não resolve

Para não vender o módulo como bala de prata:

- **`Justice Cause` não está lá.** Os sufixos deles cobrem Racket, Style,
  Doctrine, Mystery, Element, Patron, Impulse/Gate Junction — não Cause. Só
  funciona no Foundry porque o motor de `ChoiceSet` acha sozinho. Nosso índice de
  tags cobre, porque `champion-cause` é uma das 51.
- **A tabela estática envelhece.** 64 dos 161 pares apontam para nomes que não
  existem em pack nenhum do nosso vendor — são de Battlezoo, playtest, sf2e e
  legado. Manutenção perpétua.
- **`Deity Skill` e `Holy Aura` continuam órfãos.** Não há verbete correspondente
  em nenhum pack. Aqui o certo é o que a espec já manda: aparecer com o nome que
  veio, entrar no log, e seguir.
- **Dual class é declaradamente ruim** ("ropey at best"), e o README avisa.

---

## 6. Recomendações, em ordem de valor por linha de código

> **1 e 2 implementadas.** Medido depois, na mesa real: 6 nomes deixaram de ser
> procurados onde nunca estiveram, e dos 37 que restam **34 resolvem (91,9 %)**,
> contra 32 de 45 (71,1 %) antes. Sobram `Deity Skill`, `Anathema` e `Holy Aura`
> — o primeiro e o terceiro não existem em pack nenhum, e o segundo depende da
> recomendação 3. **As fichas já importadas só melhoram na próxima importação**:
> `unresolved` é dado gravado, não recalculado.

**1. Rotear perícia e itens para fora da resolução de feature.** *(feito)*
`readSpecials`/`readFeats` em `src/lib/pathbuilder.js`. Um nome que é uma das 16
perícias é aumento de perícia, não feat — e `Spellbook` é item. Sozinho, tira 6
dos 8 falsos negativos da mesa. Custo: uma lista de 16 nomes que já existe em
`SKILL_ABILITY`.

**2. Índice de apelidos derivado das `otherTags`.** *(feito)*
`scripts/build-lore.mjs`, ao lado de `reivindicar(nameIndex, …)`. 1.556 chaves,
0 ambíguas, geradas do pack. Resolve `Thief Racket`, `Justice Cause`,
`Arcane Thesis: X`, `Arcane School: X`, `X Doctrine`, `X Mystery`, `X Patron`.

**3. Consulta qualificada pelo contexto do personagem.**
`src/lib/loreResolve.js` + o endpoint `/api/entries`. Hoje mandamos um nome;
passar a mandar nome + classe + ancestralidade + herança, e o servidor tenta
`Nome`, `Nome (Classe)`, `Nome (Ancestralidade)`, `Nome (Herança)` **nessa ordem**,
parando no primeiro. Resolve toda a família `Bite (Gnoll)`, `Tusks (Orc)`,
`Deity (Champion)`, `Anathema (Cleric)`.

**4. Tabela de renome legado → remaster para magias.**
109 pares, MIT, `pathmuncher/src/data/spells.js`. É a única das três tabelas que
eu vendorizaria inteira: é fechada (a remasterização aconteceu uma vez), é 100 %
de perda hoje, e não dá para derivar do pack — o pack não guarda o nome antigo.
Vendorizar como `src/data/remaster-names.json` com a atribuição MIT no cabeçalho,
aplicada como **último candidato** da consulta, nunca como reescrita do nome que
o jogador vê.

**5. Indexar `backgrounds`, `classes`, `deities` no corpus.**
Três linhas no array `PACKS` de `build-lore.mjs`. Hoje `sheet.background`,
`sheet.class` e `sheet.deity` são texto puro na tela; com isso viram verbete
clicável como qualquer feat. É "feature do Pathbuilder que não é importada" no
sentido mais literal.

**6. Ler `rituals` e `formula` do export.**
`src/lib/pathbuilder.js`. Duas listas de nome que já chegam no JSON e que hoje
jogamos fora. Resolvem como magia (ritual é magia com `system.ritual`) e como
item do catálogo (fórmula).

**7. Relatório de importação com categoria.**
Nosso `sheet.unresolved` é uma lista plana de strings. O deles separa por tipo
(feat, special, magia, equipamento…) e diz onde procurou. Barato, e é o que
transforma "sumiu alguma coisa" em "estes três nomes, destes tipos".

**Fora da lista, de propósito:** renome de equipamento (D2 e D3 continuam
valendo — o inventário é da mesa) e casamento aproximado de qualquer espécie. O
Pathmuncher também não faz fuzzy: toda camada dele é determinística, e é por isso
que funciona.

---

## 7. Adendo — a aba Ações, e o que o Pathmuncher esclarece dela

Sintoma relatado na mesa: a aba **Classe** vazia para todo mundo, e **todas** as
ações de perícia no balde "Outras".

**Por que a Classe estava vazia.** A lista saía de `sheet.actions`, que só recebe
um nome quando o verbete resolvido tem `kind === 'action'`. Mas a prioridade de
nome — obrigatória pela espec — põe `class-feature` acima de `action`. O
Pathbuilder manda `"Rage"`; o desempate resolve para a *feature* de classe (está
certo, é o que a pessoa escolheu no nível 1), e a *ação* homônima nunca é
alcançada. Medido: Valeros e Merisiel com zero ações; Seelah e Ezren com uma
cada, e só porque o Pathbuilder as citou nominalmente em `specials`.

**Aqui o Pathmuncher esclarece, sim.** No Foundry a ponte não é o nome: é a regra
`GrantItem` da feature, que aponta para a ação.

```json
// class-features/rage.json
"rules": [{ "key": "GrantItem", "uuid": "Compendium.pf2e.actionspf2e.Item.Rage" }]
```

São **337** links assim de features/feats para `actionspf2e`, e é essa corrente
que o `#addGrantedItems` do Pathmuncher percorre — o motor de 700 linhas que a
§2.6 já descrevia. Seguir a corrente é a resposta certa e continua na mesa;
medida nos quatro personagens de nível 1, ela rende pouco (Valeros ganha Reactive
Strike, Ezren ganha Drain Bonded Item, que ele já tinha), porque a maior parte
das ações concedidas vem de feats de nível alto. Duas armadilhas anotadas para
quando for feita: o alvo do grant tem de resolver **por slug no pack `actions`**
(`action:reactive-strike`), nunca por nome — resolver por nome devolve a feature
de novo —, e o grant traz coisas que já estão em outra aba (`Cast a Spell`).

Enquanto isso, a solução barata: a pasta da Paizo já diz de que classe é cada
ação (`actions/class/<classe>/`), e a tela filtra pela classe da ficha. O traço
da ação **não** serve para isso — 83 das 196 não carregam o traço da própria
classe.

**Por que as de perícia estavam todas em "Outras".** Aqui o Pathmuncher não
ajuda: ele não categoriza ação nenhuma. Ele despeja os itens no ator e quem
agrupa é a ficha do Foundry, que lê o registro de ações do sistema — não os
packs. E o motivo do nosso balde é que o pack **mudou**: `actions/skill/` já foi
dividido por perícia (`skill/athletics/climb.json`) e hoje é uma pasta plana. O
código lia o segundo nível de pasta, que deixou de existir, e devolvia `null`
para as 54.

Quem ainda guarda a divisão é o registro do sistema, uma pasta por perícia em
`src/module/system/action-macros/`. Lendo só os nomes das pastas: 45 das 54. A
marcação estruturada da descrição (`@Check[survival|…]`,
`[[/act disable-device]]{Thievery}`) cobre o resto até **44 com perícia** — e ela
é uma **lista**: Decipher Writing rola com Society, Arcana, Occultism e Religion,
e aparece embaixo das quatro. Sobram 10 que fonte nenhuma classifica (Treat
Wounds, Earn Income, Recall Knowledge…); ficam num balde chamado "Sem perícia no
pack", porque chutar "Medicine" para Treat Wounds seria escrever regra de jogo no
nosso código.

---

## Apêndice — mapa do repositório do Pathmuncher

| Arquivo | Linhas | O que tem |
|---|---|---|
| `src/app/Pathmuncher.js` | 3.322 | orquestração; `#nameMap`, `#slugNameMatch`, `#indexFind`, motor de `ChoiceSet`/`GrantItem`, atores temporários, `postImportCheck` |
| `src/app/Seasoning.js` | 162 | fachada do renome; slug, tamanho, local do feat, nome qualificado por classe |
| `src/app/CompendiumMatcher.js` | 137 | busca por nome e por slug em N compêndios, com filtro |
| `src/data/features.js` | 404 | 161 pares + regex dinâmicas + listas de ignorados |
| `src/data/equipment.js` | 262 | ~110 pares de equipamento + `RUNE_ITEM_MAP` |
| `src/data/spells.js` | 130 | 109 pares legado → remaster |
| `src/constants.js` | 283 | mapa de compêndios por tipo, prioridade de feat |

Licença MIT (Jack Holloway, 2023) — reuso das tabelas é permitido com o aviso de
copyright junto.
