/* Modificador manual em número da ficha.
 *
 * O risco desta entrega não é o modificador que não aparece — esse a pessoa vê
 * na hora. É o CONTRÁRIO: modificador que aparece onde não devia, e some no
 * meio de uma soma sem dizer que está ali. Por isso metade dos casos abaixo
 * verifica o que NÃO mudou.
 *
 * O outro risco é o número que se acerta em dois lugares e diverge: PV máximo
 * é calculado pelo motor (a barra) e pelo reducer (o teto da cura). Os dois
 * têm de responder a mesma coisa.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildSheet, nightRest } from '../src/lib/sheet.js'
import { normalizeStatMods, statModLabel, statModTargets } from '../src/lib/statMods.js'
import { parsePathbuilder } from '../src/lib/pathbuilder.js'
import { reducer } from '../src/state/reducer.js'
import { createInitialState } from '../src/state/initialState.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const RURIK = parsePathbuilder(JSON.parse(readFileSync(path.join(ROOT, 'docs/fixtures/rurik.json'), 'utf8')))
const MAGO = parsePathbuilder(JSON.parse(readFileSync(path.join(ROOT, 'docs/fixtures/wizard.json'), 'utf8')))
const CATALOG = JSON.parse(readFileSync(path.join(ROOT, 'src/data/catalog.equipment.json'), 'utf8'))

const doCatalogo = (nome) => {
  const item = CATALOG.find((i) => i.name === nome)
  assert.ok(item, `o catálogo precisa ter "${nome}"`)
  return { ...item, qty: 1 }
}

const HIDE = doCatalogo('Hide Armor')
const GREATPICK = doCatalogo('Greatpick')

const ver = (statMods = [], { items = [], gear = {} } = {}) =>
  buildSheet({
    sheet: RURIK,
    items,
    gear: { wornArmorId: null, heldShieldId: null, equippedWeaponIds: [], ...gear },
    vitals: { hp: 24, tempHp: 0, conditions: {} },
    itemMods: {},
    statMods,
  })

const pericia = (view, nome) => view.skills.find((s) => s.name === nome)
const ataque = (view, nome) => view.attacks.find((a) => a.name === nome)

/* --------------------------------------------------- nada muda sem modificador */

test('sem modificador manual, a ficha é exatamente a de antes', () => {
  const semLista = buildSheet({
    sheet: RURIK,
    items: [HIDE],
    gear: { wornArmorId: HIDE.id, heldShieldId: null, equippedWeaponIds: [] },
    vitals: { hp: 24 },
    itemMods: {},
  })
  const comListaVazia = ver([], { items: [HIDE], gear: { wornArmorId: HIDE.id } })
  assert.deepEqual(comListaVazia, semLista)
  assert.equal(semLista.ac.total, 18)
})

/* ------------------------------------------------------------ onde ele entra */

test('modificador na CA soma no total e aparece como parcela rotulada', () => {
  const view = ver([{ label: 'Bênção de Torag', target: 'ac', value: 1 }], {
    items: [HIDE],
    gear: { wornArmorId: HIDE.id },
  })

  assert.equal(view.ac.total, 19)
  const parcela = view.ac.parts.find((p) => p.label === 'Bênção de Torag (manual)')
  assert.ok(parcela, 'o modificador tem que aparecer no breakdown com o rótulo do jogador')
  assert.equal(parcela.value, 1)
  assert.equal(
    view.ac.parts.reduce((n, p) => n + p.value, 0),
    view.ac.total,
    'as parcelas continuam somando o total',
  )
})

test('modificador negativo é penalidade, e o rótulo continua o do jogador', () => {
  const view = ver([{ label: 'Maldição', target: 'save:will', value: -2 }])
  const semNada = ver([])
  assert.equal(view.saves.will.total, semNada.saves.will.total - 2)
  assert.ok(view.saves.will.parts.some((p) => p.label === 'Maldição (manual)' && p.value === -2))
})

test('dois modificadores no mesmo alvo entram os dois', () => {
  const view = ver([
    { label: 'Bênção', target: 'perception', value: 1 },
    { label: 'Item', target: 'perception', value: 2 },
  ])
  assert.equal(view.perception.total, ver([]).perception.total + 3)
})

test('modificador de condição e modificador manual convivem no mesmo número', () => {
  const view = buildSheet({
    sheet: RURIK,
    items: [],
    gear: {},
    vitals: { hp: 24, conditions: { frightened: 1 } },
    statMods: [{ label: 'Bênção', target: 'save:will', value: 2 }],
  })
  const sem = buildSheet({ sheet: RURIK, items: [], gear: {}, vitals: { hp: 24, conditions: { frightened: 1 } } })
  assert.equal(view.saves.will.total, sem.saves.will.total + 2)
  assert.ok(view.saves.will.altered, 'a marca de "alterado por condição" continua sendo da condição')
})

test('modificador manual sozinho NÃO marca o número como alterado por condição', () => {
  const view = ver([{ label: 'Bênção', target: 'save:will', value: 2 }])
  assert.equal(view.saves.will.altered, false)
})

