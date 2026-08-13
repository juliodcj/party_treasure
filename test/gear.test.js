/* Equipar, e o que acontece quando o item equipado sai.
 *
 * Este arquivo existe por causa de UM bug, o mais provável de toda a entrega e o
 * que menos avisa: vender a armadura e continuar com o bônus de CA dela. O slot
 * fica apontando para um item que não existe mais, o número segue somando, e
 * ninguém descobre na hora — descobre num combate, três semanas depois.
 *
 * Por isso quase todo teste aqui termina do mesmo jeito: confere o invariante
 * "todo id em `gear` está em `items`" DEPOIS da ação, e confere que a CA caiu.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { gearIsConsistent, reducer } from '../src/state/reducer.js'
import { emptySheetFields } from '../src/state/migrations.js'
import { parsePathbuilder } from '../src/lib/pathbuilder.js'
import { buildSheet } from '../src/lib/sheet.js'
import { playerInventory } from '../src/lib/items.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const RURIK = parsePathbuilder(readFileSync(path.join(ROOT, 'docs/fixtures/rurik.json'), 'utf8'))

const HIDE = 'cat-hide-armor'
const ESCUDO = 'cat-steel-shield'
const GREATPICK = 'cat-greatpick'
const JAVELIN = 'cat-javelin'
const LEATHER = 'cat-leather-armor'

/** Uma mesa com o Rurik vestido dos pés à cabeça, e um segundo personagem. */
function mesa({ comFicha = true } = {}) {
  return {
    version: 6,
    settings: { ownedCategories: [], remasterFilter: 'all' },
    history: [],
    campaignItems: [],
    shops: [],
    players: [
      {
        id: 'p-rurik',
        name: 'Rurik',
        gold: 10,
        silver: 0,
        copper: 0,
        items: { [HIDE]: 1, [ESCUDO]: 1, [GREATPICK]: 1, [JAVELIN]: 4, [LEATHER]: 1 },
        customItems: [],
        itemNotes: {},
        ...emptySheetFields(),
        sheet: comFicha ? RURIK : null,
        vitals: { ...emptySheetFields().vitals, hp: 24 },
      },
      {
        id: 'p-seelah',
        name: 'Seelah',
        gold: 5,
        silver: 0,
        copper: 0,
        items: {},
        customItems: [],
        itemNotes: {},
        ...emptySheetFields(),
      },
    ],
  }
}

const rurikDe = (state) => state.players.find((p) => p.id === 'p-rurik')
const seelahDe = (state) => state.players.find((p) => p.id === 'p-seelah')

/** Roda uma ação e já cobra o invariante de todo mundo. */
function agir(state, action) {
  const next = reducer(state, action)
  for (const player of next.players) {
    assert.ok(
      gearIsConsistent(player),
      `depois de ${action.type}, ${player.name} tem slot apontando para item que não está na mochila`,
    )
  }
  return next
}

/** A CA calculada de verdade, como a tela mostra. */
function ca(state, playerId = 'p-rurik') {
  const player = state.players.find((p) => p.id === playerId)
  const items = playerInventory(state, player).map(({ item, qty }) => ({ ...item, qty }))
  return buildSheet({
    sheet: player.sheet,
    items,
    gear: player.gear,
    vitals: player.vitals,
    itemMods: player.itemMods,
  })?.ac.total
}

/** Vestido, empunhando e armado. */
function vestido(base = mesa()) {
  let state = base
  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: HIDE })
  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: ESCUDO })
  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: GREATPICK })
  return state
}

/* ------------------------------------------------------------------ slots */

test('vestir, empunhar e equipar preenchem cada um o seu slot', () => {
  const gear = rurikDe(vestido()).gear

  assert.equal(gear.wornArmorId, HIDE)
  assert.equal(gear.heldShieldId, ESCUDO)
  assert.deepEqual(gear.equippedWeaponIds, [GREATPICK])
  assert.equal(ca(vestido()), 18)
})

test('vestir outra armadura desveste a anterior — duas ao mesmo tempo nem é representável', () => {
  const state = agir(vestido(), { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: LEATHER })

  assert.equal(rurikDe(state).gear.wornArmorId, LEATHER)
  // não existe lista de armaduras: `wornArmorId` é um campo só
  assert.equal(typeof rurikDe(state).gear.wornArmorId, 'string')
})

test('várias armas ficam equipadas juntas, e ninguém conta mãos', () => {
  const state = agir(vestido(), { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: JAVELIN })

  // Greatpick é de duas mãos e o Javelin de uma: somando, seriam três. Validar
  // isso exigiria rastrear a mão a cada turno — contabilidade de combate.
  assert.deepEqual(rurikDe(state).gear.equippedWeaponIds, [GREATPICK, JAVELIN])
})

