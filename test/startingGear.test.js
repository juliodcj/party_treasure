/* A bagagem do Pathbuilder: os itens e as moedas que vêm junto com a ficha.
 *
 * Duas regras mandam neste arquivo, e são as duas que a mesa cobra:
 *
 * 1. **Só na primeira vinculação.** Reimportar para subir de nível não pode
 *    ressuscitar a poção que o grupo bebeu nem devolver o ouro já gasto.
 * 2. **Somando, nunca substituindo.** O que estava na mochila continua lá.
 *
 * A terceira, mais antiga que as duas: nome que o catálogo não conhece não some
 * e não é aproximado — vira item avulso com o nome que veio.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { gearIsConsistent, reducer } from '../src/state/reducer.js'
import { emptySheetFields } from '../src/state/migrations.js'
import { parsePathbuilder } from '../src/lib/pathbuilder.js'
import { resolveStartingItems } from '../src/lib/startingGear.js'
import { playerInventory } from '../src/lib/items.js'
import { CATALOG } from '../src/data/catalog.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const RURIK = parsePathbuilder(readFileSync(path.join(ROOT, 'docs/fixtures/rurik.json'), 'utf8'))

/* ------------------------------------------------ o casamento com o catálogo */

test('o catálogo não tem nome repetido — o índice por nome não precisa desempatar', () => {
  const nomes = new Set(CATALOG.map((item) => item.name.trim().toLowerCase()))
  assert.equal(nomes.size, CATALOG.length)
})

test('os treze itens do Rurik casam com o catálogo, inclusive a armadura', () => {
  const { matched, unmatched } = resolveStartingItems(RURIK.startingItems)

  assert.deepEqual(unmatched, [])
  assert.equal(matched.length, 13)
  // o caso que fechou D2: "Hide" no Pathbuilder é "Hide Armor" no catálogo
  assert.deepEqual(matched.find((entrada) => entrada.itemId === 'cat-hide-armor'), {
    itemId: 'cat-hide-armor',
    name: 'Hide Armor',
    qty: 1,
  })
  assert.equal(matched.find((entrada) => entrada.itemId === 'cat-chalk').qty, 10)
  assert.equal(matched.find((entrada) => entrada.itemId === 'cat-javelin').qty, 4)
})

test('o sufixo Armor só vale para quem veio da lista de armaduras', () => {
  const { matched, unmatched } = resolveStartingItems([
    { name: 'Hide', qty: 1, kind: 'armor' },
    { name: 'Hide', qty: 1, kind: 'equipment' },
  ])

  assert.deepEqual(matched.map((entrada) => entrada.itemId), ['cat-hide-armor'])
  assert.deepEqual(unmatched, [{ name: 'Hide', qty: 1, category: 'equipment' }])
})

test('nome que o catálogo não conhece vira item avulso com o nome que veio', () => {
  const { matched, unmatched } = resolveStartingItems([
    { name: 'Espada do Mestre', qty: 1, kind: 'weapon' },
    { name: 'Bugiganga', qty: 2, kind: 'equipment' },
  ])

  assert.deepEqual(matched, [])
  assert.deepEqual(unmatched, [
    { name: 'Espada do Mestre', qty: 1, category: 'weapon' },
    { name: 'Bugiganga', qty: 2, category: 'equipment' },
  ])
})

test('o mesmo item em duas listas do Pathbuilder vira uma linha só', () => {
  const { matched, unmatched } = resolveStartingItems([
    { name: 'Javelin', qty: 4, kind: 'weapon' },
    { name: 'Javelin', qty: 2, kind: 'equipment' },
    { name: 'Bugiganga', qty: 1, kind: 'equipment' },
    { name: 'bugiganga', qty: 1, kind: 'equipment' },
  ])

  assert.deepEqual(matched, [{ itemId: 'cat-javelin', name: 'Javelin', qty: 6 }])
  assert.deepEqual(unmatched, [{ name: 'Bugiganga', qty: 2, category: 'equipment' }])
})

test('bagagem ausente ou torta não lança nem inventa item', () => {
  for (const entrada of [undefined, null, [], 'nada', [null, {}, { name: '   ' }]]) {
    assert.deepEqual(resolveStartingItems(entrada), { matched: [], unmatched: [] })
  }
})

/* ------------------------------------------------------- a entrega na mesa */

const LONGSWORD = 'cat-longsword'

function mesa() {
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
        gold: 5,
        silver: 3,
        copper: 0,
        items: { [LONGSWORD]: 1, 'cat-rope': 1 },
        customItems: [],
        itemNotes: {},
        ...emptySheetFields(),
      },
    ],
  }
}

