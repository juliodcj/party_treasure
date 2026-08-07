import { useState } from 'react'
import Header from './components/Header.jsx'
import InventoryScreen from './screens/InventoryScreen.jsx'
import ShopScreen from './screens/ShopScreen.jsx'
import LibraryScreen from './screens/LibraryScreen.jsx'
import GmScreen from './screens/GmScreen.jsx'
import { useActivePlayer, useStore } from './state/store.jsx'

const TABS = [
  { id: 'inventory', label: 'Inventário', icon: '🎒' },
  { id: 'shop', label: 'Loja', icon: '⚖️' },
  { id: 'library', label: 'Biblioteca', icon: '📖' },
  { id: 'gm', label: 'Mestre', icon: '🎲' },
]

export default function App() {
  const { state } = useStore()
  const [tab, setTab] = useState('inventory')
  const player = useActivePlayer()

  // Só as telas de personagem mostram carteira no cabeçalho.
  const showsWallet = tab === 'inventory' || tab === 'shop'

  return (
    <div className="app">
      <Header
        title={showsWallet ? player.name : TABS.find((current) => current.id === tab).label}
        subtitle={showsWallet ? 'Personagem' : 'Tesouro do Grupo'}
        player={showsWallet ? player : null}
      />

      <main className="app__content">
        {tab === 'inventory' ? <InventoryScreen player={player} /> : null}
        {tab === 'shop' ? <ShopScreen player={player} /> : null}
        {tab === 'library' ? <LibraryScreen /> : null}
        {tab === 'gm' ? <GmScreen /> : null}
      </main>

      <nav className="nav" aria-label="Navegação principal">
        {TABS.map((current) => (
          <button
            key={current.id}
            type="button"
            className={`nav__tab${tab === current.id ? ' nav__tab--on' : ''}`}
            aria-current={tab === current.id ? 'page' : undefined}
            onClick={() => setTab(current.id)}
          >
            <span className="nav__icon" aria-hidden="true">
              {current.icon}
            </span>
            {current.label}
          </button>
        ))}
      </nav>

      {/* Sem jogadores o app não tem o que mostrar; o estado semente evita isso. */}
      {state.players.length === 0 ? <div className="empty">Nenhum personagem na mesa.</div> : null}
    </div>
  )
}
