import { CATEGORIES } from '../data/catalog.js'

/** Busca + filtro por tipo e nível, compartilhado por Inventário, Loja e Biblioteca. */
export default function ItemFilters({ value, onChange, levels = [], placeholder = 'Buscar item…' }) {
  const set = (patch) => onChange({ ...value, ...patch })

  return (
    <div className="toolbar">
      <input
        type="search"
        className="input"
        placeholder={placeholder}
        value={value.search}
        onChange={(event) => set({ search: event.target.value })}
        aria-label="Buscar item"
      />
      <div className="toolbar__filters">
        <select
          className="select"
          value={value.category}
          onChange={(event) => set({ category: event.target.value })}
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
          className="select"
          value={value.level}
          onChange={(event) => set({ level: event.target.value })}
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
    </div>
  )
}

export const EMPTY_FILTERS = { search: '', category: 'all', level: 'all' }
