/* O leitor do JSON do Pathbuilder, contra o export real do Rurik.
 *
 * Metade destes testes é sobre entrada quebrada. É de propósito: o caminho feliz
 * quebra na hora e alguém conserta; a entrada torta que passa calada vira número
 * errado na mesa três semanas depois.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { abilityMod, maxHp, parsePathbuilder, skillList } from '../src/lib/pathbuilder.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const RURIK_TEXT = readFileSync(path.join(ROOT, 'docs/fixtures/rurik.json'), 'utf8')
const RURIK = JSON.parse(RURIK_TEXT)
const WIZARD_TEXT = readFileSync(path.join(ROOT, 'docs/fixtures/wizard.json'), 'utf8')

const rurik = () => parsePathbuilder(RURIK_TEXT)
const wizard = () => parsePathbuilder(WIZARD_TEXT)

test('lê o Rurik inteiro sem reclamar do que é normal', () => {
  const sheet = rurik()

  assert.equal(sheet.ok, true)
  assert.equal(sheet.name, 'Rurik')
  assert.equal(sheet.level, 1)
  assert.equal(sheet.class, 'Barbarian')
  assert.equal(sheet.ancestry, 'Dwarf')
  assert.equal(sheet.heritage, 'Dromaar')
  assert.equal(sheet.background, 'Sailor')
  assert.equal(sheet.sizeName, 'Medium')
  assert.equal(sheet.keyability, 'str')
  assert.equal(sheet.speed, 20)
})

test('aceita tanto o texto colado quanto o objeto já lido, e o build sem invólucro', () => {
  assert.equal(parsePathbuilder(RURIK).name, 'Rurik')
  assert.equal(parsePathbuilder(RURIK.build).name, 'Rurik')
})

test('atributos viram modificadores pela regra, não por tabela', () => {
  const sheet = rurik()
  assert.deepEqual(sheet.abilities, { str: 18, dex: 14, con: 14, int: 10, wis: 12, cha: 10 })

  assert.equal(abilityMod(18), 4)
  assert.equal(abilityMod(14), 2)
  assert.equal(abilityMod(10), 0)
  assert.equal(abilityMod(11), 0)
  assert.equal(abilityMod(9), -1)
  assert.equal(abilityMod(7), -2)
})

test('HP máximo do Rurik é 24', () => {
  // 10 de ancestralidade + (12 de classe + 2 de Con) × 1 nível
  assert.equal(rurik().hpMax, 24)
})

test('HP máximo soma bônus fixo e bônus por nível', () => {
  const base = { attributes: { ancestryhp: 8, classhp: 10, bonushp: 0, bonushpPerLevel: 0 }, abilities: { con: 14 } }
  assert.equal(maxHp({ ...base, level: 1 }), 20)
  assert.equal(maxHp({ ...base, level: 5 }), 68)
  assert.equal(maxHp({ ...base, attributes: { ...base.attributes, bonushp: 5 }, level: 1 }), 25)
  assert.equal(maxHp({ ...base, attributes: { ...base.attributes, bonushpPerLevel: 1 }, level: 5 }), 73)
})

test('graus de proficiência ficam crus, sem virar bônus', () => {
  const { proficiencies } = rurik()

  assert.equal(proficiencies.perception, 4)
  assert.equal(proficiencies.fortitude, 4)
  assert.equal(proficiencies.reflex, 2)
  assert.equal(proficiencies.will, 4)
  assert.equal(proficiencies.classDC, 2)
  assert.equal(proficiencies.athletics, 2)
  assert.equal(proficiencies.arcana, 0)
  assert.equal(proficiencies.medium, 2)
  assert.equal(proficiencies.heavy, 0)
  assert.equal(proficiencies.martial, 2)
  assert.equal(proficiencies.advanced, 0)
})

test('chave de Starfinder é ignorada e vira aviso, não perícia', () => {
  const sheet = rurik()

  assert.equal('piloting' in sheet.proficiencies, false)
  assert.equal('computers' in sheet.proficiencies, false)

  const aviso = sheet.warnings.find((w) => w.includes('piloting'))
  assert.ok(aviso, 'o descarte precisa aparecer nos avisos')
  assert.match(aviso, /computers/)

  assert.equal(
    skillList(sheet).some((s) => s.key === 'piloting' || s.key === 'computers'),
    false,
  )
})

test('lore vira perícia com o sufixo Lore e o atributo Int', () => {
  const sheet = rurik()
  assert.deepEqual(sheet.lores, [['Sailing', 2]])

  const sailing = skillList(sheet).find((s) => s.name === 'Sailing Lore')
  assert.ok(sailing)
  assert.equal(sailing.rank, 2)
  assert.equal(sailing.ability, 'int')
  assert.equal(sailing.lore, true)
})

test('as dezesseis perícias comuns aparecem, treinadas ou não', () => {
  const skills = skillList(rurik())
  assert.equal(skills.filter((s) => !s.lore).length, 16)

  const byName = Object.fromEntries(skills.map((s) => [s.name, s]))
  assert.equal(byName.Athletics.rank, 2)
  assert.equal(byName.Athletics.ability, 'str')
  assert.equal(byName.Arcana.rank, 0)
  assert.equal(byName.Stealth.rank, 0)
  assert.equal(byName.Stealth.ability, 'dex')
})

test('"None selected" em idiomas vira lista vazia', () => {
  assert.deepEqual(rurik().languages, [])
})

test('feats posicionais são lidos sem indexar às cegas', () => {
  const { feats } = rurik()
  assert.equal(feats.length, 4)

  const byName = Object.fromEntries(feats.map((f) => [f.name, f]))

  // entrada curta: quatro posições, sem rótulo próprio
  assert.equal(byName['Underwater Marauder'].category, 'Awarded Feat')
  assert.equal(byName['Underwater Marauder'].source, 'Awarded Feat')
  assert.equal(byName['Underwater Marauder'].level, 1)

  // entrada longa: o rótulo específico ganha do genérico
  assert.equal(byName['Sudden Charge'].category, 'Class Feat')
  assert.equal(byName['Sudden Charge'].source, 'Barbarian Feat 1')
  assert.equal(byName['Orc Ferocity'].source, 'Dwarf Feat 1')
  assert.equal(byName.Dromaar.source, 'Heritage Feat')
})

test('o que a fase 4 resolve nasce vazio, não nasce aproximado', () => {
  for (const feat of rurik().feats) {
    assert.equal(feat.slug, null)
    assert.equal(feat.descriptionHtml, null)
    assert.equal(feat.actionCost, null)
    assert.deepEqual(feat.traits, [])
  }
  assert.deepEqual(rurik().unresolved, [])
})

test('specials ficam separados dos feats, mesmo com nome repetido', () => {
  const sheet = rurik()

  assert.deepEqual(sheet.specials, [
    'Darkvision',
    'Quick-Tempered',
    'Giant Instinct',
    'Low-Light Vision',
    'Rage',
    'Dromaar',
  ])
  // "Dromaar" está nas duas listas; juntar aqui apagaria de qual delas veio
  assert.ok(sheet.feats.some((f) => f.name === 'Dromaar'))
})

test('perícia e grimório não viram special: a ficha já os mostra em outro lugar', () => {
  const build = {
    ...RURIK.build,
    specials: ['Darkvision', 'Crafting', 'Rage', 'Society', 'Spellbook', 'Stealth'],
  }
  const sheet = parsePathbuilder({ build })

  // O Pathbuilder repete a perícia treinada em `specials`. Procurar "Crafting"
  // no pack de feats é procurar o que nunca esteve lá — e o resultado era uma
  // linha "não resolvido" para um dado que `proficiencies` mostra certo.
  assert.deepEqual(sheet.specials, ['Darkvision', 'Rage'])

  // e continua sendo perícia, com o grau, onde sempre esteve
  const cra = skillList(sheet).find((s) => s.key === 'crafting')
  assert.equal(cra.rank, RURIK.build.proficiencies.crafting)
})

test('special que não é perícia continua entrando, mesmo desconhecido', () => {
  const build = { ...RURIK.build, specials: ['Craftiness', 'Fúria do Julio'] }
  assert.deepEqual(parsePathbuilder({ build }).specials, ['Craftiness', 'Fúria do Julio'])
})

test('bárbaro não tem conjuração, e isso é null e não um objeto vazio', () => {
  const sheet = rurik()
  assert.equal(sheet.spellcasting, null)
  assert.equal(sheet.focusPoints, 0)
})

test('lê um conjurador quando o export traz um', () => {
  const build = {
    ...RURIK.build,
    spellCasters: [
      {
        name: 'Wizard',
        magicTradition: 'arcane',
        spellcastingType: 'prepared',
        ability: 'int',
        proficiency: 2,
        perDay: [5, 2, 0],
        spells: [{ spellLevel: 1, list: ['Magic Missile'] }],
      },
    ],
  }
  const { spellcasting } = parsePathbuilder({ build })

  assert.equal(spellcasting.tradition, 'arcane')
  assert.equal(spellcasting.preparation, 'prepared')
  assert.equal(spellcasting.ability, 'int')
  assert.equal(spellcasting.proficiency, 2)
  assert.deepEqual(spellcasting.perDay, [5, 2, 0])
  assert.deepEqual(spellcasting.book, [{ rank: 1, name: 'Magic Missile' }])
})

/* ---------------------------------------------- o conjurador de verdade (fase 11)

   Até aqui só existia o fixture do Rurik, que é bárbaro: `spellCasters` vazio
   nunca exercitou este caminho contra dado real (§18, risco 1). O mago abaixo
   fecha isso. */

