/* Leitor do JSON do Pathbuilder.
 *
 * Entra o texto colado pelo mestre (Export Character → Export to Foundry VTT),
 * sai o objeto `sheet` da §7 da espec. Função pura: sem React, sem rede, sem
 * disco. Não sabe o que é `player`, não sabe o que é item.
 *
 * Duas regras mandam neste arquivo:
 *
 * 1. **Nunca lançar.** JSON truncado, chave faltando, campo com o tipo errado:
 *    tudo vira ficha parcial mais um aviso em `sheet.warnings`. Uma ficha que
 *    entra pela metade e diz o que faltou é melhor que uma tela de erro.
 * 2. **Errar em silêncio é o único erro inaceitável.** Chave que não
 *    reconhecemos entra em `warnings` com o nome que veio.
 *
 * O que NÃO é lido, e por quê:
 *
 * - `equipment`, `equipmentContainers` — D2: nenhum item vem do Pathbuilder. O
 *   inventário é 100% do app. `"Hide"` no Pathbuilder é `"Hide Armor"` no
 *   catálogo, e casar nome por aproximação erra calado.
 * - `weapons`, `armor` — mesma razão. O que a pessoa empunha sai do inventário.
 * - `money` — D3: a carteira é da mesa, não do construtor de personagem.
 * - `acTotal`, `formula` — D5: os números saem do nosso cálculo. Estes dois são
 *   gabarito de teste (§16), não fonte em produção.
 * - `pets`, `familiars`, `inventorMods`, `mods`, `rituals` — fora do escopo.
 */

/* Grau de proficiência no Pathbuilder é um número, e é o número que somaria ao
   bônus se a pessoa fosse de nível 0. Guardamos o grau cru; quem transforma em
   bônus é o motor (§9), porque a regra do PF2e — destreinado não soma o nível —
   precisa valer num lugar só. */
export const RANKS = { untrained: 0, trained: 2, expert: 4, master: 6, legendary: 8 }

export const RANK_NAMES = { 0: 'untrained', 2: 'trained', 4: 'expert', 6: 'master', 8: 'legendary' }

/* Atributo de cada perícia do PF2e. Não vem do JSON do Pathbuilder nem dos packs
   do Foundry em forma ingerível: é estrutura da regra, como a legenda de graus
   acima. Nome em inglês (D12). Lore entra com o atributo Int. */
export const SKILL_ABILITY = {
  acrobatics: 'dex',
  arcana: 'int',
  athletics: 'str',
  crafting: 'int',
  deception: 'cha',
  diplomacy: 'cha',
  intimidation: 'cha',
  medicine: 'wis',
  nature: 'wis',
  occultism: 'int',
  performance: 'cha',
  religion: 'wis',
  society: 'int',
  stealth: 'dex',
  survival: 'wis',
  thievery: 'dex',
}

/* Nome de tela de cada perícia. O Pathbuilder grava a chave em minúscula; o que
   aparece na ficha é o nome publicado. */
export const SKILL_NAMES = {
  acrobatics: 'Acrobatics',
  arcana: 'Arcana',
  athletics: 'Athletics',
  crafting: 'Crafting',
  deception: 'Deception',
  diplomacy: 'Diplomacy',
  intimidation: 'Intimidation',
  medicine: 'Medicine',
  nature: 'Nature',
  occultism: 'Occultism',
  performance: 'Performance',
  religion: 'Religion',
  society: 'Society',
  stealth: 'Stealth',
  survival: 'Survival',
  thievery: 'Thievery',
}

export const SAVE_KEYS = ['fortitude', 'reflex', 'will']
export const ARMOR_KEYS = ['unarmored', 'light', 'medium', 'heavy']
export const WEAPON_KEYS = ['unarmed', 'simple', 'martial', 'advanced']
export const CASTING_KEYS = ['castingArcane', 'castingDivine', 'castingOccult', 'castingPrimal']

