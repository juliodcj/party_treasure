/* As fórmulas que o Foundry guarda dentro dos macros.
 *
 * O Caustic Blast chegava à tela dizendo "takes (1+floor((@item.rank -1)/2))
 * persistent,acid damage": sintaxe de automação no lugar do texto da Paizo.
 * Estes casos são os que apareceram de verdade nos packs — não expressões
 * inventadas para o avaliador passar.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { reduzirFormula, sanitizeDescription, toPlainText } from '../src/lib/foundryImport.js'

const texto = (html, level) => toPlainText(sanitizeDescription(html, { level }))

test('a fórmula com dado reduz só a parte aritmética', () => {
  assert.equal(reduzirFormula('(9 -3)d6'), '6d6')
  assert.equal(reduzirFormula('ceil(9/2)d6'), '5d6')
  assert.equal(reduzirFormula('8d12'), '8d12')
})

test('a fórmula sem dado vira o número', () => {
  assert.equal(reduzirFormula('(1+floor((1 -1)/2))'), '1')
  assert.equal(reduzirFormula('(1+floor((5 -1)/2))'), '3')
  assert.equal(reduzirFormula('(ternary(gte(9,10),115,100))'), '100')
})

test('referência que depende do personagem fica como veio, sem sumir', () => {
  assert.equal(reduzirFormula('(@actor.level)d6'), '(@actor.level)d6')
  assert.equal(reduzirFormula('resolve(5+@item.badge.value)'), 'resolve(5+@item.badge.value)')
})

test('@Damage resolve o nível do próprio verbete e separa os tipos', () => {
  assert.equal(
    texto('takes @Damage[(1+floor((@item.rank -1)/2))[persistent,acid]] damage.', 1),
    'takes 1 persistent acid damage.',
  )
  assert.equal(texto('takes @Damage[(@item.level -3)d6[void]] damage', 9), 'takes 6d6 void damage')
})

test('@Damage descarta a configuração do motor e junta as parcelas', () => {
  assert.equal(texto('takes @Damage[10d8[fire]|options:area-damage] damage', 5), 'takes 10d8 fire damage')
  assert.equal(
    texto('deals @Damage[4d6[slashing],2d6[persistent,fire]] damage', 3),
    'deals 4d6 slashing and 2d6 persistent fire damage',
  )
})

test('@Template vira a área escrita como o livro escreve', () => {
  assert.equal(texto('in a @Template[type:cone|distance:60]', 5), 'in a 60-foot cone')
  assert.equal(
    texto('a @Template[line|distance:100|width:10]', 5),
    'a 100-foot-long, 10-foot-wide line',
  )
})

test('@Check não perde o "basic" do salvamento', () => {
  assert.equal(
    texto('with a @Check[reflex|basic|options:area-effect|traits:fire] save', 5),
    'with a basic Reflex save',
  )
  assert.equal(texto('a @Check[flat|dc:8] check', 5), 'a Flat CD 8 check')
})

test('sem nível, a referência ao item não é chutada', () => {
  assert.equal(
    texto('takes @Damage[(@item.rank)d6[fire]] damage', null),
    'takes (@item.rank)d6 fire damage',
  )
})