test('o mago tem conjuração arcana preparada, com DC e ataque calculáveis', () => {
  const { spellcasting } = wizard()

  assert.equal(spellcasting.tradition, 'arcane')
  assert.equal(spellcasting.preparation, 'prepared')
  assert.equal(spellcasting.ability, 'int')
  assert.equal(spellcasting.proficiency, 2)
  assert.deepEqual(spellcasting.perDay.slice(0, 2), [6, 3])
})

test('o grimório do mago vem achatado, sem os baldes por círculo', () => {
  const { book } = wizard().spellcasting

  assert.equal(book.length, 9)
  assert.equal(book.filter((s) => s.rank === 0).length, 6, 'seis truques')
  assert.equal(book.filter((s) => s.rank === 1).length, 3, 'três de círculo 1')
  assert.ok(book.some((s) => s.name === 'Sure Strike' && s.rank === 1))
})

test('o preparado do dia do mago semeia a mesa, inclusive truque repetido', () => {
  const { initialPrepared } = wizard().spellcasting

  assert.equal(initialPrepared.length, 9)
  // "Bullhorn" está preparado duas vezes entre os truques — é legítimo, e
  // achatar não pode perder a repetição.
  assert.equal(initialPrepared.filter((s) => s.name === 'Bullhorn').length, 2)
})

