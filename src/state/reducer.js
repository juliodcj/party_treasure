import { addCoins, simplifyWallet, spendCopper, toCopper, withWalletCopper } from '../lib/money.js'
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

/** Tira a observação de um item — usado sempre que ele sai todo da mochila. */
function withoutNote(itemNotes, itemId) {
  if (!itemNotes[itemId]) return itemNotes
  const next = { ...itemNotes }
  delete next[itemId]
  return next
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SELECT_PLAYER':
      // Trocar de personagem esvazia o carrinho: ele era da compra do anterior.
      return { ...state, activePlayerId: action.playerId, cart: {} }

    case 'SELECT_SHOP':
      return { ...state, activeShopId: action.shopId, cart: {} }

    case 'SET_SETTINGS':
      // Config da mesa (livros possuídos, remaster/legado): mescla, não substitui.
      return { ...state, settings: { ...state.settings, ...action.settings } }

    // ---------------------------------------------------------------- jogadores

    case 'ADD_PLAYER':
      return {
        ...state,
        players: [
          ...state.players,
          {
            id: makeId('p'),
            name: action.name?.trim() || 'Novo jogador',
            gold: 0,
            silver: 0,
            copper: 0,
            items: {},
            customItems: [],
            itemNotes: {},
          },
        ],
      }

    case 'RENAME_PLAYER':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          name: action.name,
        })),
      }

    case 'REMOVE_PLAYER': {
      // Sempre precisa sobrar pelo menos um personagem na mesa.
      if (state.players.length <= 1) return state
      const players = state.players.filter((player) => player.id !== action.playerId)
      const activePlayerId =
        state.activePlayerId === action.playerId ? players[0].id : state.activePlayerId
      return { ...state, players, activePlayerId }
    }

    // ----------------------------------------------------------------- dinheiro

    // Troca as moedas miúdas pelas graúdas sem mexer no total: 23 pc viram
    // 2 pp 3 pc. É só apresentação, o saldo em cobre não muda.
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
      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === action.fromId) return { ...player, ...remaining }
          if (player.id === action.toId) {
            return { ...player, ...withWalletCopper(player, toCopper(player) + action.amountCp) }
          }
          return player
        }),
      }
    }

    case 'ADJUST_COINS':
      // Botão "±" do jogador: soma/subtrai um total em cobre (não por
      // denominação), como no croqui. Nunca deixa o saldo ficar negativo.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) =>
          withWalletCopper(player, Math.max(0, toCopper(player) + action.deltaCp)),
        ),
      }

    case 'SET_COINS':
      // Clicar no dinheiro e definir o valor exato — diferente do "±", que soma/subtrai.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          gold: Math.max(0, Math.round(action.coins.gold ?? 0)),
          silver: Math.max(0, Math.round(action.coins.silver ?? 0)),
          copper: Math.max(0, Math.round(action.coins.copper ?? 0)),
        })),
      }

    case 'GIVE_COINS':
      // Mestre criando dinheiro do nada, para um jogador específico.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          ...addCoins(player, action.coins),
        })),
      }

    case 'SPLIT_COINS': {
      // "Distribuir": a quantia é dividida igualmente, cada um leva sua parte.
      const count = state.players.length
      if (!count) return state
      const share = {
        gold: Math.floor((action.coins.gold ?? 0) / count),
        silver: Math.floor((action.coins.silver ?? 0) / count),
        copper: Math.floor((action.coins.copper ?? 0) / count),
      }
      if (!share.gold && !share.silver && !share.copper) return state
      return {
        ...state,
        players: state.players.map((player) => ({ ...player, ...addCoins(player, share) })),
      }
    }

    // -------------------------------------------------------------- inventário

    case 'GIVE_ITEM':
      // Mestre entregando: entra na mochila sem custo.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          items: withItemDelta(player.items, action.itemId, action.qty ?? 1),
        })),
      }

    case 'CHANGE_ITEM_QTY':
      // A quantidade no inventário é livre: só ajusta a mochila, nunca mexe
      // na carteira. Comprar é na Loja; vender é o botão "Vender".
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          items: withItemDelta(player.items, action.itemId, action.delta),
        })),
      }

    case 'SET_ITEM_NOTE': {
      const note = action.note.trim()
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          itemNotes: note
            ? { ...player.itemNotes, [action.itemId]: note }
            : withoutNote(player.itemNotes, action.itemId),
        })),
      }
    }

    case 'DROP_ITEM':
      // Excluir tira o item da mochila inteiro. Não devolve dinheiro.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const items = { ...player.items }
          delete items[action.itemId]
          return {
            ...player,
            items,
            customItems: player.customItems.filter((custom) => custom.id !== action.itemId),
            itemNotes: withoutNote(player.itemNotes, action.itemId),
          }
        }),
      }

    case 'SELL_ITEM': {
      const item = resolveItem(state, action.itemId, action.playerId)
      if (!item) return state
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const owned = player.items[action.itemId] ?? 0
          const sold = Math.min(owned, action.qty ?? 1)
          if (sold <= 0) return player
          const earnedCp = Math.floor(item.priceCp * SELL_RATE) * sold
          return {
            ...player,
            ...withWalletCopper(player, toCopper(player) + earnedCp),
            items: withItemDelta(player.items, action.itemId, -sold),
            customItems:
              sold >= owned
                ? player.customItems.filter((custom) => custom.id !== action.itemId)
                : player.customItems,
            itemNotes: sold >= owned ? withoutNote(player.itemNotes, action.itemId) : player.itemNotes,
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
              // A observação é anotação de quem escreveu, não viaja com o item.
              itemNotes: leftBehind <= 0 ? withoutNote(player.itemNotes, action.itemId) : player.itemNotes,
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

    case 'RENAME_ITEM': {
      // O item da biblioteca é imutável: renomear cria uma cópia avulsa, que
      // passa a existir só na mochila deste jogador, com os dados todos.
      const current = resolveItem(state, action.itemId, action.playerId)
      if (!current) return state
      const name = action.name?.trim()
      if (!name || name === current.name) return state
      const renamed = normalizeItem({ ...current, id: makeId('custom'), name })

      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const owned = player.items[action.itemId] ?? 0
          if (owned <= 0) return player
          const items = { ...player.items }
          delete items[action.itemId]
          items[renamed.id] = owned
          const note = player.itemNotes?.[action.itemId]
          return {
            ...player,
            items,
            // Renomear de novo troca o avulso antigo, não empilha.
            customItems: [
              ...player.customItems.filter((custom) => custom.id !== action.itemId),
              renamed,
            ],
            itemNotes: note
              ? { ...withoutNote(player.itemNotes, action.itemId), [renamed.id]: note }
              : player.itemNotes,
          }
        }),
      }
    }

    // ------------------------------------------------------------------- lojas

    case 'CART_SET': {
      const cart = { ...state.cart }
      if (action.qty > 0) cart[action.itemId] = action.qty
      else delete cart[action.itemId]
      return { ...state, cart }
    }

    case 'BUY_CART': {
      const player = state.players.find((current) => current.id === state.activePlayerId)
      if (!player) return state

      const lines = Object.entries(state.cart)
        .map(([itemId, qty]) => ({ itemId, qty, item: resolveItem(state, itemId) }))
        .filter((line) => line.item && line.qty > 0)
      if (!lines.length) return state

      const totalCp = lines.reduce((sum, line) => sum + line.item.priceCp * line.qty, 0)
      const wallet = spendCopper(player, totalCp)
      if (!wallet) return state // a tela apaga o botão antes de chegar aqui

      let items = player.items
      for (const line of lines) items = withItemDelta(items, line.itemId, line.qty)

      return {
        ...state,
        cart: {},
        players: mapPlayer(state.players, player.id, (current) => ({
          ...current,
          ...wallet,
          items,
        })),
      }
    }

    case 'ADD_SHOP': {
      const shop = {
        id: makeId('shop'),
        name: action.name?.trim() || 'Nova loja',
        itemIds: action.itemIds ?? [],
      }
      return { ...state, shops: [...state.shops, shop] }
    }

    case 'UPDATE_SHOP':
      // Salva de uma vez o nome e a composição inteira, vindos da tela de edição.
      return {
        ...state,
        shops: state.shops.map((shop) =>
          shop.id === action.shopId
            ? { ...shop, name: action.name?.trim() || shop.name, itemIds: action.itemIds }
            : shop,
        ),
      }

    case 'REMOVE_SHOP': {
      const shops = state.shops.filter((shop) => shop.id !== action.shopId)
      const activeShopId =
        state.activeShopId === action.shopId ? (shops[0]?.id ?? null) : state.activeShopId
      return { ...state, shops, activeShopId }
    }

    case 'TOGGLE_SHOP_ITEM':
      return {
        ...state,
        shops: state.shops.map((shop) => {
          if (shop.id !== action.shopId) return shop
          const has = shop.itemIds.includes(action.itemId)
          return {
            ...shop,
            itemIds: has
              ? shop.itemIds.filter((id) => id !== action.itemId)
              : [...shop.itemIds, action.itemId],
          }
        }),
      }

    // ------------------------------------------------------------- biblioteca

    case 'ADD_CAMPAIGN_ITEMS':
      return {
        ...state,
        campaignItems: [...state.campaignItems, ...action.items.map((item) => normalizeItem(item))],
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

export function canAfford(player, totalCp) {
  return toCopper(player) >= totalCp
}
