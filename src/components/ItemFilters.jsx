import { useState } from 'react'
import { FilterIcon, SearchIcon } from './Icons.jsx'
import { CATEGORIES } from '../data/catalog.js'

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

/** Tipo e nível (tickável) — o filtro de conteúdo mora em Configurações, na aba Mestre. */
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
    </div>
  )
}

export const EMPTY_FILTERS = { search: '', category: 'all', levels: [] }

/**
 * Faixa de busca padrão: campo + funil que revela os filtros embaixo.
 * `levelsOnly` mostra só o filtro de nível (caso da Biblioteca); o padrão
 * filtra tipo e nível juntos.
 */
export function FiltersBar({
  filters,
  onChange,
  levels,
  open,
  onToggle,
  levelsOnly = false,
  small = false,
  placeholder,
}) {
  return (
    <div className="filters">
      <div className="filters__row">
        <SearchBox
          small={small}
          value={filters.search}
          onChange={(search) => onChange({ ...filters, search })}
          {...(placeholder ? { placeholder } : {})}
        />
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
              small={small}
            />
          </div>
        ) : (
          <FilterSelects value={filters} onChange={onChange} levels={levels} small={small} />
        )
      ) : null}
    </div>
  )
}
