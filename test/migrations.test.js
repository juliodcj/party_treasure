/* A migração mexe no arquivo que guarda a mesa de verdade — a mesa do Julio,
 * com o dinheiro e os itens de uma campanha em andamento. Migração que perde
 * campo não avisa: o jogador só descobre no meio da sessão que a corda sumiu.
 *
 * Por isso metade destes testes não olha o que foi acrescentado, e sim o que
 * tinha que continuar lá.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { emptySheetFields, migrate, withSheetFields } from '../src/state/migrations.js'
import { createInitialState } from '../src/state/initialState.js'
import { reducer } from '../src/state/reducer.js'
import { withHistory } from '../src/state/history.js'
import { sanitizeTable } from '../server/table.js'
import { parsePathbuilder } from '../src/lib/pathbuilder.js'

const VERSAO_ATUAL = createInitialState().version

/** Uma mesa `version: 5` como as que estão gravadas em data/mesa.json hoje. */
const mesaV5 = () => ({
  version: 5,
  settings: { ownedCategories: ['core'], remasterFilter: 'remaster' },
  history: [{ id: 'hist-1', at: 1, label: 'Deu moedas a Valeros', by: 'Ezren', slices: {} }],
  players: [
    {
      id: 'p-valeros',
      name: 'Valeros',
      gold: 45,
      silver: 7,
      copper: 13,
      items: { 'cat-longsword': 1, 'cat-rope': 2 },
      customItems: [{ id: 'custom-1', name: 'Espada do avô', priceCp: 0, category: 'weapon' }],
      itemNotes: { 'cat-longsword': 'lascada na ponta' },
    },
    { id: 'p-ezren', name: 'Ezren', gold: 30, silver: 0, copper: 0, items: {}, customItems: [], itemNotes: {} },
  ],
  campaignItems: [{ id: 'camp-1', name: 'Amuleto de Venis', priceCp: 500, category: 'equipment' }],
  shops: [{ id: 'shop-smith', name: 'Ferreiro de Venis', itemIds: ['cat-longsword'] }],
})

/* ---------------------------------------------------------------- migração */

test('a mesa version 5 chega na atual sem perder um campo sequer', () => {
  const antes = mesaV5()
  const depois = migrate(antes, VERSAO_ATUAL)

  assert.equal(depois.version, VERSAO_ATUAL)
  assert.deepEqual(depois.settings, antes.settings)
  assert.deepEqual(depois.history, antes.history)
  assert.deepEqual(depois.campaignItems, antes.campaignItems)
  assert.deepEqual(depois.shops, antes.shops)

  const valeros = depois.players.find((p) => p.id === 'p-valeros')
  assert.equal(valeros.name, 'Valeros')
  assert.equal(valeros.gold, 45)
  assert.equal(valeros.silver, 7)
  assert.equal(valeros.copper, 13)
  assert.deepEqual(valeros.items, { 'cat-longsword': 1, 'cat-rope': 2 })
  assert.deepEqual(valeros.customItems, antes.players[0].customItems)
  assert.deepEqual(valeros.itemNotes, { 'cat-longsword': 'lascada na ponta' })
})

test('todo jogador ganha os campos da ficha, vazios', () => {
  const depois = migrate(mesaV5(), VERSAO_ATUAL)

  for (const player of depois.players) {
    assert.equal(player.sheet, null, 'ninguém ganha ficha na migração')
    assert.equal(player.vitals.hp, null, 'sem ficha não existe HP máximo, e zero seria mentira')
    assert.equal(player.vitals.tempHp, 0)
    assert.deepEqual(player.vitals.conditions, {})
    assert.deepEqual(player.vitals.favorites, {})
    assert.equal(player.vitals.shieldRaised, false)
    assert.deepEqual(player.gear, { wornArmorId: null, heldShieldId: null, equippedWeaponIds: [] })
    assert.deepEqual(player.itemMods, {})
  }
})

test('migrar duas vezes dá exatamente o mesmo resultado', () => {
  const uma = migrate(mesaV5(), VERSAO_ATUAL)
  const duas = migrate(uma, VERSAO_ATUAL)
  assert.deepEqual(duas, uma)
})

