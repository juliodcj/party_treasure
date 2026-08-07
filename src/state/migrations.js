// Migra o estado salvo no localStorage de uma versão para a próxima. Cada
// chave é a versão de origem; o valor devolve o estado já na versão seguinte.
// `store.jsx` aplica em cadeia até chegar na versão atual — nunca descarta
// a mesa do jogador só porque o schema mudou.
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
}

export function migrate(state, targetVersion) {
  let next = state
  while (next.version < targetVersion && MIGRATIONS[next.version]) {
    next = MIGRATIONS[next.version](next)
  }
  return next
}
