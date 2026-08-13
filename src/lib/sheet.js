/* O motor de cálculo da ficha.
 *
 * Função pura: entra a ficha, o que o personagem está vestindo, o que está na
 * mochila e o que está acontecendo com ele; sai o que a tela mostra. Sem React,
 * sem rede, sem disco, sem estado global. Roda igual no celular e no servidor.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * A regra que manda em tudo aqui: NENHUMA FUNÇÃO DEVOLVE NÚMERO SOLTO.
 *
 * Toda estatística devolve parcelas rotuladas que somam, mais a marca `altered`
 * quando alguma parcela veio de condição:
 *
 *     Large Greatpick — Ataque +7
 *       Str                       +4
 *       Proficiência (trained)    +3
 *       Rage (manual)             +0
 *       Frightened (status)       −0
 *
 * Disso saem de graça três coisas que, calculadas à parte, divergiriam: o popup
 * de breakdown, o modificador manual como parcela nomeada, e o número em
 * vermelho quando uma condição mexeu nele.
 * ────────────────────────────────────────────────────────────────────────────
 *
 * O que o motor NÃO sabe, e admite: Rage, Giant Instinct, weapon specialization,
 * runas. Nada disso é chutado — a saída é o modificador manual, com o rótulo que
 * o jogador escreveu, aparecendo no breakdown como qualquer outra parcela.
 */

import UNARMED from '../data/unarmed.json' with { type: 'json' }
import { ABILITY_CONDITION, conditionMods } from './conditions.js'
import { RANK_NAMES, abilityMod, skillList } from './pathbuilder.js'

/**
 * A regra de proficiência, num lugar só.
 *
 * **Destreinado não soma o nível.** É a fonte de erro mais comum do PF2e: a
 * Arcana do Rurik, nível 1 e destreinado, é +0 — não +1. Vale igual para
 * perícia, salvamento, arma e armadura.
 */
export const profBonus = (rank, level) => (rank === 0 ? 0 : level + rank)

const rankLabel = (rank) => RANK_NAMES[rank] ?? 'untrained'

/** Sinal na frente, com o menos tipográfico e o ±0 do protótipo. */
export const sgn = (n) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '±0')

