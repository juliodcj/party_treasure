# ESPEC — Ficha PF2e

Referência da ficha de personagem do party_treasure. **Consulta sob demanda, por
seção.** As regras que valem em toda sessão estão no `CLAUDE.md`.

A ficha está implementada. Este documento descreve como ela funciona; os
roteiros de implementação, uma fase por arquivo, foram removidos depois de
cumpridos — o que continua valendo está aqui.

Índice: §1 princípios · §2 decisões · §3 conteúdo · §4 JSON do Pathbuilder ·
§5 packs do Foundry · §6 personagens · §7 dados · §8 equipar · §9 motor ·
§10 regras · §11 condições · §12 telas · §13 integração · §14 sincronização ·
§15 fases e modelos · §16 aceite · §17 perguntas em aberto.

---

## 1. Princípios

Para decidir caso que a espec não previu. Nesta ordem.

1. **A ficha é para a mesa.** Usada em pé, entre rodadas, no celular. Três toques
   é erro. Na mesa presencial, depender de internet é erro — o Wi-Fi local basta;
   o túnel da Cloudflare é para quem joga de fora, não a base.
2. **O Pathbuilder constrói, o party_treasure joga.** Subir de nível é reimportar.
3. **Cada fonte é dona do que sabe.** Pathbuilder: quem o personagem é. Foundry:
   regras e texto. party_treasure: o que acontece na mesa (dinheiro, itens, HP).
4. **Todo número se explica.** Nenhuma função devolve total solto; devolve
   parcelas rotuladas.
5. **Onde o app não sabe, ele admite.** Modificador manual, não chute.
6. **Errar em silêncio é o único erro inaceitável.**
7. **Nada regride.**
8. **Offline é o produto, não requisito técnico.**
9. **Estado calculável não se guarda; fato de mesa não se recalcula.**
10. **Prefira a decisão que apaga trabalho.**
11. **A ficha usa a louça da casa** — o design system existente, sem exceção.
12. **Escopo se defende.** Ideia fora do escopo vira sugestão anotada.

---

## 2. Decisões — não reabrir

| # | Decisão | Razão em uma linha |
|---|---|---|
| D1 | Ficha entra **só colando JSON**; sem id de 6 dígitos, sem rede | Rodar em hotspot sem dados |
| D2 | **Nenhum item importado** do Pathbuilder; inventário é 100% do app | `"Hide"` vs `"Hide Armor"` = matching fuzzy falhando em silêncio |
| D3 | `money` do JSON ignorado | Carteira é da mesa |
| D4 | Ficha **vincula a jogador existente**, vive em `player.sheet` | Reimportar troca só essa fatia; some a política de merge |
| D5 | Números vêm do **cálculo do app**, não dos campos prontos do JSON | Consequência de D2 |
| D6 | **Modificadores manuais** de ataque/dano por item, com rótulo | Cobre Rage, Giant Instinct, weapon spec, runas |
| D7 | Fato do personagem no **servidor**; só ponto de vista no aparelho | Régua já escrita em `src/state/session.js` |
| D8 | **Bulk e carga adiados** | Puxa contêiner, bulk de moeda, efeito automático |
| D9 | Feats/ações/magias com **descrição completa** do Foundry | Ficha sem descrição não substitui o livro |
| D10 | Corpus **não vai no bundle**; resolvido no servidor | 32 MB atravessando a internet a cada celular que abre o app |
| D11 | **Zero conteúdo escrito à mão** | Protótipo é layout, não conteúdo |
| D12 | Dado de pack **em inglês** | Regra do `CLAUDE.md` |
| D13 | Item criado à mão **ganha ficha técnica** quando arma/armadura/escudo | Homebrew é o que o catálogo não cobre |
| D14 | Importar/atualizar/remover ficha **só pela tela do Mestre** | Um único lugar de substituição |
| D15 | **Identidade visual existente**, sem exceção | Tela grande com liberdade visual desfaz a padronização |

Fora do escopo: level-up, escolha de feat, rolagem de dado, iniciativa, controle
de combate, runas, bulk.

---

## 3. Conteúdo: de onde vem cada coisa

Nada escrito à mão. O que o protótipo inventa, e a fonte real:

