import { useMemo, useState } from 'react'
import ItemCard from '../components/ItemCard.jsx'
import ItemFilters, { EMPTY_FILTERS } from '../components/ItemFilters.jsx'
import ItemForm from '../components/ItemForm.jsx'
import Modal from '../components/Modal.jsx'
import Stepper from '../components/Stepper.jsx'
import { useStore } from '../state/store.jsx'
import { GROUPS } from '../data/catalog.js'
import {
  availableLevels,
  groupInventory,
  libraryItems,
  matchesFilters,
  matchesSearch,
  playerInventory,
  totalBulk,
} from '../lib/items.js'
import { formatBulk } from '../lib/bulk.js'
import { formatCopper } from '../lib/money.js'
import { plural } from '../lib/text.js'
import { SELL_RATE } from '../config.js'

export default function InventoryScreen({ player }) {
  const { state, dispatch } = useStore()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [adding, setAdding] = useState(null) // 'manual' | 'catalog'
  const [transfer, setTransfer] = useState(null) // { item }
  const [editing, setEditing] = useState(null) // item avulso

  const entries = useMemo(() => playerInventory(state, player), [state, player])
  const visible = useMemo(
    () => entries.filter(({ item }) => matchesSearch(item, filters.search) && matchesFilters(item, filters)),
    [entries, filters],
  )
  const grouped = useMemo(() => groupInventory(visible), [visible])
  const levels = useMemo(() => availableLevels(entries.map((entry) => entry.item)), [entries])

  const isCustom = (itemId) => player.customItems.some((custom) => custom.id === itemId)

  return (
    <div className="stack">
      <PlayerChips />

      <div className="row">
        <span className="card__sub">
          {plural(entries.reduce((sum, entry) => sum + entry.qty, 0), 'item', 'itens')} · Bulk{' '}
          {formatBulk(totalBulk(entries))}
        </span>
        <div className="spacer" />
        <button type="button" className="btn btn--sm btn--primary" onClick={() => setAdding('catalog')}>
          + Adicionar
        </button>
      </div>

      <ItemFilters value={filters} onChange={setFilters} levels={levels} />

      {visible.length === 0 ? (
        <div className="empty">
          {entries.length === 0
            ? 'A mochila está vazia. Toque em “Adicionar”.'
            : 'Nenhum item bate com a busca.'}
        </div>
      ) : null}

      {GROUPS.map((group) =>
        grouped[group.id].length ? (
          <section key={group.id} className="stack">
            <h2 className="section-title">
              {group.label} <span>({grouped[group.id].length})</span>
            </h2>
            {grouped[group.id].map(({ item, qty }) => (
              <ItemCard
                key={item.id}
                item={item}
                qty={qty}
                right={
                  <Stepper
                    value={qty}
                    min={0}
                    onChange={(next) =>
                      dispatch({
                        type: 'CHANGE_ITEM_QTY',
                        playerId: player.id,
                        itemId: item.id,
                        delta: next - qty,
                      })
                    }
                  />
                }
              >
                <div className="item__actions">
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() => setTransfer({ item, qty })}
                    disabled={state.players.length < 2}
                  >
                    Enviar
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() =>
                      dispatch({ type: 'SELL_ITEM', playerId: player.id, itemId: item.id, qty: 1 })
                    }
                  >
                    Vender ({formatCopper(Math.floor(item.priceCp * SELL_RATE))})
                  </button>
                  {isCustom(item.id) ? (
                    <button type="button" className="btn btn--sm" onClick={() => setEditing(item)}>
                      Editar
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() =>
                      dispatch({
                        type: 'DROP_ITEM',
                        playerId: player.id,
                        itemId: item.id,
                        refund: true,
                      })
                    }
                  >
                    Excluir c/ reembolso
                  </button>
                </div>
              </ItemCard>
            ))}
          </section>
        ) : null,
      )}

      {adding ? (
        <AddItemSheet mode={adding} player={player} onMode={setAdding} onClose={() => setAdding(null)} />
      ) : null}

      {transfer ? (
        <TransferSheet player={player} entry={transfer} onClose={() => setTransfer(null)} />
      ) : null}

      {editing ? (
        <Modal title="Editar item" onClose={() => setEditing(null)}>
          <ItemForm
            item={editing}
            submitLabel="Salvar alterações"
            onSubmit={(item) => {
              dispatch({ type: 'UPDATE_CUSTOM_ITEM', playerId: player.id, item })
              setEditing(null)
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}

/** Seletor de personagem em chips roláveis. */
function PlayerChips() {
  const { state, dispatch } = useStore()
  return (
    <div className="chips" role="tablist" aria-label="Escolher personagem">
      {state.players.map((player) => (
        <button
          key={player.id}
          type="button"
          role="tab"
          aria-selected={player.id === state.activePlayerId}
          className={`chip${player.id === state.activePlayerId ? ' chip--on' : ''}`}
          onClick={() => dispatch({ type: 'SELECT_PLAYER', playerId: player.id })}
        >
          {player.name}
        </button>
      ))}
    </div>
  )
}

/** Adicionar item: escolher do catálogo/campanha ou cadastrar um avulso. */
function AddItemSheet({ mode, player, onMode, onClose }) {
  const { state, dispatch } = useStore()
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  const catalog = useMemo(() => libraryItems(state), [state])
  const visible = catalog.filter(
    (item) => matchesSearch(item, filters.search) && matchesFilters(item, filters),
  )

  return (
    <Modal title="Adicionar item" onClose={onClose}>
      <div className="stack">
        <div className="chips">
          <button
            type="button"
            className={`chip${mode === 'catalog' ? ' chip--on' : ''}`}
            onClick={() => onMode('catalog')}
          >
            Do catálogo
          </button>
          <button
            type="button"
            className={`chip${mode === 'manual' ? ' chip--on' : ''}`}
            onClick={() => onMode('manual')}
          >
            Item avulso
          </button>
        </div>

        {mode === 'catalog' ? (
          <>
            <ItemFilters
              value={filters}
              onChange={setFilters}
              levels={availableLevels(catalog)}
            />
            {visible.length === 0 ? <div className="empty">Nada encontrado.</div> : null}
            {visible.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                right={
                  <button
                    type="button"
                    className="btn btn--sm btn--primary"
                    onClick={() =>
                      dispatch({ type: 'GIVE_ITEM', playerId: player.id, itemId: item.id, qty: 1 })
                    }
                  >
                    Pegar
                  </button>
                }
              />
            ))}
          </>
        ) : (
          <>
            <p className="card__sub">
              O item avulso fica só na ficha de {player.name} — não entra no catálogo da mesa.
            </p>
            <ItemForm
              submitLabel="Adicionar à mochila"
              onSubmit={(item) => {
                dispatch({ type: 'ADD_CUSTOM_ITEM', playerId: player.id, item, qty: 1 })
                onClose()
              }}
            />
          </>
        )}
      </div>
    </Modal>
  )
}

/** Enviar item a outro personagem. */
function TransferSheet({ player, entry, onClose }) {
  const { state, dispatch } = useStore()
  const others = state.players.filter((other) => other.id !== player.id)
  const [targetId, setTargetId] = useState(others[0]?.id ?? '')
  const [qty, setQty] = useState(1)

  return (
    <Modal title={`Enviar ${entry.item.name}`} onClose={onClose}>
      <div className="stack">
        <label className="field">
          <span className="field__label">Para quem</span>
          <select
            className="select"
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
          >
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                {other.name}
              </option>
            ))}
          </select>
        </label>

        <div className="row">
          <span className="field__label" style={{ flex: 1 }}>
            Quantidade (tem {entry.qty})
          </span>
          <Stepper value={qty} min={1} max={entry.qty} onChange={setQty} />
        </div>

        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!targetId}
          onClick={() => {
            dispatch({
              type: 'TRANSFER_ITEM',
              fromId: player.id,
              toId: targetId,
              itemId: entry.item.id,
              qty,
            })
            onClose()
          }}
        >
          Enviar
        </button>
      </div>
    </Modal>
  )
}
