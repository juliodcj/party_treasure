// Importador de JSON dos packs do foundryvtt/pf2e.
// O schema é polimórfico: `type` na raiz e um `system` cujos campos mudam por
// tipo. Aqui normalizamos o que a interface consome e guardamos o `system`
// inteiro em `raw`, para nada se perder — é a mesma estratégia que a ingestão
// da Fase 2 vai usar no SQLite.

import { CP_PER_GP, CP_PER_SP } from './money.js'
import { makeId, normalizeItem } from './items.js'

// Identidade proposital: cada tipo do Foundry é uma categoria real própria,
// nenhuma é fundida em outra (ammo e kit tinham isso antes — escondia contagem real).
const TYPE_TO_CATEGORY = {
  weapon: 'weapon',
  armor: 'armor',
  shield: 'shield',
  equipment: 'equipment',
  consumable: 'consumable',
  treasure: 'treasure',
  backpack: 'backpack',
  ammo: 'ammo',
  kit: 'kit',
}

/** `system.price.value` é um objeto {pp, gp, sp, cp}; qualquer chave pode faltar. */
export function priceToCopper(price) {
  const value = price?.value ?? price
  if (value == null) return 0
  if (typeof value === 'number') return Math.round(value * CP_PER_GP)

  const pp = Number(value.pp) || 0
  const gp = Number(value.gp) || 0
  const sp = Number(value.sp) || 0
  const cp = Number(value.cp) || 0
  // Platina não aparece na carteira do app, mas existe nos dados: 1 pl = 10 po.
  return Math.round(pp * 10 * CP_PER_GP + gp * CP_PER_GP + sp * CP_PER_SP + cp)
}

/**
 * Troca a sintaxe do Foundry por texto legível, preservando o resto do HTML
 * (inclusive `<table class="pf2e remaster">`, que renderiza bem).
 */
export function sanitizeDescription(html) {
  if (!html) return ''
  return (
    String(html)
      // O HTML importado é renderizado direto; nada de script nem handler inline.
      .replace(/<\s*(script|style|iframe|object|embed)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
      .replace(/<\s*(script|style|iframe|object|embed)\b[^>]*\/?>/gi, '')
      .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
      .replace(/(href|src)\s*=\s*(?:"\s*javascript:[^"]*"|'\s*javascript:[^']*')/gi, '$1="#"')
      // @UUID[...]{Rótulo} -> Rótulo ; @UUID[...] -> último segmento do caminho
      .replace(/@UUID\[[^\]]*\]\{([^}]*)\}/g, '$1')
      .replace(/@UUID\[[^\]]*?([^.\]]+)\]/g, '$1')
      // @Localize[...] não tem texto útil aqui
      .replace(/@Localize\[[^\]]*\]/g, '')
      // [[/act make-an-impression]] -> Make An Impression
      .replace(/\[\[\/act\s+([^\]\s|#]+)[^\]]*\]\](?:\{([^}]*)\})?/g, (_m, slug, label) =>
        label ? label : titleFromSlug(slug),
      )
      // [[/r 1d6]] , [[/br 2d8 #dano]] -> a fórmula
      .replace(/\[\[\/b?r\s+([^\]#|]+)[^\]]*\]\](?:\{([^}]*)\})?/g, (_m, formula, label) =>
        label ? label : formula.trim(),
      )
      // @Damage[2d6[fire]] -> 2d6 fire (o argumento tem colchetes aninhados)
      .replace(/@Damage\[((?:[^[\]]|\[[^\]]*\])*)\](?:\{([^}]*)\})?/g, (_m, expr, label) =>
        label ? label : expr.replace(/[[\]]/g, ' ').replace(/\s+/g, ' ').trim(),
      )
      // @Check[reflex|dc:20] -> Reflex DC 20
      .replace(/@Check\[([^\]]*)\](?:\{([^}]*)\})?/g, (_m, expr, label) => {
        if (label) return label
        const parts = String(expr).split('|')
        const kind = titleFromSlug(parts[0] ?? '')
        const dc = parts.find((part) => part.startsWith('dc:'))
        return dc ? `${kind} CD ${dc.slice(3)}` : kind
      })
      // Templates e demais macros que sobrarem viram o próprio rótulo
      .replace(/@\w+\[(?:[^[\]]|\[[^\]]*\])*\]\{([^}]*)\}/g, '$1')
      .replace(/@\w+\[((?:[^[\]]|\[[^\]]*\])*)\]/g, (_m, expr) =>
        expr.replace(/[[\]]/g, ' ').replace(/\s+/g, ' ').trim(),
      )
      .trim()
  )
}

