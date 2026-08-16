/* Contra o que a magia joga — a pergunta que decide se a aba Ataques mostra a
 * DC ou o bônus de ataque, e o que a descrição escreve em "Defense".
 *
 * Os casos vêm do corpus de verdade (`src/data/index.spells.json`), e não de
 * objetos inventados: o ponto do teste é que a regra case com a forma que o
 * Foundry usa, e um objeto à mão provaria só que a função lê a si mesma.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  defesaDaMagia,
  ehMagiaDeAtaque,
  ehMagiaDeSalvamento,
  spellDoIndice,
} from '../src/lib/spells.js'

test('magia de ataque é marcada pelo traço `attack`, não por defense', () => {
  const projectile = spellDoIndice('Telekinetic Projectile')

  assert.ok(projectile, 'a magia precisa existir no índice')
  assert.equal(projectile.defense, null, 'o corpus não preenche defense nela')
  assert.equal(ehMagiaDeAtaque(projectile), true)
  assert.equal(ehMagiaDeSalvamento(projectile), false)
  assert.equal(defesaDaMagia(projectile), 'AC')
})

test('magia de salvamento diz o salvamento, com "basic" quando é basic', () => {
  const caustic = spellDoIndice('Caustic Blast')
  assert.equal(ehMagiaDeSalvamento(caustic), true)
  assert.equal(ehMagiaDeAtaque(caustic), false)
  assert.equal(defesaDaMagia(caustic), 'basic Reflex')

  const charm = spellDoIndice('Charm')
  assert.equal(ehMagiaDeSalvamento(charm), true, 'salvamento não-basic também é salvamento')
  assert.equal(defesaDaMagia(charm), 'Will')
})

test('magia sem salvamento e sem ataque não inventa defesa', () => {
  const shield = spellDoIndice('Shield')
  assert.equal(ehMagiaDeAtaque(shield), false)
  assert.equal(ehMagiaDeSalvamento(shield), false)
  assert.equal(defesaDaMagia(shield), null)
})

test('nome que o índice não conhece devolve null em vez de quebrar', () => {
  assert.equal(spellDoIndice('Magia Inventada Pelo Mestre'), null)
  assert.equal(ehMagiaDeAtaque(null), false)
  assert.equal(ehMagiaDeSalvamento(undefined), false)
  assert.equal(defesaDaMagia(null), null)
})

test('as duas metades de defense convivem quando o corpus traz as duas', () => {
  const comAs2 = { defense: { save: { statistic: 'reflex', basic: true }, passive: { statistic: 'ac' } } }
  assert.equal(defesaDaMagia(comAs2), 'basic Reflex · AC')

  // chave passiva desconhecida aparece com o nome que veio, nunca some
  assert.equal(defesaDaMagia({ defense: { save: null, passive: { statistic: 'sorte' } } }), 'Sorte')
})

test('todo salvamento do corpus tem rótulo, e nenhum sai vazio', () => {
  for (const nome of ['Fireball', 'Heal', 'Frostbite']) {
    const sp = spellDoIndice(nome)
    assert.ok(sp, `${nome} precisa existir no índice`)
    if (ehMagiaDeSalvamento(sp)) assert.ok(defesaDaMagia(sp), `${nome} ficou sem rótulo de defesa`)
  }
})
