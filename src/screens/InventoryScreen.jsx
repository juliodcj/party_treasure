import { useEffect, useMemo, useRef, useState } from 'react'
import ItemRow from '../components/ItemRow.jsx'
import Sheet, { SheetActions } from '../components/Sheet.jsx'
import Stepper from '../components/Stepper.jsx'
import { Price } from '../components/Coins.jsx'
import ItemForm from '../components/ItemForm.jsx'
import { SearchBox } from '../components/ItemFilters.jsx'
import { EditIcon, MoreIcon, PlusIcon, TrashIcon } from '../components/Icons.jsx'
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
          <section className="list-group" key={id}>
            <h2 className="label list-group__title">{categoryLabel(id)}</h2>
            <div className="list-rows">
              {grouped[id].map(({ item, qty }) => (
                <InventoryItem
                  key={item.id}
                  player={player}
                  item={item}
                  qty={qty}
                  custom={isCustom(item.id)}
                  canSend={state.players.length > 1}
                  open={openId === item.id}
                  onToggle={() => onToggle(item.id)}
                  onDelete={() => setDeleting(item)}
                  onSell={() => setSelling({ item, qty: 1, owned: qty })}
                  onSend={() => setSending({ item, qty: 1, owned: qty })}
                  onEdit={() => setEditing(item)}
                />
              ))}
            </div>
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
          />
        </Sheet>
      ) : null}

      {selling ? (
        <Sheet center onClose={() => setSelling(null)}>
          <div className="sheet__question">
            Deseja vender {selling.qty}x {selling.item.name} por{' '}
            <Price totalCp={Math.floor(selling.item.priceCp * SELL_RATE) * selling.qty} size="sm" />?
          </div>
          <div className="sheet__center-row">
            <Stepper
              size="lg"
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

/**
 * Uma linha da mochila. Só "Excluir" fica à mostra; o resto (enviar, vender,
 * renomear, observação) espera atrás do "⋯".
 */
function InventoryItem({
  player,
  item,
  qty,
  custom,
  canSend,
  open,
  onToggle,
  onDelete,
  onSell,
  onSend,
  onEdit,
}) {
  const { dispatch } = useStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [noteOpen, setNoteOpen] = useState(false)
  const [draft, setDraft] = useState(item.name)
  const menuRef = useRef(null)

  const savedNote = player.itemNotes?.[item.id] ?? ''

  // Fechar o item recolhe o menu junto: reabrir sempre começa limpo.
  useEffect(() => {
    if (!open) {
      setMenuOpen(false)
      setRenaming(false)
      setNoteOpen(false)
    }
  }, [open])

  // Abrindo para baixo, o menu pode nascer fora da parte visível quando o
  // item está no pé da lista. "nearest" rola só o necessário para revelá-lo.
  useEffect(() => {
    if (menuOpen) menuRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [menuOpen])

  const rename = () => {
    const name = draft.trim()
    if (name && name !== item.name) {
      dispatch({ type: 'RENAME_ITEM', playerId: player.id, itemId: item.id, name })
    }
    setRenaming(false)
    setMenuOpen(false)
  }

  return (
    <ItemRow
      item={item}
      qty={qty}
      priceInBody
      open={open}
      onToggle={onToggle}
      hasNote={!!savedNote}
    >
      {/* Observação já escrita continua à vista; só o "+ Observação" some no menu. */}
      {savedNote || noteOpen ? (
        <ItemNote player={player} item={item} autoEdit={noteOpen && !savedNote} />
      ) : null}

      <div className="item__foot">
        <div className="item__tools">
          <button
            type="button"
            className="icon-btn icon-btn--accent"
            title="Excluir"
            aria-label={`Excluir ${item.name}`}
            onClick={onDelete}
          >
            <TrashIcon />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--accent"
            title="Mais ações"
            aria-label={`Mais ações de ${item.name}`}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((value) => !value)}
          >
            <MoreIcon />
          </button>
        </div>

        <Stepper
          value={qty}
          canDec={qty > 0}
          onDec={() =>
            dispatch({ type: 'CHANGE_ITEM_QTY', playerId: player.id, itemId: item.id, delta: -1 })
          }
          onInc={() =>
            dispatch({ type: 'CHANGE_ITEM_QTY', playerId: player.id, itemId: item.id, delta: 1 })
          }
        />
      </div>

      {/* Menu e renomear vêm depois do rodapé: abrem para baixo do "⋯" que os
          chamou, e não por cima dele. */}
      {menuOpen ? (
        <div
          className="item__menu"
          role="menu"
          aria-label={`Mais ações de ${item.name}`}
          ref={menuRef}
        >
          {qty > 0 && canSend ? (
            <button type="button" role="menuitem" className="item__menu-item" onClick={onSend}>
              Enviar
            </button>
          ) : null}
          {qty > 0 && !custom ? (
            <button type="button" role="menuitem" className="item__menu-item" onClick={onSell}>
              Vender
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="item__menu-item"
            onClick={() => {
              setDraft(item.name)
              setRenaming(true)
            }}
          >
            Renomear
          </button>
          {savedNote ? null : (
            <button
              type="button"
              role="menuitem"
              className="item__menu-item"
              onClick={() => {
                setNoteOpen(true)
                setMenuOpen(false)
              }}
            >
              Observação
            </button>
          )}
          {custom ? (
            <button type="button" role="menuitem" className="item__menu-item" onClick={onEdit}>
              Editar
            </button>
          ) : null}
        </div>
      ) : null}

      {renaming ? (
        <div className="item__rename">
          <input
            className="input input--sm"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') rename()
              if (event.key === 'Escape') setRenaming(false)
            }}
            aria-label={`Novo nome de ${item.name}`}
            autoFocus
          />
          <button type="button" className="btn btn--solid" disabled={!draft.trim()} onClick={rename}>
            Salvar
          </button>
          <button type="button" className="btn btn--neutral" onClick={() => setRenaming(false)}>
            Cancelar
          </button>
        </div>
      ) : null}
    </ItemRow>
  )
}

/** Observação do jogador sobre o item — pessoal, não viaja se o item for enviado. */
function ItemNote({ player, item, autoEdit = false }) {
  const { dispatch } = useStore()
  const saved = player.itemNotes?.[item.id] ?? ''
  const [editing, setEditing] = useState(autoEdit)
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
        className="textarea item-note__field"
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
        <EditIcon size={14} />
        {saved}
      </button>
    )
  }

  return (
    <button type="button" className="link item-note__add" onClick={() => setEditing(true)}>
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
          <div className="sheet__search">
            <SearchBox sunken value={search} onChange={setSearch} placeholder="Buscar na biblioteca..." />
          </div>
          <div className="gm__scroll">
            {rows.map((item) => (
              <div className="gm__row" key={item.id}>
                <div className="gm__grow">
                  <div className="gm__row-name">{item.name}</div>
                  <div className="gm__row-sub">
                    Nv {item.level} · <Price totalCp={item.priceCp} size="sm" />
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--tint"
                  onClick={() =>
                    dispatch({ type: 'GIVE_ITEM', playerId: player.id, itemId: item.id, qty: 1 })
                  }
                >
                  Adicionar
                </button>
              </div>
            ))}
            {rows.length === 0 ? (
              <div className="empty empty--inline">Nenhum item encontrado.</div>
            ) : null}
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
        className="input sheet__field"
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

      <div className="sheet__center-row">
        <Stepper
          size="lg"
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
