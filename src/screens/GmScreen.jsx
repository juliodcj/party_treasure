import { useMemo, useState } from 'react'
import ItemCard from '../components/ItemCard.jsx'
import ItemFilters, { EMPTY_FILTERS } from '../components/ItemFilters.jsx'
import Modal from '../components/Modal.jsx'
import { CoinBadges } from '../components/Coins.jsx'
import { useStore } from '../state/store.jsx'
import { availableLevels, libraryItems, matchesFilters, matchesSearch, resolveItem } from '../lib/items.js'
import { formatCopper, toCopper } from '../lib/money.js'
import { plural } from '../lib/text.js'

export default function GmScreen() {
  const { state } = useStore()
  const [tab, setTab] = useState('players')

  const partyCp = state.players.reduce((sum, player) => sum + toCopper(player), 0)

  return (
    <div className="stack">
      <div className="chips">
        <button
          type="button"
          className={`chip${tab === 'players' ? ' chip--on' : ''}`}
          onClick={() => setTab('players')}
        >
          Jogadores
        </button>
        <button
          type="button"
          className={`chip${tab === 'shops' ? ' chip--on' : ''}`}
          onClick={() => setTab('shops')}
        >
          Lojas
        </button>
      </div>

      {tab === 'players' ? (
        <>
          <div className="total-bar">
            Tesouro do grupo
            <span className="total-bar__value">{formatCopper(partyCp)}</span>
          </div>
          <PlayersPanel />
        </>
      ) : (
        <ShopsPanel />
      )}
    </div>
  )
}

/* --------------------------------------------------------------- jogadores */

function PlayersPanel() {
  const { state, dispatch } = useStore()
  const [giving, setGiving] = useState(null) // { playerIds, title }
  const [givingItem, setGivingItem] = useState(null) // playerId
  const [renaming, setRenaming] = useState(null)
  const [newName, setNewName] = useState('')

  return (
    <div className="stack">
      {state.players.map((player) => (
        <div key={player.id} className="stack" style={{ gap: 'var(--sp-2)' }}>
          <div className="gm-player">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="gm-player__name">{player.name}</div>
              <CoinBadges wallet={player} />
            </div>
            <span className="item__price">{formatCopper(toCopper(player))}</span>
          </div>
          <div className="row row--wrap">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setGiving({ playerIds: [player.id], title: `Dar moedas a ${player.name}` })}
            >
              Dar moedas
            </button>
            <button type="button" className="btn btn--sm" onClick={() => setGivingItem(player.id)}>
              Dar item
            </button>
            <button type="button" className="btn btn--sm" onClick={() => setRenaming(player)}>
              Renomear
            </button>
            <button
              type="button"
              className="btn btn--sm btn--danger"
              onClick={() => dispatch({ type: 'REMOVE_PLAYER', playerId: player.id })}
              disabled={state.players.length <= 1}
            >
              Remover
            </button>
          </div>
        </div>
      ))}

      <div className="row">
        <button
          type="button"
          className="btn btn--primary"
          style={{ flex: 1 }}
          onClick={() => setGiving({ playerIds: null, title: 'Dar moedas ao grupo' })}
        >
          Dar moedas ao grupo
        </button>
      </div>

      <div className="row">
        <input
          className="input"
          placeholder="Nome do novo personagem"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
        />
        <button
          type="button"
          className="btn"
          disabled={!newName.trim()}
          onClick={() => {
            dispatch({ type: 'ADD_PLAYER', name: newName })
            setNewName('')
          }}
        >
          Adicionar
        </button>
      </div>

      {giving ? (
        <GiveCoinsSheet
          title={giving.title}
          playerIds={giving.playerIds}
          onClose={() => setGiving(null)}
        />
      ) : null}

      {givingItem ? (
        <GiveItemSheet playerId={givingItem} onClose={() => setGivingItem(null)} />
      ) : null}

      {renaming ? (
        <RenameSheet
          player={renaming}
          onClose={() => setRenaming(null)}
          onSubmit={(name) => {
            dispatch({ type: 'RENAME_PLAYER', playerId: renaming.id, name })
            setRenaming(null)
          }}
        />
      ) : null}
    </div>
  )
}

