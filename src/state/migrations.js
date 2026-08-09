// Migra a mesa de uma versão do schema para a próxima. Cada chave é a versão
// de origem; o valor devolve o estado já na versão seguinte. O servidor aplica
// em cadeia até chegar na versão atual — nunca descarta a mesa só porque o
// schema mudou. Vale também para a mesa antiga importada de um aparelho.
const MIGRATIONS = {
  2: (state) => ({
    ...state,
    version: 3,
    settings: state.settings ?? { ownedCategories: [], remasterFilter: 'all' },
  }),
  3: (state) => ({
    ...state,
    version: 4,
    history: state.history ?? [],
    players: state.players.map((player) => ({ ...player, itemNotes: player.itemNotes ?? {} })),
  }),
  // Fase 3: a mesa passou a viver no servidor. Foco e carrinho saíram daqui e
  // viraram sessão de cada aparelho — na mesa compartilhada eles não existem.
  4: (state) => {
    const { cart, activePlayerId, activeShopId, ...table } = state
    return {
      ...table,
      version: 5,
      history: (state.history ?? []).map((entry) => {
        const { activePlayerId: _p, activeShopId: _s, ...slices } = entry.slices ?? {}
        return { ...entry, by: entry.by ?? null, slices }
      }),
    }
  },
}

export function migrate(state, targetVersion) {
  let next = state
  while (next.version < targetVersion && MIGRATIONS[next.version]) {
    next = MIGRATIONS[next.version](next)
  }
  return next
}
