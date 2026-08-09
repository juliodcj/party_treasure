import { makeId, resolveItem } from '../lib/items.js'

const HISTORY_LIMIT = 20

// Só ações que mexem em dado real e valem a pena poder desfazer. Renomear
// jogador fica de fora de propósito — dispara a cada letra digitada; renomear
// item não, é confirmado num clique só.
const SLICE_KEYS = {
  SET_COINS: ['players'],
  ADJUST_COINS: ['players'],
  GIVE_COINS: ['players'],
  SPLIT_COINS: ['players'],
  TRANSFER_COINS: ['players'],
  SIMPLIFY_COINS: ['players'],
  GIVE_ITEM: ['players'],
  DROP_ITEM: ['players'],
  CHANGE_ITEM_QTY: ['players'],
  SELL_ITEM: ['players'],
  TRANSFER_ITEM: ['players'],
  BUY_CART: ['players'],
  ADD_CUSTOM_ITEM: ['players'],
  UPDATE_CUSTOM_ITEM: ['players'],
  RENAME_ITEM: ['players'],
  SET_ITEM_NOTE: ['players'],
  ADD_PLAYER: ['players'],
  REMOVE_PLAYER: ['players'],
  ADD_SHOP: ['shops'],
  UPDATE_SHOP: ['shops'],
  REMOVE_SHOP: ['shops'],
  TOGGLE_SHOP_ITEM: ['shops'],
  ADD_CAMPAIGN_ITEMS: ['campaignItems'],
  UPDATE_CAMPAIGN_ITEM: ['campaignItems'],
  REMOVE_CAMPAIGN_ITEM: ['campaignItems', 'shops'],
}

// Ações que só valem histórico numa situação específica. O +/- do inventário
// é clique rotineiro demais para registrar, mas chegar a zero apaga o item da
// mochila — isso precisa dar para desfazer, como o "Excluir".
const RECORD_WHEN = {
  CHANGE_ITEM_QTY: (state, next, action) => {
    const before = state.players.find((player) => player.id === action.playerId)?.items[action.itemId] ?? 0
    const after = next.players.find((player) => player.id === action.playerId)?.items[action.itemId] ?? 0
    return before > 0 && after === 0
  },
}

function playerName(state, id) {
  return state.players.find((player) => player.id === id)?.name ?? 'jogador removido'
}

function shopName(state, id) {
  return state.shops.find((shop) => shop.id === id)?.name ?? 'loja removida'
}

function itemName(state, itemId, playerId) {
  return resolveItem(state, itemId, playerId)?.name ?? 'item removido'
}

/** Rótulo em português, resolvido com o estado ANTES da ação (nomes ainda existem). */
function describeAction(state, action) {
  switch (action.type) {
    case 'SET_COINS':
      return `Editou as moedas de ${playerName(state, action.playerId)}`
    case 'ADJUST_COINS':
      return `Ajustou as moedas de ${playerName(state, action.playerId)}`
    case 'GIVE_COINS':
      return `Deu moedas a ${playerName(state, action.playerId)}`
    case 'SPLIT_COINS':
      return 'Distribuiu moedas entre o grupo'
    case 'TRANSFER_COINS':
      return `${playerName(state, action.fromId)} enviou dinheiro a ${playerName(state, action.toId)}`
    case 'SIMPLIFY_COINS':
      return `Simplificou as moedas de ${playerName(state, action.playerId)}`
    case 'GIVE_ITEM':
      return `Deu ${itemName(state, action.itemId, action.playerId)} a ${playerName(state, action.playerId)}`
    case 'DROP_ITEM':
    case 'CHANGE_ITEM_QTY':
      return `Excluiu ${itemName(state, action.itemId, action.playerId)} da mochila de ${playerName(state, action.playerId)}`
    case 'SELL_ITEM':
      return `${playerName(state, action.playerId)} vendeu ${itemName(state, action.itemId, action.playerId)}`
    case 'TRANSFER_ITEM':
      return `${playerName(state, action.fromId)} enviou ${itemName(state, action.itemId, action.fromId)} a ${playerName(state, action.toId)}`
    case 'BUY_CART':
      return `${playerName(state, action.playerId)} comprou itens na loja`
    case 'ADD_CUSTOM_ITEM':
      return `Adicionou o item avulso "${action.item.name}" a ${playerName(state, action.playerId)}`
    case 'UPDATE_CUSTOM_ITEM':
      return `Editou um item avulso de ${playerName(state, action.playerId)}`
    case 'RENAME_ITEM':
      return `Renomeou "${itemName(state, action.itemId, action.playerId)}" para "${action.name}" na mochila de ${playerName(state, action.playerId)}`
    case 'SET_ITEM_NOTE':
      return `Editou a observação de ${itemName(state, action.itemId, action.playerId)}`
    case 'ADD_PLAYER':
      return 'Criou um novo jogador'
    case 'REMOVE_PLAYER':
      return `Excluiu o jogador ${playerName(state, action.playerId)}`
    case 'ADD_SHOP':
      return `Criou a loja "${action.name?.trim() || 'Nova loja'}"`
    case 'UPDATE_SHOP':
      return `Editou a loja ${shopName(state, action.shopId)}`
    case 'REMOVE_SHOP':
      return `Excluiu a loja ${shopName(state, action.shopId)}`
    case 'TOGGLE_SHOP_ITEM':
      return `Alterou o estoque de ${shopName(state, action.shopId)}`
    case 'ADD_CAMPAIGN_ITEMS':
      return `Adicionou ${action.items.length} item(ns) à biblioteca`
    case 'UPDATE_CAMPAIGN_ITEM':
      return 'Editou um item da biblioteca'
    case 'REMOVE_CAMPAIGN_ITEM':
      return 'Excluiu um item da biblioteca'
    default:
      return action.type
  }
}

/**
 * Envolve o reducer: antes de aplicar uma ação da lista acima, guarda um
 * snapshot das fatias do estado que ela toca. `UNDO_TO` restaura o
 * snapshot de uma entrada e descarta ela e tudo que veio depois — é uma
 * pilha, não edição pontual (senão o estado fica inconsistente em cascata).
 *
 * As `slices` ficam só no servidor: são um retrato do estado anterior e não
 * têm serventia nenhuma no celular, que recebe as entradas sem elas.
 */
export function withHistory(reducer) {
  return function reducerWithHistory(state, action) {
    if (action.type === 'UNDO_TO') {
      const index = state.history.findIndex((entry) => entry.id === action.entryId)
      if (index === -1) return state
      return {
        ...state,
        ...state.history[index].slices,
        history: state.history.slice(0, index),
      }
    }

    if (action.type === 'CLEAR_HISTORY') {
      return { ...state, history: [] }
    }

    const next = reducer(state, action)
    if (next === state) return next

    const keys = SLICE_KEYS[action.type]
    if (!keys) return next

    const shouldRecord = RECORD_WHEN[action.type]
    if (shouldRecord && !shouldRecord(state, next, action)) return next

    const slices = {}
    for (const key of keys) slices[key] = state[key]

    const entry = {
      id: makeId('hist'),
      at: Date.now(),
      label: describeAction(state, action),
      // De qual celular veio. Sem login, o autor é o personagem que estava
      // selecionado no aparelho que agiu — é o que permite ao mestre saber
      // quem mexeu, já que todo mundo pode mexer em tudo.
      by: action.by ? playerName(state, action.by) : null,
      slices,
    }

    return { ...next, history: [...next.history, entry].slice(-HISTORY_LIMIT) }
  }
}