test('a cadeia inteira, da version 2 até a atual, não descarta a mesa', () => {
  const antiga = {
    version: 2,
    players: [{ id: 'p-1', name: 'Valeros', gold: 5, silver: 0, copper: 0, items: { 'cat-rope': 1 }, customItems: [] }],
    campaignItems: [],
    shops: [],
  }
  const depois = migrate(antiga, VERSAO_ATUAL)

  assert.equal(depois.version, VERSAO_ATUAL)
  assert.equal(depois.players[0].name, 'Valeros')
  assert.deepEqual(depois.players[0].items, { 'cat-rope': 1 })
  assert.deepEqual(depois.players[0].itemNotes, {})
  assert.equal(depois.players[0].sheet, null)
  assert.ok(depois.settings)
})

test('migração não apaga ficha de quem já tem uma', () => {
  const comFicha = mesaV5()
  comFicha.players[0].sheet = { name: 'Rurik', hpMax: 24 }
  comFicha.players[0].vitals = { hp: 11, tempHp: 3, conditions: { frightened: 1 } }

  const depois = migrate(comFicha, VERSAO_ATUAL)
  const valeros = depois.players[0]

  assert.equal(valeros.sheet.name, 'Rurik')
  assert.equal(valeros.vitals.hp, 11)
  assert.equal(valeros.vitals.tempHp, 3)
  assert.deepEqual(valeros.vitals.conditions, { frightened: 1 })
  // e o que faltava vem preenchido, sem sobrescrever o que havia
  assert.deepEqual(valeros.vitals.favorites, {})
})

test('withSheetFields é idempotente e não inventa nada', () => {
  const cru = { id: 'p-1', name: 'Valeros' }
  const uma = withSheetFields(cru)
  assert.deepEqual(withSheetFields(uma), uma)
  assert.deepEqual(uma.gear, emptySheetFields().gear)
})

test('a mesa de exemplo nasce na versão atual e sem nada equipado', () => {
  const seed = createInitialState()
  assert.equal(seed.version, VERSAO_ATUAL)
  for (const player of seed.players) {
    assert.deepEqual(player.gear.equippedWeaponIds, [])
  }
})

/* Duas fichas vêm vinculadas para a aba Ficha abrir sem colar JSON, e a
   terceira fica sem: personagem sem ficha é caso de primeira classe, e some
   dos testes se a mesa de exemplo não guardar um. */
test('a mesa de exemplo traz duas fichas vinculadas e um personagem sem ficha', () => {
  const seed = createInitialState()
  const comFicha = seed.players.filter((p) => p.sheet)

  assert.equal(comFicha.length, 2)
  assert.equal(seed.players.filter((p) => !p.sheet).length, 1)

  for (const player of comFicha) {
    // HP nasce cheio, como numa importação de verdade.
    assert.equal(player.vitals.hp, player.sheet.hpMax)
  }

  // Uma delas conjura: é o que faz a aba Magias existir na mesa de exemplo.
  assert.ok(comFicha.some((p) => p.sheet.spellcasting))
})

test('o saneamento do servidor completa jogador que chegou sem os campos novos', () => {
  const bruta = mesaV5()
  const sanada = sanitizeTable(bruta)

  assert.equal(sanada.version, VERSAO_ATUAL)
  assert.equal(sanada.players[0].sheet, null)
  assert.deepEqual(sanada.players[0].itemMods, {})
  assert.deepEqual(sanada.players[0].items, { 'cat-longsword': 1, 'cat-rope': 2 })
})

/* ------------------------------------------------------------- as ações */

const RURIK = parsePathbuilder(
  JSON.stringify({ build: { name: 'Rurik', level: 1, abilities: { con: 14 }, attributes: { ancestryhp: 10, classhp: 12 } } }),
)

const comFicha = () => {
  const state = migrate(mesaV5(), VERSAO_ATUAL)
  return reducer(state, { type: 'IMPORT_SHEET', playerId: 'p-valeros', sheet: RURIK })
}

const valerosDe = (state) => state.players.find((p) => p.id === 'p-valeros')

test('IMPORT_SHEET põe a ficha e enche o HP', () => {
  const state = comFicha()
  assert.equal(valerosDe(state).sheet.name, 'Rurik')
  assert.equal(valerosDe(state).vitals.hp, 24)
})