/* Toda chave que sabemos ler dentro de `proficiencies`. O que cair fora daqui é
   logado: o export traz chaves de Starfinder (`piloting`, `computers`) mesmo em
   personagem de Pathfinder, e amanhã pode trazer outras. */
const KNOWN_PROFICIENCIES = new Set([
  'classDC',
  'perception',
  ...SAVE_KEYS,
  ...ARMOR_KEYS,
  ...WEAPON_KEYS,
  ...CASTING_KEYS,
  ...Object.keys(SKILL_ABILITY),
])

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha']

/** Modificador a partir do valor do atributo. 18 → +4, 10 → +0, 7 → −2. */
export const abilityMod = (score) => Math.floor((toNumber(score, 10) - 10) / 2)

function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function toText(value) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/* "Not set" é como o Pathbuilder grava campo opcional em branco — divindade,
   idade, gênero. Vira ausência, não vira o texto "Not set" na tela. */
const NOT_SET = new Set(['not set', 'none selected', 'none', '-', '—'])
const meaningful = (value) => {
  const text = toText(value)
  return text && !NOT_SET.has(text.toLowerCase()) ? text : null
}

/**
 * Converte o export do Pathbuilder na ficha da §7.
 *
 * Aceita o texto colado ou o objeto já parseado, com ou sem o invólucro
 * `{ success, build }`.
 *
 * @returns {object} a ficha. `sheet.warnings` lista tudo que não foi entendido;
 *   `sheet.ok` diz se havia um `build` reconhecível. Nunca lança.
 */
export function parsePathbuilder(input, { now = () => new Date() } = {}) {
  const warnings = []
  const warn = (message) => warnings.push(message)

  const build = readBuild(input, warn)
  if (!build) {
    return { ...emptySheet(now), warnings, ok: false }
  }

  const level = Math.max(1, Math.round(toNumber(build.level, 1)))
  const abilities = readAbilities(build.abilities, warn)
  const attributes = build.attributes ?? {}
  const proficiencies = readProficiencies(build.proficiencies, warn)
  const lores = readLores(build.lores, warn)

  return {
    ok: true,
    importedAt: now().toISOString(),
    source: 'pathbuilder',

    name: toText(build.name) ?? 'Sem nome',
    level,
    class: meaningful(build.class),
    dualClass: meaningful(build.dualClass),
    ancestry: meaningful(build.ancestry),
    heritage: meaningful(build.heritage),
    background: meaningful(build.background),
    deity: meaningful(build.deity),

    size: toNumber(build.size, 2),
    sizeName: meaningful(build.sizeName),
    /* O atributo-chave manda no DC de classe (§10.4). Vem em minúscula. */
    keyability: readKeyability(build.keyability, warn),

    speed: toNumber(attributes.speed, 0) + toNumber(attributes.speedBonus, 0),
    languages: readList(build.languages),
    resistances: readList(build.resistances),

    abilities,
    proficiencies,
    specificProficiencies: readSpecificProficiencies(build.specificProficiencies, warn),
    lores,

    hpMax: maxHp({ attributes, abilities, level }),

    /* Resolvidos nos packs do Foundry na fase 4: até lá, `slug`, `traits`,
       `actionCost` e `descriptionHtml` ficam vazios de propósito — campo que a
       fonte ainda não deu não se preenche com aproximação. */
    feats: readFeats(build.feats, warn),
    specials: readSpecials(build.specials),
    actions: [],

    spellcasting: readSpellcasting(build, warn),
    focusPoints: Math.max(0, Math.round(toNumber(build.focusPoints, 0))),

    unresolved: [],
    warnings,
  }
}

/**
 * HP máximo (§10.1). Único número que a ficha guarda pronto, porque só muda com
 * reimportação — subir de nível é reimportar.
 *
 *   hpMax = ancestryhp + (classhp + conMod) × level + bonushp + bonushpPerLevel × level
 */
