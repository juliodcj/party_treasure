/*
 * Exportar a mesa para JSON e trazer um JSON de volta.
 *
 * A ida e a volta precisam fechar: o que sai do `tableToFile` tem que ser
 * exatamente o que o `sanitizeTable` do servidor aceita — senão a mesa
 * exportada hoje não abre amanhã.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { fileNameFor, tableFromFile, tableToFile } from '../src/lib/tableFile.js'
import { TABLE_KEYS, createInitialState } from '../src/state/initialState.js'
import { sanitizeTable } from '../server/table.js'

test('o arquivo leva as chaves da mesa, e só elas', () => {
  const state = { ...createInitialState(), cart: { 'cat-rope': 2 }, activePlayerId: 'p-valeros' }
  const arquivo = tableToFile(state)

  assert.deepEqual(Object.keys(arquivo).sort(), [...TABLE_KEYS].sort())
  assert.equal(arquivo.cart, undefined, 'carrinho é deste aparelho, não é mesa')
  assert.equal(arquivo.activePlayerId, undefined, 'foco é sessão, não é mesa')
})

test('exportar e importar devolve a mesma mesa', () => {
  const original = createInitialState()
  const texto = JSON.stringify(tableToFile(original), null, 2)

  const lida = tableFromFile(texto)
  assert.equal(lida.ok, true)

  const aceita = sanitizeTable(lida.table)
  assert.ok(aceita, 'o servidor precisa aceitar o que o app exportou')
  assert.equal(aceita.players.length, original.players.length)
  assert.deepEqual(aceita.players.map((p) => p.name), original.players.map((p) => p.name))
  assert.deepEqual(aceita.settings, original.settings)
  assert.deepEqual(aceita.shops, original.shops)
})

test('arquivo que não serve diz por que não serve', () => {
  assert.match(tableFromFile('não é json').erro, /JSON/)
  assert.match(tableFromFile('[1, 2, 3]').erro, /mesa/)
  assert.match(tableFromFile('{"players": []}').erro, /personagem/)
})

test('o nome do arquivo carrega o nome da mesa e a data', () => {
  const dia = new Date('2026-08-18T12:00:00Z')
  assert.equal(fileNameFor({ settings: { tableName: 'Mesa da Sexta' } }, dia), 'mesa-mesa-da-sexta-2026-08-18.json')
  assert.equal(fileNameFor({ settings: { tableName: '  ' } }, dia), 'mesa-2026-08-18.json')
  assert.equal(fileNameFor({}, dia), 'mesa-2026-08-18.json')
})

test('a mesa nova nasce com o campo de nome, vazio', () => {
  assert.equal(createInitialState().settings.tableName, '')
})