test('IMPORT_SHEET não encosta em carteira, mochila nem observação', () => {
  const antes = valerosDe(migrate(mesaV5(), VERSAO_ATUAL))
  const depois = valerosDe(comFicha())

  assert.equal(depois.gold, antes.gold)
  assert.deepEqual(depois.items, antes.items)
  assert.deepEqual(depois.customItems, antes.customItems)
  assert.deepEqual(depois.itemNotes, antes.itemNotes)
})

test('reimportar substitui a ficha inteira e preserva o que é da mesa', () => {
  let state = comFicha()
  state = reducer(state, { type: 'APPLY_DAMAGE', playerId: 'p-valeros', amount: 9 })
  state = reducer(state, { type: 'SET_CONDITION', playerId: 'p-valeros', key: 'frightened', value: 2 })

  const nova = { ...RURIK, level: 2, hpMax: 40, class: 'Fighter' }
  state = reducer(state, { type: 'UPDATE_SHEET', playerId: 'p-valeros', sheet: nova })
  const valeros = valerosDe(state)

  assert.equal(valeros.sheet.class, 'Fighter')
  assert.equal(valeros.sheet.level, 2)
  assert.equal(valeros.vitals.hp, 15, 'o ferimento atravessa a reimportação')
  assert.deepEqual(valeros.vitals.conditions, { frightened: 2 })
  assert.deepEqual(valeros.items, { 'cat-longsword': 1, 'cat-rope': 2 })
})

test('HP máximo menor puxa o atual para baixo, e nunca o contrário', () => {
  let state = comFicha()
  state = reducer(state, { type: 'UPDATE_SHEET', playerId: 'p-valeros', sheet: { ...RURIK, hpMax: 10 } })
  assert.equal(valerosDe(state).vitals.hp, 10)

  state = reducer(state, { type: 'UPDATE_SHEET', playerId: 'p-valeros', sheet: { ...RURIK, hpMax: 99 } })
  assert.equal(valerosDe(state).vitals.hp, 10, 'reimportar não cura')
})

test('REMOVE_SHEET tira só a ficha', () => {
  let state = comFicha()
  state = reducer(state, { type: 'APPLY_DAMAGE', playerId: 'p-valeros', amount: 5 })
  state = reducer(state, { type: 'REMOVE_SHEET', playerId: 'p-valeros' })
  const valeros = valerosDe(state)

  assert.equal(valeros.sheet, null)
  assert.deepEqual(valeros.items, { 'cat-longsword': 1, 'cat-rope': 2 })
  assert.deepEqual(valeros.itemNotes, { 'cat-longsword': 'lascada na ponta' })
  assert.equal(valeros.gold, 45)
  assert.equal(valeros.vitals.hp, 19, 'o HP é fato de mesa e sobrevive à remoção')
})

test('dano come o HP temporário antes do real', () => {
  let state = comFicha()
  state = reducer(state, { type: 'SET_TEMP_HP', playerId: 'p-valeros', value: 5 })
  state = reducer(state, { type: 'APPLY_DAMAGE', playerId: 'p-valeros', amount: 3 })

  assert.equal(valerosDe(state).vitals.tempHp, 2)
  assert.equal(valerosDe(state).vitals.hp, 24, 'o HP real não foi tocado')

  state = reducer(state, { type: 'APPLY_DAMAGE', playerId: 'p-valeros', amount: 6 })
  assert.equal(valerosDe(state).vitals.tempHp, 0)
  assert.equal(valerosDe(state).vitals.hp, 20)
})

test('o HP não passa de zero para baixo nem do máximo para cima', () => {
  let state = comFicha()
  state = reducer(state, { type: 'APPLY_DAMAGE', playerId: 'p-valeros', amount: 999 })
  assert.equal(valerosDe(state).vitals.hp, 0)

  state = reducer(state, { type: 'APPLY_HEAL', playerId: 'p-valeros', amount: 999 })
  assert.equal(valerosDe(state).vitals.hp, 24)
})

test('HP temporário não acumula: vale o maior', () => {
  let state = comFicha()
  state = reducer(state, { type: 'SET_TEMP_HP', playerId: 'p-valeros', value: 5 })
  state = reducer(state, { type: 'SET_TEMP_HP', playerId: 'p-valeros', value: 3 })
  assert.equal(valerosDe(state).vitals.tempHp, 5)

  state = reducer(state, { type: 'SET_TEMP_HP', playerId: 'p-valeros', value: 8 })
  assert.equal(valerosDe(state).vitals.tempHp, 8)

  state = reducer(state, { type: 'SET_TEMP_HP', playerId: 'p-valeros', value: 0 })
  assert.equal(valerosDe(state).vitals.tempHp, 0, 'definir zero limpa o que sobrou')
})

