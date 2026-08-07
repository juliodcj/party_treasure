import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { reducer } from './reducer.js'
import { createInitialState } from './initialState.js'
import { migrate } from './migrations.js'
import { STORAGE_KEY } from '../config.js'

const StoreContext = createContext(null)

/**
 * Persistência mínima da Fase 1: o estado inteiro no localStorage do aparelho.
 * Na Fase 3 quem manda passa a ser o servidor (Socket.IO + SQLite) e isto vira
 * só um cache de leitura.
 */
function loadState() {
  const fallback = createInitialState()
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return fallback
    let parsed = JSON.parse(stored)
    if (!parsed || !Array.isArray(parsed.players) || !Number.isFinite(parsed.version)) {
      return fallback
    }
    // Versão do futuro (estado de um aparelho mais atualizado) ou schema
    // corrompido: não dá pra confiar, volta pro padrão. Versão antiga migra.
    if (parsed.version > fallback.version) return fallback
    if (parsed.version < fallback.version) parsed = migrate(parsed, fallback.version)

    // O jogador ou a loja em foco podem ter sido apagados noutro aparelho.
    const playerExists = parsed.players.some((player) => player.id === parsed.activePlayerId)
    const shopExists = parsed.shops?.some((shop) => shop.id === parsed.activeShopId)
    return {
      ...fallback,
      ...parsed,
      cart: {},
      settings: { ...fallback.settings, ...parsed.settings },
      activePlayerId: playerExists ? parsed.activePlayerId : parsed.players[0]?.id,
      activeShopId: shopExists ? parsed.activeShopId : parsed.shops?.[0]?.id,
    }
  } catch {
    return fallback
  }
}

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, loadState)

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // Aba anônima ou armazenamento cheio: seguimos só em memória.
    }
  }, [state])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error('useStore precisa estar dentro de <StoreProvider>')
  return context
}

/** Atalho para o personagem em foco na aba Inventário. */
export function useActivePlayer() {
  const { state } = useStore()
  return state.players.find((player) => player.id === state.activePlayerId) ?? state.players[0]
}

export function resetToSeed(dispatch) {
  dispatch({ type: 'RESET', state: createInitialState() })
}