export function maxHp({ attributes = {}, abilities = {}, level = 1 }) {
  const conMod = abilityMod(abilities.con)
  const total =
    toNumber(attributes.ancestryhp) +
    (toNumber(attributes.classhp) + conMod) * level +
    toNumber(attributes.bonushp) +
    toNumber(attributes.bonushpPerLevel) * level
  return Math.max(1, Math.round(total))
}

/**
 * As perícias da ficha, com atributo e grau — as comuns mais as lores.
 * Derivada, não guardada: sai do `proficiencies` e do `lores` da ficha.
 */
export function skillList(sheet) {
  if (!sheet) return []
  const proficiencies = sheet.proficiencies ?? {}

  const common = Object.keys(SKILL_ABILITY).map((key) => ({
    key,
    name: SKILL_NAMES[key],
    ability: SKILL_ABILITY[key],
    rank: toNumber(proficiencies[key], 0),
    lore: false,
  }))

  /* "Sailing" vira a perícia "Sailing Lore" — é como o PF2e a chama, e é o nome
     que a pessoa procura na lista. */
  const lores = (sheet.lores ?? []).map(([name, rank]) => ({
    key: `lore:${String(name).toLowerCase()}`,
    name: `${name} Lore`,
    ability: 'int',
    rank: toNumber(rank, 0),
    lore: true,
  }))

  return [...common, ...lores].sort((a, b) => a.name.localeCompare(b.name))
}

/* ------------------------------------------------------------------ leitura */

function readBuild(input, warn) {
  let data = input

  if (typeof data === 'string') {
    const text = data.trim()
    if (!text) {
      warn('Nada foi colado.')
      return null
    }
    try {
      data = JSON.parse(text)
    } catch (error) {
      warn(`O texto colado não é um JSON válido (${error.message}).`)
      return null
    }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    warn('O JSON colado não tem o formato do Pathbuilder.')
    return null
  }

  /* O export vem embrulhado em { success, build }. Aceitamos o embrulho e o
     recheio: quem copia da tela às vezes traz só o `build`. */
  if (data.success === false) warn('O Pathbuilder marcou este export como malsucedido; lendo assim mesmo.')
  const build = data.build && typeof data.build === 'object' ? data.build : data

  if (!build.abilities && !build.proficiencies && !build.name) {
    warn('O JSON colado não parece um personagem do Pathbuilder (sem name, abilities nem proficiencies).')
    return null
  }
  return build
}

function readAbilities(raw, warn) {
  const out = {}
  for (const key of ABILITY_KEYS) out[key] = 10

  if (!raw || typeof raw !== 'object') {
    warn('Sem bloco `abilities`: assumindo 10 em tudo. Confira o export.')
    return out
  }
  for (const key of ABILITY_KEYS) {
    if (raw[key] === undefined) {
      warn(`Atributo ausente no export: ${key}. Assumindo 10.`)
      continue
    }
    out[key] = Math.round(toNumber(raw[key], 10))
  }
  return out
}

function readKeyability(raw, warn) {
  const key = toText(raw)?.toLowerCase() ?? null
  if (!key) return null
  if (!ABILITY_KEYS.includes(key)) {
    warn(`Atributo-chave desconhecido no export: "${raw}".`)
    return null
  }
  return key
}

function readProficiencies(raw, warn) {
  const out = {}
  if (!raw || typeof raw !== 'object') {
    warn('Sem bloco `proficiencies`: tudo entra como destreinado.')
    return out
  }
  const unknown = []
  for (const [key, value] of Object.entries(raw)) {
    if (!KNOWN_PROFICIENCIES.has(key)) {
      unknown.push(key)
      continue
    }
    const rank = Math.round(Number(value))
    /* `Number('muito')` é NaN, e NaN não está na escala — a checagem abaixo pega
       tanto o grau ímpar quanto o valor que nem número é. Converter para 0 antes
       de checar deixaria o texto virar "destreinado" sem um pio. */
    if (!(rank in RANK_NAMES)) {
      warn(`Grau de proficiência fora da escala em "${key}": ${value}. Tratando como destreinado.`)
      out[key] = 0
      continue
    }
    out[key] = rank
  }
  if (unknown.length) {
    /* `piloting` e `computers` são de Starfinder e aparecem em todo export. Não
       é defeito do arquivo — é só ruído que não podemos deixar virar perícia. */
    warn(`Proficiências ignoradas por não serem do PF2e: ${unknown.join(', ')}.`)
  }
  return out
}