test('dano e cura em personagem sem ficha não fazem nada', () => {
  const state = migrate(mesaV5(), VERSAO_ATUAL)
  const depois = reducer(state, { type: 'APPLY_DAMAGE', playerId: 'p-ezren', amount: 5 })
  assert.equal(depois, state, 'sem ficha não há HP, e o estado nem precisa mudar')
})

test('condição em zero some do objeto em vez de virar zero', () => {
  let state = comFicha()
  state = reducer(state, { type: 'SET_CONDITION', playerId: 'p-valeros', key: 'frightened', value: 2 })
  state = reducer(state, { type: 'SET_CONDITION', playerId: 'p-valeros', key: 'prone', value: true })
  assert.deepEqual(valerosDe(state).vitals.conditions, { frightened: 2, prone: true })

  state = reducer(state, { type: 'SET_CONDITION', playerId: 'p-valeros', key: 'frightened', value: 0 })
  state = reducer(state, { type: 'SET_CONDITION', playerId: 'p-valeros', key: 'prone', value: false })
  assert.deepEqual(valerosDe(state).vitals.conditions, {})
})

test('CLEAR_CONDITIONS limpa tudo e não encosta no HP', () => {
  let state = comFicha()
  state = reducer(state, { type: 'APPLY_DAMAGE', playerId: 'p-valeros', amount: 4 })
  state = reducer(state, { type: 'SET_CONDITION', playerId: 'p-valeros', key: 'clumsy', value: 1 })
  state = reducer(state, { type: 'CLEAR_CONDITIONS', playerId: 'p-valeros' })

  assert.deepEqual(valerosDe(state).vitals.conditions, {})
  assert.equal(valerosDe(state).vitals.hp, 20)
})

test('favorito liga e desliga, e a chave some quando desliga', () => {
  let state = comFicha()
  state = reducer(state, { type: 'TOGGLE_FAVORITE', playerId: 'p-valeros', key: 'cat-longsword' })
  assert.deepEqual(valerosDe(state).vitals.favorites, { 'cat-longsword': true })

  state = reducer(state, { type: 'TOGGLE_FAVORITE', playerId: 'p-valeros', key: 'cat-longsword' })
  assert.deepEqual(valerosDe(state).vitals.favorites, {})
})

test('erguer escudo sem escudo empunhado não faz nada', () => {
  const state = comFicha()
  assert.equal(reducer(state, { type: 'TOGGLE_SHIELD_RAISED', playerId: 'p-valeros' }), state)
})

test('erguer e baixar o escudo empunhado funciona, e o PV respeita o máximo', () => {
  let state = comFicha()
  state = {
    ...state,
    players: state.players.map((p) =>
      p.id === 'p-valeros'
        ? { ...p, items: { ...p.items, 'cat-steel-shield': 1 }, gear: { ...p.gear, heldShieldId: 'cat-steel-shield' } }
        : p,
    ),
  }

  state = reducer(state, { type: 'TOGGLE_SHIELD_RAISED', playerId: 'p-valeros' })
  assert.equal(valerosDe(state).vitals.shieldRaised, true)
  state = reducer(state, { type: 'TOGGLE_SHIELD_RAISED', playerId: 'p-valeros' })
  assert.equal(valerosDe(state).vitals.shieldRaised, false)

  // Steel Shield tem hpMax 20 no catálogo; o stepper não passa disso nem de 0
  state = reducer(state, { type: 'SET_SHIELD_HP', playerId: 'p-valeros', value: 999 })
  assert.equal(valerosDe(state).vitals.shieldHp, 20)
  state = reducer(state, { type: 'SET_SHIELD_HP', playerId: 'p-valeros', value: -5 })
  assert.equal(valerosDe(state).vitals.shieldHp, 0)
})

test('foco sem magia de foco é ação vazia', () => {
  const state = comFicha() // Rurik é bárbaro: nem conjuração tem
  assert.equal(reducer(state, { type: 'SET_FOCUS', playerId: 'p-valeros', value: 2 }), state)
})