test('as magias de foco do mago vêm de build.focus, por tradição e atributo', () => {
  const { focusSpells, focusCantrips } = wizard().spellcasting

  assert.deepEqual(focusSpells, ['Charming Push'])
  assert.deepEqual(focusCantrips, [])
})

test('o Rurik continua sem conjuração depois da mudança de forma', () => {
  assert.equal(rurik().spellcasting, null)
})

test('balde de magia em formato torto vira aviso, não trava a importação', () => {
  const { build } = JSON.parse(WIZARD_TEXT)
  build.spellCasters[0].spells.push('não é um balde')
  build.spellCasters[0].prepared = 'nem isso é uma lista'

  const sheet = parsePathbuilder({ build })

  assert.equal(sheet.spellcasting.book.length, 9, 'o balde torto foi descartado, o resto ficou')
  assert.deepEqual(sheet.spellcasting.initialPrepared, [])
  assert.ok(sheet.warnings.some((w) => w.includes('spells')))
})

test('D5: número pronto continua fora da ficha, mesmo com D2 e D3 reabertas', () => {
  const sheet = rurik()

  assert.equal(RURIK.build.acTotal.acTotal, 18)
  for (const chave of ['money', 'acTotal', 'formula', 'pets', 'familiars', 'equipment']) {
    assert.equal(chave in sheet, false, `${chave} não pertence à ficha`)
  }
})