function readSpecificProficiencies(raw, warn) {
  const out = { trained: [], expert: [], master: [], legendary: [] }
  if (raw === undefined || raw === null) return out
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    warn('Bloco `specificProficiencies` com formato inesperado; ignorado.')
    return out
  }
  for (const level of Object.keys(out)) {
    out[level] = readList(raw[level])
  }
  return out
}

function readLores(raw, warn) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const entry of raw) {
    if (!Array.isArray(entry) || !toText(entry[0])) {
      warn(`Lore em formato inesperado, ignorada: ${JSON.stringify(entry)}.`)
      continue
    }
    out.push([toText(entry[0]), Math.round(toNumber(entry[1], 0))])
  }
  return out
}

function readList(raw) {
  if (!Array.isArray(raw)) return []
  return raw.map(meaningful).filter(Boolean)
}

/**
 * `feats` é um array posicional de tamanho variável:
 *
 *   ["Underwater Marauder", null, "Awarded Feat", 1]
 *   ["Sudden Charge", null, "Class Feat", 1, "Barbarian Feat 1", "standardChoice", null]
 *
 * [0] nome · [1] escolha feita dentro do feat · [2] categoria · [3] nível ·
 * [4] rótulo de onde ele veio. Ler por índice às cegas quebra na entrada curta,
 * então cada posição é opcional.
 */
function readFeats(raw, warn) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const entry of raw) {
    if (!Array.isArray(entry)) {
      warn(`Feat em formato inesperado, ignorado: ${JSON.stringify(entry)}.`)
      continue
    }
    const name = toText(entry[0])
    if (!name) {
      warn(`Feat sem nome, ignorado: ${JSON.stringify(entry)}.`)
      continue
    }
    const category = meaningful(entry[2])
    out.push({
      name,
      choice: meaningful(entry[1]),
      category,
      level: entry[3] === undefined || entry[3] === null ? null : Math.round(toNumber(entry[3], 0)),
      /* O que aparece embaixo do nome na lista: o rótulo específico quando
         existe ("Barbarian Feat 1"), senão a categoria ("Awarded Feat"). */
      source: meaningful(entry[4]) ?? category,
      origin: 'feats',
      slug: null,
      actionCost: null,
      traits: [],
      descriptionHtml: null,
    })
  }
  return out
}

/**
 * `specials` são features de classe, sentidos e traços de herança, misturados
 * numa lista de nomes: ["Darkvision", "Giant Instinct", "Rage", "Dromaar"].
 *
 * Ficam separados dos `feats` porque só a resolução nos packs (fase 4) sabe se
 * "Rage" é ação ou feature, e porque um mesmo nome pode estar nas duas listas —
 * "Dromaar" está. Deduplicar aqui esconderia a informação de qual lista trouxe.
 */
function readSpecials(raw) {
  if (!Array.isArray(raw)) return []
  const seen = new Set()
  const out = []
  for (const value of raw) {
    const name = meaningful(value)
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push(name)
  }
  return out
}

/**
 * `[{ spellLevel, list: [nome, ...] }]` → `[{ rank, name }]`, achatado e sem os
 * baldes por círculo. É a forma que a ficha e o motor de resolução consomem;
 * a forma de balde é só como o Pathbuilder serializa.
 */