const num = (value, fallback = 0) => {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/* ------------------------------------------------------------------- stat */

/**
 * Monta uma estatística a partir das parcelas dela mais as penalidades de
 * condição que se aplicam. Portada do protótipo, com o mesmo nome e a mesma
 * forma.
 *
 * @param opts.check  é um teste (perícia, salvamento, percepção, ataque)
 * @param opts.dc     é uma CD (CA, DC de classe, DC de magia)
 * @param opts.ability atributo de que depende — decide quem entre Clumsy,
 *                     Enfeebled e Drained encosta nele
 * @param opts.ac     é a Classe de Armadura (Off-Guard pesa)
 * @param opts.attack é uma jogada de ataque (Prone pesa)
 */
export function stat(title, parts, opts = {}, mods) {
  const cond = []
  const add = (label, value) => {
    if (value > 0) cond.push({ label, value: -value, cond: true })
  }

  /* Penalidade de status atinge todo teste e toda CD — inclusive a CA. */
  if (opts.check || opts.dc) add(`${mods.statusLabel} (status)`, mods.status)

  /* Penalidade por atributo só atinge o que depende daquele atributo: Clumsy
     pesa na CA e nos Reflexos, e não encosta em Atletismo. */
  if (opts.ability && ABILITY_CONDITION[opts.ability]) {
    add(`${ABILITY_CONDITION[opts.ability]} (status)`, mods[opts.ability])
  }

  if (opts.ac && mods.offGuard) {
    cond.push({ label: 'Off-Guard (circumstance)', value: -mods.offGuard, cond: true })
  }
  if (opts.attack && mods.prone) {
    cond.push({ label: 'Prone (circumstance)', value: -mods.prone, cond: true })
  }

  const all = [...parts.filter(Boolean), ...cond]
  return {
    title,
    parts: all,
    total: all.reduce((n, p) => n + p.value, 0),
    altered: cond.length > 0,
    kind: opts.dc ? 'dc' : 'check',
  }
}

/* --------------------------------------------------------------- armas */

/* Traços que decidem de qual atributo sai o ataque e o dano. Não são inventados
   aqui: saem do `traits` do próprio catálogo, que veio dos packs. */
const temTraco = (item, nome) =>
  (item.traits ?? []).some((t) => t === nome || t.startsWith(`${nome}-`))

/**
 * De qual atributo sai o ataque, e de qual sai o dano (§10.3).
 *
 * - corpo a corpo: Força; com `finesse`, o melhor entre Força e Destreza
 * - à distância: Destreza no ataque e **atributo nenhum no dano**, salvo
 *   `propulsive`, que soma metade da Força
 * - arremesso: Destreza no ataque e **Força no dano** — é o caso do Javelin, e
 *   é o que faz o Pathbuilder marcar ataque +5 e dano 1d6+4
 */
function weaponAbilities(item, abilities) {
  const str = abilityMod(abilities.str)
  const dex = abilityMod(abilities.dex)
  const thrown = temTraco(item, 'thrown')
  const ranged = Boolean(item.weapon?.ranged)

  if (!ranged) {
    const finesse = temTraco(item, 'finesse')
    const usaDex = finesse && dex > str
    return { attack: usaDex ? 'dex' : 'str', damage: 'str' }
  }
  if (thrown) return { attack: 'dex', damage: 'str' }
  if (temTraco(item, 'propulsive')) return { attack: 'dex', damage: 'propulsive' }
  return { attack: 'dex', damage: null }
}

/**
 * Grau de proficiência da arma. A categoria (`simple`, `martial`…) é o padrão;
 * `specificProficiencies` do Pathbuilder é a exceção nomeada — "você é expert
 * em Longsword", que sobrepõe o grau da categoria quando for maior.
 */
function weaponRank(item, sheet) {
  const categoria = item.weapon?.category ?? 'simple'
  let rank = num(sheet.proficiencies?.[categoria], 0)

  const especificas = sheet.specificProficiencies ?? {}
  for (const [nivel, lista] of Object.entries(especificas)) {
    const grau = { trained: 2, expert: 4, master: 6, legendary: 8 }[nivel]
    if (!grau || !Array.isArray(lista)) continue
    const bate = lista.some((nome) => String(nome).toLowerCase() === String(item.name).toLowerCase())
    if (bate && grau > rank) rank = grau
  }
  return rank
}

/** Fórmula de dano, como se lê na mesa: `1d10+4`, `2d6`, `1d4−1`. */
function damageFormula(dice, die, bonus) {
  const dados = die ? `${dice}${die}` : String(dice)
  if (!bonus) return dados
  return bonus > 0 ? `${dados}+${bonus}` : `${dados}−${Math.abs(bonus)}`
}

function buildAttack(item, { sheet, abilities, mods, itemMods, equipped, level }) {
  const arma = item.weapon ?? {}
  const rank = weaponRank(item, sheet)
  const { attack: atkAbil, damage: dmgAbil } = weaponAbilities(item, abilities)
  const manuais = itemMods[item.id] ?? []

  const partesAtaque = [
    { label: atkAbil.toUpperCase(), value: abilityMod(abilities[atkAbil]) },
    { label: `Proficiência (${rankLabel(rank)})`, value: profBonus(rank, level) },
    ...manuais
      .filter((m) => num(m.atk) !== 0)
      .map((m) => ({ label: `${m.label} (manual)`, value: num(m.atk), manual: true })),
  ]

  const ataque = stat(
    item.name,
    partesAtaque,
    { check: true, attack: true, ability: atkAbil },
    mods,
  )

  /* Dano não é teste: condição de status não pesa nele. Enfeebled, sim — é
     penalidade a testes e dano baseados em Força. */
  const partesDano = []
  if (dmgAbil === 'str') {
    partesDano.push({ label: 'STR', value: abilityMod(abilities.str) })
  } else if (dmgAbil === 'propulsive') {
    const str = abilityMod(abilities.str)
    partesDano.push({ label: 'STR (propulsive)', value: str >= 0 ? Math.floor(str / 2) : str })
  }
  for (const m of manuais) {
    if (num(m.dmg) !== 0) partesDano.push({ label: `${m.label} (manual)`, value: num(m.dmg), manual: true })
  }
  const dano = stat(
    `${item.name} — dano`,
    partesDano,
    dmgAbil === 'str' || dmgAbil === 'propulsive' ? { ability: 'str' } : {},
    mods,
  )

  const dadosExtra = manuais.reduce((n, m) => n + num(m.extraDice), 0)
  const dados = num(arma.damage?.dice, 1) + dadosExtra
  const passo = temTraco(item, 'agile') ? 4 : 5

  return {
    id: item.id,
    name: item.name,
    qty: num(item.qty, 1),
    equipped,
    ranged: Boolean(arma.ranged),
    thrown: temTraco(item, 'thrown'),
    traits: item.traits ?? [],
    weapon: arma,
    rank,
    attack: ataque,
    damage: {
      dice: dados,
      die: arma.damage?.die ?? null,
      damageType: arma.damage?.damageType ?? null,
      bonus: dano,
      formula: damageFormula(dados, arma.damage?.die, dano.total),
    },
    /* Penalidade de ataque múltiplo: −5/−10, ou −4/−8 com `agile`. */
    map: { second: ataque.total - passo, third: ataque.total - passo * 2 },
  }
}

/* ------------------------------------------------------------------ escudo */

function buildShield(item, vitals) {
  if (!item?.shield) return null
  const hpMax = num(item.shield.hpMax, 0)
  const bt = num(item.shield.bt, Math.floor(hpMax / 2))
  /* PV nunca gravado significa escudo inteiro, não escudo destruído. */
  const hp = vitals.shieldHp == null ? hpMax : Math.max(0, num(vitals.shieldHp, hpMax))

  return {
    id: item.id,
    name: item.name,
    acBonus: num(item.shield.acBonus, 0),
    hardness: num(item.shield.hardness, 0),
    hpMax,
    bt,
    hp,
    /* Abaixo do Ponto de Ruptura o escudo quebra e para de dar bônus — mesmo
       erguido. Erguer um escudo quebrado não devolve CA. */
    broken: hp <= bt,
    raised: Boolean(vitals.shieldRaised),
  }
}

/* ------------------------------------------------------------------- motor */

/**
 * A ficha calculada.
 *
 * @param sheet    a ficha importada (§7). `null` = personagem sem ficha, e o
 *                 motor devolve `null` — quem chama mostra o estado vazio.
 * @param items    os itens do personagem já resolvidos, com `qty`
 * @param gear     `{ wornArmorId, heldShieldId, equippedWeaponIds }`
 * @param vitals   HP, condições, escudo — o que está acontecendo agora
 * @param itemMods modificadores manuais, por item
 */
export function buildSheet({ sheet, items = [], gear = {}, vitals = {}, itemMods = {} } = {}) {
  if (!sheet) return null

  const level = Math.max(1, num(sheet.level, 1))
  const abilities = sheet.abilities ?? {}
  const mods = conditionMods(vitals.conditions ?? {})
  const prof = (key) => num(sheet.proficiencies?.[key], 0)
  const abil = (key) => abilityMod(abilities[key])

  const porId = new Map(items.filter(Boolean).map((item) => [item.id, item]))
  const armadura = porId.get(gear.wornArmorId) ?? null
  const escudo = buildShield(porId.get(gear.heldShieldId), vitals)

  /* ---------------------------------------------------------------- CA */

  const catArmadura = armadura?.armor?.category ?? 'unarmored'
  const rankArmadura = prof(catArmadura)
  const dexCap = armadura?.armor?.dexCap
  const dexNaCA = dexCap == null ? abil('dex') : Math.min(abil('dex'), num(dexCap, 0))

  const partesCA = [
    { label: 'Base', value: 10 },
    { label: 'DEX', value: dexNaCA },
    { label: `Proficiência (${rankLabel(rankArmadura)})`, value: profBonus(rankArmadura, level) },
  ]
  if (armadura?.armor?.acBonus) {
    partesCA.push({ label: armadura.name, value: num(armadura.armor.acBonus) })
  }
  /* O escudo só entra erguido, e só se não estiver quebrado (§10.6). */
  if (escudo?.raised && !escudo.broken && escudo.acBonus) {
    partesCA.push({ label: `${escudo.name} (circumstance)`, value: escudo.acBonus })
  }

  const ac = stat('Classe de Armadura', partesCA, { dc: true, ability: 'dex', ac: true }, mods)

  /* ------------------------------------------- penalidade de teste da armadura

     A penalidade só vale para quem não alcança a Força exigida pela armadura.
     `armor.strength` é o MODIFICADOR de Força pedido, não o valor do atributo:
     Hide Armor pede 2, e o Rurik tem Str 18, ou seja mod +4 — ele carrega a
     armadura sem penalidade. */
  const forcaExigida = num(armadura?.armor?.strength, 0)
  const checkPenalty =
    armadura && abil('str') < forcaExigida ? num(armadura.armor?.checkPenalty, 0) : 0

  /* ----------------------------------------------------- salvamentos e afins */

  const salvamento = (key, ability, titulo) =>
    stat(
      titulo,
      [
        { label: ability.toUpperCase(), value: abil(ability) },
        { label: `Proficiência (${rankLabel(prof(key))})`, value: profBonus(prof(key), level) },
      ],
      { check: true, ability },
      mods,
    )

  const saves = {
    fortitude: salvamento('fortitude', 'con', 'Fortitude'),
    reflex: salvamento('reflex', 'dex', 'Reflex'),
    will: salvamento('will', 'wis', 'Will'),
  }

  const perception = salvamento('perception', 'wis', 'Perception')

  const chave = sheet.keyability ?? 'str'
  const classDc = stat(
    'DC de classe',
    [
      { label: 'Base', value: 10 },
      { label: chave.toUpperCase(), value: abil(chave) },
      { label: `Proficiência (${rankLabel(prof('classDC'))})`, value: profBonus(prof('classDC'), level) },
    ],
    { dc: true, ability: chave },
    mods,
  )

  /* -------------------------------------------------------------- perícias */

  const skills = skillList(sheet).map((skill) => {
    const partes = [
      { label: skill.ability.toUpperCase(), value: abil(skill.ability) },
      {
        label: `Proficiência (${rankLabel(skill.rank)})`,
        value: profBonus(skill.rank, level),
      },
    ]
    /* A penalidade da armadura pesa nas perícias de Força e Destreza. */
    if (checkPenalty && (skill.ability === 'str' || skill.ability === 'dex')) {
      partes.push({ label: `${armadura.name} (armadura)`, value: checkPenalty })
    }
    return {
      ...skill,
      rankLabel: rankLabel(skill.rank),
      stat: stat(skill.name, partes, { check: true, ability: skill.ability }, mods),
    }
  })

  /* --------------------------------------------------------------- ataques */

  const equipadas = new Set(gear.equippedWeaponIds ?? [])
  const armas = items.filter((item) => item?.weapon && item.category === 'weapon')

  /* O Punho vem do `unarmed.json`, extraído do código do Foundry na ingestão:
     não é item, não está na mochila, e existe sempre (§10.3). */
  const contexto = { sheet, abilities, mods, itemMods, level }
  const attacks = [
    ...armas
      .filter((item) => equipadas.has(item.id))
      .map((item) => buildAttack(item, { ...contexto, equipped: true })),
    ...armas
      .filter((item) => !equipadas.has(item.id))
      .map((item) => buildAttack(item, { ...contexto, equipped: false })),
    buildAttack({ ...UNARMED, qty: 1 }, { ...contexto, equipped: false }),
  ]

  /* ------------------------------------------------------------- conjuração */

  const conj = sheet.spellcasting
  const TRADICAO_PROF = {
    arcane: 'castingArcane',
    divine: 'castingDivine',
    occult: 'castingOccult',
    primal: 'castingPrimal',
  }
  let spellDc = null
  let spellAttack = null
  if (conj) {
    const rankConj = conj.proficiency || prof(TRADICAO_PROF[conj.tradition] ?? '')
    const atributo = conj.ability ?? 'int'
    const partes = [
      { label: atributo.toUpperCase(), value: abil(atributo) },
      { label: `Proficiência (${rankLabel(rankConj)})`, value: profBonus(rankConj, level) },
    ]
    spellDc = stat('DC de magia', [{ label: 'Base', value: 10 }, ...partes], { dc: true, ability: atributo }, mods)
    spellAttack = stat('Ataque de magia', partes, { check: true, attack: true, ability: atributo }, mods)
  }

  /* ------------------------------------------------------------------ HP */

  const hpMax = Math.max(1, num(sheet.hpMax, 1))
  const hp = vitals.hp == null ? hpMax : Math.max(0, Math.min(hpMax, num(vitals.hp, hpMax)))

  return {
    level,
    hpMax,
    hp,
    tempHp: Math.max(0, num(vitals.tempHp, 0)),
    abilities,
    abilityMods: Object.fromEntries(Object.keys(abilities).map((k) => [k, abil(k)])),

    ac,
    saves,
    perception,
    classDc,
    spellDc,
    spellAttack,
    skills,
    attacks,
    shield: escudo,

    armor: armadura
      ? { id: armadura.id, name: armadura.name, ...armadura.armor, checkPenalty, rank: rankArmadura }
      : null,

    /* Deslocamento é número da ficha; a penalidade da armadura só entra quando
       a Força não alcança o requisito, igual à de teste. */
    speed:
      num(sheet.speed, 0) +
      (armadura && abil('str') < forcaExigida ? num(armadura.armor?.speedPenalty, 0) : 0),

    conditions: vitals.conditions ?? {},
    conditionMods: mods,
    /* Slowed não vira parcela em cálculo nenhum: ele tira ações, e ação é coisa
       de mesa. Fica exposto para a tela poder avisar. */
    slowed: mods.slowed,
  }
}

/* ------------------------------------------------------------- descanso */

/**
 * Refocus: um ponto de foco de volta, sem passar da reserva (§10.7).
 * Função pura — devolve os campos de `vitals` que mudam.
 */
export function refocus(sheet, vitals = {}) {
  const pool = Math.max(0, num(sheet?.focusPoints, 0))
  if (!pool) return null
  return { focusPoints: Math.min(pool, num(vitals.focusPoints, 0) + 1) }
}

/**
 * Descanso noturno (§10.7). Por personagem, aplicando só a ele — o "descanso do
 * grupo" na aba Mestre ficou anotado como sugestão futura (§17, resposta 2).
 *
 * Repõe foco e slots preparados, cura `conMod × nível` com o mínimo de 1 por
 * nível, e **reduz Doomed em 1 — Doomed não zera**. Wounded não é tocado aqui:
 * ele some quando o HP volta ao máximo, não pelo descanso.
 */
export function nightRest(sheet, vitals = {}) {
  if (!sheet) return null
  const level = Math.max(1, num(sheet.level, 1))
  const hpMax = Math.max(1, num(sheet.hpMax, 1))
  const cura = Math.max(level, abilityMod(sheet.abilities?.con) * level)

  const conditions = { ...(vitals.conditions ?? {}) }
  const doomed = num(conditions.doomed, 0)
  if (doomed > 1) conditions.doomed = doomed - 1
  else delete conditions.doomed

  const hpAntes = vitals.hp == null ? hpMax : num(vitals.hp, hpMax)
  const hpDepois = Math.min(hpMax, hpAntes + cura)

  /* Wounded some sozinho quando o HP chega ao máximo — é a regra, e vale aqui
     porque o descanso pode ser justamente o que encheu a barra. */
  if (hpDepois >= hpMax) delete conditions.wounded

  return {
    hp: hpDepois,
    tempHp: 0,
    focusPoints: Math.max(0, num(sheet.focusPoints, 0)),
    slotsUsed: {},
    conditions,
    curado: hpDepois - hpAntes,
  }
}