| No protótipo | Fonte |
|---|---|
| 32 condições com descrição em português | `packs/pf2e/conditions` (43 arquivos), em inglês |
| Ações básicas (Strike, Stride…) | `packs/pf2e/actions` |
| Magias do "mago arcano nv 5" e as de foco | `packs/pf2e/spells` |
| Lista de feats do Rurik | `feats`/`specials` do JSON, resolvidos nos packs (§5.3) |
| `ATTACKS`, `INV_GROUPS` | inventário do jogador |
| Escudo Dureza 5 / PV 12 / VT 6 | `catalog.equipment.json` campo `shield` — o protótipo mistura Steel (dureza 5) com Wooden (PV 12, VT 6) |
| Rótulos de traço | `static/lang/en.json`, chaves `PF2E.Trait*` |
| MAP do Javelin `±0 / −5` | regra: −5/−10, ou −4/−8 com `agile` |
| Perícias, atributos, HP 24, CA 18 | calculados (§10) |

**O Punho não está em pack nenhum** (medido na fase 2). `Unarmed Strike` precisa
ser injetado sempre (§10.3), mas não existe em `packs/pf2e/equipment` — no
Foundry ele é montado em código, em
`src/module/actor/character/document.ts`, como `slug: "basic-unarmed"`,
`category: "unarmed"`, `group: "brawling"`, dano `1d4 bludgeoning`, traços
`agile finesse nonlethal unarmed`, nome vindo de `PF2E.WeaponTypeUnarmed`.

Não vale copiar esses valores para dentro do nosso código e esquecer: a fase 4
extrai o bloco desse arquivo na ingestão e **falha alto se ele mudar de forma**,
para o dia em que a Paizo mexer no Punho não passar calado.

**`build-traits.mjs` precisa crescer:** hoje gera só traços de equipamento
(`traits.equipment.json`, 83 KB). A ficha precisa dos de magia, feat, ação e
condição — mesmo `en.json`, `PF2E.Trait*` e `PF2E.TraitDescription*`. Logar todo
slug que não resolver.

---

## 4. JSON do Pathbuilder

Exportado em *Export Character → Export to Foundry VTT (JSON)* e colado no app.
Fixture: `docs/fixtures/rurik.json`.

### 4.1 Lido

```
name class dualClass level ancestry heritage background deity size sizeName
keyability languages resistances
abilities.{str dex con int wis cha}
attributes.{ancestryhp classhp bonushp bonushpPerLevel speed speedBonus}
proficiencies.*          graus de perícia, salvamento, percepção, arma, armadura
specificProficiencies    {trained expert master legendary}: listas de exceção
lores                    [["Sailing", 2]]
feats                    [[nome, ?, categoria, nível, rótulo, ...]]
specials                 ["Rage", "Giant Instinct", "Darkvision", ...]
spellCasters focusPoints focus
```

### 4.2 Ignorado

`equipment` `equipmentContainers` `weapons` `armor` `money` `acTotal` `formula`
`pets` `familiars` `inventorMods` `mods`.

`acTotal` e `weapons[].attack` só em teste, como gabarito (§16).

### 4.3 Armadilhas (medidas no fixture)

- **Proficiência é número, não bônus:** `0`=untrained `2`=trained `4`=expert
  `6`=master `8`=legendary.
- **Chaves de Starfinder aparecem** (`piloting`, `computers`). Ignorar
  desconhecida sem quebrar, e logar.
- `name` ≠ `display`: `name:"Greatpick"`, `display:"Large Greatpick"`.
- **Lore vira perícia:** `lores:[["Sailing",2]]` → `Sailing Lore`.
- `languages` pode vir `["None selected"]` → vazio.
- **O id de 6 dígitos não está no JSON**, só na URL. Rodapé mostra data e nível:
  `Importada em 10/08 · Nv 1`.
- `equipment` é posicionalmente inconsistente (`["Backpack",1,"Invested"]` vs
  `["Bedroll",1,"<uuid>","Invested"]`) e o flag `"Invested"` aparece em giz e
  sabão. Irrelevante por D2; registrado caso D2 seja reaberta.

---

## 5. Packs do Foundry

### 5.1 O layout mudou

Packs agora em `packs/pf2e/…` e `packs/sf2e/…`, não em `packs/…`.
**`scripts/build-catalog.mjs` e o sparse-checkout do README estão quebrados hoje.**

```
git clone --depth 1 --filter=blob:none --sparse https://github.com/foundryvtt/pf2e.git vendor/pf2e
cd vendor/pf2e && git sparse-checkout set packs/pf2e static/lang
```

### 5.2 Tamanhos medidos

| Pack | Arquivos | Bruto |
|---|---|---|
| `feats` | 6.284 | 31 MB |
| `spells` | 1.994 | 8,4 MB |
| `class-features` | 876 | 4,7 MB |
| `actions` | 575 | 3,0 MB |
| `heritages` | 329 | 1,6 MB |
| `ancestry-features` | 56 | 444 KB |
| `conditions` | 43 | 176 KB |