/** `playerIds: null` significa o grupo todo. */
function GiveCoinsSheet({ title, playerIds, onClose }) {
  const { dispatch } = useStore()
  const [gold, setGold] = useState('')
  const [silver, setSilver] = useState('')
  const [copper, setCopper] = useState('')

  const coins = {
    gold: Number.parseInt(gold, 10) || 0,
    silver: Number.parseInt(silver, 10) || 0,
    copper: Number.parseInt(copper, 10) || 0,
  }
  const empty = !coins.gold && !coins.silver && !coins.copper

  return (
    <Modal title={title} onClose={onClose}>
      <div className="stack">
        <div className="field-row">
          <label className="field">
            <span className="field__label">Ouro</span>
            <input className="input" type="number" inputMode="numeric" min="0" value={gold} onChange={(e) => setGold(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Prata</span>
            <input className="input" type="number" inputMode="numeric" min="0" value={silver} onChange={(e) => setSilver(e.target.value)} />
          </label>
          <label className="field">
            <span className="field__label">Cobre</span>
            <input className="input" type="number" inputMode="numeric" min="0" value={copper} onChange={(e) => setCopper(e.target.value)} />
          </label>
        </div>

        {playerIds === null ? (
          <p className="card__sub">Cada personagem recebe essa quantia. Não é uma divisão.</p>
        ) : null}

        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={empty}
          onClick={() => {
            dispatch({ type: 'GIVE_COINS', playerIds, coins })
            onClose()
          }}
        >
          Entregar
        </button>
      </div>
    </Modal>
  )
}

function GiveItemSheet({ playerId, onClose }) {
  const { state, dispatch } = useStore()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const catalog = useMemo(() => libraryItems(state), [state])
  const visible = catalog.filter(
    (item) => matchesSearch(item, filters.search) && matchesFilters(item, filters),
  )
  const player = state.players.find((current) => current.id === playerId)

  return (
    <Modal title={`Dar item a ${player?.name ?? ''}`} onClose={onClose}>
      <div className="stack">
        <ItemFilters value={filters} onChange={setFilters} levels={availableLevels(catalog)} />
        {visible.length === 0 ? <div className="empty">Nada encontrado.</div> : null}
        {visible.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            right={
              <button
                type="button"
                className="btn btn--sm btn--primary"
                onClick={() => dispatch({ type: 'GIVE_ITEM', playerId, itemId: item.id, qty: 1 })}
              >
                Dar
              </button>
            }
          />
        ))}
      </div>
    </Modal>
  )
}

function RenameSheet({ player, onClose, onSubmit }) {
  const [name, setName] = useState(player.name)
  return (
    <Modal title="Renomear personagem" onClose={onClose}>
      <div className="stack">
        <label className="field">
          <span className="field__label">Nome</span>
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <button
          type="button"
          className="btn btn--primary btn--block"
          disabled={!name.trim()}
          onClick={() => onSubmit(name)}
        >
          Salvar
        </button>
      </div>
    </Modal>
  )
}

/* ------------------------------------------------------------------- lojas */

function ShopsPanel() {
  const { state, dispatch } = useStore()
  const [stocking, setStocking] = useState(null) // shopId
  const [newShop, setNewShop] = useState('')

  return (
    <div className="stack">
      {state.shops.map((shop) => (
        <div key={shop.id} className="stack" style={{ gap: 'var(--sp-2)' }}>
          <div className="gm-player">
            <div style={{ minWidth: 0, flex: 1 }}>
              <div className="gm-player__name">{shop.name}</div>
              <div className="card__sub">
                {plural(shop.itemIds.length, 'item', 'itens')} na prateleira
              </div>
            </div>
          </div>
          <div className="row row--wrap">
            <button type="button" className="btn btn--sm" onClick={() => setStocking(shop.id)}>
              Itens da loja
            </button>
            <button
              type="button"
              className="btn btn--sm btn--danger"
              onClick={() => dispatch({ type: 'REMOVE_SHOP', shopId: shop.id })}
            >
              Remover loja
            </button>
          </div>
        </div>
      ))}

      <div className="row">
        <input
          className="input"
          placeholder="Nome da nova loja"
          value={newShop}
          onChange={(event) => setNewShop(event.target.value)}
        />
        <button
          type="button"
          className="btn"
          disabled={!newShop.trim()}
          onClick={() => {
            dispatch({ type: 'ADD_SHOP', name: newShop })
            setNewShop('')
          }}
        >
          Criar
        </button>
      </div>

      {stocking ? <StockSheet shopId={stocking} onClose={() => setStocking(null)} /> : null}
    </div>
  )
}

/** Cadastrar e remover itens da prateleira de uma loja. */
function StockSheet({ shopId, onClose }) {
  const { state, dispatch } = useStore()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const shop = state.shops.find((current) => current.id === shopId)
  const catalog = useMemo(() => libraryItems(state), [state])

  const visible = catalog.filter(
    (item) => matchesSearch(item, filters.search) && matchesFilters(item, filters),
  )

  if (!shop) return null

  return (
    <Modal title={shop.name} onClose={onClose}>
      <div className="stack">
        <h3 className="section-title">Na prateleira ({shop.itemIds.length})</h3>
        {shop.itemIds.length === 0 ? (
          <div className="empty">Prateleira vazia.</div>
        ) : (
          shop.itemIds.map((itemId) => {
            const item = resolveItem(state, itemId)
            if (!item) return null
            return (
              <ItemCard
                key={itemId}
                item={item}
                right={
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => dispatch({ type: 'SHOP_REMOVE_ITEM', shopId, itemId })}
                  >
                    Tirar
                  </button>
                }
              />
            )
          })
        )}

        <h3 className="section-title">Adicionar da biblioteca</h3>
        <ItemFilters value={filters} onChange={setFilters} levels={availableLevels(catalog)} />
        {visible
          .filter((item) => !shop.itemIds.includes(item.id))
          .map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              right={
                <button
                  type="button"
                  className="btn btn--sm btn--primary"
                  onClick={() => dispatch({ type: 'SHOP_ADD_ITEM', shopId, itemId: item.id })}
                >
                  Pôr
                </button>
              }
            />
          ))}
      </div>
    </Modal>
  )
}
