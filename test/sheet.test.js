/* O oráculo do motor de cálculo (§16 da espec).
 *
 * ESCRITO NA FASE 2, DE PROPÓSITO, ANTES DE `src/lib/sheet.js` EXISTIR. Até a
 * fase 5 este arquivo falha inteiro, e é assim que tem que ser: o gabarito é
 * escrito antes da resposta, senão o motor vira o critério de si mesmo.
 *
 * O gabarito não é opinião nossa. Cada número esperado aqui foi conferido
 * contra o próprio export do Pathbuilder do Rurik: `acTotal.acTotal` vale 18 e
 * `weapons[]` traz `attack: 7` para o Greatpick e `attack: 5` para o Javelin.
 * Esses campos são lidos AQUI e em nenhum outro lugar — em produção valem D2 e
 * D5, os números saem do nosso cálculo. Divergiu? O motor está errado.
 *
 * A regra que mais dá erro, e por isso está em quase todo caso abaixo:
 *
 *     profBonus = rank === 0 ? 0 : level + rank
 *
 * Destreinado NÃO soma o nível. Arcana do Rurik é +0, não +1.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parsePathbuilder } from '../src/lib/pathbuilder.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const RURIK_RAW = JSON.parse(readFileSync(path.join(ROOT, 'docs/fixtures/rurik.json'), 'utf8'))
const CATALOG = JSON.parse(readFileSync(path.join(ROOT, 'src/data/catalog.equipment.json'), 'utf8'))

const SHEET = parsePathbuilder(RURIK_RAW)

/* O gabarito, direto do export. Só este bloco pode tocar nestes campos. */
const GABARITO = {
  acComArmadura: RURIK_RAW.build.acTotal.acTotal,
  greatpickAtaque: RURIK_RAW.build.weapons.find((w) => w.name === 'Greatpick').attack,
  javelinAtaque: RURIK_RAW.build.weapons.find((w) => w.name === 'Javelin').attack,
}

/* Os itens saem do catálogo real, não de números escritos aqui. "Hide" no
   Pathbuilder é "Hide Armor" no catálogo — é exatamente por esse tipo de
   diferença que nenhum item é importado do Pathbuilder (D2). */
const doCatalogo = (nome) => {
  const item = CATALOG.find((i) => i.name === nome)
  assert.ok(item, `o catálogo precisa ter "${nome}"`)
  return item
}

const HIDE = doCatalogo('Hide Armor')
const GREATPICK = doCatalogo('Greatpick')
const JAVELIN = doCatalogo('Javelin')

const VITALS_VAZIO = { hp: 24, tempHp: 0, conditions: {}, shieldHp: 0, shieldRaised: false }

/** Monta a visão do motor com o Rurik e o equipamento que o caso pedir. */
async function ver({ items = [], gear = {}, vitals = {}, itemMods = {} } = {}) {
  const { buildSheet } = await import('../src/lib/sheet.js')
  return buildSheet({
    sheet: SHEET,
    items: items.map((i) => ({ ...i, qty: i.qty ?? 1 })),
    gear: { wornArmorId: null, heldShieldId: null, equippedWeaponIds: [], ...gear },
    vitals: { ...VITALS_VAZIO, ...vitals },
    itemMods,
  })
}

const acharAtaque = (view, nome) => {
  const atk = view.attacks.find((a) => a.name === nome)
  assert.ok(atk, `esperava um ataque chamado "${nome}"`)
  return atk
}

const acharPericia = (view, nome) => {
  const skill = view.skills.find((s) => s.name === nome)
  assert.ok(skill, `esperava a perícia "${nome}"`)
  return skill
}

/* ------------------------------------------------------------------- §16 HP */

test('HP máximo é 24', async () => {
  assert.equal((await ver()).hpMax, 24)
})

/* ------------------------------------------------------------------- §16 CA */

test('CA sem armadura vestida é 15', async () => {
  // 10 + Dex 2 + proficiência unarmored (nível 1 + treinado 2)
  const view = await ver()
  assert.equal(view.ac.total, 15)
})

test('CA com Hide Armor vestida é 18, e bate com o Pathbuilder', async () => {
  // 10 + min(Dex 2, dexCap 2) + proficiência medium (1 + 2) + acBonus 3
  const view = await ver({ items: [HIDE], gear: { wornArmorId: HIDE.id } })
  assert.equal(view.ac.total, 18)
  assert.equal(view.ac.total, GABARITO.acComArmadura)
})

test('a CA se explica em parcelas rotuladas que somam o total', async () => {
  const view = await ver({ items: [HIDE], gear: { wornArmorId: HIDE.id } })
  const { parts, total } = view.ac

  assert.ok(parts.length >= 4, 'CA sem breakdown é número solto — §9 proíbe')
  assert.equal(
    parts.reduce((n, p) => n + p.value, 0),
    total,
    'as parcelas têm que somar o total',
  )
  for (const p of parts) {
    assert.equal(typeof p.label, 'string')
    assert.ok(p.label.length > 0, 'parcela sem rótulo não explica nada')
    assert.equal(typeof p.value, 'number')
  }
})

