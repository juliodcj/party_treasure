import { CATALOG, groupOf } from '../data/catalog.js'
import { parseBulk } from './bulk.js'

let counter = 0
/** Id local estável o bastante para uma mesa; o servidor da Fase 3 assume isso depois. */
export function makeId(prefix) {
  counter += 1
  return `${prefix}-${Date.now().toString(36)}-${counter.toString(36)}`
}

/**
 * Um id de item pode vir do catálogo, dos itens de campanha ou dos itens
 * avulsos de um jogador — nessa ordem de especificidade invertida: o avulso
 * do próprio jogador ganha, porque só existe ali.
 */
export function resolveItem(state, itemId, playerId = null) {
  if (playerId) {
    const player = state.players.find((p) => p.id === playerId)
    const custom = player?.customItems.find((item) => item.id === itemId)
    if (custom) return custom
  }
  const campaign = state.campaignItems.find((item) => item.id === itemId)
  if (campaign) return campaign
  return CATALOG.find((item) => item.id === itemId) ?? null
}

/** Todos os itens que o jogador carrega, já resolvidos e com a quantidade junto. */
export function playerInventory(state, player) {
  if (!player) return []
  return Object.entries(player.items)
    .map(([itemId, qty]) => {
      const item = resolveItem(state, itemId, player.id)
      return item && qty > 0 ? { item, qty } : null
    })
    .filter(Boolean)
}

/** Itens que a Biblioteca oferece para escolher: campanha primeiro, depois catálogo. */
export function libraryItems(state) {
  return [...state.campaignItems, ...CATALOG]
}

export function matchesSearch(item, search) {
  const term = search.trim().toLowerCase()
  if (!term) return true
  return (
    item.name.toLowerCase().includes(term) ||
    (item.description ?? '').toLowerCase().includes(term) ||
    (item.traits ?? []).some((trait) => trait.toLowerCase().includes(term))
  )
}

export function matchesFilters(item, { category = 'all', level = 'all' } = {}) {
  if (category !== 'all' && item.category !== category) return false
  if (level !== 'all' && String(item.level ?? 0) !== String(level)) return false
  return true
}

/** Agrupa em Equipamentos / Consumíveis / Outros preservando a ordem alfabética. */
export function groupInventory(entries) {
  const buckets = { equipment: [], consumable: [], other: [] }
  for (const entry of entries) buckets[groupOf(entry.item.category)].push(entry)
  for (const list of Object.values(buckets)) {
    list.sort((a, b) => a.item.name.localeCompare(b.item.name))
  }
  return buckets
}

/** Bulk total carregado, em décimos de Bulk. */
export function totalBulk(entries) {
  return entries.reduce((sum, { item, qty }) => sum + parseBulk(item.bulk) * qty, 0)
}

/** Níveis presentes numa lista, para montar o filtro de nível sem chutar. */
export function availableLevels(items) {
  const levels = new Set(items.map((item) => item.level ?? 0))
  return [...levels].sort((a, b) => a - b)
}

/** Preenche os campos que a interface assume existir, venha o item de onde vier. */
export function normalizeItem(partial) {
  return {
    id: partial.id ?? makeId('item'),
    name: partial.name?.trim() || 'Item sem nome',
    level: Number.isFinite(Number(partial.level)) ? Number(partial.level) : 0,
    category: partial.category ?? 'equipment',
    priceCp: Math.max(0, Math.round(partial.priceCp ?? 0)),
    bulk: partial.bulk ?? 0,
    traits: Array.isArray(partial.traits) ? partial.traits : [],
    description: partial.description ?? '',
    ...(partial.descriptionHtml ? { descriptionHtml: partial.descriptionHtml } : {}),
    ...(partial.rarity ? { rarity: partial.rarity } : {}),
    ...(partial.shield ? { shield: partial.shield } : {}),
    ...(partial.source ? { source: partial.source } : {}),
    ...(partial.raw ? { raw: partial.raw } : {}),
  }
}
