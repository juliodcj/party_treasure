import { useMemo, useState } from 'react'
import Sheet, { SheetActions } from '../components/Sheet.jsx'
import Stepper from '../components/Stepper.jsx'
import { CoinInputs } from '../components/ItemForm.jsx'
import { SearchBox, FilterSelects, EMPTY_FILTERS } from '../components/ItemFilters.jsx'
import { ChevronRight, EditIcon, TrashIcon } from '../components/Icons.jsx'
import EditWalletSheet from '../components/EditWalletSheet.jsx'
import ShopEditScreen from './ShopEditScreen.jsx'
import { useStore } from '../state/store.jsx'
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

export default function GmScreen() {
  // Uma única confirmação por vez, compartilhada entre jogadores e lojas.
  const [deleting, setDeleting] = useState(null) // { type: 'player' | 'shop', id, name }
  // undefined = fechada; null = criando loja nova; objeto = editando essa loja.
  const [shopEditor, setShopEditor] = useState(undefined)

  return (
    <div className="gm">
      <PlayersSection onRequestDelete={(id, name) => setDeleting({ type: 'player', id, name })} />
      <ShopsSection
        onRequestDelete={(id, name) => setDeleting({ type: 'shop', id, name })}
        onCreateShop={() => setShopEditor(null)}
        onEditShop={(shop) => setShopEditor(shop)}
      />

      {deleting ? (
        <DeleteConfirmSheet target={deleting} onClose={() => setDeleting(null)} />
      ) : null}

      {shopEditor !== undefined ? (
        <ShopEditScreen shop={shopEditor} onClose={() => setShopEditor(undefined)} />
      ) : null}
    </div>
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
        confirmVariant="danger"
      />
    </Sheet>
  )
}

/* --------------------------------------------------------------- jogadores */

function PlayersSection({ onRequestDelete }) {
  const { state, dispatch } = useStore()
  const [groupOpen, setGroupOpen] = useState(false)

  return (
    <section>
      <div className="gm__section-head">
        <h2 className="gm__section-title">Jogadores</h2>
        <button type="button" className="link" onClick={() => dispatch({ type: 'ADD_PLAYER' })}>
          + Novo jogador
        </button>
      </div>

      <div className="card card--folder" style={{ marginBottom: 8 }}>
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

      <div className="gm__list">
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
  const [search, setSearch] = useState('')
  const [drafts, setDrafts] = useState({})
  const [editingWallet, setEditingWallet] = useState(false)

  const catalog = useMemo(() => libraryItems(state), [state])
  const term = search.trim().toLowerCase()
  const rows = catalog.filter((item) => !term || item.name.toLowerCase().includes(term))
  const hasDraft = Object.values(drafts).some((qty) => qty > 0)

  const openPanel = (next) => {
    setPanel((current) => (current === next ? null : next))
    setDrafts({})
    setSearch('')
  }

  return (
    <div className="card card--folder">
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
          Dar moedas
        </button>
        <button type="button" className="btn btn--tint" onClick={() => openPanel('items')}>
          Dar item
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
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
              className="btn btn--neutral btn--block"
              onClick={() => setPanel(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--solid btn--block"
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
          <SearchBox
            sunken
            small
            value={search}
            onChange={setSearch}
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
              className="btn btn--neutral btn--block"
              onClick={() => setPanel(null)}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="btn btn--solid btn--block"
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
    <section>
      <div className="gm__section-head">
        <h2 className="gm__section-title">Lojas</h2>
        <button type="button" className="link" onClick={onCreateShop}>
          + Nova loja
        </button>
      </div>

      <div className="gm__list">
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
    <div className="card card--folder">
      <div className="gm__card-head">
        <div style={{ flex: 1, minWidth: 0 }}>
          <input
            className="inline-input"
            value={shop.name}
            onChange={(event) =>
              dispatch({ type: 'RENAME_SHOP', shopId: shop.id, name: event.target.value })
            }
            aria-label="Nome da loja"
          />
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
          className="icon-btn icon-btn--danger"
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
          <SearchBox
            sunken
            small
            value={filters.search}
            onChange={(search) => setFilters({ ...filters, search })}
          />
          <FilterSelects
            small
            value={filters}
            onChange={setFilters}
            levels={availableLevels(stocked)}
          />
          <div className="gm__scroll" style={{ maxHeight: 260, gap: 2 }}>
            {rows.map((item) => (
              <div className="gm__row" key={item.id}>
                <span className="gm__row-name">{item.name}</span>
                <span className="item__level">Nv {item.level}</span>
                <span className="gm__check-price">{formatCopper(item.priceCp)}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn--danger"
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
