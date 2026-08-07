import { useEffect, useMemo, useState } from 'react'
import ItemRow from '../components/ItemRow.jsx'
import Sheet, { SheetActions } from '../components/Sheet.jsx'
import Stepper from '../components/Stepper.jsx'
import ItemForm from '../components/ItemForm.jsx'
import { SearchBox } from '../components/ItemFilters.jsx'
import { EditIcon, PlusIcon, SellIcon, SendIcon, TrashIcon } from '../components/Icons.jsx'
import { useStore } from '../state/store.jsx'
import { CATEGORY_ORDER, categoryLabel } from '../data/catalog.js'
import {
  groupInventory,
  libraryItems,
  matchesContent,
  matchesFilters,
  matchesSearch,
  playerInventory,
} from '../lib/items.js'
import { formatCopper } from '../lib/money.js'
import { SELL_RATE } from '../config.js'

export default function InventoryScreen({ player, filters, openId, onToggle }) {
  const { state, dispatch } = useStore()
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [selling, setSelling] = useState(null)
  const [sending, setSending] = useState(null)
  const [editing, setEditing] = useState(null)

  const entries = useMemo(() => playerInventory(state, player), [state, player])
  const visible = entries.filter(
    ({ item }) =>
      matchesSearch(item, filters.search) &&
      matchesFilters(item, filters) &&
      matchesContent(item, state.settings),
  )
  const grouped = useMemo(() => groupInventory(visible), [visible])

  const isCustom = (itemId) => player.customItems.some((custom) => custom.id === itemId)
  const { ownedCategories = [], remasterFilter = 'all' } = state.settings ?? {}
  const filtersActive =
    !!filters.search.trim() ||
    filters.category !== 'all' ||
    filters.levels.length > 0 ||
    ownedCategories.length > 0 ||
    remasterFilter !== 'all'

  return (
    <>
      {visible.length === 0 ? (
        <div className="empty">
          {filtersActive
            ? 'Nenhum item encontrado.'
            : 'Sua mochila está vazia.\nAdicione itens na Loja.'}
        </div>
      ) : null}

      {CATEGORY_ORDER.map((id) =>
        grouped[id].length ? (
          <section key={id} style={{ display: 'contents' }}>
            <h2 className="group-title">{categoryLabel(id)}</h2>
            {grouped[id].map(({ item, qty }) => {
              const custom = isCustom(item.id)
              return (
                <ItemRow
                  key={item.id}
                  item={item}
                  qty={qty}
                  priceInBody
                  open={openId === item.id}
                  onToggle={() => onToggle(item.id)}
                  hasNote={!!player.itemNotes?.[item.id]}
                >
                  <ItemNote player={player} item={item} />
                  <div className="item__foot">
                    <div className="item__tools">
                      <button
                        type="button"
                        className="icon-btn icon-btn--danger"
                        title="Excluir"
                        aria-label={`Excluir ${item.name}`}
                        onClick={() => setDeleting(item)}
                      >
                        <TrashIcon />
                      </button>
                      {qty > 0 && !custom ? (
                        <button
                          type="button"
                          className="icon-btn icon-btn--accent"
                          title="Vender"
                          aria-label={`Vender ${item.name}`}
                          onClick={() => setSelling({ item, qty: 1, owned: qty })}
                        >
                          <SellIcon />
                        </button>
                      ) : null}
                      {qty > 0 && state.players.length > 1 ? (
                        <button
                          type="button"
                          className="icon-btn icon-btn--accent"
                          title="Enviar a outro personagem"
                          aria-label={`Enviar ${item.name}`}
                          onClick={() => setSending({ item, qty: 1, owned: qty })}
                        >
                          <SendIcon />
                        </button>
                      ) : null}
                      {custom ? (
                        <button
                          type="button"
                          className="icon-btn icon-btn--accent"
                          title="Editar"
                          aria-label={`Editar ${item.name}`}
                          onClick={() => setEditing(item)}
                        >
                          <EditIcon />
                        </button>
                      ) : null}
                    </div>

                    <Stepper
                      value={qty}
                      canDec={qty > 0}
                      onDec={() =>
                        dispatch({
                          type: 'CHANGE_ITEM_QTY',
                          playerId: player.id,
                          itemId: item.id,
                          delta: -1,
                        })
                      }
                      onInc={() =>
                        dispatch({
                          type: 'CHANGE_ITEM_QTY',
                          playerId: player.id,
                          itemId: item.id,
                          delta: 1,
                        })
                      }
                    />
                  </div>
                </ItemRow>
              )
            })}
          </section>
        ) : null,
      )}

      <button type="button" className="fab" onClick={() => setAdding(true)} aria-label="Adicionar item">
        <PlusIcon />
      </button>

      {adding ? <AddItemSheet player={player} onClose={() => setAdding(false)} /> : null}

      {deleting ? (
        <Sheet center onClose={() => setDeleting(null)}>
          <div className="sheet__question">Excluir {deleting.name} da mochila?</div>
          <SheetActions
            onCancel={() => setDeleting(null)}
            onConfirm={() => {
              dispatch({ type: 'DROP_ITEM', playerId: player.id, itemId: deleting.id })
              setDeleting(null)
            }}
            confirmLabel="Excluir"
            confirmVariant="danger"
          />
        </Sheet>
      ) : null}

      {selling ? (
        <Sheet center onClose={() => setSelling(null)}>
          <div className="sheet__question">
            Deseja vender {selling.qty}x {selling.item.name} por{' '}
            {formatCopper(Math.floor(selling.item.priceCp * SELL_RATE) * selling.qty)}?
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
            <Stepper
              size={34}
              gap={18}
              valueSize={18}
              value={selling.qty}
              canDec={selling.qty > 1}
              canInc={selling.qty < selling.owned}
              onDec={() => setSelling({ ...selling, qty: selling.qty - 1 })}
              onInc={() => setSelling({ ...selling, qty: selling.qty + 1 })}
            />
          </div>
          <SheetActions
            onCancel={() => setSelling(null)}
            onConfirm={() => {
              dispatch({
                type: 'SELL_ITEM',
                playerId: player.id,
                itemId: selling.item.id,
                qty: selling.qty,
              })
              setSelling(null)
            }}
          />
        </Sheet>
      ) : null}

      {sending ? (
        <SendItemSheet player={player} entry={sending} onClose={() => setSending(null)} />
      ) : null}

      {editing ? (
        <Sheet title="Editar item" onClose={() => setEditing(null)}>
          <ItemForm
            item={editing}
            submitLabel="Salvar"
            onCancel={() => setEditing(null)}
            onSubmit={(item) => {
              dispatch({ type: 'UPDATE_CUSTOM_ITEM', playerId: player.id, item })
              setEditing(null)
            }}
          />
        </Sheet>
      ) : null}
    </>
  )
}