`equipment` (5.857 arquivos, 25 MB) já virou `catalog.equipment.json` de 10,9 MB
no bundle. Somar o resto daria ~32 MB. Por isso D10.

### 5.3 Estratégia

Gerar em `scripts/build-lore.mjs`:

- `src/data/index.spells.json` — nome, círculo, tradição, ações, traços,
  raridade. ~1.994 entradas, ~400 KB. **Vai no bundle** (o compêndio navega tudo,
  offline).
- `src/data/conditions.json` — as 43 condições inteiras. Pequeno e usado o tempo
  todo.
- `server/data/entries.bin` + `entries.idx.json` — verbetes sanitizados
  concatenados, índice `slug → [offset, tamanho]`. Servidor lê por `fs.read` no
  offset, guardando em memória o que já leu. **Não gerar 9.000 arquivos soltos.**

  *(Revisto em 13/08: caiu o "não carregar em memória". O servidor roda só no PC
  do mestre, onde memória é barata. O corpus continua fora do bundle por outra
  razão, hoje mais forte — com o acesso por Cloudflare, o bundle atravessa a
  internet a cada celular que abre o app, e não mais a rede local.)*

Rotas Express, só leitura:
```
GET /api/entry/:slug     → { name, traits, actionCost, rank, descriptionHtml, source }
GET /api/entries?slugs=  → lote, usado na importação
```

### 5.4 Resolução de nome — taxa medida

Feats + specials do Rurik contra 8.450 nomes indexados: **7 de 10 por nome exato.**

| Nome | Resultado |
|---|---|
| Underwater Marauder / Sudden Charge / Orc Ferocity | `feats` |
| Giant Instinct | `class-features` |
| Dromaar | **`feats` e `heritages`** |
| Quick-Tempered / Rage | **`actions` e `class-features`** |
| Darkvision / Low-Light Vision | não achado |
| Sailing Lore | não achado (correto — é perícia) |

**Ordem de prioridade obrigatória no empate:** `class-features` → `heritages` →
`ancestry-features` → `feats` → `actions`.

**Sentidos não estão em pack.** `Darkvision` e `Low-Light Vision` estão em
`static/lang/en.json` sob `PF2E.NPC.Abilities.Glossary.*`. Indexar junto.

Não resolveu: aparece com o nome que veio, sem descrição, marcado, e vai para
`sheet.unresolved` e para o log.

---

## 6. Personagens com e sem ficha

**Sem ficha** (criado na aba Mestre, como hoje): nome, carteira, inventário.
Funciona como o app funciona hoje. A aba Ficha existe e mostra estado vazio:

> **Personagem sem ficha importada**
> Este personagem tem inventário e carteira, mas não tem ficha. Para importar,
> vá em Mestre → escolha o personagem → Vincular ficha.

**Com ficha:** cinco sub-abas, cálculos, controles de equipar.

**Vincular (D14):** botão **Vincular ficha** na linha do personagem, na tela do
Mestre. Quem já tem ganha **Atualizar ficha** (cola JSON novo, substitui
`player.sheet` inteiro) e **Remover ficha** (`vitals`, `gear` e `itemMods`
preservados).

**Degradação:** sem ficha → sem sub-abas, sem cálculo, sem controles de equipar.
Remover ficha nunca apaga item, moeda ou nota.

---

## 7. Modelo de dados

```js
player = {
  id, name, gold, silver, copper, items, customItems, itemNotes,   // já existe

  sheet: {                          // null = sem ficha; substituída inteira ao reimportar
    importedAt, level, class, ancestry, heritage, background, deity,
    size, sizeName, keyability, speed, languages: [], resistances: [],
    abilities: { str, dex, con, int, wis, cha },
    proficiencies: {},              // graus crus do Pathbuilder
    specificProficiencies: {},
    lores: [['Sailing', 2]],
    hpMax: 24,                      // calculado na importação (§10.1)
    feats:   [{ name, source, level, slug|null, actionCost, traits, descriptionHtml }],
    actions: [{ ... }],
    spellcasting: { tradition, prepared|spontaneous, dc, attack, slots, known } | null,
    unresolved: ['Darkvision', 'Low-Light Vision'],
  } | null,

  vitals: {                         // sobrevive à reimportação e à remoção da ficha
    hp, tempHp,
    conditions: { frightened: 2, prone: true },
    focusPoints,
    shieldHp, shieldRaised,
    slotsUsed: {}, preparedSpells: [], extraSpells: [],
    favorites: {},
  },

  gear: { wornArmorId: null, heldShieldId: null, equippedWeaponIds: [] },

  itemMods: {                       // por item, do dono — não viaja em transferência
    'cat-greatpick': [
      { label: 'Rage', atk: 0, dmg: 2 },
      { label: 'Giant Instinct', atk: 0, dmg: 0, extraDice: 1 },
    ],
  },
}
```

