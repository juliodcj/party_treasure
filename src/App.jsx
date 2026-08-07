import { useMemo, useState } from 'react'
import Header from './components/Header.jsx'
import SendMoneySheet from './components/SendMoneySheet.jsx'
import AdjustCoinsSheet from './components/AdjustCoinsSheet.jsx'
import EditWalletSheet from './components/EditWalletSheet.jsx'
import { SearchBox, FilterSelects, LevelPicker, EMPTY_FILTERS } from './components/ItemFilters.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import { BagIcon, BookIcon, ChevronDown, CrownIcon, ShopIcon } from './components/Icons.jsx'
import InventoryScreen from './screens/InventoryScreen.jsx'
import ShopScreen from './screens/ShopScreen.jsx'
import LibraryScreen from './screens/LibraryScreen.jsx'
import GmScreen from './screens/GmScreen.jsx'
import { useActivePlayer, useStore } from './state/store.jsx'
import { CATALOG } from './data/catalog.js'
import { availableLevels, playerInventory, resolveItem } from './lib/items.js'
import { plural } from './lib/text.js'

const TABS = [
  { id: 'inventory', label: 'Inventário', Icon: BagIcon },
  { id: 'shop', label: 'Loja', Icon: ShopIcon },
  { id: 'library', label: 'Biblioteca', Icon: BookIcon },
  { id: 'gm', label: 'Mestre', Icon: CrownIcon },
]

