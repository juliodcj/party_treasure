/**
 * Sessão: o pedaço do estado que é deste aparelho, e só dele.
 *
 * A mesa (jogadores, lojas, biblioteca, histórico) mora no servidor e é igual
 * para todo mundo. Já "em qual personagem estou olhando", "em qual loja estou"
 * e "o que tem no meu carrinho" são ponto de vista, não dado da mesa: se
 * fossem compartilhados, trocar de personagem num celular trocaria a tela de
 * todos, e dois jogadores comprando ao mesmo tempo dividiriam o mesmo carrinho.
 *
 * Por isso a sessão fica aqui, em memória e no localStorage do aparelho, e
 * nunca sobe pro servidor.
 */

const SESSION_KEY = 'party-treasure/session/v1'

/** Ações que o `dispatch` resolve localmente, sem falar com o servidor. */
export const SESSION_ACTIONS = new Set(['SELECT_PLAYER', 'SELECT_SHOP', 'CART_SET', 'CART_CLEAR'])

export function createSession() {
  return { activePlayerId: null, activeShopId: null, cart: {} }
}

export function sessionReducer(session, action) {
  switch (action.type) {
    case 'SELECT_PLAYER':
      // Trocar de personagem esvazia o carrinho: ele era da compra do anterior.
      return { ...session, activePlayerId: action.playerId, cart: {} }

    case 'SELECT_SHOP':
      return { ...session, activeShopId: action.shopId, cart: {} }

    case 'CART_SET': {
      const cart = { ...session.cart }
      if (action.qty > 0) cart[action.itemId] = action.qty
      else delete cart[action.itemId]
      return { ...session, cart }
    }

    case 'CART_CLEAR':
      return { ...session, cart: {} }

    default:
      return session
  }
}

export function loadSession() {
  const fallback = createSession()
  try {
    const stored = window.localStorage.getItem(SESSION_KEY)
    if (!stored) return fallback
    const parsed = JSON.parse(stored)
    if (!parsed || typeof parsed !== 'object') return fallback
    return {
      activePlayerId: typeof parsed.activePlayerId === 'string' ? parsed.activePlayerId : null,
      activeShopId: typeof parsed.activeShopId === 'string' ? parsed.activeShopId : null,
      cart: parsed.cart && typeof parsed.cart === 'object' ? parsed.cart : {},
    }
  } catch {
    return fallback
  }
}

export function saveSession(session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Aba anônima ou armazenamento cheio: seguimos só em memória.
  }
}

/**
 * O personagem ou a loja em foco podem ter sido apagados por outro aparelho —
 * a mesa é compartilhada. Quando isso acontece, o foco cai no primeiro da
 * lista em vez de apontar para o vazio.
 */
export function reconcileSession(session, table) {
  if (!table) return session
  const playerExists = table.players?.some((player) => player.id === session.activePlayerId)
  const shopExists = table.shops?.some((shop) => shop.id === session.activeShopId)
  const activePlayerId = playerExists ? session.activePlayerId : (table.players?.[0]?.id ?? null)
  const activeShopId = shopExists ? session.activeShopId : (table.shops?.[0]?.id ?? null)
  if (activePlayerId === session.activePlayerId && activeShopId === session.activeShopId) {
    return session
  }
  return { ...session, activePlayerId, activeShopId }
}
