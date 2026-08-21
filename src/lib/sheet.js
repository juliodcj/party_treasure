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
import { statModParts, statModTotal } from './statMods.js'
import { truqueDeFoco } from './spells.js'

/**
 * A regra de proficiência, num lugar só.
 *
 * **Destreinado não soma o nível.** É a fonte de erro mais comum do PF2e: a
 * Arcana do Rurik, nível 1 e destreinado, é +0 — não +1. Vale igual para
 * perícia, salvamento, arma e armadura.
 */
export const profBonus = (rank, level) => (rank === 0 ? 0 : level + rank)

const rankLabel = (rank) => RANK_NAMES[rank] ?? 'untrained'

/* Sinal na frente, com o menos tipográfico. Zero é `+0`, e não o `±0` que o
   protótipo usava: numa coluna de modificadores, `+0` alinha com os vizinhos e
   se lê como o modificador que é. */
export const sgn = (n) => (n < 0 ? `−${Math.abs(n)}` : `+${n}`)

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
function weaponAbilities(item, abilMods) {
  const str = abilMods.str
  const dex = abilMods.dex
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

function buildAttack(item, { sheet, abilMods, abilParts, mods, itemMods, equipped, level }) {
  const arma = item.weapon ?? {}
  const rank = weaponRank(item, sheet)
  const { attack: atkAbil, damage: dmgAbil } = weaponAbilities(item, abilMods)
  const manuais = itemMods[item.id] ?? []

  const partesAtaque = [
    ...abilParts(atkAbil),
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
    partesDano.push(...abilParts('str'))
  } else if (dmgAbil === 'propulsive') {
    /* Metade da Força, e a metade é do TOTAL: um modificador manual em `str`
       entra na conta antes de dividir, como qualquer outro ponto de Força. */
    const str = abilMods.str
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

/* ------------------------------------------------------- traços de armadura

   Três traços de armadura mexem em número que esta ficha mostra. Eles não são
   regra escrita aqui: são o traço publicado que o catálogo já carrega, com o
   texto em `src/data/traits.json` (saído do mesmo pack).

     noisy     — "a penalidade de teste da armadura vale para Stealth mesmo
                  quando você alcança a Força exigida"
     flexible  — "você não aplica a penalidade de teste a Acrobatics nem a
                  Athletics"
     hindering — "−5 em todos os deslocamentos, no mínimo 5 pés, mesmo que a
                  Força ou uma habilidade reduza a penalidade da armadura"

   O resto dos traços de armadura do catálogo fica de fora, e é de propósito: o
   número deles depende de algo que a ficha não tem como saber sozinha.

     bulwark     só vale contra dano de área (a CA e o Reflexo da tela são um
                 número só, sem "contra o quê")
     aquadynamic só vale dentro d'água
     laminar     só com a armadura quebrada, e a ficha não guarda isso
     ponderous   é iniciativa — fora do escopo do programa
     comfort     é dormir de armadura: não vira número nenhum

   Aplicar qualquer um deles aqui seria pôr no número uma condição que não está
   na tela — que é a mesma coisa que errar em silêncio. */

/** Pergunta se a armadura vestida tem um traço. Sem armadura, é sempre não. */
const tracoDaArmadura = (armadura) => {
  const traits = armadura?.traits ?? []
  return (nome) => traits.includes(nome)
}

/** −5 em todo deslocamento, com o piso de 5 pés que o traço `hindering` fixa. */
const HINDERING = { penalidade: -5, minimo: 5 }

/**
 * O deslocamento com o que a armadura tira: a penalidade da própria armadura
 * (só para quem não alcança a Força exigida) e a de `hindering` (sempre).
 */
function velocidade(base, { armadura, forcaFalta, hindering }) {
  const comArmadura = base + (forcaFalta ? num(armadura?.armor?.speedPenalty, 0) : 0)
  if (!hindering) return comArmadura
  return Math.max(HINDERING.minimo, comArmadura + HINDERING.penalidade)
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
 * @param statMods modificadores manuais em número da ficha (`lib/statMods.js`)
 */
export function buildSheet({
  sheet,
  items = [],
  gear = {},
  vitals = {},
  itemMods = {},
  statMods = [],
} = {}) {
  if (!sheet) return null

  const level = Math.max(1, num(sheet.level, 1))
  const abilities = sheet.abilities ?? {}
  const mods = conditionMods(vitals.conditions ?? {})
  const prof = (key) => num(sheet.proficiencies?.[key], 0)

  /* O modificador manual entra como PARCELA, não somado por dentro: quem abrir
     o breakdown vê o rótulo que o jogador escreveu junto do que o app calculou.
     `manual()` devolve as parcelas de um alvo; `total()` devolve a soma, para o
     número que não tem breakdown (deslocamento, PV máximo). */
  const manual = (target) => statModParts(statMods, target)
  const total = (target) => statModTotal(statMods, target)

  /* Atributo é o caso especial: um `abil:str` de +1 sobe Atletismo, o ataque e o
     dano junto, porque é isso que um ponto de Força faz. Por isso ele aparece
     nas parcelas de TODA estatística que depende do atributo (`abilParts`), e o
     valor somado (`abil`) é o que a regra compara — requisito de Força da
     armadura, `finesse`, metade da Força do `propulsive`. */
  const abilParts = (key) => [
    { label: key.toUpperCase(), value: abilityMod(abilities[key]) },
    ...manual(`abil:${key}`),
  ]
  const abil = (key) => abilityMod(abilities[key]) + total(`abil:${key}`)

  const porId = new Map(items.filter(Boolean).map((item) => [item.id, item]))
  const armadura = porId.get(gear.wornArmorId) ?? null
  const escudo = buildShield(porId.get(gear.heldShieldId), vitals)

  /* ---------------------------------------------------------------- CA */

  const catArmadura = armadura?.armor?.category ?? 'unarmored'
  const rankArmadura = prof(catArmadura)
  const dexCap = armadura?.armor?.dexCap
  const dexNaCA = dexCap == null ? abil('dex') : Math.min(abil('dex'), num(dexCap, 0))

  /* DEX entra na CA como parcela ÚNICA, e não como base + manual: o limite de
     Destreza da armadura vale para o total, então separar as duas mostraria uma
     soma que o teto já cortou. O rótulo do que foi declarado continua visível na
     célula Dex dos Atributos, e na lista de modificadores. */
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

  partesCA.push(...manual('ac'))

  const ac = stat('Classe de Armadura', partesCA, { dc: true, ability: 'dex', ac: true }, mods)

  /* ------------------------------------------- penalidade de teste da armadura

     A penalidade só vale para quem não alcança a Força exigida pela armadura.
     `armor.strength` é o MODIFICADOR de Força pedido, não o valor do atributo:
     Hide Armor pede 2, e o Rurik tem Str 18, ou seja mod +4 — ele carrega a
     armadura sem penalidade.

     Em cima disso valem os três traços da armadura que mexem no que a ficha
     mostra (ver `tracoDaArmadura` no fim do arquivo). */
  const traco = tracoDaArmadura(armadura)
  const forcaExigida = num(armadura?.armor?.strength, 0)
  const forcaFalta = Boolean(armadura) && abil('str') < forcaExigida
  const penalidadeDaArmadura = num(armadura?.armor?.checkPenalty, 0)
  const checkPenalty = forcaFalta ? penalidadeDaArmadura : 0

  /* ----------------------------------------------------- salvamentos e afins */

  const salvamento = (key, ability, titulo, alvo) =>
    stat(
      titulo,
      [
        ...abilParts(ability),
        { label: `Proficiência (${rankLabel(prof(key))})`, value: profBonus(prof(key), level) },
        ...manual(alvo),
      ],
      { check: true, ability },
      mods,
    )

  const saves = {
    fortitude: salvamento('fortitude', 'con', 'Fortitude', 'save:fortitude'),
    reflex: salvamento('reflex', 'dex', 'Reflex', 'save:reflex'),
    will: salvamento('will', 'wis', 'Will', 'save:will'),
  }

  const perception = salvamento('perception', 'wis', 'Perception', 'perception')

  const chave = sheet.keyability ?? 'str'
  const classDc = stat(
    'DC de classe',
    [
      { label: 'Base', value: 10 },
      ...abilParts(chave),
      { label: `Proficiência (${rankLabel(prof('classDC'))})`, value: profBonus(prof('classDC'), level) },
      ...manual('classDc'),
    ],
    { dc: true, ability: chave },
    mods,
  )

  /* -------------------------------------------------------------- perícias */

  /*
   * Quanto a armadura tira de uma perícia.
   *
   * O caso base é o de sempre: quem não alcança a Força exigida leva a
   * penalidade de teste nas perícias de Força e de Destreza. Os dois traços
   * mudam o alcance dela, e não o valor:
   *
   *   flexible — não vale para Acrobatics nem para Athletics
   *   noisy    — vale para Stealth mesmo com a Força exigida alcançada
   */
  const penalidadeNaPericia = (skill) => {
    if (!armadura || !penalidadeDaArmadura) return 0
    if (skill.key === 'stealth' && traco('noisy')) return penalidadeDaArmadura
    if (!checkPenalty) return 0
    if (skill.ability !== 'str' && skill.ability !== 'dex') return 0
    if (traco('flexible') && (skill.key === 'acrobatics' || skill.key === 'athletics')) return 0
    return checkPenalty
  }

  const skills = skillList(sheet).map((skill) => {
    const partes = [
      ...abilParts(skill.ability),
      {
        label: `Proficiência (${rankLabel(skill.rank)})`,
        value: profBonus(skill.rank, level),
      },
      ...manual(`skill:${skill.key}`),
    ]
    /* A penalidade da armadura pesa nas perícias de Força e Destreza — com o
       que `flexible` tira e o que `noisy` acrescenta. */
    const daArmadura = penalidadeNaPericia(skill)
    if (daArmadura) {
      partes.push({ label: `${armadura.name} (armadura)`, value: daArmadura })
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
  const abilMods = Object.fromEntries(Object.keys(abilities).map((k) => [k, abil(k)]))
  const contexto = { sheet, abilMods, abilParts, mods, itemMods, level }
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
  /* O grau de conjuração não mora em `proficiencies` como os outros: vem da
     tradição (`castingArcane`…) ou do próprio bloco de conjuração. Sai daqui
     resolvido para a tela não ter de repetir essa escolha — quem não conjura
     fica em 0, que é destreinado e é a resposta certa. */
  let spellRank = 0
  if (conj) {
    const rankConj = conj.proficiency || prof(TRADICAO_PROF[conj.tradition] ?? '')
    spellRank = rankConj
    const atributo = conj.ability ?? 'int'
    const partes = [
      ...abilParts(atributo),
      { label: `Proficiência (${rankLabel(rankConj)})`, value: profBonus(rankConj, level) },
    ]
    spellDc = stat(
      'DC de magia',
      [{ label: 'Base', value: 10 }, ...partes, ...manual('spellDc')],
      { dc: true, ability: atributo },
      mods,
    )
    spellAttack = stat(
      'Ataque de magia',
      [...partes, ...manual('spellAttack')],
      { check: true, attack: true, ability: atributo },
      mods,
    )
  }

  /* ------------------------------------------------------------------ HP */

  /* O teto da barra também aceita modificador manual — é o que resolve o feat
     de resistência que o motor não conhece. Piso de 1: personagem com PV máximo
     zero não existe, nem depois de um modificador negativo exagerado. */
  const hpMax = Math.max(1, num(sheet.hpMax, 1) + total('hpMax'))
  const hp = vitals.hp == null ? hpMax : Math.max(0, Math.min(hpMax, num(vitals.hp, hpMax)))

  return {
    level,
    hpMax,
    hp,
    tempHp: Math.max(0, num(vitals.tempHp, 0)),
    abilities,
    abilityMods: abilMods,
    /* O atributo também se explica: a célula abre o breakdown e mostra o que
       veio da ficha e o que o jogador declarou. */
    abilityStats: Object.fromEntries(
      Object.keys(abilities).map((k) => [k, stat(k.toUpperCase(), abilParts(k), {}, mods)]),
    ),

    ac,
    saves,
    perception,
    classDc,
    spellDc,
    spellAttack,
    spellRank,
    skills,
    attacks,
    shield: escudo,

    armor: armadura
      ? { id: armadura.id, name: armadura.name, ...armadura.armor, checkPenalty, rank: rankArmadura }
      : null,

    /* Deslocamento é número da ficha; a penalidade da armadura só entra quando
       a Força não alcança o requisito, igual à de teste. `hindering` entra
       sempre — é o que o traço diz. O modificador manual vem depois de tudo, e
       o piso é zero: parado é estado que existe na mesa, negativo não. */
    speed: Math.max(
      0,
      velocidade(num(sheet.speed, 0), {
        armadura,
        forcaFalta,
        hindering: traco('hindering'),
      }) + total('speed'),
    ),

    conditions: vitals.conditions ?? {},
    conditionMods: mods,
    /* Slowed não vira parcela em cálculo nenhum: ele tira ações, e ação é coisa
       de mesa. Fica exposto para a tela poder avisar. */
    slowed: mods.slowed,
  }
}

/* ----------------------------------------------------------------- foco */

/** Teto da reserva de foco em PF2e: três pontos, por mais magias que se tenha. */
export const MAX_FOCO = 3

/**
 * As magias de foco que o personagem tem AGORA, nas duas listas que o
 * Pathbuilder já exporta separadas e que a aba mostra separadas: **truque de
 * foco** e **magia de foco**.
 *
 * São coisas diferentes na regra, e é por isso que a divisão importa: truque de
 * foco não gasta ponto nenhum — lança-se à vontade — e magia de foco gasta um
 * ponto da reserva. Enquanto as duas viviam numa lista só, um truque de foco
 * inflava a reserva e o personagem ganhava um ponto que a regra não dá.
 *
 * As de mesa (`extraFocusSpells`) trazem o `rank` gravado na hora em que foram
 * escolhidas: `0` é truque. Entrada antiga, gravada antes de o campo existir,
 * fica como magia de foco — que é exatamente como ela já contava.
 */
export function focusList(sheet, vitals = {}) {
  const conj = sheet?.spellcasting
  if (!conj) return { cantrips: [], spells: [] }

  const esquecidas = new Set(vitals.forgottenFocusSpells ?? [])
  const cantrips = []
  const spells = []

  /*
   * Quem decide de que lado a magia cai é o CORPUS, e não a lista de onde o
   * nome veio: o pack sabe que Courageous Anthem é truque de foco mesmo que o
   * export a tenha mandado como magia de foco. Quando o corpus não conhece o
   * nome — conteúdo legado, slug que não resolve — vale o `padrao`, que é a
   * lista do Pathbuilder que a trouxe ou o rank gravado na escolha de mesa.
   */
  const separar = (sp, padrao) => {
    const doCorpus = truqueDeFoco(sp.name)
    const truque = doCorpus == null ? padrao : doCorpus
    if (truque) cantrips.push(sp)
    else spells.push(sp)
  }

  for (const name of conj.focusCantrips ?? []) {
    if (!esquecidas.has(name)) separar({ name }, true)
  }
  for (const name of conj.focusSpells ?? []) {
    if (!esquecidas.has(name)) separar({ name }, false)
  }
  for (const sp of vitals.extraFocusSpells ?? []) {
    separar(sp, sp.rank != null && Number(sp.rank) === 0)
  }

  return { cantrips, spells }
}

/** As duas listas numa só, para quem não precisa da divisão (a aba Ataques). */
export function focusSpells(sheet, vitals = {}) {
  const { cantrips, spells } = focusList(sheet, vitals)
  return [...cantrips, ...spells]
}

/**
 * A reserva de foco: um ponto por MAGIA de foco, até três. Truque de foco não
 * entra na conta — ele não gasta ponto, então também não dá ponto.
 *
 * É cálculo, não fato guardado — sai do que o personagem sabe agora. Ganhou uma
 * magia de foco, ganhou o ponto; esqueceu a magia, perdeu o ponto. O
 * `sheet.focusPoints` que o Pathbuilder exporta não entra: ele é a foto do
 * momento da exportação, e desanda assim que a lista muda aqui dentro.
 */
export function focusPool(sheet, vitals = {}) {
  return Math.min(MAX_FOCO, focusList(sheet, vitals).spells.length)
}

/**
 * Descanso noturno (§10.7). Por personagem, aplicando só a ele — o "descanso do
 * grupo" na aba Mestre ficou anotado como sugestão futura (§17, resposta 2).
 *
 * Repõe foco e slots preparados, cura `conMod × nível` com o mínimo de 1 por
 * nível, e **reduz Doomed em 1 — Doomed não zera**. Wounded não é tocado aqui:
 * ele some quando o HP volta ao máximo, não pelo descanso.
 */
export function nightRest(sheet, vitals = {}, statMods = []) {
  if (!sheet) return null
  const level = Math.max(1, num(sheet.level, 1))
  /* O mesmo PV máximo que `buildSheet` mostra, com o mesmo modificador manual:
     descansar até o teto e ver a barra cheia têm de ser a mesma coisa. */
  const hpMax = Math.max(1, num(sheet.hpMax, 1) + statModTotal(statMods, 'hpMax'))
  const con = abilityMod(sheet.abilities?.con) + statModTotal(statMods, 'abil:con')
  const cura = Math.max(level, con * level)

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
    focusPoints: focusPool(sheet, vitals),
    slotsUsed: {},
    conditions,
    curado: hpDepois - hpAntes,
  }
}
