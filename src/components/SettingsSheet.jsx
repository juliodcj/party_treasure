import Sheet from './Sheet.jsx'
import { CONTENT_CATEGORIES } from '../lib/sourceCategory.js'
import { useStore } from '../state/store.jsx'

/**
 * Configurações da mesa — hoje só o filtro de conteúdo, que vale pro app
 * inteiro (Loja, Inventário, Biblioteca, Mestre), não por aba.
 */
export default function SettingsSheet({ onClose }) {
  const { state, dispatch } = useStore()
  const { ownedCategories = [], remasterFilter = 'all' } = state.settings ?? {}

  const setSettings = (partial) => dispatch({ type: 'SET_SETTINGS', settings: partial })

  const toggleCategory = (id) => {
    setSettings({
      ownedCategories: ownedCategories.includes(id)
        ? ownedCategories.filter((current) => current !== id)
        : [...ownedCategories, id],
    })
  }

  return (
    <Sheet title="Configurações" onClose={onClose}>
      <div className="label">Filtrar conteúdo do catálogo</div>
      <div className="content-filter__chips">
        {CONTENT_CATEGORIES.map(({ id, label }) => (
          <button
            type="button"
            key={id}
            className={`chip${ownedCategories.includes(id) ? ' chip--on' : ''}`}
            onClick={() => toggleCategory(id)}
            aria-pressed={ownedCategories.includes(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="content-filter__hint">
        Nenhuma categoria marcada mostra tudo. Marcadas, só esse conteúdo aparece em Loja,
        Inventário, Biblioteca e Mestre.
      </div>

      <div className="label content-filter__rule">Regra</div>
      <div className="seg">
        {[
          ['all', 'Todas'],
          ['remaster', 'Remaster'],
          ['legacy', 'Legado'],
        ].map(([id, label]) => (
          <button
            type="button"
            key={id}
            className={`seg__tab${remasterFilter === id ? ' seg__tab--on' : ''}`}
            onClick={() => setSettings({ remasterFilter: id })}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="sheet__actions">
        <button type="button" className="btn btn--solid btn--block" onClick={onClose}>
          Pronto
        </button>
      </div>
    </Sheet>
  )
}