/** Observação do jogador sobre o item — pessoal, não viaja se o item for enviado. */
function ItemNote({ player, item }) {
  const { dispatch } = useStore()
  const saved = player.itemNotes?.[item.id] ?? ''
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(saved)

  useEffect(() => {
    setDraft(saved)
  }, [saved])

  const save = () => {
    dispatch({ type: 'SET_ITEM_NOTE', playerId: player.id, itemId: item.id, note: draft })
    setEditing(false)
  }

  if (editing) {
    return (
      <textarea
        className="textarea"
        style={{ marginTop: 10, minHeight: 60 }}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        placeholder="Escreva uma observação..."
        aria-label={`Observação sobre ${item.name}`}
        autoFocus
      />
    )
  }

  if (saved) {
    return (
      <button type="button" className="item-note" onClick={() => setEditing(true)}>
        <EditIcon />
        {saved}
      </button>
    )
  }

  return (
    <button type="button" className="link" style={{ marginTop: 10 }} onClick={() => setEditing(true)}>
      + Observação
    </button>
  )
}

/** Folha "Adicionar item": cadastrar um avulso ou pegar da biblioteca. */
function AddItemSheet({ player, onClose }) {
  const { state, dispatch } = useStore()
  const [mode, setMode] = useState('manual')
  const [search, setSearch] = useState('')

  const term = search.trim().toLowerCase()
  const rows = libraryItems(state).filter(
    (item) => !term || item.name.toLowerCase().includes(term),
  )

  return (
    <Sheet onClose={onClose}>
      <div className="seg">
        <button
          type="button"
          className={`seg__tab${mode === 'manual' ? ' seg__tab--on' : ''}`}
          onClick={() => setMode('manual')}
        >
          Item manual
        </button>
        <button
          type="button"
          className={`seg__tab${mode === 'catalog' ? ' seg__tab--on' : ''}`}
          onClick={() => setMode('catalog')}
        >
          Biblioteca
        </button>
      </div>

      {mode === 'manual' ? (
        <ItemForm
          submitLabel="Adicionar à mochila"
          onCancel={onClose}
          onSubmit={(item) => {
            dispatch({ type: 'ADD_CUSTOM_ITEM', playerId: player.id, item, qty: 1 })
            onClose()
          }}
        />
      ) : (
        <>
          <div style={{ marginBottom: 10 }}>
            <SearchBox
              sunken
              small
              value={search}
              onChange={setSearch}
              placeholder="Buscar na biblioteca..."
            />
          </div>
          <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {rows.map((item) => (
              <div className="gm__row" key={item.id} style={{ padding: '6px 2px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5 }}>{item.name}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>
                    Nv {item.level} · {formatCopper(item.priceCp)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--solid"
                  style={{ fontSize: 11.5, padding: '6px 11px', borderRadius: 7 }}
                  onClick={() =>
                    dispatch({ type: 'GIVE_ITEM', playerId: player.id, itemId: item.id, qty: 1 })
                  }
                >
                  Adicionar
                </button>
              </div>
            ))}
            {rows.length === 0 ? <div className="empty">Nenhum item encontrado.</div> : null}
          </div>
        </>
      )}
    </Sheet>
  )
}

/** Enviar item a outro personagem. */
function SendItemSheet({ player, entry, onClose }) {
  const { state, dispatch } = useStore()
  const others = state.players.filter((other) => other.id !== player.id)
  const [targetId, setTargetId] = useState(others[0]?.id ?? '')
  const [qty, setQty] = useState(1)

  return (
    <Sheet center onClose={onClose}>
      <div className="sheet__question">Enviar {entry.item.name} para quem?</div>

      <select
        className="input"
        style={{ marginTop: 14 }}
        value={targetId}
        onChange={(event) => setTargetId(event.target.value)}
        aria-label="Para quem enviar"
      >
        {others.map((other) => (
          <option key={other.id} value={other.id}>
            {other.name}
          </option>
        ))}
      </select>

      <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
        <Stepper
          size={34}
          gap={18}
          valueSize={18}
          value={qty}
          canDec={qty > 1}
          canInc={qty < entry.owned}
          onDec={() => setQty(qty - 1)}
          onInc={() => setQty(qty + 1)}
        />
      </div>

      <SheetActions
        onCancel={onClose}
        onConfirm={() => {
          dispatch({
            type: 'TRANSFER_ITEM',
            fromId: player.id,
            toId: targetId,
            itemId: entry.item.id,
            qty,
          })
          onClose()
        }}
        confirmLabel="Enviar"
        disabled={!targetId}
      />
    </Sheet>
  )
}
