/* A lista de ações que o servidor aceita, contra os `case` do reducer.
 *
 * Este teste existe por causa de um bug de verdade: `SET_FEAT_NOTE` entrou no
 * reducer e não entrou na lista. O resultado foi o pior tipo de defeito — a
 * tela mostrava o texto salvo (o cliente aplica na hora), o servidor recusava,
 * e o texto sumia no próximo recarregamento. A recusa ia para o `console.warn`,
 * onde ninguém olha no meio da sessão.
 *
 * Uma ação que existe num lado e não no outro é sempre defeito, dos dois lados:
 * a que falta na lista some calada, e a que sobra promete um efeito que o
 * reducer não tem.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { TABLE_ACTIONS } from '../server/table.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const REDUCER = readFileSync(path.join(ROOT, 'src/state/reducer.js'), 'utf8')
/* `UNDO_TO` e `CLEAR_HISTORY` nunca chegam ao reducer: quem os atende é o
   embrulho `withHistory`, e por isso ele conta como fonte também. */
const HISTORY = readFileSync(path.join(ROOT, 'src/state/history.js'), 'utf8')

/** Todo `case 'X':` do reducer, mais o que o histórico intercepta antes dele. */
const casosDoReducer = new Set([
  ...[...REDUCER.matchAll(/^\s*case '([A-Z_]+)':/gm)].map((m) => m[1]),
  ...[...HISTORY.matchAll(/action\.type === '([A-Z_]+)'/g)].map((m) => m[1]),
])

test('o reducer não tem ação que o servidor recuse', () => {
  const faltando = [...casosDoReducer].filter((tipo) => !TABLE_ACTIONS.has(tipo))
  assert.deepEqual(
    faltando,
    [],
    `estas ações existem no reducer e o servidor recusa (some calado): ${faltando.join(', ')}`,
  )
})

test('o servidor não aceita ação que o reducer não conhece', () => {
  const sobrando = [...TABLE_ACTIONS].filter((tipo) => !casosDoReducer.has(tipo))
  assert.deepEqual(
    sobrando,
    [],
    `estas ações passam pelo servidor e caem no default do reducer: ${sobrando.join(', ')}`,
  )
})

test('a leitura do reducer não silenciou: achou o conjunto todo', () => {
  // Se a expressão parar de casar, os dois testes acima passam vazios e o
  // guarda vira enfeite.
  assert.ok(casosDoReducer.size > 30, `só ${casosDoReducer.size} cases lidos do reducer`)
  assert.ok(casosDoReducer.has('SET_ITEM_NOTE'))
  assert.ok(casosDoReducer.has('SET_FEAT_NOTE'))
})