const rurikDe = (state) => state.players.find((p) => p.id === 'p-rurik')

function agir(state, action) {
  const next = reducer(state, action)
  for (const player of next.players) assert.ok(gearIsConsistent(player))
  return next
}

const vincular = (state, sheet = RURIK) =>
  agir(state, { type: 'IMPORT_SHEET', playerId: 'p-rurik', sheet })

test('vincular a ficha põe os itens do Pathbuilder na mochila', () => {
  const rurik = rurikDe(vincular(mesa()))

  assert.equal(rurik.items['cat-hide-armor'], 1)
  assert.equal(rurik.items['cat-javelin'], 4)
  assert.equal(rurik.items['cat-chalk'], 10)
})

test('a bagagem soma à mochila, e não substitui nada do que já estava lá', () => {
  const rurik = rurikDe(vincular(mesa()))

  assert.equal(rurik.items[LONGSWORD], 1, 'a espada da mesa continua na mochila')
  // corda o Pathbuilder também trazia: soma, não sobrescreve
  assert.equal(rurik.items['cat-rope'], 2)
})

test('a moeda do Pathbuilder soma à carteira', () => {
  const rurik = rurikDe(vincular(mesa()))

  assert.equal(rurik.gold, 16, '5 da mesa + 11 do Pathbuilder')
  assert.equal(rurik.silver, 3, 'a prata da mesa fica onde estava')
})

test('reimportar NÃO traz item nem moeda de novo', () => {
  let state = vincular(mesa())
  const depoisDaPrimeira = rurikDe(state)

  // a mesa aconteceu: bebeu-se a poção, gastou-se o ouro
  state = agir(state, { type: 'CHANGE_ITEM_QTY', playerId: 'p-rurik', itemId: 'cat-torch', delta: -5 })
  state = agir(state, { type: 'ADJUST_COINS', playerId: 'p-rurik', deltaCp: -1000 })

  const antes = rurikDe(state)
  state = agir(state, { type: 'UPDATE_SHEET', playerId: 'p-rurik', sheet: { ...RURIK, level: 2 } })
  const depois = rurikDe(state)

  assert.equal(depois.sheet.level, 2, 'a ficha atualizou')
  assert.deepEqual(depois.items, antes.items, 'a tocha gasta não voltou')
  assert.equal(depois.gold, antes.gold, 'o ouro gasto não voltou')
  assert.equal(depois.items['cat-torch'], undefined)
  assert.ok(depoisDaPrimeira.items['cat-torch'] === 5)
})

test('nome fora do catálogo entra como item avulso, com o nome que veio', () => {
  const ficha = {
    ...RURIK,
    startingItems: [{ name: 'Machado do Vovô', qty: 1, kind: 'weapon' }],
    startingCoins: { gold: 0, silver: 0, copper: 0 },
  }
  const rurik = rurikDe(vincular(mesa(), ficha))

  assert.equal(rurik.customItems.length, 1)
  const avulso = rurik.customItems[0]
  assert.equal(avulso.name, 'Machado do Vovô')
  assert.equal(avulso.category, 'weapon')
  assert.equal(avulso.priceCp, 0, 'preço que a fonte não deu não se inventa')
  assert.equal(rurik.items[avulso.id], 1)
  // e ele aparece no inventário como qualquer outro item
  assert.ok(playerInventory({ ...mesa(), players: [rurik] }, rurik).some((e) => e.item.id === avulso.id))
})

test('ficha sem bagagem nenhuma não encosta em mochila nem carteira', () => {
  const vazia = { ...RURIK, startingItems: [], startingCoins: { gold: 0, silver: 0, copper: 0 } }
  const antes = rurikDe(mesa())
  const depois = rurikDe(vincular(mesa(), vazia))

  assert.deepEqual(depois.items, antes.items)
  assert.deepEqual(depois.customItems, antes.customItems)
  assert.equal(depois.gold, antes.gold)
})

test('o item que chegou é item como qualquer outro: dá para vender e para vestir', () => {
  let state = vincular(mesa())

  state = agir(state, { type: 'EQUIP_ITEM', playerId: 'p-rurik', itemId: 'cat-hide-armor' })
  assert.equal(rurikDe(state).gear.wornArmorId, 'cat-hide-armor')

  state = agir(state, { type: 'SELL_ITEM', playerId: 'p-rurik', itemId: 'cat-hide-armor' })
  assert.equal(rurikDe(state).items['cat-hide-armor'], undefined)
  assert.equal(rurikDe(state).gear.wornArmorId, null, 'vendeu, desequipou')
})