function flattenSpellList(raw, warn, campo) {
  if (!Array.isArray(raw)) return []
  const out = []
  for (const balde of raw) {
    if (!balde || typeof balde !== 'object' || !Array.isArray(balde.list)) {
      warn(`${campo}: balde em formato inesperado, ignorado: ${JSON.stringify(balde)}.`)
      continue
    }
    const rank = Math.round(toNumber(balde.spellLevel, 0))
    for (const nome of balde.list) {
      const name = toText(nome)
      if (!name) continue
      out.push({ rank, name })
    }
  }
  return out
}

/**
 * Conjuração. Testado contra um conjurador de verdade na fase 11 (mago
 * humano nv 1, `docs/fixtures/wizard.json`) — até aqui só existia o fixture do
 * Rurik, que é bárbaro e nunca exercitou este caminho (§18, risco 1, fechado).
 */
function readSpellcasting(build, warn) {
  const casters = Array.isArray(build.spellCasters) ? build.spellCasters : []
  if (casters.length === 0) return null

  if (casters.length > 1) {
    warn(`O export tem ${casters.length} blocos de conjuração; a ficha mostra o primeiro.`)
  }

  const caster = casters[0]
  if (!caster || typeof caster !== 'object') {
    warn('Bloco de conjuração em formato inesperado; ficha importada sem magias.')
    return null
  }

  /* `build.focus` é aninhado por tradição e depois por atributo:
     `{ arcane: { int: { focusCantrips: [], focusSpells: [...] } } }`. Chave
     composta porque um multiclasse pode ter mais de um bloco. */
  const tradicao = meaningful(caster.magicTradition)
  const atributo = readKeyability(caster.ability, warn)
  const focoDoBloco = build.focus?.[tradicao]?.[atributo]
  const focusCantrips = Array.isArray(focoDoBloco?.focusCantrips)
    ? focoDoBloco.focusCantrips.map(toText).filter(Boolean)
    : []
  const focusSpells = Array.isArray(focoDoBloco?.focusSpells)
    ? focoDoBloco.focusSpells.map(toText).filter(Boolean)
    : []

  return {
    name: meaningful(caster.name),
    tradition: tradicao,
    preparation: meaningful(caster.spellcastingType),
    ability: atributo,
    proficiency: Math.round(toNumber(caster.proficiency, 0)),
    /* Índice = círculo; índice 0 é a cota de truques. `[6,3,0,…]` do mago:
       6 truques, 3 magias de círculo 1. */
    perDay: Array.isArray(caster.perDay) ? caster.perDay.map((n) => Math.round(toNumber(n, 0))) : [],
    /* O grimório: tudo que o conjurador sabe/pode preparar. Para espontâneo é
       a lista de magias conhecidas — o Pathbuilder usa o mesmo campo `spells`
       para os dois tipos. */
    book: flattenSpellList(caster.spells, warn, 'spellCasters[].spells'),
    /* Semente de `vitals.preparedSpells` no primeiro IMPORT_SHEET (D7: fato
       de mesa, não se recalcula). Reimportar não mexe nisso — o jogador já
       escolheu o que tem preparado hoje. */
    initialPrepared: flattenSpellList(caster.prepared, warn, 'spellCasters[].prepared'),
    focusCantrips,
    focusSpells,
  }
}

function emptySheet(now) {
  return {
    ok: false,
    importedAt: now().toISOString(),
    source: 'pathbuilder',
    name: null,
    level: 1,
    class: null,
    dualClass: null,
    ancestry: null,
    heritage: null,
    background: null,
    deity: null,
    size: 2,
    sizeName: null,
    keyability: null,
    speed: 0,
    languages: [],
    resistances: [],
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    proficiencies: {},
    specificProficiencies: { trained: [], expert: [], master: [], legendary: [] },
    lores: [],
    hpMax: 1,
    feats: [],
    specials: [],
    actions: [],
    spellcasting: null,
    focusPoints: 0,
    unresolved: [],
    warnings: [],
  }
}