/* ------------------------------------------------------- e onde ele não entra */

test('modificador numa perícia não encosta nas outras nem na CA', () => {
  const view = ver([{ label: 'Corda boa', target: 'skill:athletics', value: 2 }])
  const sem = ver([])

  assert.equal(pericia(view, 'Athletics').stat.total, pericia(sem, 'Athletics').stat.total + 2)
  assert.equal(pericia(view, 'Acrobatics').stat.total, pericia(sem, 'Acrobatics').stat.total)
  assert.equal(view.ac.total, sem.ac.total)
  assert.equal(view.saves.reflex.total, sem.saves.reflex.total)
})

test('modificador na perícia de Lore acha a perícia certa', () => {
  const lore = RURIK.lores?.[0]
  assert.ok(lore, 'o fixture do Rurik precisa de uma perícia de Lore')
  const chave = `skill:lore:${String(lore[0]).toLowerCase()}`

  const view = ver([{ label: 'Livro', target: chave, value: 3 }])
  const sem = ver([])
  const nome = `${lore[0]} Lore`
  assert.equal(pericia(view, nome).stat.total, pericia(sem, nome).stat.total + 3)
})

/* ------------------------------------------- atributo é o que se espalha */

test('modificador em atributo sobe a perícia, o ataque e o dano que dependem dele', () => {
  const view = ver([{ label: 'Cinturão de Força', target: 'abil:str', value: 1 }], {
    items: [GREATPICK],
    gear: { equippedWeaponIds: [GREATPICK.id] },
  })
  const sem = ver([], { items: [GREATPICK], gear: { equippedWeaponIds: [GREATPICK.id] } })

  assert.equal(view.abilityMods.str, sem.abilityMods.str + 1)
  assert.equal(pericia(view, 'Athletics').stat.total, pericia(sem, 'Athletics').stat.total + 1)
  assert.equal(ataque(view, 'Greatpick').attack.total, ataque(sem, 'Greatpick').attack.total + 1)
  assert.equal(ataque(view, 'Greatpick').damage.bonus.total, ataque(sem, 'Greatpick').damage.bonus.total + 1)
  assert.equal(view.saves.will.total, sem.saves.will.total, 'Will não depende de Força')
})

test('o atributo se explica: a célula tem breakdown com a ficha e o que foi declarado', () => {
  const view = ver([{ label: 'Cinturão de Força', target: 'abil:str', value: 1 }])
  const str = view.abilityStats.str

  assert.equal(str.total, view.abilityMods.str, 'o breakdown do atributo tem que fechar com o número')
  assert.deepEqual(
    str.parts.map((p) => p.label),
    ['STR', 'Cinturão de Força (manual)'],
  )
})

test('a penalidade de ataque múltiplo anda junto com o ataque modificado', () => {
  const view = ver([{ label: 'Cinturão de Força', target: 'abil:str', value: 1 }], {
    items: [GREATPICK],
    gear: { equippedWeaponIds: [GREATPICK.id] },
  })
  const atk = ataque(view, 'Greatpick')
  assert.equal(atk.map.second, atk.attack.total - 5)
  assert.equal(atk.map.third, atk.attack.total - 10)
})

test('modificador em Destreza não fura o limite de Destreza da armadura', () => {
  // Hide Armor tem dexCap 2 e o Rurik já está no teto: o +2 declarado não entra
  // na CA, porque o teto vale para o total.
  const view = ver([{ label: 'Capa élfica', target: 'abil:dex', value: 2 }], {
    items: [HIDE],
    gear: { wornArmorId: HIDE.id },
  })
  const sem = ver([], { items: [HIDE], gear: { wornArmorId: HIDE.id } })

  assert.equal(view.ac.total, sem.ac.total)
  assert.equal(view.saves.reflex.total, sem.saves.reflex.total + 2, 'Reflexos não têm teto de armadura')
})

/* ------------------------------------------------- números sem breakdown */

test('modificador no deslocamento entra depois da armadura, e o piso é zero', () => {
  assert.equal(ver([{ label: 'Botas', target: 'speed', value: 10 }]).speed, ver([]).speed + 10)
  assert.equal(ver([{ label: 'Lama', target: 'speed', value: -999 }]).speed, 0)
})

test('modificador no PV máximo muda a barra e o teto da cura junto', () => {
  const mods = [{ label: 'Robustez', target: 'hpMax', value: 6 }]
  const view = ver(mods)
  assert.equal(view.hpMax, ver([]).hpMax + 6)

  // O mesmo teto no reducer: curar um personagem inteiro não pode parar num
  // número diferente do que está escrito na barra.
  let state = createInitialState()
  state = reducer(state, { type: 'SET_STAT_MODS', playerId: 'p-valeros', mods })
  state = reducer(state, { type: 'APPLY_DAMAGE', playerId: 'p-valeros', amount: 100 })
  state = reducer(state, { type: 'APPLY_HEAL', playerId: 'p-valeros', amount: 100 })

  const valeros = state.players.find((p) => p.id === 'p-valeros')
  assert.equal(valeros.vitals.hp, valeros.sheet.hpMax + 6)
})

