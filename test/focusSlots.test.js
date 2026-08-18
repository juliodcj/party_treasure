/*
 * Truque de foco × magia de foco, e os slots do conjurador espontâneo.
 *
 * A regra que os dois casos exercitam é a mesma: quem gasta ponto de foco é a
 * MAGIA de foco, e quem gasta slot é o rank — o truque não gasta nada dos dois.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { focusList, focusPool, nightRest } from '../src/lib/sheet.js'
import { reducer } from '../src/state/reducer.js'
import { TABLE_ACTIONS } from '../server/table.js'

const fichaCom = (spellcasting) => ({
  level: 3,
  hpMax: 20,
  abilities: { str: 10, dex: 10, con: 10, int: 16, wis: 10, cha: 10 },
  proficiencies: {},
  spellcasting: { perDay: [5, 3, 2], preparation: 'spontaneous', ...spellcasting },
})

const mesa = (player) => ({
  version: 6,
  settings: {},
  history: [],
  players: [{ id: 'p-1', items: {}, customItems: [], itemNotes: {}, vitals: {}, gear: {}, itemMods: {}, ...player }],
  campaignItems: [],
  shops: [],
})

const vitals = (state) => state.players[0].vitals

test('truque de foco e magia de foco saem em listas separadas', () => {
  const sheet = fichaCom({ focusCantrips: ['Shield of Faith'], focusSpells: ['Force Bolt'] })
  const { cantrips, spells } = focusList(sheet, {})

  assert.deepEqual(cantrips.map((sp) => sp.name), ['Shield of Faith'])
  assert.deepEqual(spells.map((sp) => sp.name), ['Force Bolt'])
})

test('a reserva de foco conta só as magias de foco', () => {
  const sheet = fichaCom({ focusCantrips: ['A', 'B'], focusSpells: ['C'] })
  assert.equal(focusPool(sheet, {}), 1, 'dois truques de foco não valem ponto nenhum')

  const soTruques = fichaCom({ focusCantrips: ['A', 'B', 'C'], focusSpells: [] })
  assert.equal(focusPool(soTruques, {}), 0)
})

test('magia ganha na mesa entra na lista certa pelo rank que veio junto', () => {
  let state = mesa({ sheet: fichaCom({ focusCantrips: [], focusSpells: [] }) })

  state = reducer(state, { type: 'ADD_FOCUS_SPELL', playerId: 'p-1', name: 'Truque', rank: 0 })
  state = reducer(state, { type: 'ADD_FOCUS_SPELL', playerId: 'p-1', name: 'Magia', rank: 1 })

  const sheet = state.players[0].sheet
  const { cantrips, spells } = focusList(sheet, vitals(state))
  assert.deepEqual(cantrips.map((sp) => sp.name), ['Truque'])
  assert.deepEqual(spells.map((sp) => sp.name), ['Magia'])
  assert.equal(focusPool(sheet, vitals(state)), 1, 'só a magia deu ponto')
})

test('escolha antiga, gravada sem rank, continua contando como magia de foco', () => {
  const sheet = fichaCom({ focusCantrips: [], focusSpells: [] })
  const antiga = { extraFocusSpells: [{ uid: 'u1', name: 'De antes do campo rank' }] }

  assert.deepEqual(focusList(sheet, antiga).cantrips, [])
  assert.equal(focusPool(sheet, antiga), 1)
})

test('SET_SLOTS_USED guarda o gasto do espontâneo, preso ao que a ficha dá', () => {
  assert.ok(TABLE_ACTIONS.has('SET_SLOTS_USED'), 'o servidor precisa aceitar a ação')

  let state = mesa({ sheet: fichaCom({ focusCantrips: [], focusSpells: [] }) })

  state = reducer(state, { type: 'SET_SLOTS_USED', playerId: 'p-1', rank: 1, value: 2 })
  assert.equal(vitals(state).slotsUsed[1], 2)

  state = reducer(state, { type: 'SET_SLOTS_USED', playerId: 'p-1', rank: 1, value: 99 })
  assert.equal(vitals(state).slotsUsed[1], 3, 'nunca passa do total de slots do rank')

  state = reducer(state, { type: 'SET_SLOTS_USED', playerId: 'p-1', rank: 1, value: -5 })
  assert.equal(vitals(state).slotsUsed[1], 0, 'nem desce abaixo de zero')

  const antes = state
  assert.equal(
    reducer(state, { type: 'SET_SLOTS_USED', playerId: 'p-1', rank: 9, value: 1 }),
    antes,
    'rank sem slot nenhum não vira gasto',
  )
})

test('o descanso zera os slots gastos', () => {
  const sheet = fichaCom({ focusCantrips: [], focusSpells: ['Force Bolt'] })
  const depois = nightRest(sheet, { slotsUsed: { 1: 3, 2: 1 }, hp: 5 })
  assert.deepEqual(depois.slotsUsed, {})
  assert.equal(depois.focusPoints, 1)
})
