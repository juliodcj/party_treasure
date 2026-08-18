/*
 * O índice de ações, do lado de quem o consome.
 *
 * O que se prova aqui não é o extrator (esse mora em scripts/build-lore.mjs e
 * precisa do clone do Foundry): é que o dado gravado em src/data continua
 * respondendo às duas perguntas que a aba Ações faz — "que perícia rola isto?"
 * e "isto exige treinamento?".
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const ACTIONS = JSON.parse(readFileSync(path.join(ROOT, 'src/data/index.actions.json'), 'utf8'))

const porSlug = (slug) => ACTIONS.find((acao) => acao.slug === slug)

test('a Treat Wounds cai na seção de Medicine', () => {
  assert.deepEqual(porSlug('treat-wounds').skills, ['medicine'])
})

test('as outras que a prosa resolveu continuam resolvidas', () => {
  assert.deepEqual(porSlug('deconstruct').skills, ['crafting'])
  assert.deepEqual(porSlug('fortify-camp').skills, ['crafting'])
})

test('as que já tinham perícia não mudaram de perícia', () => {
  assert.deepEqual(porSlug('climb').skills, ['athletics'])
  assert.deepEqual(porSlug('hide').skills, ['stealth'])
  assert.deepEqual(
    porSlug('decipher-writing').skills,
    ['arcana', 'occultism', 'religion', 'society'],
    'a que rola com quatro continua com as quatro',
  )
})

test('o que não tem perícia continua sem, e continua na lista', () => {
  /* Não é falha de ingestão: Recall Knowledge depende do assunto, Earn Income
     vale com qualquer perícia. Elas aparecem na tela num balde próprio. */
  for (const slug of ['recall-knowledge', 'earn-income', 'learn-a-spell', 'identify-magic']) {
    const acao = porSlug(slug)
    assert.ok(acao, `${slug} sumiu do índice`)
    assert.deepEqual(acao.skills, [])
  }
})

test('toda ação diz se exige treinamento, e a Treat Wounds diz que sim', () => {
  for (const acao of ACTIONS) {
    assert.equal(typeof acao.trained, 'boolean', `${acao.slug} sem o campo trained`)
  }

  const treinadas = ACTIONS.filter((acao) => acao.trained).map((acao) => acao.slug).sort()
  assert.deepEqual(treinadas, [
    'decipher-writing',
    'earn-income',
    'learn-a-spell',
    'maneuver-in-flight',
    'squeeze',
    'treat-wounds',
  ])
})

test('nenhuma ação básica exige treinamento — são as que todo mundo usa', () => {
  const basicas = ACTIONS.filter((acao) => acao.group === 'basic' && acao.trained)
  assert.deepEqual(basicas, [])
})