test('armadura no inventário mas não vestida não muda a CA', async () => {
  const view = await ver({ items: [HIDE] })
  assert.equal(view.ac.total, 15)
})

test('dexCap limita o mod de Destreza, e não o contrário', async () => {
  const agil = { ...SHEET, abilities: { ...SHEET.abilities, dex: 20 } } // Dex +5
  const { buildSheet } = await import('../src/lib/sheet.js')
  const view = buildSheet({
    sheet: agil,
    items: [{ ...HIDE, qty: 1 }],
    gear: { wornArmorId: HIDE.id, heldShieldId: null, equippedWeaponIds: [] },
    vitals: VITALS_VAZIO,
    itemMods: {},
  })
  // Dex +5 com dexCap 2: entra 2, não 5
  assert.equal(view.ac.total, 18)
})

/* -------------------------------------------------------------- §16 defesas */

test('Fortitude +7, Reflex +5, Will +6', async () => {
  const view = await ver()
  assert.equal(view.saves.fortitude.total, 7) // Con 2 + (1 + expert 4)
  assert.equal(view.saves.reflex.total, 5) //    Dex 2 + (1 + trained 2)
  assert.equal(view.saves.will.total, 6) //      Wis 1 + (1 + expert 4)
})

test('Percepção +6', async () => {
  assert.equal((await ver()).perception.total, 6) // Wis 1 + (1 + expert 4)
})

test('DC de classe é 10 + atributo-chave + proficiência', async () => {
  // 10 + Str 4 (keyability) + (nível 1 + treinado 2)
  assert.equal((await ver()).classDc.total, 17)
})

/* ------------------------------------------------------------- §16 perícias */

test('Athletics +7', async () => {
  assert.equal(acharPericia(await ver(), 'Athletics').stat.total, 7) // Str 4 + (1 + 2)
})

test('Arcana +0 — destreinado não soma o nível', async () => {
  assert.equal(acharPericia(await ver(), 'Arcana').stat.total, 0) // Int 0, e só
})

test('a lore do Sailor entra como perícia comum', async () => {
  const sailing = acharPericia(await ver(), 'Sailing Lore')
  assert.equal(sailing.stat.total, 3) // Int 0 + (1 + treinado 2)
})

test('a penalidade de teste da armadura pesa nas perícias de Força e Destreza', async () => {
  // Hide Armor tem checkPenalty −2 e exige `strength: 2` — que é o MODIFICADOR
  // de Força, não o valor do atributo. O Rurik tem Str 18, ou seja mod +4, que
  // alcança o requisito: a penalidade não se aplica a ele.
  const view = await ver({ items: [HIDE], gear: { wornArmorId: HIDE.id } })
  assert.equal(acharPericia(view, 'Athletics').stat.total, 7)
})

/* -------------------------------------------------------------- §16 ataques */

test('Greatpick: ataque +7 e dano 1d10+4, batendo com o Pathbuilder', async () => {
  const view = await ver({ items: [GREATPICK], gear: { equippedWeaponIds: [GREATPICK.id] } })
  const atk = acharAtaque(view, 'Greatpick')

  assert.equal(atk.attack.total, 7) // Str 4 + (1 + martial trained 2)
  assert.equal(atk.attack.total, GABARITO.greatpickAtaque)
  assert.equal(atk.damage.formula, '1d10+4')
  assert.equal(atk.damage.damageType, 'piercing')
})

test('Javelin: Dex no ataque, Força no dano — +5 e 1d6+4', async () => {
  const view = await ver({ items: [{ ...JAVELIN, qty: 4 }] })
  const atk = acharAtaque(view, 'Javelin')

  assert.equal(atk.attack.total, 5) // Dex 2 + (1 + simple trained 2)
  assert.equal(atk.attack.total, GABARITO.javelinAtaque)
  assert.equal(atk.damage.formula, '1d6+4') // arremesso soma Str no dano
})

test('Unarmed Strike existe sempre, sem estar no inventário', async () => {
  const view = await ver()
  const punho = acharAtaque(view, 'Unarmed Strike')

  assert.equal(punho.attack.total, 7) // Str 4 + (1 + unarmed trained 2)
  assert.equal(punho.damage.formula, '1d4+4')
  assert.equal(punho.damage.damageType, 'bludgeoning')
})

test('MAP é −5/−10, e −4/−8 com arma ágil', async () => {
  const view = await ver({ items: [GREATPICK] })

  const pick = acharAtaque(view, 'Greatpick') // sem `agile`
  assert.equal(pick.map.second, pick.attack.total - 5)
  assert.equal(pick.map.third, pick.attack.total - 10)

  const punho = acharAtaque(view, 'Unarmed Strike') // `agile`
  assert.equal(punho.map.second, punho.attack.total - 4)
  assert.equal(punho.map.third, punho.attack.total - 8)
})