**Migração:** mesa está na `version: 5`; `src/state/migrations.js` aplica em
cadeia sem descartar. Acrescentar a `6`: `sheet: null`, `vitals` padrão, `gear`
vazio, `itemMods: {}`. Os semeados Valeros/Seelah/Ezren viram o caso de teste do
estado "sem ficha".

**Ações novas do reducer:** `IMPORT_SHEET` `UPDATE_SHEET` `REMOVE_SHEET`
`APPLY_DAMAGE` `APPLY_HEAL` `SET_TEMP_HP` `SET_CONDITION` `CLEAR_CONDITIONS`
`EQUIP_ITEM` `UNEQUIP_ITEM` `SET_ITEM_MODS` `TOGGLE_SHIELD_RAISED` `SET_SHIELD_HP`
`SET_FOCUS` `USE_SPELL_SLOT` `PREPARE_SPELL` `ADD_SPELL` `REMOVE_SPELL` `REST`
`TOGGLE_FAVORITE`.

---

## 8. Equipar itens

**Slots explícitos**, não flag por item — com slot, o estado inválido (duas
armaduras vestidas) não é representável.

```js
gear = { wornArmorId, heldShieldId, equippedWeaponIds: [] }
```

- Uma armadura vestida; vestir outra desveste a anterior.
- Um escudo empunhado.
- Armas: várias equipadas. **Não validar número de mãos** — exige rastrear mão a
  cada turno, que é contabilidade de combate, fora do escopo.
- Controle na linha do item no inventário, junto de vender/enviar/excluir.
  Rótulo por tipo: **Vestir** (armadura), **Empunhar** (escudo), **Equipar** (arma).
- Efeito: armadura → CA e penalidades; escudo → habilita Erguer; armas equipadas
  aparecem primeiro na aba Ataques.
- Só aparece com ficha.

**Limitação aceita:** `player.items` é `{ itemId: qty }`, não lista de instâncias.
Modificador manual vale para a pilha inteira; não dá para ter uma adaga com runa e
outra sem. Mudar isso reescreve compra, venda, transferência e a Loja. Fora desta
entrega.

---

## 9. Motor de cálculo

`src/lib/sheet.js`, função pura, roda igual no cliente e no servidor. Portar a
forma do protótipo, não reinventar:

```js
stat(title, parts, opts) → { title, parts, total, altered, kind }
```

Nenhuma função devolve número solto: devolve **parcelas rotuladas** que somam,
mais a marca `altered` de "alterado por condição". Daí saem de graça o popup de
breakdown, os modificadores manuais como parcela nomeada, e o número em vermelho.

```
Large Greatpick — Ataque +7
  Str                       +4
  Proficiência (treinado)   +3
  Rage (manual)             +0
  Frightened (status)       −0
```

**Regra de proficiência** (fonte de erro mais comum):

```js
profBonus = rank === 0 ? 0 : level + rank    // untrained NÃO soma o nível
```

Vale para perícia, salvamento, arma e armadura.

---

## 10. Regras

O catálogo já traz tudo o que é preciso, em sub-objetos por tipo:
`armor {category acBonus dexCap checkPenalty speedPenalty strength}`,
`shield {hardness hpMax bt acBonus}`,
`weapon {category group hands damage{dice die damageType} range reload}`.

### 10.1 HP máximo
```
hpMax = ancestryhp + (classhp + conMod) × level + bonushp + bonushpPerLevel × level
```
Rurik: `10 + (12+2)×1 = 24`. Só muda com reimportação.

### 10.2 CA
```
CA = 10 + min(dexMod, dexCap) + profBonus(categoria da armadura vestida)
     + acBonus da armadura + acBonus do escudo se erguido
```
Sem armadura vestida: grau `unarmored`, sem `dexCap`.

### 10.3 Ataque e dano
```
ataque = profBonus(categoria da arma) + mod de atributo + modificadores manuais
dano   = dados da arma + mod de atributo + modificadores manuais
```
Atributo pelos traços do catálogo: `finesse` permite Dex no ataque; arma à
distância usa Dex no ataque e **não soma atributo no dano**, salvo `propulsive`;
arma de arremesso usa Dex no ataque e **Str no dano**. `specificProficiencies`
sobrepõe a categoria.

**MAP:** −5/−10, ou −4/−8 com `agile`.
**Unarmed Strike não é item** — injetar sempre, grau `unarmed`.

