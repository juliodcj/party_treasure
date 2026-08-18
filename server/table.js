import { reducer } from '../src/state/reducer.js'
import { withHistory } from '../src/state/history.js'
import { createInitialState } from '../src/state/initialState.js'
import { migrate, withSheetFields } from '../src/state/migrations.js'

/**
 * A mesa. Um estado só, com um dono só: este processo.
 *
 * Todo aparelho manda ações para cá, aqui elas são aplicadas em ordem, e o que
 * mudou volta para todos. É o que faz a compra do Valeros aparecer no celular
 * da Seelah — e o que garante que ninguém invente o próprio saldo, já que o
 * reducer confere preço e carteira antes de aceitar.
 */

const applyAction = withHistory(reducer)

/** As chaves de primeiro nível que formam a mesa. Ordem sem importância. */
const TABLE_KEYS = ['version', 'settings', 'history', 'players', 'campaignItems', 'shops']

/**
 * Tudo que um aparelho tem direito de despachar. Bater a lista aqui em vez de
 * confiar no `default:` do reducer é o que impede uma ação com nome errado de
 * virar um broadcast à toa — e deixa o erro visível em vez de silencioso.
 */
export const TABLE_ACTIONS = new Set([
  'SET_SETTINGS',
  'ADD_PLAYER',
  'RENAME_PLAYER',
  'REMOVE_PLAYER',
  'SIMPLIFY_COINS',
  'TRANSFER_COINS',
  'ADJUST_COINS',
  'SET_COINS',
  'GIVE_COINS',
  'SPLIT_COINS',
  'GIVE_ITEM',
  'CHANGE_ITEM_QTY',
  'SET_ITEM_NOTE',
  'DROP_ITEM',
  'SELL_ITEM',
  'TRANSFER_ITEM',
  'ADD_CUSTOM_ITEM',
  'UPDATE_CUSTOM_ITEM',
  'RENAME_ITEM',
  'BUY_CART',
  'ADD_SHOP',
  'UPDATE_SHOP',
  'REMOVE_SHOP',
  'TOGGLE_SHOP_ITEM',
  'ADD_CAMPAIGN_ITEMS',
  'UPDATE_CAMPAIGN_ITEM',
  'REMOVE_CAMPAIGN_ITEM',
  // Equipar e modificador manual: da linha do item, no Inventário.
  'EQUIP_ITEM',
  'UNEQUIP_ITEM',
  'SET_ITEM_MODS',
  // Ficha de personagem. Vincular/atualizar/remover só sai da tela do Mestre
  // (D14), mas quem barra isso é a tela: sem papéis e sem login, qualquer
  // aparelho pode despachar qualquer uma — o histórico registra quem foi.
  'IMPORT_SHEET',
  'UPDATE_SHEET',
  'REMOVE_SHEET',
  'APPLY_DAMAGE',
  'APPLY_HEAL',
  'SET_TEMP_HP',
  'SET_CONDITION',
  'SET_CONDITIONS',
  'CLEAR_CONDITIONS',
  'SET_FOCUS',
  'TOGGLE_SHIELD_RAISED',
  'SET_SHIELD_HP',
  'TOGGLE_FAVORITE',
  // A descrição que o jogador escreve para um feat que os packs não conhecem.
  'SET_FEAT_NOTE',
  'REST',
  'PREPARE_SPELL',
  'ADD_SPELL',
  'ADD_BOOK_SPELL',
  'REMOVE_BOOK_SPELL',
  'ADD_FOCUS_SPELL',
  'REMOVE_FOCUS_SPELL',
  'REMOVE_SPELL',
  'USE_SPELL_SLOT',
  'UNDO_TO',
  'CLEAR_HISTORY',
  'RESET',
])

/**
 * Uma mesa vinda de fora (arquivo do disco, ou o localStorage antigo de um
 * aparelho) pode estar em versão velha ou com chave a mais. Migra, descarta o
 * que não é mesa e completa o que faltar — nunca joga a mesa fora por causa
 * de um campo ausente.
 */
