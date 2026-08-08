import { useMemo, useState } from 'react'
import Sheet, { SheetActions } from '../components/Sheet.jsx'
import Stepper from '../components/Stepper.jsx'
import { CoinInputs } from '../components/ItemForm.jsx'
import { EMPTY_FILTERS, FiltersBar } from '../components/ItemFilters.jsx'
import { ChevronRight, EditIcon, TrashIcon } from '../components/Icons.jsx'
import EditWalletSheet from '../components/EditWalletSheet.jsx'
import ShopEditScreen from './ShopEditScreen.jsx'
import { useStore } from '../state/store.jsx'
import { CATALOG } from '../data/catalog.js'
import {
  availableLevels,
  libraryItems,
  matchesContent,
  matchesFilters,
  matchesSearch,
  resolveItem,
} from '../lib/items.js'
import { formatCopper } from '../lib/money.js'
import { plural } from '../lib/text.js'

export default function GmScreen({ onOpenLibrary }) {
  // Uma única confirmação por vez, compartilhada entre jogadores e lojas.
  const [deleting, setDeleting] = useState(null) // { type: 'player' | 'shop', id, name }
  // undefined = fechada; null = criando loja nova; objeto = editando essa loja.
  const [shopEditor, setShopEditor] = useState(undefined)

  return (
    <div className="gm">
      <LibrarySection onOpen={onOpenLibrary} />
      <PlayersSection onRequestDelete={(id, name) => setDeleting({ type: 'player', id, name })} />
      <ShopsSection
        onRequestDelete={(id, name) => setDeleting({ type: 'shop', id, name })}
        onCreateShop={() => setShopEditor(null)}
        onEditShop={(shop) => setShopEditor(shop)}
      />
      <HistorySection />

      {deleting ? (
        <DeleteConfirmSheet target={deleting} onClose={() => setDeleting(null)} />
      ) : null}

      {shopEditor !== undefined ? (
        <ShopEditScreen shop={shopEditor} onClose={() => setShopEditor(undefined)} />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------- biblioteca */

/** Porta de entrada da Biblioteca, que deixou de ser aba e virou tela do Mestre. */
function LibrarySection({ onOpen }) {
  const { state } = useStore()

  return (
    <section className="list-group">
      <h2 className="list-group__title">Biblioteca</h2>

      <div className="list-rows">
        <button type="button" className="gm__card-head" onClick={onOpen}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="folder__name">Catálogo de itens</div>
            <div className="folder__count">
              {state.campaignItems.length} da campanha · {CATALOG.length} oficiais
            </div>
          </div>
          <ChevronRight />
        </button>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- histórico */

function formatHistoryTime(at) {
  return new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function HistorySection() {
  const { state, dispatch } = useStore()
  const [confirming, setConfirming] = useState(null) // { entryId, label, count }
  const [clearing, setClearing] = useState(false)

  const total = state.history.length
  const entries = [...state.history].reverse() // mais recente primeiro

  return (
    <section className="list-group">
      <h2 className="list-group__title">
        <span>Histórico</span>
        {total ? (
          <button type="button" className="link link--muted" onClick={() => setClearing(true)}>
            Limpar
          </button>
        ) : null}
      </h2>

      <div className="list-rows">
        {entries.length === 0 ? (
          <div className="empty" style={{ padding: '24px 16px' }}>
            Nenhuma alteração recente.
          </div>
        ) : (
          entries.map((entry, position) => {
            const originalIndex = total - 1 - position
            const count = total - originalIndex
            return (
              <div className="gm__row" key={entry.id} style={{ padding: '10px 16px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{entry.label}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', marginTop: 1 }}>
                    {formatHistoryTime(entry.at)}
                  </div>
                </div>
                <button
                  type="button"
                  className="btn btn--neutral"
                  style={{ fontSize: 12, padding: '6px 12px', flexShrink: 0 }}
                  onClick={() => setConfirming({ entryId: entry.id, label: entry.label, count })}
                >
                  Reverter
                </button>
              </div>
            )
          })
        )}
      </div>

      {confirming ? (
        <Sheet center onClose={() => setConfirming(null)}>
          <div className="sheet__question">
            {confirming.count === 1
              ? `Reverter "${confirming.label}"?`
              : `Reverter até "${confirming.label}"? Isso também desfaz as ${confirming.count - 1} alterações mais recentes depois dela.`}
          </div>
          <SheetActions
            onCancel={() => setConfirming(null)}
            onConfirm={() => {
              dispatch({ type: 'UNDO_TO', entryId: confirming.entryId })
              setConfirming(null)
            }}
            confirmLabel="Reverter"
            confirmVariant="danger"
          />
        </Sheet>
      ) : null}

      {clearing ? (
        <Sheet center onClose={() => setClearing(false)}>
          <div className="sheet__question">
            Limpar o histórico? Isso só apaga a lista — não desfaz nada que já foi feito.
          </div>
          <SheetActions
            onCancel={() => setClearing(false)}
            onConfirm={() => {
              dispatch({ type: 'CLEAR_HISTORY' })
              setClearing(false)
            }}
            confirmLabel="Limpar"
            confirmVariant="danger"
          />
        </Sheet>
      ) : null}
    </section>
  )
}

function DeleteConfirmSheet({ target, onClose }) {
  const { dispatch } = useStore()
  const isPlayer = target.type === 'player'

  return (
    <Sheet center onClose={onClose}>
      <div className="sheet__question">
        Excluir {isPlayer ? 'o jogador' : 'a loja'} {target.name}?
        {isPlayer ? ' O inventário e o dinheiro dele serão perdidos.' : ''}
      </div>
      <SheetActions
        onCancel={onClose}
        onConfirm={() => {
          dispatch({
            type: isPlayer ? 'REMOVE_PLAYER' : 'REMOVE_SHOP',
            ...(isPlayer ? { playerId: target.id } : { shopId: target.id }),
          })
          onClose()
        }}
        confirmLabel="Excluir"
      />
    </Sheet>
  )
}

/* --------------------------------------------------------------- jogadores */

function PlayersSection({ onRequestDelete }) {
  const { state, dispatch } = useStore()
  const [groupOpen, setGroupOpen] = useState(false)

  return (
    <section className="list-group">
      <h2 className="list-group__title">
        <span>Jogadores</span>
        <button type="button" className="link" onClick={() => dispatch({ type: 'ADD_PLAYER' })}>
          + Novo jogador
        </button>
      </h2>

      <div className="list-rows">
        <div>
          <div className="gm__card-head">
            <span style={{ flex: 1, fontSize: 13.5, color: 'var(--text-muted)' }}>
              Dar moedas ao grupo (dividido igualmente)
            </span>
            <button
              type="button"
              className="btn btn--solid"
              onClick={() => setGroupOpen((value) => !value)}
            >
              Distribuir
            </button>
          </div>
          {groupOpen ? <GroupGivePanel onDone={() => setGroupOpen(false)} /> : null}
        </div>

        {state.players.map((player) => (
          <PlayerCard
            key={player.id}
            player={player}
            canDelete={state.players.length > 1}
            onDelete={() => onRequestDelete(player.id, player.name)}
          />
        ))}
      </div>
    </section>
  )
}

function GroupGivePanel({ onDone }) {
  const { dispatch } = useStore()
  const [gold, setGold] = useState('')
  const [silver, setSilver] = useState('')
  const [copper, setCopper] = useState('')

  const coins = {
    gold: Number.parseInt(gold, 10) || 0,
    silver: Number.parseInt(silver, 10) || 0,
    copper: Number.parseInt(copper, 10) || 0,
  }

  return (
    <div className="gm__panel">
      <CoinInputs
        small
        gold={gold}
        silver={silver}
        copper={copper}
        onGold={setGold}
        onSilver={setSilver}
        onCopper={setCopper}
      />
      <button
        type="button"
        className="btn btn--solid btn--block"
        disabled={!coins.gold && !coins.silver && !coins.copper}
        onClick={() => {
          dispatch({ type: 'SPLIT_COINS', coins })
          onDone()
        }}
      >
        Distribuir
      </button>
    </div>
  )
}

function PlayerCard({ player, canDelete, onDelete }) {
  const { state, dispatch } = useStore()
  const [panel, setPanel] = useState(null) // 'coins' | 'items'
  const [gold, setGold] = useState('')
  const [silver, setSilver] = useState('')
  const [copper, setCopper] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [drafts, setDrafts] = useState({})
  const [editingWallet, setEditingWallet] = useState(false)

  const catalog = useMemo(() => libraryItems(state), [state])
  const rows = catalog.filter(
    (item) =>
      matchesSearch(item, filters.search) &&
      matchesFilters(item, filters) &&
      matchesContent(item, state.settings),
  )
  const hasDraft = Object.values(drafts).some((qty) => qty > 0)

  const openPanel = (next) => {
    setPanel((current) => (current === next ? null : next))
    setDrafts({})
    setFilters(EMPTY_FILTERS)
    setFiltersOpen(false)
  }

  return (
    <div>
      <div className="gm__card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="inline-input"
            value={player.name}
            onChange={(event) =>
              dispatch({ type: 'RENAME_PLAYER', playerId: player.id, name: event.target.value })
            }
            aria-label="Nome do personagem"
          />
          <button
            type="button"
            className="gm__coins"
            onClick={() => setEditingWallet(true)}
            aria-label={`Editar moedas de ${player.name}`}
          >
            {[
              ['gold', player.gold],
              ['silver', player.silver],
              ['copper', player.copper],
            ].map(([coin, value]) => (
              <span className="gm__coin" key={coin}>
                <span className="gm__coin-value">{value}</span>
                <span className={`coin-dot coin-dot--${coin}`} />
              </span>
            ))}
          </button>
        </div>
        <button type="button" className="btn btn--solid" onClick={() => openPanel('coins')}>
          Dinheiro
        </button>
        <button type="button" className="btn btn--tint" onClick={() => openPanel('items')}>
          Item
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--accent"
          title={canDelete ? 'Excluir jogador' : 'Precisa haver ao menos um jogador'}
          aria-label={`Excluir ${player.name}`}
          disabled={!canDelete}
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
      </div>

      {panel === 'coins' ? (
        <div className="gm__panel">
          <CoinInputs
            small
            gold={gold}
            silver={silver}
            copper={copper}
            onGold={setGold}
            onSilver={setSilver}
            onCopper={setCopper}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn--neutral btn--wide"
              onClick={() => setPanel(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--solid btn--wide"
              onClick={() => {
                dispatch({
                  type: 'GIVE_COINS',
                  playerId: player.id,
                  coins: {
                    gold: Number.parseInt(gold, 10) || 0,
                    silver: Number.parseInt(silver, 10) || 0,
                    copper: Number.parseInt(copper, 10) || 0,
                  },
                })
                setGold('')
                setSilver('')
                setCopper('')
                setPanel(null)
              }}
            >
              Dar
            </button>
          </div>
        </div>
      ) : null}

      {panel === 'items' ? (
        <div className="gm__panel">
          <FiltersBar
            small
            filters={filters}
            onChange={setFilters}
            levels={availableLevels(catalog)}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((value) => !value)}
            placeholder="Buscar item para dar..."
          />
          <div className="gm__scroll">
            {rows.map((item) => {
              const qty = drafts[item.id] ?? 0
              return (
                <div className="gm__row" key={item.id}>
                  <span className="gm__row-name">{item.name}</span>
                  <span className="item__level">Nv {item.level}</span>
                  <Stepper
                    size={22}
                    value={qty}
                    canDec={qty > 0}
                    onDec={() => setDrafts({ ...drafts, [item.id]: qty - 1 })}
                    onInc={() => setDrafts({ ...drafts, [item.id]: qty + 1 })}
                  />
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              className="btn btn--neutral btn--wide"
              onClick={() => setPanel(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--solid btn--wide"
              disabled={!hasDraft}
              onClick={() => {
                for (const [itemId, qty] of Object.entries(drafts)) {
                  if (qty > 0) dispatch({ type: 'GIVE_ITEM', playerId: player.id, itemId, qty })
                }
                setDrafts({})
                setPanel(null)
              }}
            >
              Finalizar
            </button>
          </div>
        </div>
      ) : null}

      {editingWallet ? (
        <EditWalletSheet player={player} onClose={() => setEditingWallet(false)} />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------- lojas */

function ShopsSection({ onRequestDelete, onCreateShop, onEditShop }) {
  const { state } = useStore()
  const [openId, setOpenId] = useState(null)

  return (
    <section className="list-group">
      <h2 className="list-group__title">
        <span>Lojas</span>
        <button type="button" className="link" onClick={onCreateShop}>
          + Nova loja
        </button>
      </h2>

      <div className="list-rows">
        {state.shops.map((shop) => (
          <ShopCard
            key={shop.id}
            shop={shop}
            isOpen={openId === shop.id}
            onToggle={() => setOpenId(openId === shop.id ? null : shop.id)}
            onDelete={() => onRequestDelete(shop.id, shop.name)}
            onEdit={() => onEditShop(shop)}
          />
        ))}
      </div>
    </section>
  )
}

function ShopCard({ shop, isOpen, onToggle, onDelete, onEdit }) {
  const { state, dispatch } = useStore()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [filtersOpen, setFiltersOpen] = useState(false)

  // Aqui dentro só interessa o que já está na prateleira — o catálogo
  // inteiro para marcar/desmarcar vive na tela cheia de edição.
  const stocked = useMemo(
    () => shop.itemIds.map((itemId) => resolveItem(state, itemId)).filter(Boolean),
    [state, shop.itemIds],
  )
  const rows = stocked.filter(
    (item) =>
      matchesSearch(item, filters.search) &&
      matchesFilters(item, filters) &&
      matchesContent(item, state.settings),
  )

  return (
    <div>
      <div className="gm__card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <button type="button" className="inline-input" onClick={onToggle} aria-expanded={isOpen}>
            {shop.name}
          </button>
          <div className="folder__count">
            {plural(shop.itemIds.length, 'item cadastrado', 'itens cadastrados')}
          </div>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn--accent"
          title="Editar loja"
          aria-label={`Editar ${shop.name}`}
          onClick={onEdit}
        >
          <EditIcon />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--accent"
          title="Excluir loja"
          aria-label={`Excluir ${shop.name}`}
          onClick={onDelete}
        >
          <TrashIcon />
        </button>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={`${isOpen ? 'Fechar' : 'Abrir'} itens de ${shop.name}`}
        >
          <ChevronRight open={isOpen} />
        </button>
      </div>

      {isOpen ? (
        <div className="gm__panel">
          <FiltersBar
            small
            filters={filters}
            onChange={setFilters}
            levels={availableLevels(stocked)}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((value) => !value)}
          />
          <div className="gm__scroll" style={{ maxHeight: 260, gap: 2 }}>
            {rows.map((item) => (
              <div className="gm__row" key={item.id}>
                <span className="gm__row-name">{item.name}</span>
                <span className="item__level">Nv {item.level}</span>
                <span className="gm__check-price">{formatCopper(item.priceCp)}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn--accent"
                  style={{ width: 24, height: 24 }}
                  title="Remover da loja"
                  aria-label={`Remover ${item.name} da loja`}
                  onClick={() =>
                    dispatch({ type: 'TOGGLE_SHOP_ITEM', shopId: shop.id, itemId: item.id })
                  }
                >
                  <TrashIcon />
                </button>
              </div>
            ))}
            {rows.length === 0 ? (
              <div className="empty">
                {stocked.length === 0 ? 'Nenhum item cadastrado.' : 'Nenhum item encontrado.'}
              </div>
            ) : null}
          </div>
          <button type="button" className="btn btn--solid btn--block" onClick={onEdit}>
            Editar loja
          </button>
        </div>
      ) : null}
    </div>
  )
}