test('o descanso noturno enxerga o mesmo PV máximo que a ficha', () => {
  const mods = [{ label: 'Robustez', target: 'hpMax', value: 6 }]
  const patch = nightRest(RURIK, { hp: 1 }, mods)
  assert.ok(patch.hp <= ver(mods).hpMax)
  assert.equal(nightRest(RURIK, { hp: 1 }, []).hp + 0, nightRest(RURIK, { hp: 1 }).hp)
})

/* ---------------------------------------------------------------- alvos */

test('a lista de alvos cobre a aba Resumo inteira, e as perícias do personagem', () => {
  const alvos = statModTargets(RURIK).flatMap((g) => g.opcoes.map((o) => o.target))
  for (const esperado of ['abil:str', 'ac', 'save:will', 'perception', 'speed', 'hpMax', 'classDc']) {
    assert.ok(alvos.includes(esperado), `faltou o alvo ${esperado}`)
  }
  assert.ok(alvos.some((a) => a.startsWith('skill:')), 'as perícias têm que estar na lista')
})

test('quem não conjura não recebe alvo de magia — seria número declarado que não muda nada', () => {
  const alvos = statModTargets(RURIK).flatMap((g) => g.opcoes.map((o) => o.target))
  assert.ok(!RURIK.spellcasting, 'o Rurik é o bárbaro do fixture: não conjura')
  assert.ok(!alvos.includes('spellDc'))
  assert.ok(!alvos.includes('spellAttack'))
})

test('quem conjura recebe os dois alvos de magia, e eles mexem nos dois números', () => {
  const alvos = statModTargets(MAGO).flatMap((g) => g.opcoes.map((o) => o.target))
  assert.ok(alvos.includes('spellDc'))
  assert.ok(alvos.includes('spellAttack'))

  const comum = { sheet: MAGO, items: [], gear: {}, vitals: { hp: 8 } }
  const sem = buildSheet(comum)
  const view = buildSheet({
    ...comum,
    statMods: [
      { label: 'Bastão', target: 'spellAttack', value: 1 },
      { label: 'Foco arcano', target: 'spellDc', value: 2 },
    ],
  })

  assert.equal(view.spellAttack.total, sem.spellAttack.total + 1)
  assert.equal(view.spellDc.total, sem.spellDc.total + 2)
  assert.ok(view.spellDc.parts.some((p) => p.label === 'Foco arcano (manual)'))
})

test('alvo que sumiu da ficha continua visível com a chave que veio', () => {
  assert.equal(statModLabel(RURIK, 'skill:lore:navio-afundado'), 'skill:lore:navio-afundado')
  assert.equal(statModLabel(RURIK, 'ac'), 'CA')
})

test('alvo desconhecido não muda número nenhum, e não quebra a ficha', () => {
  const view = ver([{ label: 'Vindo do futuro', target: 'coisa-nova', value: 5 }])
  assert.deepEqual(view.ac, ver([]).ac)
  assert.equal(view.hpMax, ver([]).hpMax)
})

/* --------------------------------------------------------------- saneamento */

test('modificador sem rótulo não entra: número que não diz de onde veio é o que a ficha proíbe', () => {
  const limpo = normalizeStatMods([
    { label: '  ', target: 'ac', value: 2 },
    { label: 'Bênção', target: '', value: 2 },
    { label: '  Bênção  ', target: 'ac', value: '2.7' },
    null,
  ])
  assert.deepEqual(limpo, [{ label: 'Bênção', target: 'ac', value: 3 }])
})

test('a ação grava a lista inteira de uma vez, e o saneamento vale para ela', () => {
  let state = createInitialState()
  state = reducer(state, {
    type: 'SET_STAT_MODS',
    playerId: 'p-valeros',
    mods: [
      { label: 'Bênção', target: 'ac', value: 1 },
      { label: '', target: 'ac', value: 9 },
    ],
  })
  assert.deepEqual(state.players.find((p) => p.id === 'p-valeros').statMods, [
    { label: 'Bênção', target: 'ac', value: 1 },
  ])

  state = reducer(state, { type: 'SET_STAT_MODS', playerId: 'p-valeros', mods: [] })
  assert.deepEqual(state.players.find((p) => p.id === 'p-valeros').statMods, [])
})

test('remover a ficha não apaga o que o jogador declarou', () => {
  let state = createInitialState()
  const mods = [{ label: 'Bênção', target: 'ac', value: 1 }]
  state = reducer(state, { type: 'SET_STAT_MODS', playerId: 'p-valeros', mods })
  state = reducer(state, { type: 'REMOVE_SHEET', playerId: 'p-valeros' })
  assert.deepEqual(state.players.find((p) => p.id === 'p-valeros').statMods, mods)
})
