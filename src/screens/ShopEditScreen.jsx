import { useEffect, useMemo, useState } from 'react'
import { SearchBox, FilterSelects, EMPTY_FILTERS } from '../components/ItemFilters.jsx'
import { CheckIcon } from '../components/Icons.jsx'
import { useStore } from '../state/store.jsx'
import { availableLevels, libraryItems, matchesContent, matchesFilters, matchesSearch } from '../lib/items.js'
import { formatCopper } from '../lib/money.js'
import { plural } from '../lib/text.js'

const LIST_LIMIT = 200

/**
 * Tela cheia de cadastro/edição de loja: nome + catálogo inteiro para marcar.
 * `shop` nulo é criação. Nada vai para o estado da mesa antes de "Salvar".
 */
export default function ShopEditScreen({ shop = null, onClose }) {
  const { state, dispatch } = useStore()
  const isNew = !shop

  const [name, setName] = useState(shop?.name ?? 'Nova loja')
  const [itemIds, setItemIds] = useState(() => new Set(shop?.itemIds ?? []))
  const [filters, setFilters] = useState(EMPTY_FILTERS)

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  const catalog = useMemo(() => libraryItems(state), [state])
  const levels = useMemo(() => availableLevels(catalog), [catalog])
  const matches = catalog.filter(
    (item) =>
      matchesSearch(item, filters.search) &&
      matchesFilters(item, filters) &&
      matchesContent(item, state.settings),
  )
  const rows = matches.slice(0, LIST_LIMIT)

  const toggle = (itemId) => {
    setItemIds((current) => {
      const next = new Set(current)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  const save = () => {
    const payload = { name: name.trim() || 'Nova loja', itemIds: [...itemIds] }
    if (isNew) dispatch({ type: 'ADD_SHOP', ...payload })
    else dispatch({ type: 'UPDATE_SHOP', shopId: shop.id, ...payload })
    onClose()
  }

  return (
    <div className="screen-modal" role="dialog" aria-modal="true" aria-label={isNew ? 'Nova loja' : 'Editar loja'}>
      <div className="screen-modal__head">
        <button type="button" className="screen-modal__back" onClick={onClose} aria-label="Voltar">
          <span className="screen-modal__chevron" aria-hidden="true" />
        </button>
        <div className="screen-modal__title">{isNew ? 'Nova loja' : 'Editar loja'}</div>
        <span className="screen-modal__back" aria-hidden="true" />
      </div>

      <div className="screen-modal__body">
        <input
          className="input"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome da loja"
          aria-label="Nome da loja"
        />

        <div className="screen-modal__count">
          {plural(itemIds.size, 'item selecionado', 'itens selecionados')}
        </div>

        <div className="filters screen-modal__filters">
          <SearchBox
            sunken
            value={filters.search}
            onChange={(search) => setFilters({ ...filters, search })}
            placeholder="Buscar no catálogo..."
          />
          <FilterSelects value={filters} onChange={setFilters} levels={levels} />
        </div>

        <div className="screen-modal__list">
          {rows.map((item) => {
            const checked = itemIds.has(item.id)
            return (
              <button
                type="button"
                className="gm__check-row"
                key={item.id}
                onClick={() => toggle(item.id)}
                aria-pressed={checked}
              >
                <span className={`checkbox${checked ? ' checkbox--on' : ''}`}>
                  {checked ? <CheckIcon /> : null}
                </span>
                <span className="gm__check-name">{item.name}</span>
                <span className="gm__check-price">{formatCopper(item.priceCp)}</span>
              </button>
            )
          })}
          {matches.length === 0 ? (
            <div className="empty empty--inline">Nenhum item encontrado.</div>
          ) : null}
          {matches.length > LIST_LIMIT ? (
            <div className="screen-modal__more">
              Mostrando {LIST_LIMIT} de {matches.length} — refine a busca para ver mais.
            </div>
          ) : null}
        </div>
      </div>

      <div className="screen-modal__foot">
        <button type="button" className="btn btn--solid btn--wide" onClick={save}>
          Salvar
        </button>
        <button type="button" className="btn btn--neutral btn--wide" onClick={onClose}>
          Cancelar
        </button>
      </div>
    </div>
  )
}
