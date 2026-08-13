/* Preparar, gastar, descansar. As magias do mago (fixture `wizard.json`),
 * contra as quatro ações novas do reducer.
 *
 * D7 aparece em quase todo teste aqui: `preparedSpells` e `extraSpells` são
 * fato de mesa, não a ficha em si — reimportar não pode apagar o que o
 * jogador escolheu preparar hoje.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { reducer } from '../src/state/reducer.js'
import { emptySheetFields } from '../src/state/migrations.js'
import { parsePathbuilder } from '../src/lib/pathbuilder.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const WIZARD = parsePathbuilder(readFileSync(path.join(ROOT, 'docs/fixtures/wizard.json'), 'utf8'))

const mesaVazia = () => ({
  version: 6,
  players: [{ id: 'p-1', name: 'Vaeril', items: {}, customItems: [], itemNotes: {}, ...emptySheetFields() }],
})

const jogador = (state) => state.players[0]

/** Importa o mago numa mesa em branco. */
function comMago() {
  return reducer(mesaVazia(), { type: 'IMPORT_SHEET', playerId: 'p-1', sheet: WIZARD })
}

/* -------------------------------------------------------- semeadura no import */

test('importar o mago semeia vitals.preparedSpells a partir do initialPrepared', () => {
  const preparadas = jogador(comMago()).vitals.preparedSpells

  assert.equal(preparadas.length, 9)
  assert.ok(preparadas.every((p) => p.uid && !p.used))
  assert.equal(preparadas.filter((p) => p.name === 'Bullhorn').length, 2, 'truque repetido não se perde')
  // cada instância ganha uid próprio, mesmo as com o mesmo nome
  assert.equal(new Set(preparadas.map((p) => p.uid)).size, 9)
})

test('reimportar não apaga o que o jogador já preparou', () => {
  let state = comMago()
  // troca o que está preparado em rank 0 na mesa
  state = reducer(state, {
    type: 'PREPARE_SPELL',
    playerId: 'p-1',
    rank: 1,
    name: 'Airburst',
  }) // sem slot livre (3/3 já ocupados) — não muda nada, é só para gerar estado
  const antes = jogador(state).vitals.preparedSpells

  state = reducer(state, { type: 'UPDATE_SHEET', playerId: 'p-1', sheet: { ...WIZARD, level: 2 } })
  assert.deepEqual(jogador(state).vitals.preparedSpells, antes)
})

test('personagem sem conjuração não ganha preparedSpells do nada', () => {
  const semMagia = { ...WIZARD, spellcasting: null }
  const state = reducer(mesaVazia(), { type: 'IMPORT_SHEET', playerId: 'p-1', sheet: semMagia })
  assert.deepEqual(jogador(state).vitals.preparedSpells, [])
})

/* -------------------------------------------------------------- PREPARE_SPELL */

test('preparar respeita o teto de vagas do círculo', () => {
  let state = comMago()
  // rank 1 já tem 3/3 (Agitate, Airburst, Sure Strike) — cheio
  state = reducer(state, { type: 'PREPARE_SPELL', playerId: 'p-1', rank: 1, name: 'Sure Strike' })
  assert.equal(jogador(state).vitals.preparedSpells.filter((p) => p.rank === 1).length, 3)
})

test('preparar em círculo com vaga livre funciona', () => {
  // um mago nível 1 recém-criado, sem nada preparado ainda
  let state = reducer(mesaVazia(), {
    type: 'IMPORT_SHEET',
    playerId: 'p-1',
    sheet: { ...WIZARD, spellcasting: { ...WIZARD.spellcasting, initialPrepared: [] } },
  })
  state = reducer(state, { type: 'PREPARE_SPELL', playerId: 'p-1', rank: 1, name: 'Sure Strike' })

  const rank1 = jogador(state).vitals.preparedSpells.filter((p) => p.rank === 1)
  assert.equal(rank1.length, 1)
  assert.equal(rank1[0].name, 'Sure Strike')
  assert.equal(rank1[0].used, false)
})

test('preparar sem nome ou personagem sem conjuração não faz nada', () => {
  let state = comMago()
  assert.equal(reducer(state, { type: 'PREPARE_SPELL', playerId: 'p-1', rank: 0, name: '  ' }), state)

  const semMagia = reducer(mesaVazia(), {
    type: 'IMPORT_SHEET',
    playerId: 'p-1',
    sheet: { ...WIZARD, spellcasting: null },
  })
  assert.equal(
    reducer(semMagia, { type: 'PREPARE_SPELL', playerId: 'p-1', rank: 0, name: 'Bullhorn' }),
    semMagia,
  )
})

