// Migra a mesa de uma versão do schema para a próxima. Cada chave é a versão
// de origem; o valor devolve o estado já na versão seguinte. O servidor aplica
// em cadeia até chegar na versão atual — nunca descarta a mesa só porque o
// schema mudou. Vale também para a mesa antiga importada de um aparelho.
/**
 * Os campos da ficha, em branco. Um lugar só, porque três precisam deles: a
 * migração 5 → 6, a mesa de exemplo e o saneamento de mesa vinda de fora.
 *
 * `hp: null` de propósito: sem ficha não existe HP máximo, e zero seria mentira
 * (um personagem sem ficha não está morrendo). Quem tem ficha recebe
 * `hp = sheet.hpMax` no `IMPORT_SHEET`.
 *
 * `vitals` sobrevive à reimportação e à remoção da ficha — é fato de mesa, não
 * cálculo. `gear`, `itemMods` e `featNotes` idem: o que a pessoa está vestindo,
 * o que o mestre concedeu e o texto que ela mesma escreveu para um feat que os
 * packs não conhecem não se perdem porque a ficha foi trocada.
 */
export function emptySheetFields() {
  return {
    sheet: null,
    vitals: {
      hp: null,
      tempHp: 0,
      conditions: {},
      focusPoints: 0,
      shieldHp: null,
      shieldRaised: false,
      slotsUsed: {},
      preparedSpells: [],
      extraSpells: [],
      bookSpells: [],
      forgottenSpells: [],
      extraFocusSpells: [],
      forgottenFocusSpells: [],
      favorites: {},
    },
    gear: { wornArmorId: null, heldShieldId: null, equippedWeaponIds: [] },
    itemMods: {},
    featNotes: {},
  }
}

/**
 * Completa um jogador com o que faltar da ficha, sem tocar no que já existe.
 * Idempotente: rodar duas vezes dá o mesmo jogador.
 */
export function withSheetFields(player) {
  const empty = emptySheetFields()
  return {
    ...player,
    sheet: player.sheet ?? null,
    vitals: { ...empty.vitals, ...(player.vitals ?? {}) },
    gear: { ...empty.gear, ...(player.gear ?? {}) },
    itemMods: player.itemMods ?? {},
    featNotes: player.featNotes ?? {},
  }
}

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
  // A ficha de personagem entrou. Todo jogador ganha os campos vazios: quem já
  // está na mesa continua exatamente como estava, só que agora com um lugar
  // reservado para a ficha que talvez nunca venha. Personagem sem ficha é caso
  // de primeira classe, não estado de transição.
  5: (state) => ({
    ...state,
    version: 6,
    players: state.players.map(withSheetFields),
  }),
}

export function migrate(state, targetVersion) {
  let next = state
  while (next.version < targetVersion && MIGRATIONS[next.version]) {
    next = MIGRATIONS[next.version](next)
  }
  return next
}