test('as armas equipadas vêm antes das guardadas', async () => {
  const view = await ver({
    items: [JAVELIN, GREATPICK],
    gear: { equippedWeaponIds: [GREATPICK.id] },
  })
  const nomes = view.attacks.map((a) => a.name)
  assert.ok(nomes.indexOf('Greatpick') < nomes.indexOf('Javelin'))
})

test('só arma vira ataque; corda e sabão não', async () => {
  const view = await ver({ items: [GREATPICK, doCatalogo('Rope'), doCatalogo('Soap')] })
  assert.deepEqual(
    view.attacks.map((a) => a.name).sort(),
    ['Greatpick', 'Unarmed Strike'],
  )
})

/* ------------------------------------------------- §9 modificadores manuais */

test('modificador manual entra como parcela com o rótulo do jogador', async () => {
  const view = await ver({
    items: [GREATPICK],
    itemMods: { [GREATPICK.id]: [{ label: 'Rage', atk: 0, dmg: 2 }] },
  })
  const atk = acharAtaque(view, 'Greatpick')

  assert.equal(atk.damage.formula, '1d10+6') // 4 de Força + 2 de Rage
  assert.ok(
    atk.damage.bonus.parts.some((p) => p.label.includes('Rage')),
    'o modificador manual precisa aparecer no breakdown com o rótulo que a pessoa deu',
  )
})

/* ---------------------------------------------------------- §11 condições */

test('Frightened penaliza tudo e marca o número como alterado', async () => {
  const view = await ver({ vitals: { conditions: { frightened: 2 } } })

  assert.equal(view.perception.total, 4) // 6 − 2
  assert.equal(view.perception.altered, true)
  assert.equal(acharPericia(view, 'Athletics').stat.total, 5)
})

test('Frightened e Sickened não somam: vale o maior', async () => {
  const view = await ver({ vitals: { conditions: { frightened: 1, sickened: 3 } } })
  assert.equal(view.perception.total, 3) // 6 − 3, não 6 − 4
})

test('Clumsy pesa no que depende de Destreza, e não no resto', async () => {
  const view = await ver({ vitals: { conditions: { clumsy: 2 } } })

  assert.equal(view.saves.reflex.total, 3) // 5 − 2
  assert.equal(view.saves.fortitude.total, 7) // intocado
  assert.equal(acharPericia(view, 'Athletics').stat.total, 7) // Força, intocado
})

test('Enfeebled pesa na Força; Drained, na Fortitude', async () => {
  const fraco = await ver({ vitals: { conditions: { enfeebled: 1 } } })
  assert.equal(acharPericia(fraco, 'Athletics').stat.total, 6)

  const drenado = await ver({ vitals: { conditions: { drained: 1 } } })
  assert.equal(drenado.saves.fortitude.total, 6)
})

test('Off-Guard baixa a CA em 2, e Prone baixa os ataques em 2', async () => {
  const desprevenido = await ver({ vitals: { conditions: { offGuard: true } } })
  assert.equal(desprevenido.ac.total, 13) // 15 − 2

  const caido = await ver({ items: [GREATPICK], vitals: { conditions: { prone: true } } })
  assert.equal(acharAtaque(caido, 'Greatpick').attack.total, 5) // 7 − 2
})

test('sem condição nenhuma, nada fica marcado como alterado', async () => {
  const view = await ver()
  assert.equal(view.ac.altered, false)
  assert.equal(view.perception.altered, false)
})

/* ----------------------------------------------------------------- §10.6 escudo */

test('escudo só conta quando está empunhado e erguido', async () => {
  const escudo = doCatalogo('Steel Shield')

  const guardado = await ver({ items: [escudo] })
  assert.equal(guardado.ac.total, 15)

  const empunhado = await ver({ items: [escudo], gear: { heldShieldId: escudo.id } })
  assert.equal(empunhado.ac.total, 15, 'empunhar não basta: precisa erguer')

  const erguido = await ver({
    items: [escudo],
    gear: { heldShieldId: escudo.id },
    vitals: { shieldRaised: true, shieldHp: escudo.shield.hpMax },
  })
  assert.equal(erguido.ac.total, 15 + escudo.shield.acBonus)
})

test('escudo quebrado para de dar bônus', async () => {
  const escudo = doCatalogo('Steel Shield')
  const view = await ver({
    items: [escudo],
    gear: { heldShieldId: escudo.id },
    vitals: { shieldRaised: true, shieldHp: escudo.shield.bt - 1 },
  })
  assert.equal(view.ac.total, 15)
  assert.equal(view.shield.broken, true)
})

/* -------------------------------------------------------- personagem sem ficha */

test('sem ficha o motor devolve nulo, não explode', async () => {
  const { buildSheet } = await import('../src/lib/sheet.js')
  assert.equal(
    buildSheet({ sheet: null, items: [], gear: {}, vitals: {}, itemMods: {} }),
    null,
  )
})