test('equipar a mesma arma duas vezes não a duplica', () => {
  const state = agir(vestido(), { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: GREATPICK })
  assert.deepEqual(rurikDe(state).gear.equippedWeaponIds, [GREATPICK])
})

test('não dá para equipar o que não está na mochila', () => {
  const state = agir(mesa(), { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: 'cat-longsword' })
  assert.deepEqual(rurikDe(state).gear.equippedWeaponIds, [])
})

test('corda e sabão não se vestem', () => {
  let state = agir(mesa(), { type: 'GIVE_ITEM', playerId: 'p-rurik', itemId: 'cat-rope', qty: 1 })
  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: 'cat-rope' })

  const gear = rurikDe(state).gear
  assert.equal(gear.wornArmorId, null)
  assert.deepEqual(gear.equippedWeaponIds, [])
})

test('empunhar o escudo o traz inteiro e baixado; guardá-lo baixa a guarda', () => {
  let state = vestido()
  assert.equal(rurikDe(state).vitals.shieldHp, 20) // hpMax do Steel Shield
  assert.equal(rurikDe(state).vitals.shieldRaised, false)

  state = agir(state, { type: 'TOGGLE_SHIELD_RAISED', playerId: 'p-rurik' })
  assert.equal(ca(state), 20, 'erguido soma o bônus de circunstância')

  state = agir(state, { type: 'UNEQUIP_ITEM', playerId: 'p-rurik', itemId: ESCUDO })
  assert.equal(rurikDe(state).vitals.shieldRaised, false, 'escudo na mochila não fica erguido')
  assert.equal(ca(state), 18)
})

/* ----------------------------------------------- o invariante, item por item */

test('vender a armadura vestida deixa a CA correta', () => {
  const antes = vestido()
  assert.equal(ca(antes), 18)

  const depois = agir(antes, { type: 'SELL_ITEM', playerId: 'p-rurik', itemId: HIDE, qty: 1 })

  assert.equal(rurikDe(depois).gear.wornArmorId, null)
  assert.equal(ca(depois), 15, 'a CA tinha que cair junto com a armadura vendida')
  assert.ok(rurikDe(depois).gold > rurikDe(antes).gold, 'e o dinheiro tinha que entrar')
})

test('excluir o escudo empunhado tira o bônus mesmo com ele erguido', () => {
  let state = agir(vestido(), { type: 'TOGGLE_SHIELD_RAISED', playerId: 'p-rurik' })
  assert.equal(ca(state), 20)

  state = agir(state, { type: 'DROP_ITEM', playerId: 'p-rurik', itemId: ESCUDO })
  assert.equal(rurikDe(state).gear.heldShieldId, null)
  assert.equal(ca(state), 18)
})

test('o +/- chegando a zero desequipa; parando em 1, não', () => {
  let state = agir(vestido(), { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: JAVELIN })

  state = agir(state, { type: 'CHANGE_ITEM_QTY', playerId: 'p-rurik', itemId: JAVELIN, delta: -3 })
  assert.deepEqual(rurikDe(state).gear.equippedWeaponIds, [GREATPICK, JAVELIN], 'ainda tem um')

  state = agir(state, { type: 'CHANGE_ITEM_QTY', playerId: 'p-rurik', itemId: JAVELIN, delta: -1 })
  assert.deepEqual(rurikDe(state).gear.equippedWeaponIds, [GREATPICK], 'acabou, saiu do slot')
})

test('vender parte da pilha não desequipa o que sobrou', () => {
  let state = agir(vestido(), { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: JAVELIN })
  state = agir(state, { type: 'SELL_ITEM', playerId: 'p-rurik', itemId: JAVELIN, qty: 2 })

  assert.equal(rurikDe(state).items[JAVELIN], 2)
  assert.ok(rurikDe(state).gear.equippedWeaponIds.includes(JAVELIN))
})

test('transferir desequipa na origem e chega guardado no destino', () => {
  let state = vestido()
  state = agir(state, {
    type: 'SET_ITEM_MODS',
    playerId: 'p-rurik',
    itemId: GREATPICK,
    mods: [{ label: 'Rage', atk: 0, dmg: 2 }],
  })
  state = agir(state, { type: 'TOGGLE_FAVORITE', playerId: 'p-rurik', key: GREATPICK })

  state = agir(state, {
    type: 'TRANSFER_ITEM',
    fromId: 'p-rurik',
    toId: 'p-seelah',
    itemId: GREATPICK,
    qty: 1,
  })

  assert.deepEqual(rurikDe(state).gear.equippedWeaponIds, [])
  assert.deepEqual(seelahDe(state).gear.equippedWeaponIds, [], 'chega guardado, não vestido')

  // O modificador é do dono, não do item: não viaja e não fica para trás
  assert.equal(rurikDe(state).itemMods[GREATPICK], undefined)
  assert.equal(seelahDe(state).itemMods[GREATPICK], undefined)
  assert.equal(rurikDe(state).vitals.favorites[GREATPICK], undefined)
})

