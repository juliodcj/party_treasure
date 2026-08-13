import { useMemo, useState } from 'react'
import AppHeader, { HeaderCount, WalletPill } from './components/AppHeader.jsx'
import CharacterPicker, { initialOf } from './components/CharacterPicker.jsx'
import SendMoneySheet from './components/SendMoneySheet.jsx'
import AdjustCoinsSheet from './components/AdjustCoinsSheet.jsx'
import EditWalletSheet from './components/EditWalletSheet.jsx'
import { EMPTY_FILTERS, FiltersBar } from './components/ItemFilters.jsx'
import SettingsSheet from './components/SettingsSheet.jsx'
import ConnectionBanner from './components/ConnectionBanner.jsx'
import { BagIcon, ChevronDown, CrownIcon, GearIcon, SheetIcon, ShopIcon } from './components/Icons.jsx'
import InventoryScreen from './screens/InventoryScreen.jsx'
import CharacterSheetScreen from './screens/CharacterSheet/index.jsx'
import ShopScreen from './screens/ShopScreen.jsx'
import LibraryScreen from './screens/LibraryScreen.jsx'
import GmScreen from './screens/GmScreen.jsx'
import { useActivePlayer, useStore } from './state/store.jsx'
import { CATALOG } from './data/catalog.js'
import { availableLevels, matchesContent, playerInventory, resolveItem } from './lib/items.js'
import { plural } from './lib/text.js'

/* Abas da barra de baixo. O primeiro botão da barra é o seletor de
   personagem, que não é aba nenhuma — abre a folha de troca. */
const TABS = [
  { id: 'inventory', label: 'Inventário', Icon: BagIcon },
  { id: 'sheet', label: 'Ficha', Icon: SheetIcon },
  { id: 'shop', label: 'Loja', Icon: ShopIcon },
  { id: 'gm', label: 'Mestre', Icon: CrownIcon },
]

/* A Biblioteca não é aba: é uma tela filha do Mestre, com o mesmo cabeçalho
   das outras e um botão de voltar. Daí o título vir daqui e não das abas. */
const TITLES = {
  inventory: 'Inventário',
  sheet: 'Ficha',
  shop: 'Loja',
  gm: 'Mestre',
  library: 'Biblioteca',
}

export default function App() {
  const { state, dispatch, ready } = useStore()
  const player = useActivePlayer()

  const [tab, setTab] = useState('inventory')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  // Como no protótipo, só um item fica aberto de cada vez.
  const [openId, setOpenId] = useState(null)
  const [sendMoneyOpen, setSendMoneyOpen] = useState(false)
  const [adjustCoinsOpen, setAdjustCoinsOpen] = useState(false)
  const [shopPickerOpen, setShopPickerOpen] = useState(false)
  const [charPickerOpen, setCharPickerOpen] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editWalletOpen, setEditWalletOpen] = useState(false)

  const isInventory = tab === 'inventory'
  const isSheet = tab === 'sheet'
  const isShop = tab === 'shop'
  const isLibrary = tab === 'library'
  const isGm = tab === 'gm'
  const isCharacterTab = isInventory || isShop
  // A Biblioteca é filha do Mestre: a aba Mestre segue acesa lá dentro.
  const inGmSection = isGm || isLibrary
  // Só o Mestre não tem botão flutuante — as outras telas precisam do respiro
  // extra no fim da lista para o último item não ficar embaixo dele.
  // A Ficha também não tem botão flutuante.
  const hasFab = !isGm && !isSheet

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
  // A contagem some do "X oficiais" no cabeçalho e no botão do Mestre —
  // precisa refletir o mesmo filtro de conteúdo que a lista de verdade usa,
  // senão o número não bate com o que a Biblioteca mostra.
  const officialCount = useMemo(
    () => CATALOG.filter((item) => matchesContent(item, state.settings)).length,
    [state.settings],
  )
  const campaignCount = useMemo(
    () => state.campaignItems.filter((item) => matchesContent(item, state.settings)).length,
    [state.campaignItems, state.settings],
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
    setCharPickerOpen(false)
    setFiltersOpen(false)
  }

  const toggleItem = (id) => setOpenId((current) => (current === id ? null : id))

  const subhead = isLibrary
    ? `${campaignCount} da campanha · ${officialCount} oficiais`
    : isGm
      ? `${plural(state.players.length, 'jogador', 'jogadores')} · ${plural(state.shops.length, 'loja cadastrada', 'lojas cadastradas')}`
      : ''

  // Antes da primeira resposta do servidor não há mesa nenhuma para desenhar —
  // e sem personagem em foco metade da tela quebraria. O aviso explica o que
  // está acontecendo e some sozinho quando a mesa chega.
  if (!ready || !player) {
    return (
      <div className="app">
        <ConnectionBanner />
        <div className="empty">
          Procurando a mesa…{'\n'}O PC do mestre precisa estar ligado e no mesmo Wi-Fi.
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <ConnectionBanner />
      <AppHeader
        title={TITLES[tab]}
        onBack={isLibrary ? () => goTo('gm') : null}
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
            onSimplify={() => dispatch({ type: 'SIMPLIFY_COINS', playerId: player.id })}
          />
        ) : null}

        {subhead ? <HeaderCount>{subhead}</HeaderCount> : null}

        {isGm || isSheet ? null : (
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
        {isSheet ? <CharacterSheetScreen player={player} /> : null}
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
        {isGm ? <GmScreen onOpenLibrary={() => goTo('library')} /> : null}
      </main>

      <div className="dock">
        <nav className="nav" aria-label="Navegação principal">
          {/* Primeiro botão: quem está jogando. Não é aba — abre a troca. O
              traço à direita separa "quem" (o personagem) de "onde" (as
              três abas de tela), que são categorias diferentes de botão. */}
          <button
            type="button"
            className={`nav__tab nav__tab--char${charPickerOpen ? ' nav__tab--on' : ''}`}
            aria-haspopup="dialog"
            aria-expanded={charPickerOpen}
            aria-label={`Personagem: ${player.name}. Trocar de personagem`}
            onClick={() => setCharPickerOpen(true)}
          >
            <span className="nav__avatar" aria-hidden="true">
              {initialOf(player.name)}
            </span>
            <span className="nav__label">{player.name.trim().split(' ')[0]}</span>
          </button>

          {TABS.map(({ id, label, Icon }) => {
            const on = id === 'gm' ? inGmSection : tab === id
            return (
              <button
                key={id}
                type="button"
                className={`nav__tab${on ? ' nav__tab--on' : ''}`}
                aria-current={on ? 'page' : undefined}
                onClick={() => goTo(id)}
              >
                <span className="nav__icon">
                  <Icon />
                </span>
                <span className="nav__label">{label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {charPickerOpen ? (
        <CharacterPicker
          activeId={player.id}
          onClose={() => {
            setCharPickerOpen(false)
            setOpenId(null)
          }}
        />
      ) : null}
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
