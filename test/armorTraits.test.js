/*
 * Traços de armadura que mexem em número da ficha.
 *
 * O gabarito é o texto publicado do próprio traço, que está em
 * `src/data/traits.json` (saído do pack do Foundry) e é lido aqui: se a regra
 * mudar lá, o teste passa a citar a regra nova, e não a nossa lembrança dela.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSheet } from '../src/lib/sheet.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const TRAITS = JSON.parse(readFileSync(path.join(ROOT, 'src/data/traits.json'), 'utf8'))
const CATALOG = JSON.parse(readFileSync(path.join(ROOT, 'src/data/catalog.equipment.json'), 'utf8'))

/* Str 10 (mod +0) e Dex 14 (mod +2): a Força NÃO alcança o requisito 1, então a
   penalidade de teste da armadura vale. O caso do requisito alcançado usa a
   mesma ficha com Str 18. */
const ficha = (str = 10) => ({
  level: 1,
  speed: 25,
  abilities: { str, dex: 14, con: 10, int: 10, wis: 10, cha: 10 },
  proficiencies: { light: 2, heavy: 2, acrobatics: 2, athletics: 2, stealth: 2, thievery: 2 },
  specificProficiencies: {},
  lores: [],
  hpMax: 10,
})

const armadura = (traits, extra = {}) => ({
  id: 'arm',
  name: 'Armadura de teste',
  category: 'armor',
  traits,
  armor: { category: 'light', acBonus: 1, dexCap: 3, checkPenalty: -1, speedPenalty: 0, strength: 1, ...extra },
})

const vestindo = (item, str) =>
  buildSheet({ sheet: ficha(str), items: [item], gear: { wornArmorId: 'arm' }, vitals: {} })

const pericia = (view, key) => view.skills.find((s) => s.key === key).stat.total

test('os três traços existem no traits.json com o texto que o código aplica', () => {
  for (const [traco, trecho] of [
    ['noisy', /check penalty applies to Stealth/i],
    ['flexible', /don't apply its check penalty to Acrobatics or Athletics/i],
    ['hindering', /-5 penalty to all your Speeds/i],
  ]) {
    assert.ok(TRAITS[traco], `o traço ${traco} sumiu do traits.json`)
    assert.match(TRAITS[traco].description, trecho, `o texto de ${traco} mudou — reveja sheet.js`)
  }
})

test('noisy: Stealth leva a penalidade mesmo com a Força exigida alcançada', () => {
  const comNoisy = vestindo(armadura(['noisy']), 18)
  const semNoisy = vestindo(armadura([]), 18)

  assert.equal(pericia(semNoisy, 'stealth'), 5, 'Força alcançada: sem penalidade nenhuma')
  assert.equal(pericia(comNoisy, 'stealth'), 4, 'noisy: −1 no Stealth mesmo assim')
  assert.equal(pericia(comNoisy, 'thievery'), 5, 'e só no Stealth — Thievery não é tocada')
})

test('flexible: Acrobatics e Athletics escapam da penalidade', () => {
  const comFlexible = vestindo(armadura(['flexible']), 10)
  const semFlexible = vestindo(armadura([]), 10)

  assert.equal(pericia(semFlexible, 'acrobatics'), 4)
  assert.equal(pericia(semFlexible, 'athletics'), 2)
  assert.equal(pericia(comFlexible, 'acrobatics'), 5, 'flexible tira a penalidade')
  assert.equal(pericia(comFlexible, 'athletics'), 3, 'flexible tira a penalidade')
  assert.equal(pericia(comFlexible, 'thievery'), 4, 'nas outras ela continua valendo')
})

test('noisy e flexible juntos (a Chain Shirt do catálogo) não se anulam', () => {
  const chainShirt = CATALOG.find((item) => item.name === 'Chain Shirt')
  assert.ok(chainShirt, 'Chain Shirt sumiu do catálogo')
  assert.deepEqual(
    ['flexible', 'noisy'].filter((t) => chainShirt.traits.includes(t)),
    ['flexible', 'noisy'],
    'a Chain Shirt é o caso real dos dois traços juntos',
  )

  const view = vestindo({ ...chainShirt, id: 'arm', qty: 1 }, 18)
  const semPenalidade = pericia(vestindo({ ...chainShirt, id: 'arm', traits: [], qty: 1 }, 18), 'stealth')
  assert.ok(pericia(view, 'stealth') < semPenalidade, 'noisy pesa no Stealth')
  assert.equal(pericia(view, 'acrobatics'), pericia(view, 'stealth') - chainShirt.armor.checkPenalty)
})

test('hindering: −5 no deslocamento, com a Força alcançada ou não', () => {
  const base = vestindo(armadura([]), 18).speed
  assert.equal(base, 25)
  assert.equal(vestindo(armadura(['hindering']), 18).speed, 20)

  /* Soma com a penalidade da própria armadura quando a Força não alcança. */
  const pesada = armadura(['hindering'], { speedPenalty: -10, strength: 5 })
  assert.equal(vestindo(pesada, 10).speed, 10, '25 − 10 (armadura) − 5 (hindering)')

  /* O piso de 5 pés que o traço fixa. */
  const lenta = armadura(['hindering'], { speedPenalty: -25, strength: 5 })
  assert.equal(vestindo(lenta, 10).speed, 5)
})

test('sem armadura vestida nenhum traço encosta em nada', () => {
  const view = buildSheet({ sheet: ficha(10), items: [], gear: {}, vitals: {} })
  assert.equal(view.speed, 25)
  assert.equal(pericia(view, 'stealth'), 5)
})