/* A reserva não vem mais de `sheet.focusPoints`: ela é um ponto por magia de
   foco, até três. Uma ficha que diz ter foco mas não tem magia de foco nenhuma
   não abre reserva — o teste antigo pedia o contrário. */
test('reserva de foco ignora o focusPoints da ficha e conta as magias', () => {
  let state = comFicha()
  state = reducer(state, {
    type: 'UPDATE_SHEET',
    playerId: 'p-valeros',
    sheet: { ...RURIK, focusPoints: 2 },
  })
  assert.equal(reducer(state, { type: 'SET_FOCUS', playerId: 'p-valeros', value: 9 }), state)
})

/* ---------------------------------------------------------------- histórico */

test('as três ações de ficha entram no histórico; as de combate, nenhuma', () => {
  const comLog = withHistory(reducer)
  let state = migrate(mesaV5(), VERSAO_ATUAL)
  const antes = state.history.length

  state = comLog(state, { type: 'IMPORT_SHEET', playerId: 'p-valeros', sheet: RURIK })
  state = comLog(state, { type: 'UPDATE_SHEET', playerId: 'p-valeros', sheet: { ...RURIK, level: 2 } })
  state = comLog(state, { type: 'REMOVE_SHEET', playerId: 'p-valeros' })
  assert.equal(state.history.length, antes + 3)
  assert.match(state.history.at(-3).label, /Vinculou a ficha de Rurik a Valeros/)
  assert.match(state.history.at(-1).label, /Removeu a ficha de Valeros/)

  const depoisDaFicha = state.history.length
  state = comLog(state, { type: 'IMPORT_SHEET', playerId: 'p-valeros', sheet: RURIK })
  const marco = state.history.length

  for (const action of [
    { type: 'APPLY_DAMAGE', playerId: 'p-valeros', amount: 3 },
    { type: 'APPLY_HEAL', playerId: 'p-valeros', amount: 1 },
    { type: 'SET_TEMP_HP', playerId: 'p-valeros', value: 4 },
    { type: 'SET_CONDITION', playerId: 'p-valeros', key: 'prone', value: true },
    { type: 'CLEAR_CONDITIONS', playerId: 'p-valeros' },
    { type: 'TOGGLE_FAVORITE', playerId: 'p-valeros', key: 'cat-rope' },
  ]) {
    state = comLog(state, action)
  }
  assert.equal(state.history.length, marco, 'combate não entra no log')
  assert.equal(marco, depoisDaFicha + 1)
})

test('desfazer uma vinculação de ficha devolve o estado anterior', () => {
  const comLog = withHistory(reducer)
  let state = migrate(mesaV5(), VERSAO_ATUAL)
  state = comLog(state, { type: 'IMPORT_SHEET', playerId: 'p-valeros', sheet: RURIK })
  assert.equal(valerosDe(state).sheet.name, 'Rurik')

  state = comLog(state, { type: 'UNDO_TO', entryId: state.history.at(-1).id })
  assert.equal(valerosDe(state).sheet, null)
  assert.deepEqual(valerosDe(state).items, { 'cat-longsword': 1, 'cat-rope': 2 })
})

/* -------------------------------------------------------------- nada regride */

test('comprar, vender e transferir continuam funcionando na mesa migrada', () => {
  let state = migrate(mesaV5(), VERSAO_ATUAL)

  state = reducer(state, { type: 'SELL_ITEM', playerId: 'p-valeros', itemId: 'cat-rope', qty: 1 })
  assert.equal(valerosDe(state).items['cat-rope'], 1)

  state = reducer(state, {
    type: 'TRANSFER_ITEM',
    fromId: 'p-valeros',
    toId: 'p-ezren',
    itemId: 'cat-rope',
    qty: 1,
  })
  assert.equal(valerosDe(state).items['cat-rope'], undefined)
  assert.equal(state.players.find((p) => p.id === 'p-ezren').items['cat-rope'], 1)

  state = reducer(state, { type: 'ADD_PLAYER', name: 'Kyra' })
  const kyra = state.players.at(-1)
  assert.equal(kyra.sheet, null, 'jogador novo nasce com os campos da ficha vazios')
  assert.deepEqual(kyra.gear.equippedWeaponIds, [])
})
