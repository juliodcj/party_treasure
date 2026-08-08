import { useMemo, useState } from 'react'
import Sheet, { SheetActions } from '../components/Sheet.jsx'
import Stepper from '../components/Stepper.jsx'
import Coins from '../components/Coins.jsx'
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

/* Quais seções ficam abertas. Mora fora do componente porque a aba Mestre é
   desmontada ao trocar de aba: guardado só no estado do React, fechar o
   Histórico duraria até a primeira passada no Inventário. Também não vai para
   o localStorage — é preferência da sessão, não dado da mesa, e tudo que entra
   no store passa pelo histórico de "Reverter". */
let openSections = { players: true, shops: true, history: true }

/**
 * Faixa de título que abre e fecha. A ação da direita ("+ Novo jogador",
 * "Limpar") fica fora do botão de propósito — ver o comentário do CSS.
 */
function SectionHead({ title, count, open, onToggle, action = null }) {
  return (
    <h2 className="label list-group__title">
      <button
        type="button"
        className="list-group__toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${open ? 'Fechar' : 'Abrir'} ${title}`}
      >
        <ChevronRight open={open} />
        <span>{title}</span>
        {count != null ? <span className="list-group__count">{count}</span> : null}
      </button>
      {action}
    </h2>
  )
}

export default function GmScreen({ onOpenLibrary }) {
  // Uma única confirmação por vez, compartilhada entre jogadores e lojas.
  const [deleting, setDeleting] = useState(null) // { type: 'player' | 'shop', id, name }
  // undefined = fechada; null = criando loja nova; objeto = editando essa loja.
  const [shopEditor, setShopEditor] = useState(undefined)
  const [sections, setSections] = useState(openSections)

  // Espelha no módulo o que o React acabou de guardar, para a escolha
  // atravessar a troca de aba.
  const setSection = (id, value) => {
    setSections((current) => {
      openSections = { ...current, [id]: value }
      return openSections
    })
  }

  return (
    <div className="gm">
      <LibrarySection onOpen={onOpenLibrary} />
      <PlayersSection
        open={sections.players}
        onOpenChange={(value) => setSection('players', value)}
        onRequestDelete={(id, name) => setDeleting({ type: 'player', id, name })}
      />
      <ShopsSection
        open={sections.shops}
        onOpenChange={(value) => setSection('shops', value)}
        onRequestDelete={(id, name) => setDeleting({ type: 'shop', id, name })}
        onCreateShop={() => setShopEditor(null)}
        onEditShop={(shop) => setShopEditor(shop)}
      />
      <HistorySection
        open={sections.history}
        onOpenChange={(value) => setSection('history', value)}
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

/* ------------------------------------------------------------- biblioteca */

/** Porta de entrada da Biblioteca, que deixou de ser aba e virou tela do Mestre. */
function LibrarySection({ onOpen }) {
  const { state } = useStore()

  return (
    <section className="list-group">
      <h2 className="label list-group__title">Biblioteca</h2>

      <div className="list-rows">
        <button type="button" className="gm__card-head" onClick={onOpen}>
          <div className="gm__grow">
            <div className="folder__name">Catálogo de itens</div>
            <div className="folder__count">
              {state.campaignItems.length} da campanha · {CATALOG.length} oficiais
            </div>
          </div>
          <span className="icon-btn icon-btn--ghost">
            <ChevronRight />
          </span>
        </button>
      </div>
    </section>
  )
}

/* -------------------------------------------------------------- histórico */

function formatHistoryTime(at) {
  return new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function HistorySection({ open, onOpenChange }) {
  const { state, dispatch } = useStore()
  const [confirming, setConfirming] = useState(null) // { entryId, label, count }
  const [clearing, setClearing] = useState(false)

  const total = state.history.length
  const entries = [...state.history].reverse() // mais recente primeiro

  return (
    <section className="list-group">
      <SectionHead
        title="Histórico"
        count={total}
        open={open}
        onToggle={() => onOpenChange(!open)}
        action={
          total ? (
            <button type="button" className="link link--muted" onClick={() => setClearing(true)}>
              Limpar
            </button>
          ) : null
        }
      />

      {open ? (
        <div className="list-rows">
          {entries.length === 0 ? (
            <div className="empty empty--inline">Nenhuma alteração recente.</div>
          ) : (
            entries.map((entry, position) => {
              const originalIndex = total - 1 - position
              const count = total - originalIndex
              return (
                <div className="gm__row gm__row--list" key={entry.id}>
                  <div className="gm__grow">
                    <div className="gm__row-name">{entry.label}</div>
                    <div className="gm__row-sub">{formatHistoryTime(entry.at)}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn--neutral"
                    onClick={() => setConfirming({ entryId: entry.id, label: entry.label, count })}
                  >
                    Reverter
                  </button>
                </div>
              )
            })
          )}
        </div>
      ) : null}

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

function PlayersSection({ open, onOpenChange, onRequestDelete }) {
  const { state, dispatch } = useStore()
  const [groupOpen, setGroupOpen] = useState(false)

  return (
    <section className="list-group">
      <SectionHead
        title="Jogadores"
        count={state.players.length}
        open={open}
        onToggle={() => onOpenChange(!open)}
        action={
          <button
            type="button"
            className="link"
            onClick={() => {
              // Criar com a seção fechada esconderia o jogador recém-criado.
              onOpenChange(true)
              dispatch({ type: 'ADD_PLAYER' })
            }}
          >
            + Novo jogador
          </button>
        }
      />

      {open ? (
        <div className="list-rows">
          <div>
            <div className="gm__card-head">
              <span className="gm__hint">Dar moedas ao grupo (dividido igualmente)</span>
              <button
                type="button"
                className="btn btn--tint"
                aria-expanded={groupOpen}
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
      ) : null}
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
        <div className="gm__grow">
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
            className="gm__wallet-btn"
            onClick={() => setEditingWallet(true)}
            aria-label={`Editar moedas de ${player.name}`}
          >
            <Coins
              gold={player.gold}
              silver={player.silver}
              copper={player.copper}
              size="sm"
              showZeros
            />
          </button>
        </div>
        {/* "Dinheiro" e "Item" são ações irmãs: mesmo peso. O azul cheio fica
            para quem fecha um fluxo, não para quem abre um painel. */}
        <button
          type="button"
          className="btn btn--tint"
          aria-expanded={panel === 'coins'}
          onClick={() => openPanel('coins')}
        >
          Dinheiro
        </button>
        <button
          type="button"
          className="btn btn--tint"
          aria-expanded={panel === 'items'}
          onClick={() => openPanel('items')}
        >
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
          <SheetActions
            onCancel={() => setPanel(null)}
            confirmLabel="Dar"
            onConfirm={() => {
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
          />
        </div>
      ) : null}

      {panel === 'items' ? (
        <div className="gm__panel">
          <FiltersBar
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
                    value={qty}
                    canDec={qty > 0}
                    onDec={() => setDrafts({ ...drafts, [item.id]: qty - 1 })}
                    onInc={() => setDrafts({ ...drafts, [item.id]: qty + 1 })}
                    label={`${item.name} para dar`}
                  />
                </div>
              )
            })}
            {rows.length === 0 ? (
              <div className="empty empty--inline">Nenhum item encontrado.</div>
            ) : null}
          </div>
          <SheetActions
            onCancel={() => setPanel(null)}
            confirmLabel="Finalizar"
            disabled={!hasDraft}
            onConfirm={() => {
              for (const [itemId, qty] of Object.entries(drafts)) {
                if (qty > 0) dispatch({ type: 'GIVE_ITEM', playerId: player.id, itemId, qty })
              }
              setDrafts({})
              setPanel(null)
            }}
          />
        </div>
      ) : null}

      {editingWallet ? (
        <EditWalletSheet player={player} onClose={() => setEditingWallet(false)} />
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------- lojas */

function ShopsSection({ open, onOpenChange, onRequestDelete, onCreateShop, onEditShop }) {
  const { state } = useStore()
  const [openId, setOpenId] = useState(null)

  return (
    <section className="list-group">
      <SectionHead
        title="Lojas"
        count={state.shops.length}
        open={open}
        onToggle={() => onOpenChange(!open)}
        action={
          <button
            type="button"
            className="link"
            onClick={() => {
              // A loja nova aparece aqui depois de salva: a seção precisa estar
              // aberta para o mestre ver o que acabou de criar.
              onOpenChange(true)
              onCreateShop()
            }}
          >
            + Nova loja
          </button>
        }
      />

      {open ? (
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
      ) : null}
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
        <div className="gm__grow">
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
          className="icon-btn icon-btn--ghost"
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
            filters={filters}
            onChange={setFilters}
            levels={availableLevels(stocked)}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((value) => !value)}
          />
          <div className="gm__scroll">
            {rows.map((item) => (
              <div className="gm__row" key={item.id}>
                <span className="gm__row-name">{item.name}</span>
                <span className="item__level">Nv {item.level}</span>
                <span className="gm__check-price">{formatCopper(item.priceCp)}</span>
                <button
                  type="button"
                  className="icon-btn icon-btn--accent"
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
              <div className="empty empty--inline">
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
