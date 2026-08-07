import { SearchIcon } from './Icons.jsx'
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

/** Os dois seletores: tipo e nível. */
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
      <select
        className={cls}
        value={value.level}
        onChange={(event) => onChange({ ...value, level: event.target.value })}
        aria-label="Filtrar por nível"
      >
        <option value="all">Todos os níveis</option>
        {levels.map((level) => (
          <option key={level} value={String(level)}>
            Nível {level}
          </option>
        ))}
      </select>
    </div>
  )
}

export const EMPTY_FILTERS = { search: '', category: 'all', level: 'all' }