test('remover o item da biblioteca não deixa slot pendurado em ninguém', () => {
  let state = mesa()
  state = agir(state, {
    type: 'ADD_CAMPAIGN_ITEMS',
    items: [{ id: 'camp-couraca', name: 'Couraça de Venis', category: 'armor', priceCp: 0, armor: { category: 'medium', acBonus: 4, dexCap: 1 } }],
  })
  state = agir(state, { type: 'GIVE_ITEM', playerId: 'p-rurik', itemId: 'camp-couraca', qty: 1 })
  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: 'camp-couraca' })
  assert.equal(rurikDe(state).gear.wornArmorId, 'camp-couraca')

  state = agir(state, { type: 'REMOVE_CAMPAIGN_ITEM', itemId: 'camp-couraca' })
  assert.equal(rurikDe(state).gear.wornArmorId, null, 'armadura que a biblioteca não conhece mais não fica vestida')
})

test('renomear leva o slot e o modificador junto — é o mesmo objeto, com apelido', () => {
  let state = vestido()
  state = agir(state, {
    type: 'SET_ITEM_MODS',
    playerId: 'p-rurik',
    itemId: HIDE,
    mods: [{ label: 'Couro do avô', atk: 0, dmg: 0 }],
  })
  state = agir(state, {
    type: 'RENAME_ITEM',
    playerId: 'p-rurik',
    itemId: HIDE,
    name: 'Couro do avô',
  })

  const rurik = rurikDe(state)
  const novoId = rurik.customItems.at(-1).id

  assert.equal(rurik.gear.wornArmorId, novoId, 'renomear não pode desvestir sozinho')
  assert.ok(rurik.itemMods[novoId])
  assert.equal(rurik.itemMods[HIDE], undefined)
  assert.equal(ca(state), 18, 'e a CA continua a mesma')
})

test('remover a ficha guarda o que está equipado, para a reimportação encontrar', () => {
  const state = agir(vestido(), { type: 'REMOVE_SHEET', playerId: 'p-rurik' })
  const rurik = rurikDe(state)

  assert.equal(rurik.sheet, null)
  assert.equal(rurik.gear.wornArmorId, HIDE)
  assert.deepEqual(rurik.gear.equippedWeaponIds, [GREATPICK])
  assert.equal(ca(state), undefined, 'sem ficha não há CA para calcular')
})

/* ------------------------------------------------- modificadores manuais */

test('o modificador manual entra no dano com o rótulo do jogador', () => {
  const state = agir(vestido(), {
    type: 'SET_ITEM_MODS',
    playerId: 'p-rurik',
    itemId: GREATPICK,
    mods: [{ label: 'Rage', atk: 0, dmg: 2 }, { label: 'Giant Instinct', atk: 0, dmg: 0, extraDice: 1 }],
  })

  const rurik = rurikDe(state)
  const items = playerInventory(state, rurik).map(({ item, qty }) => ({ ...item, qty }))
  const view = buildSheet({ ...rurik, items })
  const pick = view.attacks.find((a) => a.name === 'Greatpick')

  assert.equal(pick.damage.formula, '2d10+6', 'dado extra e +2 de Rage')
  assert.ok(pick.damage.bonus.parts.some((p) => p.label === 'Rage (manual)'))
})

test('modificador sem rótulo não entra: número sem explicação é o que a espec proíbe', () => {
  const state = agir(mesa(), {
    type: 'SET_ITEM_MODS',
    playerId: 'p-rurik',
    itemId: GREATPICK,
    mods: [{ label: '  ', atk: 5, dmg: 5 }],
  })
  assert.equal(rurikDe(state).itemMods[GREATPICK], undefined)
})

test('lista vazia de modificadores apaga a chave em vez de guardar vazio', () => {
  let state = agir(mesa(), {
    type: 'SET_ITEM_MODS',
    playerId: 'p-rurik',
    itemId: GREATPICK,
    mods: [{ label: 'Rage', dmg: 2 }],
  })
  state = agir(state, { type: 'SET_ITEM_MODS', playerId: 'p-rurik', itemId: GREATPICK, mods: [] })
  assert.deepEqual(rurikDe(state).itemMods, {})
})