export function sanitizeTable(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.players) || !raw.players.length) {
    return null
  }
  const seed = createInitialState()
  const migrated = Number.isFinite(raw.version) && raw.version < seed.version
    ? migrate(raw, seed.version)
    : raw

  return {
    version: seed.version,
    settings: { ...seed.settings, ...(migrated.settings ?? {}) },
    history: Array.isArray(migrated.history) ? migrated.history : [],
    players: migrated.players.map((player) => ({
      ...withSheetFields(player),
      items: player.items ?? {},
      customItems: player.customItems ?? [],
      itemNotes: player.itemNotes ?? {},
    })),
    campaignItems: Array.isArray(migrated.campaignItems) ? migrated.campaignItems : [],
    shops: Array.isArray(migrated.shops) ? migrated.shops : [],
  }
}

/** A mesa como os aparelhos a enxergam: sem as `slices` do histórico, que só
 *  servem para o servidor executar o "Reverter" e podem ser grandes. */
function publicValue(key, value) {
  if (key !== 'history') return value
  return value.map(({ slices, ...entry }) => entry)
}

export function createTable(storage) {
  const stored = storage.read()
  let state = sanitizeTable(stored) ?? createInitialState()
  // Uma mesa nova precisa nascer no disco: assim um restart imediato não volta
  // pro exemplo achando que é a primeira execução.
  if (!stored) storage.save(state)

  // Contador que só cresce. É por ele que um celular percebe que perdeu um
  // aviso (tela dormiu, Wi-Fi oscilou) e pede a mesa inteira de novo, em vez
  // de continuar mostrando um número errado sem saber.
  let seq = 0

  return {
    get seq() {
      return seq
    },

    /** A mesa inteira, para quem acabou de conectar ou pediu resync. */
    snapshot() {
      const table = {}
      for (const key of TABLE_KEYS) table[key] = publicValue(key, state[key])
      return { seq, table }
    },

    /** O estado cru, com as `slices`. Só o servidor usa. */
    raw() {
      return state
    },

    /**
     * Aplica uma ação. Devolve `{ ok, patch }` — `patch` traz só as fatias que
     * mudaram, comparadas por referência: o reducer devolve objeto novo apenas
     * para o que tocou, então mexer na quantidade de um item manda `players` e
     * mais nada, nunca a biblioteca inteira junto.
     */
    apply(action) {
      if (!action || typeof action.type !== 'string') {
        return { ok: false, error: 'Ação sem tipo.' }
      }
      if (!TABLE_ACTIONS.has(action.type)) {
        return { ok: false, error: `Ação desconhecida: ${action.type}` }
      }

      let incoming = action
      if (action.type === 'RESET') {
        // Sem `state` é "voltar para a mesa de exemplo". Com `state` é a mesa
        // que alguém importou do próprio aparelho — nunca entra crua.
        const clean = action.state ? sanitizeTable(action.state) : createInitialState()
        if (!clean) return { ok: false, error: 'A mesa enviada não é válida.' }
        incoming = { ...action, state: clean }
      }

      let next
      try {
        next = applyAction(state, incoming)
      } catch (error) {
        console.error(`[mesa] ${action.type} quebrou:`, error)
        return { ok: false, error: 'O servidor não conseguiu aplicar a ação.' }
      }

      // Ação sem efeito (saldo insuficiente, item que já sumiu, id inexistente):
      // não é erro, mas também não vira broadcast.
      if (next === state) return { ok: true, patch: null }

      const patch = {}
      for (const key of TABLE_KEYS) {
        if (next[key] !== state[key]) patch[key] = publicValue(key, next[key])
      }

      state = next
      storage.save(state)
      if (!Object.keys(patch).length) return { ok: true, patch: null }

      seq += 1
      return { ok: true, patch, seq }
    },
  }
}