/* ------------------------------------------------------------- a bagagem */

test('item do Pathbuilder vira lista crua, com a quantidade e a lista de origem', () => {
  const itens = rurik().startingItems

  assert.equal(itens.length, 13)
  assert.deepEqual(itens[0], { name: 'Backpack', qty: 1, kind: 'equipment' })
  assert.deepEqual(
    itens.find((entrada) => entrada.name === 'Chalk'),
    { name: 'Chalk', qty: 10, kind: 'equipment' },
  )
  // arma e armadura saem das listas próprias, com o `kind` que diz de onde vieram
  assert.deepEqual(
    itens.find((entrada) => entrada.name === 'Javelin'),
    { name: 'Javelin', qty: 4, kind: 'weapon' },
  )
  // "Hide", não "Hide Armor": aqui o nome fica cru; quem casa é lib/startingGear.js
  assert.deepEqual(
    itens.find((entrada) => entrada.kind === 'armor'),
    { name: 'Hide', qty: 1, kind: 'armor' },
  )
})

test('o enfeite que não entra no item vira aviso, não silêncio', () => {
  const sheet = parsePathbuilder({
    build: {
      name: 'Runada',
      weapons: [{ name: 'Longsword', qty: 1, pot: 2, runes: ['striking'], mat: 'cold-iron' }],
      armor: [{ name: 'Hide', qty: 1, worn: true }],
    },
  })

  const avisos = sheet.warnings.join(' · ')
  assert.match(avisos, /Longsword: potência, runas, material/)
  assert.match(avisos, /modificador manual/)
  assert.match(avisos, /Hide estava vestido/)
  // e o item entra assim mesmo, sem as runas
  assert.deepEqual(sheet.startingItems[0], { name: 'Longsword', qty: 1, kind: 'weapon' })
})

test('contêiner do Pathbuilder é ignorado, e o aviso diz isso', () => {
  assert.ok(rurik().warnings.some((aviso) => aviso.includes('Contêineres')))
  assert.ok(Object.keys(RURIK.build.equipmentContainers).length > 0)
})

test('moeda vira carteira do app, com a platina convertida em ouro', () => {
  assert.deepEqual(rurik().startingCoins, { gold: 11, silver: 0, copper: 0 })

  const rico = parsePathbuilder({ build: { name: 'Rico', money: { pp: 3, gp: 2, sp: 5, cp: 7, xp: 9 } } })
  assert.deepEqual(rico.startingCoins, { gold: 32, silver: 5, copper: 7 })
  assert.ok(rico.warnings.some((aviso) => aviso.includes('3 pl viraram 30 po')))
  assert.ok(rico.warnings.some((aviso) => aviso.includes('xp')))
})

test('bagagem torta não trava a importação e nunca some calada', () => {
  const sheet = parsePathbuilder({
    build: { name: 'Torta', equipment: [['Rope', 1], 'só um texto', []], weapons: {}, money: 'muito' },
  })

  assert.equal(sheet.ok, true)
  assert.deepEqual(sheet.startingItems, [{ name: 'Rope', qty: 1, kind: 'equipment' }])
  assert.deepEqual(sheet.startingCoins, { gold: 0, silver: 0, copper: 0 })
  // dois itens tortos, o bloco `weapons` que não é lista e o `money` que é texto
  assert.equal(sheet.warnings.filter((aviso) => aviso.includes('formato inesperado')).length, 4)
})

test('ficha sem bagagem nenhuma tem lista vazia e carteira zerada, não undefined', () => {
  const sheet = wizard()
  assert.deepEqual(sheet.startingItems, [])
  assert.deepEqual(sheet.startingCoins, { gold: 15, silver: 0, copper: 0 })
})

/* ------------------------------------------------- entrada torta nunca lança */