### 10.4 Perícias, salvamentos, percepção, DCs
```
valor = mod de atributo + profBonus(grau) + checkPenalty da armadura, onde couber
DC de classe = 10 + mod do atributo-chave + profBonus(classDC)
```
`checkPenalty` entra nas perícias de Str e Dex, exceto as que o PF2e isenta.
Lores entram como perícias comuns.

### 10.5 Bulk — fora desta versão (D8)
Não implementar. Encumbered é condição de marcação como as outras.
Guardado: `5 + strMod` sobrecarrega, `10 + strMod` trava.

### 10.6 Escudo
Dureza, PV máximo e VT do catálogo. Erguer soma `acBonus` como bônus de
circunstância. PV em stepper; abaixo do VT quebra e para de dar bônus. Só com
escudo empunhado.

### 10.7 Descanso — dois botões
- **Refocus** (bloco de foco, aba Magias): +1 ponto de foco.
- **Descanso noturno** (Resumo, porque mexe em HP e condições): repõe foco, repõe
  slots preparados, cura `conMod × level` PV (mínimo 1 por nível), **reduz Doomed
  em 1** — Doomed não zera. Wounded some quando o HP volta ao máximo, não pelo
  descanso.

### 10.8 Dano e cura
Dano consome HP temporário antes do HP real. Cura não passa do máximo. HP
temporário não acumula: vale o maior.

---

## 11. Condições

As 43 vêm do pack `conditions`, em inglês.

**Efeito mecânico automático em 8:** frightened, sickened, clumsy, enfeebled,
drained, slowed, prone, off-guard. As demais são marcação e referência.

- Frightened e Sickened são penalidade de status e **não somam**: vale o maior.
- Clumsy → o que depende de Dex. Enfeebled → Str. Drained → Fortitude e Con.
- Off-Guard: −2 de circunstância na CA. Prone: −2 de circunstância em ataques.
- Encumbered fica na marcação, sem efeito (bulk adiado).

---

## 12. Telas

### 12.1 Identidade visual (D15)
Protótipo dá layout; `docs/design-system.md` dá estilo. Discordando, vence o
design system.

- **Nenhum valor visual literal fora de `tokens.css`** (51 tokens cobrem tudo).
  Falta degrau? Usa o vizinho; se não servir, o degrau novo entra no `tokens.css`
  com nome e comentário.
- **Sem `style={{}}` para aparência** — só valor calculado em runtime (rotação de
  chevron, largura da barra de HP).
- **Seis tamanhos:** `--t-label` 11, `--t-meta` 12, `--t-sm` 13, `--t-body` 14.5,
  `--t-lg` 16, `--t-title` 26. **Quatro tintas:** `--text` `--text-body`
  `--text-2` `--text-3` (`--ornament` é ícone decorativo, não quinta tinta).
  **Duas superfícies:** `--surface-sunken` `--surface-raised`.
- **Azul age, vermelho destrói:** `--accent` para equipar, editar, favoritar,
  preparar magia, atualizar ficha. `--danger` para remover ficha, limpar condições.
- **Componentes com dono único:**

| Precisa de | Use |
|---|---|
| moedas | `<Coins>` / `<Price>` |
| mudar quantidade (HP, foco, PV do escudo, valor de condição, qtd de arremesso) | `<Stepper>` (`sm`/`lg`) |
| par aceitar/cancelar | `<SheetActions>` |
| sobrancelha de seção | `.label` |
| rótulo de campo | `.field-label` |
| vazio dentro de painel | `.empty--inline` |
| folha deslizante | `components/Sheet.jsx` |
| traços clicáveis | `components/TraitList.jsx` |

- **Confirmar à esquerda, cancelar à direita.** Par invertido é bug.
- **Ícones herdam a cor:** SVG novo entra em `Icons.jsx` com `currentColor`.
- **Toque:** `--tap-sm` 28px em lista, `--tap-md` 36px em cabeçalho, 44px em botão
  largo. Chevron e ícone nunca são o alvo — é o `.icon-btn` em volta.
- **Duas armadilhas de cascata** (§8 do design system): `<button>` não herda
  `text-transform` nem `letter-spacing`, então botão dentro de `.label` declara
  `inherit`; e estado `--on` vem **depois** do bloco base no arquivo. As sub-abas
  da ficha são exatamente esse caso.
- **CSS:** `components.css` para o que se repete, `screens.css` para o que é só da
  ficha.

### 12.2 O que ficou do protótipo, e o que não ficou
O protótipo do Claude Design deu o layout e foi removido do repositório depois
de cumprido esse papel. Do que ele trazia, nada de aparência sobreviveu como
literal: a moldura fixa de 360×812 virou layout responsivo mobile-first, os
`oklch` viraram token, e as constantes dele (`ACCENT`, `DANGER`, `TEXT_2`,
`TEXT_3`, `RAISED`) mais a escala 26/14.5/13/11 batem uma a uma com
`tokens.css`. Quem prova isso a cada build é o `npm run lint:visual`.

