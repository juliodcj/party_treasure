// Importador de JSON dos packs do foundryvtt/pf2e.
// O schema é polimórfico: `type` na raiz e um `system` cujos campos mudam por
// tipo. Aqui normalizamos o que a interface consome e guardamos o `system`
// inteiro em `raw`, para nada se perder — é a mesma estratégia dos scripts de
// ingestão que geram `src/data/`.

import { CP_PER_GP, CP_PER_SP } from './money.js'
import { makeId, normalizeItem } from './items.js'

// Identidade proposital: cada tipo do Foundry é uma categoria real própria,
// nenhuma é fundida em outra (ammo e kit tinham isso antes — escondia contagem real).
export const TYPE_TO_CATEGORY = {
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

/**
 * Runa não é um `type` próprio do Foundry — é `type: "equipment"` com
 * `system.usage.value` começando em "etched-onto" (etched-onto-a-weapon,
 * etched-onto-armor, etched-onto-a-shield...). Confirmado nos dados reais:
 * 176 itens, todos runas de verdade (Striking, Armor Potency, Ghost Touch,
 * Reinforcing Rune...). Um talismã fica em "affixed-to-armor-or-a-weapon" —
 * usage diferente, não cai aqui.
 */
export function readCategory(type, system) {
  const base = TYPE_TO_CATEGORY[type]
  if (base === 'equipment' && /^etched-onto/.test(system?.usage?.value ?? '')) return 'rune'
  return base
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

/*
 * ------------------------------------------------------- fórmulas dos packs
 *
 * O Foundry escreve o número dentro do macro como a expressão que o motor dele
 * resolve na hora de rolar: o Caustic Blast guarda
 * `@Damage[(1+floor((@item.rank -1)/2))[persistent,acid]]`. Sem resolver, a
 * magia chegava à tela dizendo "takes (1+floor((@item.rank -1)/2))
 * persistent,acid damage" — sintaxe de automação no lugar do texto da Paizo.
 *
 * Nas 1.993 magias as únicas referências são `@item.rank` e `@item.level`, e as
 * duas são o nível do próprio verbete: dá para resolver na íntegra. Fora das
 * magias aparecem `@actor.*` e `@self.*`, que dependem de quem lança — essas
 * ficam como vieram, e o build as registra no log em vez de sumir com elas.
 *
 * Nada de `eval`: as fórmulas usam treze funções, todas listadas aqui.
 */

const FUNCOES = {
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  abs: Math.abs,
  max: Math.max,
  min: Math.min,
  /* `resolve` é o "calcule isto agora" do Foundry; fora de lá, identidade. */
  resolve: (x) => x,
  ternary: (cond, sim, nao) => (cond ? sim : nao),
  gte: (a, b) => (a >= b ? 1 : 0),
  gt: (a, b) => (a > b ? 1 : 0),
  lte: (a, b) => (a <= b ? 1 : 0),
  lt: (a, b) => (a < b ? 1 : 0),
  eq: (a, b) => (a === b ? 1 : 0),
}

/**
 * Avalia uma expressão aritmética e devolve o número, ou `null` se houver
 * qualquer coisa que não seja número, operador ou uma das funções acima —
 * dado (`2d6`) e referência não resolvida (`@actor.level`) devolvem `null`.
 *
 * Descida recursiva de três níveis, sobre os tokens da expressão inteira.
 */
function avaliarFormula(texto) {
  const tokens = String(texto).match(/\d+(?:\.\d+)?|[a-z]\w*|[-+*/(),]/gi)
  if (!tokens) return null

  let i = 0
  let falhou = false
  const olhar = () => tokens[i]
  const comer = () => tokens[i++]
  const falhar = () => {
    falhou = true
    return 0
  }

  const soma = () => {
    let valor = produto()
    while (olhar() === '+' || olhar() === '-') {
      valor = comer() === '+' ? valor + produto() : valor - produto()
    }
    return valor
  }
  const produto = () => {
    let valor = unario()
    while (olhar() === '*' || olhar() === '/') {
      const op = comer()
      const direita = unario()
      valor = op === '*' ? valor * direita : direita === 0 ? falhar() : valor / direita
    }
    return valor
  }
  const unario = () => {
    if (olhar() === '-') {
      comer()
      return -unario()
    }
    if (olhar() === '+') {
      comer()
      return unario()
    }
    return primario()
  }
  const primario = () => {
    const t = comer()
    if (t === undefined) return falhar()
    if (/^\d/.test(t)) return Number(t)
    if (t === '(') {
      const valor = soma()
      return comer() === ')' ? valor : falhar()
    }
    const fn = FUNCOES[t]
    if (!fn || comer() !== '(') return falhar()
    const args = []
    if (olhar() !== ')') {
      args.push(soma())
      while (olhar() === ',') {
        comer()
        args.push(soma())
      }
    }
    if (comer() !== ')') return falhar()
    return fn(...args)
  }

  const valor = soma()
  if (falhou || i !== tokens.length || !Number.isFinite(valor)) return null
  return valor
}

/**
 * Reduz o que der numa expressão que também pode ter dado: `(9 -3)d6` vira
 * `6d6`, e `(1+floor((1 -1)/2))` vira `1`. Grupo que não avalia fica como está.
 */
export function reduzirFormula(texto) {
  let atual = String(texto).trim()
  let anterior
  do {
    anterior = atual
    /* Um grupo sem parênteses dentro, levando junto o nome da função quando
       houver — senão `floor((9-1)/2)` reduziria para `floor4`. */
    atual = atual.replace(/([a-z]\w*)?\(([^()]*)\)/gi, (macro, nome, dentro) => {
      const valor = avaliarFormula(nome ? `${nome}(${dentro})` : dentro)
      return valor == null ? macro : String(valor)
    })
  } while (atual !== anterior)
  const inteiro = avaliarFormula(atual)
  return inteiro == null ? atual.trim() : String(inteiro)
}

/** Troca `@item.rank`/`@item.level` pelo nível do próprio verbete. */
function resolverItem(texto, level) {
  if (level == null) return String(texto)
  return String(texto).replace(/@item\.(rank|level)\b/g, String(level))
}

/**
 * Quebra "4d6[slashing],2d6[persistent,fire]" nas duas parcelas. A vírgula
 * dentro de `[...]` e a de `max(1,2)` não separam nada.
 */
function partesDoDano(corpo) {
  const partes = []
  let profundidade = 0
  let atual = ''
  for (const c of String(corpo)) {
    if (c === '(' || c === '[') profundidade += 1
    else if (c === ')' || c === ']') profundidade -= 1
    if (c === ',' && profundidade === 0) {
      partes.push(atual)
      atual = ''
      continue
    }
    atual += c
  }
  partes.push(atual)
  return partes.filter((p) => p.trim())
}

/**
 * `@Damage[(9 -3)d6[void]|options:area-damage]` -> "6d6 void".
 *
 * O que vem depois do primeiro `|` é configuração do motor (`options:`,
 * `traits:`, `shortLabel`) e não texto de regra. Os tipos vêm separados por
 * vírgula (`persistent,acid`) e se leem com espaço, como o livro escreve.
 */
function formatarDano(expr, level) {
  const corpo = resolverItem(String(expr).split('|')[0], level)
  return partesDoDano(corpo)
    .map((parte) => {
      const casa = parte.trim().match(/^(.*?)\[([^[\]]*)\]$/)
      const formula = reduzirFormula(casa ? casa[1] : parte)
      const tipos = casa
        ? casa[2]
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
            .join(' ')
        : ''
      return tipos ? `${formula} ${tipos}` : formula
    })
    .join(' and ')
}

/**
 * `@Template[type:cone|distance:60]` -> "60-foot cone"; com largura,
 * "100-foot-long, 10-foot-wide line", que é como o próprio pack rotula à mão
 * os poucos que ele rotula.
 */
function formatarTemplate(expr) {
  const partes = String(expr).split('|')
  const campo = (nome) => {
    const achado = partes.find((p) => p.startsWith(`${nome}:`))
    return achado ? achado.slice(nome.length + 1) : null
  }
  const tipo = campo('type') ?? partes.find((p) => !p.includes(':')) ?? null
  const distancia = campo('distance')
  const largura = campo('width')
  if (!tipo) return partes.join(' ')
  if (!distancia) return tipo
  if (largura) return `${distancia}-foot-long, ${largura}-foot-wide ${tipo}`
  return `${distancia}-foot ${tipo}`
}

/** `@Check[reflex|basic|dc:20]` -> "basic Reflex CD 20". */
function formatarCheck(expr, level) {
  const partes = String(expr).split('|')
  const tipo = titleFromSlug(partes[0] ?? '')
  const basic = partes.includes('basic') || partes.includes('basic:true')
  const dc = partes.find((p) => p.startsWith('dc:'))
  const alvo = dc ? `${tipo} CD ${reduzirFormula(resolverItem(dc.slice(3), level))}` : tipo
  return basic ? `basic ${alvo}` : alvo
}

/**
 * Troca a sintaxe do Foundry por texto legível, preservando o resto do HTML
 * (inclusive `<table class="pf2e remaster">`, que renderiza bem).
 *
 * `level` é o nível do verbete, e é o que resolve `@item.rank`/`@item.level`
 * dentro das fórmulas. Sem ele, a expressão fica como veio.
 */
export function sanitizeDescription(html, { level = null } = {}) {
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
      // [[/r 1d6]] , [[/br 2d8 #dano]] -> a fórmula, já reduzida
      .replace(/\[\[\/b?r\s+([^\]#|]+)[^\]]*\]\](?:\{([^}]*)\})?/g, (_m, formula, label) =>
        label ? label : reduzirFormula(resolverItem(formula, level)),
      )
      // @Damage[2d6[fire]] -> 2d6 fire (o argumento tem colchetes aninhados)
      .replace(/@Damage\[((?:[^[\]]|\[[^\]]*\])*)\](?:\{([^}]*)\})?/g, (_m, expr, label) =>
        label ? label : formatarDano(expr, level),
      )
      // @Template[type:cone|distance:60] -> 60-foot cone
      .replace(/@Template\[([^\]]*)\](?:\{([^}]*)\})?/g, (_m, expr, label) =>
        label ? label : formatarTemplate(expr),
      )
      // @Check[reflex|dc:20] -> Reflex CD 20
      .replace(/@Check\[([^\]]*)\](?:\{([^}]*)\})?/g, (_m, expr, label) =>
        label ? label : formatarCheck(expr, level),
      )
      // Os demais macros viram o próprio rótulo
      .replace(/@\w+\[(?:[^[\]]|\[[^\]]*\])*\]\{([^}]*)\}/g, '$1')
      .replace(/@\w+\[((?:[^[\]]|\[[^\]]*\])*)\]/g, (_m, expr) =>
        reduzirFormula(resolverItem(expr, level))
          .replace(/[[\]]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
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
  const html = sanitizeDescription(system?.description?.value ?? '', {
    level: system?.level?.value ?? null,
  })
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
    category: readCategory(raw?.type, system) ?? 'equipment',
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
    ...(system?.usage?.value ? { usage: system.usage.value } : {}),
    ...(raw?.img ? { img: raw.img } : {}),
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