test('texto vazio, lixo e JSON truncado devolvem ficha vazia com aviso', () => {
  for (const entrada of ['', '   ', 'nada disso é json', '{"build":{"name":"Rurik"', '[]', 'null']) {
    const sheet = parsePathbuilder(entrada)
    assert.equal(sheet.ok, false, `deveria recusar: ${entrada}`)
    assert.ok(sheet.warnings.length > 0, `deveria avisar: ${entrada}`)
    assert.equal(sheet.hpMax >= 1, true)
  }
})

test('undefined, número e array não lançam', () => {
  for (const entrada of [undefined, null, 42, [], [1, 2, 3], true]) {
    const sheet = parsePathbuilder(entrada)
    assert.equal(sheet.ok, false)
    assert.ok(sheet.warnings.length > 0)
  }
})

test('ficha sem abilities vira 10 em tudo, com aviso', () => {
  const { build } = JSON.parse(RURIK_TEXT)
  delete build.abilities
  const sheet = parsePathbuilder({ build })

  assert.equal(sheet.ok, true)
  assert.deepEqual(sheet.abilities, { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 })
  assert.ok(sheet.warnings.some((w) => w.includes('abilities')))
})

test('atributo faltando isolado não derruba os outros', () => {
  const { build } = JSON.parse(RURIK_TEXT)
  delete build.abilities.dex
  const sheet = parsePathbuilder({ build })

  assert.equal(sheet.abilities.str, 18)
  assert.equal(sheet.abilities.dex, 10)
  assert.ok(sheet.warnings.some((w) => w.includes('dex')))
})

test('grau de proficiência fora da escala vira destreinado, com aviso', () => {
  const { build } = JSON.parse(RURIK_TEXT)
  build.proficiencies.athletics = 3
  build.proficiencies.stealth = 'muito'
  const sheet = parsePathbuilder({ build })

  assert.equal(sheet.proficiencies.athletics, 0)
  assert.equal(sheet.proficiencies.stealth, 0)
  assert.equal(sheet.warnings.filter((w) => w.includes('fora da escala')).length, 2)
})

test('blocos ausentes ou tortos não impedem a importação', () => {
  const { build } = JSON.parse(RURIK_TEXT)
  delete build.proficiencies
  delete build.attributes
  delete build.lores
  delete build.feats
  delete build.specials
  build.specificProficiencies = 'nada disso'
  build.languages = null

  const sheet = parsePathbuilder({ build })

  assert.equal(sheet.ok, true)
  assert.deepEqual(sheet.proficiencies, {})
  assert.deepEqual(sheet.lores, [])
  assert.deepEqual(sheet.feats, [])
  assert.deepEqual(sheet.specials, [])
  assert.deepEqual(sheet.languages, [])
  assert.deepEqual(sheet.specificProficiencies, { trained: [], expert: [], master: [], legendary: [] })
  // sem `attributes` sobra só o mod de Con; o piso de 1 impede HP zero ou negativo
  assert.equal(sheet.hpMax, 2)
  assert.equal(maxHp({ abilities: { con: 6 }, level: 1 }), 1)
})

test('feat e lore em formato inesperado entram no log em vez de sumir calados', () => {
  const { build } = JSON.parse(RURIK_TEXT)
  build.feats.push('só uma string', [null, null, 'Class Feat', 1])
  build.lores.push('Sailing', [])

  const sheet = parsePathbuilder({ build })

  assert.equal(sheet.feats.length, 4, 'as entradas tortas não viram feat')
  assert.equal(sheet.lores.length, 1)
  assert.equal(sheet.warnings.filter((w) => w.includes('formato inesperado')).length, 3)
  assert.ok(sheet.warnings.some((w) => w.includes('sem nome')))
})

test('a data de importação é gravada e é ISO', () => {
  const sheet = parsePathbuilder(RURIK_TEXT, { now: () => new Date('2026-08-13T15:04:05.000Z') })
  assert.equal(sheet.importedAt, '2026-08-13T15:04:05.000Z')
})