**Colisão de nome:** `src/components/Sheet.jsx` já existe (folha deslizante). A
ficha vai em `src/screens/CharacterSheet/`, prefixo CSS `.charsheet__`.

### 12.3 As cinco sub-abas

**Resumo** — HP com barra e HP temporário · condições em chips com folha de
gerenciamento · atributos · defesas (CA, escudo, três salvamentos) · outras
estatísticas (percepção, deslocamento, tamanho, DC de classe, DC e ataque de
magia) · perícias com grau e bônus · proficiências de arma e armadura ·
resistências, sentidos, idiomas · rodapé com data da importação. Todo número é
tocável e abre o breakdown. O botão **Atualizar** do rodapé não importa aqui (D14):
leva para a linha do personagem na tela do Mestre.

**Ataques** — montada do inventário: todas as armas, **as equipadas primeiro**.
Favoritos no topo. Corpo a corpo e À distância separados. Linha expansível com
traços, ficha técnica, quantidade e MAP. Unarmed Strike sempre presente. Edição de
modificadores manuais aqui e no inventário.

**Magias** — conjuração com DC e ataque · truques · foco com Refocus · slots
preparados · grimório · lista especial · **Compêndio navegável** com filtro de
tradição e círculo, do índice no bundle + descrições do servidor. Personagem sem
conjuração: aba não aparece. **Nunca foi exercitada contra dado real** — o
`spellCasters` do fixture está vazio.

**Feats** — agrupados em features de classe, feats de classe, ancestralidade e
herança, outros. Favoritos. Descrição do Foundry na linha expandida.

**Ações** — agrupadas em Classe, Perícia, Básicas. As básicas vêm do pack
`actions` e valem para todo personagem. Filtro por traço. Favoritos.

**Estado vazio** — personagem sem ficha (§6). E, logo após importar: a CA do Rurik
mostra 15 (desarmado), não 18, e Ataques nasce vazia, porque nenhum item veio
junto (D2). Aviso: *"Ficha importada. Agora monte a mochila no Inventário e vista
a armadura."*

---

## 13. Integração com o que já existe

5.745 linhas, reducer com 28 ações. Invariantes obrigatórios:

1. **Sair item, sair do slot.** `SELL_ITEM` `TRANSFER_ITEM` `DROP_ITEM` e
   `CHANGE_ITEM_QTY` para zero desequipam e limpam `favorites` e `itemMods`. É o
   bug de integração mais provável.
2. **Transferir item equipado:** desequipa na origem, chega desequipado, e
   `itemMods` **não** viaja — o modificador é do dono.
3. **`ItemForm` ganha ficha técnica** (D13), condicional ao tipo, gravando nos
   sub-objetos que `normalizeItem` já preserva:

   | Tipo | Campos |
   |---|---|
   | `weapon` | categoria (simple/martial/advanced/unarmed), grupo, mãos, nº de dados, dado (d4–d12), tipo de dano, à distância (alcance, recarga) |
   | `armor` | categoria (light/medium/heavy/unarmored), `acBonus`, `dexCap`, `checkPenalty`, `speedPenalty`, `strength` |
   | `shield` | `acBonus`, `hardness`, `hpMax`; **`bt = floor(hpMax/2)` calculado** |

   Todos opcionais. Serve item custom e item de campanha.
4. **Item de campanha já tem:** `foundryImport.js` produz `weapon`/`armor`/`shield`
   e `normalizeItem` preserva. Item de JSON funciona; item digitado, só com D13.
5. **Histórico:** `IMPORT_SHEET` `UPDATE_SHEET` `REMOVE_SHEET` entram. **HP,
   condições, foco e slots não entram** — mudam dezenas de vezes por combate e
   afogariam o log.
6. **`REMOVE_PLAYER`** já leva tudo junto; só conferir.
7. **`itemNotes` ≠ `itemMods`:** nota é texto do jogador, modificador é número.
8. **`npm run smoke`** ganha caso de ficha: dois clientes, um aplica dano, o outro vê.
9. **Bundle já tem 10,9 MB.** Medir o primeiro carregamento em Android real na LAN.

---

## 14. Servidor vs aparelho

Régua do `src/state/session.js`: fato do personagem no servidor, ponto de vista no
celular.

- **Servidor:** ficha, HP, HP temporário, condições, PV do escudo, escudo erguido,
  foco, slots usados, magias preparadas, favoritos, equipado, modificadores manuais.