/** Versão sem HTML, para busca e para as telas que mostram texto puro. */
export function toPlainText(html) {
  return String(html ?? '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function titleFromSlug(slug) {
  return String(slug)
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** `system.bulk.value` moderno, `system.weight.value` legado ("L", "—"). */
export function readBulk(system) {
  const modern = system?.bulk?.value
  if (modern != null && modern !== '') return modern
  const legacy = system?.weight?.value
  return legacy != null && legacy !== '' ? legacy : 0
}

export function readSource(system) {
  const publication = system?.publication ?? system?.source
  if (!publication) return null
  const title = publication.title ?? publication.value
  if (!title) return null
  return {
    title,
    license: publication.license ?? null,
    remaster: publication.remaster ?? false,
  }
}

/**
 * LR não existe no JSON: é derivado de PV máximo. Nunca sai do HTML da descrição.
 * `hardness`/`hp` existem em TODO item físico (é o rastreio de sunder do Foundry),
 * não só em escudos — por isso só lemos isto quando o item É um escudo.
 */
export function readShield(system) {
  if (system?.hardness == null && system?.hp == null) return null
  const hpMax = Number(system?.hp?.max) || 0
  return {
    hardness: Number(system?.hardness) || 0,
    hpMax,
    bt: Math.floor(hpMax / 2),
    ...(system?.speedPenalty != null ? { speedPenalty: system.speedPenalty } : {}),
    ...(system?.acBonus != null ? { acBonus: system.acBonus } : {}),
  }
}

/** `system.usage.value` -> quantas mãos a arma ocupa, para exibir "Hands". */
const WEAPON_HANDS = {
  'held-in-one-hand': 1,
  'held-in-two-hands': 2,
  'held-in-one-plus-hands': '1+',
}

/** Dano, grupo, categoria de proficiência e alcance — só existe em armas. */
export function readWeapon(system) {
  const damage = system?.damage?.die
    ? {
        dice: Number(system.damage.dice) || 1,
        die: system.damage.die,
        damageType: system.damage.damageType ?? null,
      }
    : null
  return {
    category: system?.category ?? null,
    group: system?.group ?? null,
    hands: WEAPON_HANDS[system?.usage?.value] ?? null,
    ranged: system?.range != null,
    range: system?.range ?? null,
    reload: system?.reload?.value || null,
    damage,
  }
}

/** CA, limite de Destreza, penalidades e Força mínima — só existe em armaduras. */
export function readArmor(system) {
  return {
    category: system?.category ?? null,
    group: system?.group ?? null,
    acBonus: system?.acBonus ?? null,
    dexCap: system?.dexCap ?? null,
    checkPenalty: system?.checkPenalty ?? null,
    speedPenalty: system?.speedPenalty ?? null,
    strength: system?.strength ?? null,
  }
}

/** Subtipo real (poção, pergaminho, gema...), quando o pack registra `system.category`. */
export function readSubcategory(system) {
  return system?.category || null
}

/** Converte UM objeto de item do Foundry. Devolve o item normalizado. */
export function convertFoundryItem(raw) {
  const system = raw?.system ?? raw?.data ?? {}
  const html = sanitizeDescription(system?.description?.value ?? '')
  const traits = Array.isArray(system?.traits?.value) ? system.traits.value : []
  const rarity = system?.traits?.rarity ?? null
  const shield = raw?.type === 'shield' ? readShield(system) : null
  const weapon = raw?.type === 'weapon' ? readWeapon(system) : null
  const armor = raw?.type === 'armor' ? readArmor(system) : null
  const subcategory =
    raw?.type === 'consumable' || raw?.type === 'treasure' ? readSubcategory(system) : null

  return normalizeItem({
    id: makeId('camp'),
    name: raw?.name ?? 'Item importado',
    level: Number(system?.level?.value ?? 0),
    category: TYPE_TO_CATEGORY[raw?.type] ?? 'equipment',
    priceCp: priceToCopper(system?.price),
    bulk: readBulk(system),
    // A raridade não é um traço no JSON, mas na mesa se lê como um.
    traits: rarity && rarity !== 'common' ? [rarity, ...traits] : traits,
    description: toPlainText(html),
    descriptionHtml: html,
    ...(rarity ? { rarity } : {}),
    ...(shield ? { shield } : {}),
    ...(weapon ? { weapon } : {}),
    ...(armor ? { armor } : {}),
    ...(subcategory ? { subcategory } : {}),
    ...(readSource(system) ? { source: readSource(system) } : {}),
    // `system.rules` é o motor de automação do Foundry: fica guardado, sem interpretação.
    raw: system,
  })
}

/**
 * Ponto de entrada da tela: recebe o texto colado e devolve
 * `{ items, errors }`. Aceita um objeto, um array, ou um NDJSON
 * (um item por linha), que é como os packs saem quando extraídos.
 */
export function importFoundryJson(text) {
  const trimmed = String(text ?? '').trim()
  if (!trimmed) return { items: [], errors: ['Cole o JSON do item antes de importar.'] }

  const errors = []
  let payload = null

  try {
    payload = JSON.parse(trimmed)
  } catch {
    // Pode ser um item por linha; tentamos linha a linha antes de desistir.
    const lines = trimmed.split('\n').map((line) => line.trim()).filter(Boolean)
    const parsed = []
    for (const [index, line] of lines.entries()) {
      try {
        parsed.push(JSON.parse(line))
      } catch {
        errors.push(`Linha ${index + 1}: não é um JSON válido.`)
      }
    }
    if (!parsed.length) {
      return { items: [], errors: ['O texto colado não é um JSON válido.'] }
    }
    payload = parsed
  }

  const candidates = Array.isArray(payload) ? payload : [payload]
  const items = []

  for (const [index, candidate] of candidates.entries()) {
    if (!candidate || typeof candidate !== 'object') {
      errors.push(`Item ${index + 1}: formato inesperado, ignorado.`)
      continue
    }
    if (!candidate.name) {
      errors.push(`Item ${index + 1}: sem campo "name", ignorado.`)
      continue
    }
    if (candidate.type && !TYPE_TO_CATEGORY[candidate.type]) {
      // Não é equipamento (feat, spell, etc.): fora do escopo do app.
      errors.push(`"${candidate.name}": tipo "${candidate.type}" não é equipamento, ignorado.`)
      continue
    }
    items.push(convertFoundryItem(candidate))
  }

  return { items, errors }
}
