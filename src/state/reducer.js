import { addCoins, fromCopper, simplifyWallet, spendCopper, toCopper } from '../lib/money.js'
import { makeId, normalizeItem, resolveItem } from '../lib/items.js'
import { SELL_RATE } from '../config.js'

/** Aplica `fn` a um jogador e devolve a lista nova, sem tocar nos outros. */
function mapPlayer(players, playerId, fn) {
  return players.map((player) => (player.id === playerId ? fn(player) : player))
}

/** Soma quantidade de um item na mochila, removendo a chave quando zera. */
function withItemDelta(items, itemId, delta) {
  const next = { ...items }
  const qty = (next[itemId] ?? 0) + delta
  if (qty > 0) next[itemId] = qty
  else delete next[itemId]
  return next
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SELECT_PLAYER':
      return { ...state, activePlayerId: action.playerId }

    // ---------------------------------------------------------------- jogadores

    case 'ADD_PLAYER': {
      const player = {
        id: makeId('p'),
        name: action.name.trim() || 'Novo personagem',
        gold: 0,
        silver: 0,
        copper: 0,
        items: {},
        customItems: [],
      }
      return { ...state, players: [...state.players, player] }
    }

    case 'RENAME_PLAYER':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          name: action.name.trim() || player.name,
        })),
      }

    case 'REMOVE_PLAYER': {
      // A mesa precisa de pelo menos um personagem para a tela ter o que mostrar.
      if (state.players.length <= 1) return state
      const players = state.players.filter((player) => player.id !== action.playerId)
      return {
        ...state,
        players,
        activePlayerId:
          state.activePlayerId === action.playerId ? players[0].id : state.activePlayerId,
      }
    }

    // ----------------------------------------------------------------- dinheiro

    case 'ADJUST_COINS':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          ...addCoins(player, action.coins),
        })),
      }

    case 'SET_COINS':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          gold: Math.max(0, Math.round(action.coins.gold ?? player.gold)),
          silver: Math.max(0, Math.round(action.coins.silver ?? player.silver)),
          copper: Math.max(0, Math.round(action.coins.copper ?? player.copper)),
        })),
      }

    case 'SIMPLIFY_COINS':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          ...simplifyWallet(player),
        })),
      }

    case 'TRANSFER_COINS': {
      const from = state.players.find((player) => player.id === action.fromId)
      if (!from) return state
      const remaining = spendCopper(from, action.amountCp)
      if (!remaining) return state // saldo insuficiente: a tela já avisa antes
      const gained = fromCopper(action.amountCp)
      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === action.fromId) return { ...player, ...remaining }
          if (player.id === action.toId) return { ...player, ...addCoins(player, gained) }
          return player
        }),
      }
    }

    case 'GIVE_COINS': {
      // Mestre criando dinheiro do nada, para um jogador ou para o grupo todo.
      const targets = action.playerIds ?? state.players.map((player) => player.id)
      return {
        ...state,
        players: state.players.map((player) =>
          targets.includes(player.id) ? { ...player, ...addCoins(player, action.coins) } : player,
        ),
      }
    }

    // -------------------------------------------------------------- inventário

    case 'GIVE_ITEM':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          items: withItemDelta(player.items, action.itemId, action.qty ?? 1),
        })),
      }

    case 'CHANGE_ITEM_QTY':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          items: withItemDelta(player.items, action.itemId, action.delta),
        })),
      }

    case 'DROP_ITEM': {
      // Excluir do inventário. Com `refund`, o valor volta para a carteira.
      const item = resolveItem(state, action.itemId, action.playerId)
      const qty = action.qty ?? Number.POSITIVE_INFINITY
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const owned = player.items[action.itemId] ?? 0
          const removed = Math.min(owned, qty)
          if (removed <= 0) return player
          const refundCp = action.refund && item ? item.priceCp * removed : 0
          const wallet = refundCp ? addCoins(player, fromCopper(refundCp)) : player
          return {
            ...player,
            ...wallet,
            items: withItemDelta(player.items, action.itemId, -removed),
            // Item avulso que saiu inteiro do inventário some junto da ficha.
            customItems:
              removed >= owned
                ? player.customItems.filter((custom) => custom.id !== action.itemId)
                : player.customItems,
          }
        }),
      }
    }

    case 'SELL_ITEM': {
      const item = resolveItem(state, action.itemId, action.playerId)
      if (!item) return state
      const qty = action.qty ?? 1
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const owned = player.items[action.itemId] ?? 0
          const sold = Math.min(owned, qty)
          if (sold <= 0) return player
          const earnedCp = Math.floor(item.priceCp * sold * SELL_RATE)
          return {
            ...player,
            ...addCoins(player, fromCopper(earnedCp)),
            items: withItemDelta(player.items, action.itemId, -sold),
            customItems:
              sold >= owned
                ? player.customItems.filter((custom) => custom.id !== action.itemId)
                : player.customItems,
          }
        }),
      }
    }

    case 'TRANSFER_ITEM': {
      const item = resolveItem(state, action.itemId, action.fromId)
      if (!item) return state
      const source = state.players.find((player) => player.id === action.fromId)
      const moved = Math.min(source?.items[action.itemId] ?? 0, action.qty ?? 1)
      if (moved <= 0) return state

      // Item avulso viaja junto com a ficha: ele só existe no inventário de alguém.
      const isCustom = source.customItems.some((custom) => custom.id === action.itemId)
      const leftBehind = (source.items[action.itemId] ?? 0) - moved

      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === action.fromId) {
            return {
              ...player,
              items: withItemDelta(player.items, action.itemId, -moved),
              customItems:
                isCustom && leftBehind <= 0
                  ? player.customItems.filter((custom) => custom.id !== action.itemId)
                  : player.customItems,
            }
          }
          if (player.id === action.toId) {
            return {
              ...player,
              items: withItemDelta(player.items, action.itemId, moved),
              customItems:
                isCustom && !player.customItems.some((custom) => custom.id === action.itemId)
                  ? [...player.customItems, item]
                  : player.customItems,
            }
          }
          return player
        }),
      }
    }

    case 'ADD_CUSTOM_ITEM': {
      // Item avulso: vive no inventário de um jogador e não entra no catálogo.
      const item = normalizeItem({ ...action.item, id: action.item.id ?? makeId('custom') })
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          customItems: [...player.customItems, item],
          items: withItemDelta(player.items, item.id, action.qty ?? 1),
        })),
      }
    }

    case 'UPDATE_CUSTOM_ITEM':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          customItems: player.customItems.map((custom) =>
            custom.id === action.item.id ? normalizeItem({ ...custom, ...action.item }) : custom,
          ),
        })),
      }

    // ------------------------------------------------------------------- lojas

    case 'BUY': {
      // `entries` é o carrinho: [{ itemId, qty }].
      const player = state.players.find((p) => p.id === action.playerId)
      if (!player) return state

      const lines = action.entries
        .map((entry) => ({ ...entry, item: resolveItem(state, entry.itemId) }))
        .filter((line) => line.item && line.qty > 0)
      if (!lines.length) return state

      const totalCp = lines.reduce((sum, line) => sum + line.item.priceCp * line.qty, 0)
      const wallet = spendCopper(player, totalCp)
      if (!wallet) return state // saldo insuficiente: a tela bloqueia antes de chegar aqui

      let items = player.items
      for (const line of lines) items = withItemDelta(items, line.itemId, line.qty)

      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (current) => ({
          ...current,
          ...wallet,
          items,
        })),
      }
    }

    case 'ADD_SHOP':
      return {
        ...state,
        shops: [
          ...state.shops,
          { id: makeId('shop'), name: action.name.trim() || 'Nova loja', itemIds: [] },
        ],
      }

    case 'RENAME_SHOP':
      return {
        ...state,
        shops: state.shops.map((shop) =>
          shop.id === action.shopId ? { ...shop, name: action.name.trim() || shop.name } : shop,
        ),
      }

    case 'REMOVE_SHOP':
      return { ...state, shops: state.shops.filter((shop) => shop.id !== action.shopId) }

    case 'SHOP_ADD_ITEM':
      return {
        ...state,
        shops: state.shops.map((shop) =>
          shop.id === action.shopId && !shop.itemIds.includes(action.itemId)
            ? { ...shop, itemIds: [...shop.itemIds, action.itemId] }
            : shop,
        ),
      }

    case 'SHOP_REMOVE_ITEM':
      return {
        ...state,
        shops: state.shops.map((shop) =>
          shop.id === action.shopId
            ? { ...shop, itemIds: shop.itemIds.filter((id) => id !== action.itemId) }
            : shop,
        ),
      }

    // ------------------------------------------------------------- biblioteca

    case 'ADD_CAMPAIGN_ITEMS': {
      const items = action.items.map((item) => normalizeItem(item))
      return { ...state, campaignItems: [...state.campaignItems, ...items] }
    }

    case 'UPDATE_CAMPAIGN_ITEM':
      return {
        ...state,
        campaignItems: state.campaignItems.map((item) =>
          item.id === action.item.id ? normalizeItem({ ...item, ...action.item }) : item,
        ),
      }

    case 'REMOVE_CAMPAIGN_ITEM':
      return {
        ...state,
        campaignItems: state.campaignItems.filter((item) => item.id !== action.itemId),
        // Sai também das prateleiras, senão a loja fica com um item fantasma.
        shops: state.shops.map((shop) => ({
          ...shop,
          itemIds: shop.itemIds.filter((id) => id !== action.itemId),
        })),
      }

    case 'RESET':
      return action.state

    default:
      return state
  }
}

/** Quanto custa um carrinho, e se o jogador pode pagar. */
export function cartTotal(state, entries) {
  return entries.reduce((sum, entry) => {
    const item = resolveItem(state, entry.itemId)
    return item ? sum + item.priceCp * entry.qty : sum
  }, 0)
}

export function canAfford(player, totalCp) {
  return toCopper(player) >= totalCp
}