- **Aparelho:** sub-aba ativa, grupos abertos/fechados, filtros, busca, popups.

Favoritos no servidor porque pertencem ao personagem, não a quem olha. Escudo
erguido também, porque o mestre precisa ver. Sem papéis e sem login: qualquer
aparelho altera qualquer um; o histórico registra quem foi.

---

## 15. Fases e modelos — concluídas

Registro de como a ficha foi construída, da fase 0 à 12. Todas entregues; os
roteiros por fase saíram do repositório depois de cumpridos. Fica a tabela
porque ela diz onde cada peça nasceu.

Critério do modelo, na época: **se isto sair errado, quando eu descubro?** Na
tela, agora → Sonnet. Três semanas depois, na mesa → Opus.

| Fase | Entrega | Modelo |
|---|---|---|
| 0 | `main`, README, `lint:visual` | Sonnet |
| 1 | `build-catalog.mjs` para `packs/pf2e/…` | Sonnet |
| 2 | Parser do Pathbuilder + fixtures + teste do Rurik | **Opus** |
| 3 | Migração `version 6` | **Opus** |
| 4 | `build-lore.mjs`, `build-traits.mjs`, rotas | Sonnet |
| 5 | `src/lib/sheet.js` | **Opus** |
| 6 | Vincular ficha no Mestre + estado vazio | Sonnet |
| 7 | Equipar itens + invariantes | **Opus** |
| 8 | Aba Resumo | Sonnet |
| 9 | Aba Ataques + modificadores manuais | Sonnet |
| 10 | Abas Feats e Ações | Sonnet |
| 11 | Aba Magias + Compêndio | Sonnet |
| 12 | PR e merge | **Opus** |

Fase marcada Sonnet que precise encostar em `state/`, `server/` ou `lib/sheet.js`
foi classificada errado: parar e reclassificar.

---

## 16. Aceite

O fixture do Rurik é o teste, **escrito na fase 2, antes do motor existir**.
Conferido à mão contra o export do Pathbuilder:

| Verificação | Esperado |
|---|---|
| HP máximo | 24 |
| CA sem armadura vestida | 15 |
| CA com Hide Armor vestida | 18 (= `acTotal.acTotal`) |
| Greatpick | ataque +7, dano 1d10+4 (= `weapons[0]`) |
| Javelin | ataque +5, dano 1d6+4 (Dex no ataque, Str no dano) |
| Athletics | +7 (Str 4 + treinado 2 + nível 1) |
| Fortitude / Reflex / Will | +7 / +5 / +6 |
| Perception | +6 |
| Arcana | +0 (untrained: sem nível) |
| Feats resolvidos | 7 de 10; `Darkvision` e `Low-Light Vision` do `en.json` |

Divergiu? O motor está errado, não o Pathbuilder.

Mais: personagem sem ficha continua comprando, vendendo e transferindo; vender
armadura vestida deixa a CA correta; `npm run smoke` passa; nenhum texto de regra
escrito à mão.

**Checagem visual por fase** (os quatro primeiros são `npm run lint:visual`):
zero `#hex`/`rgb(`/`oklch(`/`px` de aparência fora do `tokens.css`; nenhum
`style={{}}` novo com aparência; nenhum tamanho fora dos seis degraus; nenhuma
quinta tinta; todo par com confirmar à esquerda; todo `+`/`−` é `<Stepper>`; toda
moeda é `<Coins>`/`<Price>`; todo ícone em `Icons.jsx` com `currentColor`; alvo de
toque nunca é o chevron. E `npm run build` passa, testado em Android real na LAN.

---

## 17. Perguntas respondidas — não reabrir

Respondidas pelo Julio em 13/08. Valem como decisão.

1. **Filtro de conteúdo no compêndio** (fase 11): o compêndio de magias aplica o
   **mesmo filtro do catálogo** (`settings.ownedCategories` e `remasterFilter`),
   com um botão **"mostrar tudo"** que ignora o filtro pontualmente, sem alterar a
   configuração da mesa.
2. **Descanso noturno** (fase 8): **por personagem** — botão na ficha de cada um,
   aplicando só a ele. Um "descanso do grupo" na aba Mestre fica **anotado como
   sugestão futura**, não implementado.
3. **Um personagem por jogador**: **sim, continua valendo.**

## 17b. Onde a implementação divergiu da espec

Registrado em 13/08, ao fim das fases 0 a 10. Divergir de propósito é aceitável;
divergir sem registro, não.