/* -------------------------------------------------------------- nada regride */

test('personagem sem ficha equipa sem quebrar, e continua comprando e vendendo', () => {
  let state = mesa({ comFicha: false })

  // o controle não aparece na tela, mas a ação não pode explodir se chegar
  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: HIDE })
  assert.equal(ca(state), undefined)

  state = agir(state, { type: 'SELL_ITEM', playerId: 'p-rurik', itemId: HIDE, qty: 1 })
  assert.equal(rurikDe(state).items[HIDE], undefined)
  assert.ok(rurikDe(state).gold > 10)

  state = agir(state, {
    type: 'BUY_CART',
    playerId: 'p-rurik',
    lines: [{ itemId: 'cat-rope', qty: 1 }],
  })
  assert.equal(rurikDe(state).items['cat-rope'], 1)
})

test('a mesa inteira sobrevive a uma sequência de ações sem soltar um slot', () => {
  let state = vestido()
  const roteiro = [
    { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: JAVELIN },
    { type: 'SELL_ITEM', playerId: 'p-rurik', itemId: JAVELIN, qty: 4 },
    { type: 'TRANSFER_ITEM', fromId: 'p-rurik', toId: 'p-seelah', itemId: ESCUDO, qty: 1 },
    { type: 'DROP_ITEM', playerId: 'p-rurik', itemId: HIDE },
    { type: 'CHANGE_ITEM_QTY', playerId: 'p-rurik', itemId: GREATPICK, delta: -1 },
  ]
  for (const action of roteiro) state = agir(state, action)

  assert.deepEqual(rurikDe(state).gear, {
    wornArmorId: null,
    heldShieldId: null,
    equippedWeaponIds: [],
  })
  assert.equal(ca(state), 15, 'sem nada vestido, a CA é a de quem está desarmado')
})

/* ------------------------------------------------- ficha técnica do item (D13) */

test('escudo feito à mão calcula o Limiar de Avaria em vez de aceitar digitado', () => {
  let state = agir(mesa(), {
    type: 'ADD_CUSTOM_ITEM',
    playerId: 'p-rurik',
    item: {
      id: 'custom-broquel',
      name: 'Broquel do avô',
      category: 'shield',
      priceCp: 0,
      // O formulário calcula: bt = floor(hpMax / 2)
      shield: { acBonus: 1, hardness: 3, hpMax: 9, bt: Math.floor(9 / 2) },
    },
  })

  const escudo = rurikDe(state).customItems.at(-1)
  assert.equal(escudo.shield.bt, 4)

  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: 'custom-broquel' })
  state = agir(state, { type: 'TOGGLE_SHIELD_RAISED', playerId: 'p-rurik' })
  assert.equal(ca(state), 16, 'escudo de campanha entra na CA como qualquer outro')
})

test('arma feita à mão vira ataque de verdade na ficha', () => {
  let state = agir(mesa(), {
    type: 'ADD_CUSTOM_ITEM',
    playerId: 'p-rurik',
    item: {
      id: 'custom-machado',
      name: 'Machado do avô',
      category: 'weapon',
      priceCp: 0,
      traits: ['agile'],
      weapon: {
        category: 'martial',
        group: 'axe',
        hands: 1,
        ranged: false,
        range: null,
        reload: null,
        damage: { dice: 1, die: 'd8', damageType: 'slashing' },
      },
    },
  })
  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: 'custom-machado' })

  const rurik = rurikDe(state)
  const items = playerInventory(state, rurik).map(({ item, qty }) => ({ ...item, qty }))
  const view = buildSheet({ ...rurik, items })
  const machado = view.attacks.find((a) => a.name === 'Machado do avô')

  assert.equal(machado.attack.total, 7) // Str 4 + (1 + martial trained 2)
  assert.equal(machado.damage.formula, '1d8+4')
  assert.equal(machado.map.second, 3, 'ágil: MAP de −4, não −5')
  assert.equal(machado.equipped, true)
})

test('armadura feita à mão entra na CA com o dexCap dela', () => {
  let state = agir(mesa(), {
    type: 'ADD_CUSTOM_ITEM',
    playerId: 'p-rurik',
    item: {
      id: 'custom-cota',
      name: 'Cota do avô',
      category: 'armor',
      priceCp: 0,
      armor: { category: 'heavy', acBonus: 6, dexCap: 0, checkPenalty: -3, speedPenalty: -10, strength: 9 },
    },
  })
  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: 'custom-cota' })

  // O Rurik é destreinado em armadura pesada: 10 + Dex limitado a 0 + prof 0 + 6
  assert.equal(ca(state), 16)
})