export default function App() {
  const { state, dispatch } = useStore()
  const player = useActivePlayer()

  const [tab, setTab] = useState('inventory')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  // Como no protótipo, só um item fica aberto de cada vez.
  const [openId, setOpenId] = useState(null)
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false)
  const [adjustCoinsOpen, setAdjustCoinsOpen] = useState(false)
  const [shopPickerOpen, setShopPickerOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editWalletOpen, setEditWalletOpen] = useState(false)

  const isInventory = tab === 'inventory'
  const isShop = tab === 'shop'
  const isLibrary = tab === 'library'
  const isCharacterTab = isInventory || isShop

  const shop = state.shops.find((current) => current.id === state.activeShopId) ?? state.shops[0]

  // O filtro de nível só mostra os níveis presentes na lista de cada aba —
  // uma loja com 6 itens não precisa dos 29 níveis do catálogo inteiro.
  const shopStock = useMemo(() => {
    if (!shop) return []
    return shop.itemIds.map((itemId) => resolveItem(state, itemId)).filter(Boolean)
  }, [state, shop])
  const inventoryEntries = useMemo(() => playerInventory(state, player), [state, player])
  const libraryLevels = useMemo(
    () => availableLevels([...state.campaignItems, ...CATALOG]),
    [state.campaignItems],
  )
  const levels = isShop
    ? availableLevels(shopStock)
    : isInventory
      ? availableLevels(inventoryEntries.map((entry) => entry.item))
      : libraryLevels

  const goTo = (next) => {
    setTab(next)
    setOpenId(null)
    setFilters(EMPTY_FILTERS)
    setShopPickerOpen(false)
  }

  const toggleItem = (id) => setOpenId((current) => (current === id ? null : id))

  // O botão só aparece quando há moedas soltas o bastante para valer a pena.
  const showSimplify = isInventory && (player.silver >= 10 || player.copper >= 10)

  const subhead = isShop
    ? `${plural(shop?.itemIds.length ?? 0, 'item disponível', 'itens disponíveis')}`
    : isLibrary
      ? `${state.campaignItems.length} da campanha · ${CATALOG.length} oficiais`
      : tab === 'gm'
        ? `${plural(state.players.length, 'jogador', 'jogadores')} · ${plural(state.shops.length, 'loja cadastrada', 'lojas cadastradas')}`
        : ''

  return (
    <div className="app">
      <Header
        title={TABS.find((current) => current.id === tab).label}
        player={isCharacterTab ? player : null}
        showAdjust={isInventory}
        showSend={isInventory && state.players.length > 1}
        showSettings={tab === 'gm'}
        onAdjust={() => setAdjustCoinsOpen(true)}
        onSend={() => setSendMoneyOpen(true)}
        onSettings={() => setSettingsOpen(true)}
        onEditWallet={() => setEditWalletOpen(true)}
      />

      {isShop && shop ? (
        <div className="shop-picker">
          <button
            type="button"
            className="shop-picker__button"
            onClick={() => setShopPickerOpen((value) => !value)}
            aria-expanded={shopPickerOpen}
          >
            {shop.name}
            <ChevronDown open={shopPickerOpen} />
          </button>
          {shopPickerOpen ? (
            <>
              <div className="shop-picker__scrim" onClick={() => setShopPickerOpen(false)} />
              <div className="shop-picker__menu">
                {state.shops.map((current) => (
                  <button
                    key={current.id}
                    type="button"
                    className={`shop-picker__option${current.id === shop.id ? ' shop-picker__option--on' : ''}`}
                    onClick={() => {
                      dispatch({ type: 'SELECT_SHOP', shopId: current.id })
                      setShopPickerOpen(false)
                      setOpenId(null)
                    }}
                  >
                    {current.name}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      <div className="subhead">
        <span className="subhead__label">{subhead}</span>
        {showSimplify ? (
          <button
            type="button"
            className="link link--muted"
            onClick={() => dispatch({ type: 'SIMPLIFY_COINS', playerId: player.id })}
          >
            Simplificar moedas
          </button>
        ) : null}
      </div>

      {isCharacterTab ? (
        <div className="chips" role="tablist" aria-label="Escolher personagem">
          {state.players.map((current) => (
            <button
              key={current.id}
              type="button"
              role="tab"
              aria-selected={current.id === player.id}
              className={`chip${current.id === player.id ? ' chip--on' : ''}`}
              onClick={() => {
                dispatch({ type: 'SELECT_PLAYER', playerId: current.id })
                setOpenId(null)
              }}
            >
              {current.name}
            </button>
          ))}
        </div>
      ) : null}

      {isCharacterTab ? (
        <div className="filters">
          <SearchBox
            value={filters.search}
            onChange={(search) => setFilters({ ...filters, search })}
          />
          <FilterSelects value={filters} onChange={setFilters} levels={levels} />
        </div>
      ) : null}

      {isLibrary ? (
        <div className="filters">
          <SearchBox
            value={filters.search}
            onChange={(search) => setFilters({ ...filters, search })}
          />
          <div className="filters__row">
            <LevelPicker
              levels={libraryLevels}
              value={filters.levels}
              onChange={(levels) => setFilters({ ...filters, levels })}
            />
          </div>
        </div>
      ) : null}

      <main className="app__scroll">
        {isInventory ? (
          <InventoryScreen player={player} filters={filters} openId={openId} onToggle={toggleItem} />
        ) : null}
        {isShop ? (
          <ShopScreen
            player={player}
            shop={shop}
            filters={filters}
            openId={openId}
            onToggle={toggleItem}
          />
        ) : null}
        {isLibrary ? (
          <LibraryScreen filters={filters} openId={openId} onToggle={toggleItem} />
        ) : null}
        {tab === 'gm' ? <GmScreen /> : null}
      </main>

      <nav className="nav" aria-label="Navegação principal">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`nav__tab${tab === id ? ' nav__tab--on' : ''}`}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => goTo(id)}
          >
            <Icon />
            <span className="nav__label">{label}</span>
          </button>
        ))}
      </nav>

      {sendMoneyOpen ? (
        <SendMoneySheet player={player} onClose={() => setSendMoneyOpen(false)} />
      ) : null}
      {adjustCoinsOpen ? (
        <AdjustCoinsSheet player={player} onClose={() => setAdjustCoinsOpen(false)} />
      ) : null}
      {settingsOpen ? <SettingsSheet onClose={() => setSettingsOpen(false)} /> : null}
      {editWalletOpen ? (
        <EditWalletSheet player={player} onClose={() => setEditWalletOpen(false)} />
      ) : null}
    </div>
  )
}
