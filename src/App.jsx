import { useMemo, useState } from 'react'
import AppHeader, { HeaderCount, WalletPill } from './components/AppHeader.jsx'
import SendMoneySheet from './components/SendMoneySheet.jsx'
import AdjustCoinsSheet from './components/AdjustCoinsSheet.jsx'
import EditWalletSheet from './components/EditWalletSheet.jsx'
import { SearchBox, FilterSelects, LevelPicker, EMPTY_FILTERS } from './components/ItemFilters.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import {
  BagIcon,
  BookIcon,
  ChevronDown,
  CrownIcon,
  FilterIcon,
  GearIcon,
  ShopIcon,
} from './components/Icons.jsx'
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

/**
 * Faixa de busca do cabeçalho: campo + funil que revela os filtros embaixo.
 * A Biblioteca só filtra por nível; as outras abas filtram tipo e nível.
 */
function FiltersBar({ filters, onChange, levels, open, onToggle, levelsOnly = false }) {
  return (
    <div className="filters">
      <div className="filters__row">
        <SearchBox value={filters.search} onChange={(search) => onChange({ ...filters, search })} />
        <button
          type="button"
          className={`filters__toggle${open ? ' filters__toggle--on' : ''}`}
          onClick={onToggle}
          aria-expanded={open}
          aria-label="Filtros"
          title="Filtros"
        >
          <FilterIcon color={open ? 'var(--accent-ink)' : 'var(--text-muted)'} />
        </button>
      </div>
      {open ? (
        levelsOnly ? (
          <div className="filters__row">
            <LevelPicker
              levels={levels}
              value={filters.levels}
              onChange={(next) => onChange({ ...filters, levels: next })}
            />
          </div>
        ) : (
          <FilterSelects value={filters} onChange={onChange} levels={levels} />
        )
      ) : null}
    </div>
  )
}

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
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editWalletOpen, setEditWalletOpen] = useState(false)

  const isInventory = tab === 'inventory'
  const isShop = tab === 'shop'
  const isLibrary = tab === 'library'
  const isGm = tab === 'gm'
  const isCharacterTab = isInventory || isShop
  // Só o Mestre não tem botão flutuante — as outras abas precisam do respiro
  // extra no fim da lista para o último item não ficar embaixo dele.
  const hasFab = !isGm

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
    setFiltersOpen(false)
  }

  const toggleItem = (id) => setOpenId((current) => (current === id ? null : id))

  const subhead = isLibrary
    ? `${state.campaignItems.length} da campanha · ${CATALOG.length} oficiais`
    : isGm
      ? `${plural(state.players.length, 'jogador', 'jogadores')} · ${plural(state.shops.length, 'loja cadastrada', 'lojas cadastradas')}`
      : ''

  return (
    <div className={`app${isCharacterTab ? ' app--switcher' : ''}`}>
      <AppHeader
        title={TABS.find((current) => current.id === tab).label}
        titleContent={
          isShop && shop ? (
            <>
              <button
                type="button"
                className="shop-picker__button shop-picker__button--title"
                onClick={() => setShopPickerOpen((value) => !value)}
                aria-expanded={shopPickerOpen}
              >
                <span className="shop-picker__title-text">{shop.name}</span>
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
            </>
          ) : null
        }
        actions={
          isGm ? (
            <button
              type="button"
              className="header-icon-btn"
              title="Configurações"
              aria-label="Configurações"
              onClick={() => setSettingsOpen(true)}
            >
              <GearIcon size={19} />
            </button>
          ) : null
        }
      >
        {isCharacterTab ? (
          <WalletPill
            player={player}
            showAdjust
            showSend={state.players.length > 1}
            onAdjust={() => setAdjustCoinsOpen(true)}
            onSend={() => setSendMoneyOpen(true)}
            onEditWallet={() => setEditWalletOpen(true)}
          />
        ) : null}

        {subhead ? <HeaderCount>{subhead}</HeaderCount> : null}

        {isGm ? null : (
          <FiltersBar
            filters={filters}
            onChange={setFilters}
            levels={isLibrary ? libraryLevels : levels}
            open={filtersOpen}
            onToggle={() => setFiltersOpen((value) => !value)}
            levelsOnly={isLibrary}
          />
        )}
      </AppHeader>

      <main className={`app__scroll${hasFab ? ' app__scroll--fab' : ''}`}>
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
        {isGm ? <GmScreen /> : null}
      </main>

      <div className="dock">
        {isCharacterTab ? (
          <div className="char-switcher" role="tablist" aria-label="Escolher personagem">
            {state.players.map((current) => (
              <button
                key={current.id}
                type="button"
                role="tab"
                aria-selected={current.id === player.id}
                className={`char-switcher__item${current.id === player.id ? ' char-switcher__item--on' : ''}`}
                onClick={() => {
                  dispatch({ type: 'SELECT_PLAYER', playerId: current.id })
                  setOpenId(null)
                }}
              >
                <span className="char-switcher__avatar" aria-hidden="true">
                  {current.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="char-switcher__name">{current.name.trim().split(' ')[0]}</span>
              </button>
            ))}
          </div>
        ) : null}

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
      </div>

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
