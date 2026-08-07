import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { SearchIcon, TuneIcon } from './Icons.jsx'
import { CATEGORIES } from '../data/catalog.js'
import { CONTENT_CATEGORIES } from '../lib/sourceCategory.js'
import { useStore } from '../state/store.jsx'

/** Caixa de busca com a lupa dentro, como no protótipo. */
export function SearchBox({ value, onChange, placeholder = 'Buscar item...', sunken = false, small = false }) {
  return (
    <div className={`search${sunken ? ' search--sunken' : ''}`}>
      <SearchIcon size={small ? 14 : 15} />
      <input
        className="search__input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </div>
  )
}

/** Botão que abre um popover de checkboxes — só os níveis presentes na lista atual. */
export function LevelPicker({ levels = [], value = [], onChange, small = false }) {
  const [open, setOpen] = useState(false)

  const label =
    value.length === 0 ? 'Todos os níveis' : value.length === 1 ? `Nível ${value[0]}` : `${value.length} níveis`

  const toggle = (level) => {
    onChange(value.includes(level) ? value.filter((current) => current !== level) : [...value, level].sort((a, b) => a - b))
  }

  return (
    <div className="level-picker">
      <button
        type="button"
        className={`select${small ? ' select--sm' : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        {label}
      </button>
      {open ? (
        <>
          <div className="level-picker__scrim" onClick={() => setOpen(false)} />
          <div className="level-picker__menu">
            <div className="level-picker__head">
              <button type="button" className="link link--muted" onClick={() => onChange([])}>
                Todos
              </button>
              <button type="button" className="link" onClick={() => setOpen(false)}>
                Fechar
              </button>
            </div>
            {levels.length === 0 ? (
              <div className="level-picker__empty">Nenhum item na lista.</div>
            ) : (
              <div className="level-picker__grid">
                {levels.map((level) => (
                  <button
                    type="button"
                    key={level}
                    className={`chip chip--sm${value.includes(level) ? ' chip--on' : ''}`}
                    onClick={() => toggle(level)}
                    aria-pressed={value.includes(level)}
                  >
                    {level}
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

/**
 * Botão "Conteúdo": livros possuídos + remaster/legado. É config da mesa —
 * salva direto no estado (persistida), não é um filtro por aba que reseta.
 */
export function ContentFilterButton({ small = false }) {
  const { state, dispatch } = useStore()
  const [open, setOpen] = useState(false)
  const { ownedCategories = [], remasterFilter = 'all' } = state.settings ?? {}
  const active = ownedCategories.length > 0 || remasterFilter !== 'all'

  const setSettings = (partial) => dispatch({ type: 'SET_SETTINGS', settings: partial })

  const toggleCategory = (id) => {
    setSettings({
      ownedCategories: ownedCategories.includes(id)
        ? ownedCategories.filter((current) => current !== id)
        : [...ownedCategories, id],
    })
  }

  return (
    <>
      <button
        type="button"
        className={`icon-btn${active ? ' icon-btn--accent' : ''}${small ? '' : ''}`}
        style={{ width: small ? 26 : 30, height: small ? 26 : 30 }}
        title="Filtrar conteúdo"
        aria-label="Filtrar conteúdo"
        onClick={() => setOpen(true)}
      >
        <TuneIcon />
      </button>

      {open ? (
        <Sheet title="Filtrar conteúdo" onClose={() => setOpen(false)}>
          <div className="content-filter__label">Livros que você possui</div>
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
          <div className="content-filter__hint">Nenhum marcado mostra o conteúdo de todos os livros.</div>

          <div className="content-filter__label" style={{ marginTop: 16 }}>
            Regra
          </div>
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

          <button
            type="button"
            className="btn btn--solid btn--block"
            style={{ marginTop: 16 }}
            onClick={() => setOpen(false)}
          >
            Pronto
          </button>
        </Sheet>
      ) : null}
    </>
  )
}

/** Tipo, nível (tickável) e um atalho para o filtro de conteúdo. */
export function FilterSelects({ value, onChange, levels = [], small = false }) {
  const cls = `select${small ? ' select--sm' : ''}`
  return (
    <div className="filters__row">
      <select
        className={cls}
        value={value.category}
        onChange={(event) => onChange({ ...value, category: event.target.value })}
        aria-label="Filtrar por tipo"
      >
        <option value="all">Todos os tipos</option>
        {Object.entries(CATEGORIES).map(([id, meta]) => (
          <option key={id} value={id}>
            {meta.label}
          </option>
        ))}
      </select>
      <LevelPicker
        levels={levels}
        value={value.levels}
        onChange={(levels) => onChange({ ...value, levels })}
        small={small}
      />
      <ContentFilterButton small={small} />
    </div>
  )
}

export const EMPTY_FILTERS = { search: '', category: 'all', levels: [] }