| Ponto | A espec dizia | O que foi feito, e por quê |
|---|---|---|
| Chave do verbete | `slug → [offset, tamanho]` | `kind:slug`. Medido: 119 magias e 46 ações têm o mesmo slug de um feat (`fly` é ação **e** magia). Por slug puro, a magia sumia do compêndio sem um pio. |
| Prioridade de nome | cinco packs | oito. `glossary` entra **acima** de `spells` porque existe uma magia chamada *Darkvision*, e o `specials` do anão falava do sentido. |
| Nome do Punho | "Unarmed Strike" | **"Unarmed Attack"**, que é como o Foundry o publica em `PF2E.WeaponTypeUnarmed`. O Punho não está em pack: é extraído de `src/module/actor/character/document.ts` na ingestão, com falha alta se o bloco mudar de forma. |
| Grupos da aba Ações | Classe · Perícia · Básicas | mantido, mas o critério são as **pastas do pack** (`class/`, `skill/`, `basic/`), não uma lista nossa. |
| Modificador de Rage pré-preenchido | sugerido na fase 9 | **não feito.** O número da Fúria muda com instinto, nível e arma; preenchê-lo seria o app chutando, o oposto de D6. No lugar, uma nota no topo da aba contando que o campo existe. |
| `REST` | fase 8 dispararia o descanso da tela | virou **ação do reducer**. Cura, foco, slots e Doomed mudam juntos ou não mudam; em quatro despachos, um Wi-Fi oscilando deixaria o personagem curado e ainda Doomed. |
| `traits.equipment.json` | — | renomeado para `traits.json`: passou a cobrir magia, condição, feat e ação (242 → 385 traços). |
| Resolução de magia (fase 11) | nome via `nameIndex`, como feat/ação | **slug adivinhado**: `spell:<slugify(nome)>`, buscado direto por `/api/entry/`. O nome já chega desambiguado pelo contexto (`spellCasters[].spells`), então não precisa do índice de prioridade — e evita colisão com magia homônima de feat/ação. Medido 10/10 no fixture do mago. |
| Círculo de truque no compêndio (fase 11) | — (não previsto na espec) | o Foundry guarda truque como **rank 1** com o traço `cantrip`, não rank 0 como o Pathbuilder. Sem correção, o compêndio não mostrava o filtro "Truque" e o botão Preparar de um truque gastava uma vaga de círculo 1. `Compendio.jsx` traduz: `rankEfetivo = traço "cantrip" ? 0 : rank`. |
| Conjuração espontânea/inata (fase 11) | implementar como preparada | **modo leitura**: lista de magias conhecidas agrupada por círculo, com aviso explícito de que a ficha não controla quantas já foram lançadas hoje. Só existe fixture de conjurador **preparado** (`wizard.json`); implementar o controle de espontâneo sem um export real para testar seria a ficha chutando, o oposto de D6. |
| Lista especial (`vitals.extraSpells`, fase 11) | — (não prevista na espec) | magia de item/pergaminho/ritual/concessão do mestre, adicionada por nome livre, sem teto de círculo. `REST` não mexe nela — o app não sabe a regra de recarga de cada uma (D5). |

### O que ficou de fora, e continua de fora

Runas · bulk e carga (D8) · contêineres · inventário por instância (o modificador
manual vale para a pilha inteira, §8) · validação de número de mãos (§8) ·
level-up, escolha de feat, rolagem de dado, iniciativa e controle de combate ·
contagem de magias já lançadas por conjurador espontâneo/inato (fase 11, sem
fixture real para testar).

**Anotado como sugestão futura, não implementado:** descanso do grupo inteiro na
aba Mestre (a resposta 1 da §17 pediu por personagem).

## 18. Riscos

1. ~~**Aba Magias escrita contra dados inventados** até chegar um JSON de
   conjurador.~~ **Fechado em 13/08**: `docs/fixtures/wizard.json`, mago humano
   nível 1, conjuração preparada. Cobre truque, círculo, foco e grimório; segue
   sem fixture de conjurador **espontâneo/inato** — essa aba entra em modo
   leitura nesse caso (§12.3, §17b).
2. **Cálculo vai divergir do Pathbuilder** em Giant Instinct, weapon
   specialization e Rage. Preço de D2; a resposta é o modificador manual.
3. **`player.sheet` nulo** em caminho não tratado.
4. **Item equipado que sai do inventário** (§13.1).
5. ~~**Termux:** o servidor pode ser um celular.~~ **Descartado em 13/08:** o servidor roda só no PC do mestre. Em troca entrou um risco novo — com o acesso por Cloudflare o app fica exposto à internet, e ele não tem login nem papéis (§6 do README): quem tiver o endereço mexe na mesa.
6. **Licença:** packs sob ORC/OGL e Community Use Policy. Preservar `publication`
   em todo verbete resolvido.
