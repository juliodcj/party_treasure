import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import {
  SESSION_ACTIONS,
  loadSession,
  reconcileSession,
  saveSession,
  sessionReducer,
} from './session.js'
import { STORAGE_KEY } from '../config.js'

/**
 * A ponte entre o app e a mesa.
 *
 * Desde a Fase 3 o estado da mesa não mora mais no aparelho: mora no servidor
 * do PC do mestre, e chega aqui por WebSocket. O celular não aplica nada
 * sozinho — despacha, o servidor aplica e devolve o resultado para todos.
 * Numa rede local isso é instantâneo, e evita o único bug que seria infernal
 * de rastrear aqui: dois aparelhos discordando sobre quantas poções sobraram.
 *
 * Do lado de fora nada disso aparece. `useStore()` continua devolvendo
 * `{ state, dispatch }`, com o estado da mesa e o do aparelho mesclados num
 * objeto só, e as telas seguem despachando as mesmas ações de sempre.
 */

const StoreContext = createContext(null)

/** Fatias que só existem enquanto o servidor não respondeu a primeira vez. */
const EMPTY_TABLE = {
  version: 0,
  settings: { ownedCategories: [], remasterFilter: 'all' },
  history: [],
  players: [],
  campaignItems: [],
  shops: [],
}

export function StoreProvider({ children }) {
  const [table, setTable] = useState(null)
  const [status, setStatus] = useState('connecting') // 'connecting' | 'online' | 'offline'
  const [session, dispatchSession] = useReducer(sessionReducer, null, loadSession)

  const socketRef = useRef(null)
  const seqRef = useRef(0)
  // O carrinho e o personagem em foco precisam ser lidos dentro de callbacks
  // que não são recriados a cada tecla; a ref evita `dispatch` novo a cada
  // clique (o que remontaria meia interface à toa).
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    const socket = io({ autoConnect: true })
    socketRef.current = socket

    socket.on('connect', () => setStatus('online'))
    socket.on('disconnect', () => setStatus('offline'))
    socket.on('connect_error', () => setStatus('offline'))

    socket.on('table:full', ({ seq, table: full }) => {
      seqRef.current = seq
      setTable(full)
    })

    socket.on('table:patch', ({ seq, patch }) => {
      // Um número fora de ordem quer dizer que este aparelho perdeu um aviso
      // (tela dormiu, Wi-Fi oscilou). Melhor pedir a mesa inteira do que
      // seguir mostrando um saldo que não existe mais.
      if (seq !== seqRef.current + 1) {
        socket.emit('resync')
        return
      }
      seqRef.current = seq
      setTable((current) => (current ? { ...current, ...patch } : current))
    })

    return () => {
      socket.removeAllListeners()
      socket.close()
      socketRef.current = null
    }
  }, [])

  // Quem estava em foco pode ter sido excluído por outro aparelho.
  useEffect(() => {
    if (!table) return
    const fixed = reconcileSession(sessionRef.current, table)
    if (fixed !== sessionRef.current) {
      dispatchSession({ type: 'SELECT_PLAYER', playerId: fixed.activePlayerId })
      dispatchSession({ type: 'SELECT_SHOP', shopId: fixed.activeShopId })
    }
  }, [table])

  useEffect(() => {
    saveSession(session)
  }, [session])

  /** Devolve `false` quando a ação não chegou ao servidor — é o que a Loja
   *  usa para não esvaziar o carrinho de uma compra que não aconteceu. */
  const dispatch = useCallback((action) => {
    if (SESSION_ACTIONS.has(action.type)) {
      dispatchSession(action)
      return true
    }
    const socket = socketRef.current
    if (!socket?.connected) {
      // Sem conexão a ação é recusada de propósito: um "+1" que aparece na
      // tela e some depois é pior do que um aviso dizendo o que houve.
      setStatus('offline')
      return false
    }
    // `by` é quem estava selecionado neste aparelho — sem login, é o que o
    // histórico tem para dizer de onde veio a alteração.
    socket.emit('action', { ...action, by: sessionRef.current.activePlayerId }, (result) => {
      if (result && result.ok === false) console.warn('[mesa] ação recusada:', result.error)
    })
    return true
  }, [])

  const state = useMemo(() => ({ ...(table ?? EMPTY_TABLE), ...session }), [table, session])

  const value = useMemo(
    () => ({ state, dispatch, status, ready: table !== null }),
    [state, dispatch, status, table],
  )

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

/**
 * A mesa que ficou salva neste aparelho antes de existir servidor (Fase 1).
 * Serve para o botão "Importar a mesa deste aparelho": sem ele, quem já tinha
 * uma campanha montada no celular perderia tudo ao ligar o servidor.
 */
export function readDeviceTable() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    return Array.isArray(parsed?.players) && parsed.players.length ? parsed : null
  } catch {
    return null
  }
}