/* ------------------------------------------------------------------ ADD_SPELL */

test('a lista especial é livre — não respeita teto de círculo', () => {
  let state = comMago()
  for (let i = 0; i < 5; i++) {
    state = reducer(state, { type: 'ADD_SPELL', playerId: 'p-1', name: 'Cure Wounds (pergaminho)', rank: 1 })
  }
  assert.equal(jogador(state).vitals.extraSpells.length, 5)
})

test('ADD_SPELL não mexe em preparedSpells', () => {
  let state = comMago()
  const antes = jogador(state).vitals.preparedSpells
  state = reducer(state, { type: 'ADD_SPELL', playerId: 'p-1', name: 'Grimório perdido', rank: null })
  assert.deepEqual(jogador(state).vitals.preparedSpells, antes)
})

/* --------------------------------------------------------------- USE_SPELL_SLOT */

test('marcar e desmarcar uma magia preparada como usada', () => {
  let state = comMago()
  const alvo = jogador(state).vitals.preparedSpells.find((p) => p.rank === 1)

  state = reducer(state, { type: 'USE_SPELL_SLOT', playerId: 'p-1', uid: alvo.uid })
  assert.equal(jogador(state).vitals.preparedSpells.find((p) => p.uid === alvo.uid).used, true)

  state = reducer(state, { type: 'USE_SPELL_SLOT', playerId: 'p-1', uid: alvo.uid })
  assert.equal(jogador(state).vitals.preparedSpells.find((p) => p.uid === alvo.uid).used, false)
})

test('USE_SPELL_SLOT alcança a lista especial também', () => {
  let state = comMago()
  state = reducer(state, { type: 'ADD_SPELL', playerId: 'p-1', name: 'Varinha de Curar', rank: 1 })
  const uid = jogador(state).vitals.extraSpells[0].uid

  state = reducer(state, { type: 'USE_SPELL_SLOT', playerId: 'p-1', uid })
  assert.equal(jogador(state).vitals.extraSpells[0].used, true)
})

test('uid desconhecido não faz nada', () => {
  const state = comMago()
  assert.equal(reducer(state, { type: 'USE_SPELL_SLOT', playerId: 'p-1', uid: 'nao-existe' }), state)
})

/* ------------------------------------------------------------------ REMOVE_SPELL */

test('remover procura em preparedSpells e em extraSpells', () => {
  let state = comMago()
  state = reducer(state, { type: 'ADD_SPELL', playerId: 'p-1', name: 'Runa temporária', rank: 0 })

  const preparada = jogador(state).vitals.preparedSpells[0]
  const extra = jogador(state).vitals.extraSpells[0]

  state = reducer(state, { type: 'REMOVE_SPELL', playerId: 'p-1', uid: preparada.uid })
  assert.equal(jogador(state).vitals.preparedSpells.some((p) => p.uid === preparada.uid), false)
  assert.equal(jogador(state).vitals.preparedSpells.length, 8)

  state = reducer(state, { type: 'REMOVE_SPELL', playerId: 'p-1', uid: extra.uid })
  assert.deepEqual(jogador(state).vitals.extraSpells, [])
})

/* ------------------------------------------------------------------------ REST */

test('descansar repõe os slots preparados, mas não mexe na lista especial', () => {
  let state = comMago()
  state = reducer(state, { type: 'ADD_SPELL', playerId: 'p-1', name: 'Poção de magia', rank: 1 })

  const todosPreparados = jogador(state).vitals.preparedSpells.map((p) => p.uid)
  const extraUid = jogador(state).vitals.extraSpells[0].uid

  for (const uid of todosPreparados) {
    state = reducer(state, { type: 'USE_SPELL_SLOT', playerId: 'p-1', uid })
  }
  state = reducer(state, { type: 'USE_SPELL_SLOT', playerId: 'p-1', uid: extraUid })

  state = reducer(state, { type: 'REST', playerId: 'p-1' })

  assert.ok(jogador(state).vitals.preparedSpells.every((p) => p.used === false), 'slots preparados voltam')
  assert.equal(
    jogador(state).vitals.extraSpells[0].used,
    true,
    'a lista especial não é tocada — o app não sabe a regra de recarga dela',
  )
})

test('descansar também repõe foco, como já testado na fase 8 — aqui só confere que magia não quebra isso', () => {
  let state = comMago()
  state = reducer(state, { type: 'SET_FOCUS', playerId: 'p-1', value: 1 })
  state = reducer(state, { type: 'REST', playerId: 'p-1' })
  assert.equal(jogador(state).vitals.focusPoints, WIZARD.focusPoints)
})
