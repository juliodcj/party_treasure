import { useMemo, useState } from 'react'
import ItemCard from '../components/ItemCard.jsx'
import ItemFilters, { EMPTY_FILTERS } from '../components/ItemFilters.jsx'
import ItemForm from '../components/ItemForm.jsx'
import Modal from '../components/Modal.jsx'
import { useStore } from '../state/store.jsx'
import { CATALOG, categoryLabel } from '../data/catalog.js'
import { availableLevels, matchesFilters, matchesSearch } from '../lib/items.js'
import { importFoundryJson } from '../lib/foundryImport.js'
import { plural } from '../lib/text.js'

export default function LibraryScreen() {
  const { state, dispatch } = useStore()
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [open, setOpen] = useState({ campaign: true })
  const [sheet, setSheet] = useState(null) // 'manual' | 'import'
  const [editing, setEditing] = useState(null)

  const keep = (item) => matchesSearch(item, filters.search) && matchesFilters(item, filters)

  const campaign = state.campaignItems.filter(keep)
  const catalogFolders = useMemo(() => {
    const buckets = new Map()
    for (const item of CATALOG) {
      if (!keep(item)) continue
      const list = buckets.get(item.category) ?? []
      list.push(item)
      buckets.set(item.category, list)
    }
    return [...buckets.entries()]
      .map(([category, items]) => ({
        id: `cat:${category}`,
        label: categoryLabel(category),
        items: items.sort((a, b) => a.name.localeCompare(b.name)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [filters])

  const toggle = (id) => setOpen((current) => ({ ...current, [id]: !current[id] }))
  const nothingFound = !campaign.length && !catalogFolders.length

  return (
    <div className="stack">
      <div className="row">
        <button type="button" className="btn btn--sm" onClick={() => setSheet('manual')}>
          + Item manual
        </button>
        <button type="button" className="btn btn--sm btn--primary" onClick={() => setSheet('import')}>
          Importar JSON
        </button>
      </div>

      <ItemFilters
        value={filters}
        onChange={setFilters}
        levels={availableLevels([...state.campaignItems, ...CATALOG])}
        placeholder="Buscar na biblioteca…"
      />

      {nothingFound ? <div className="empty">Nenhum item bate com a busca.</div> : null}

      {campaign.length || !filters.search ? (
        <Folder
          label="Itens da campanha"
          count={campaign.length}
          isOpen={open.campaign}
          onToggle={() => toggle('campaign')}
        >
          {campaign.length === 0 ? (
            <div className="empty">
              Nada aqui ainda. Crie um item manual ou cole o JSON de um item do Foundry.
            </div>
          ) : (
            campaign.map((item) => (
              <ItemCard key={item.id} item={item}>
                <div className="item__actions">
                  <button type="button" className="btn btn--sm" onClick={() => setEditing(item)}>
                    Editar
                  </button>
                  <button
                    type="button"
                    className="btn btn--sm btn--danger"
                    onClick={() => dispatch({ type: 'REMOVE_CAMPAIGN_ITEM', itemId: item.id })}
                  >
                    Excluir
                  </button>
                </div>
              </ItemCard>
            ))
          )}
        </Folder>
      ) : null}

      {catalogFolders.map((folder) => (
        <Folder
          key={folder.id}
          label={folder.label}
          count={folder.items.length}
          isOpen={open[folder.id]}
          onToggle={() => toggle(folder.id)}
        >
          {folder.items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </Folder>
      ))}

      {sheet === 'manual' ? (
        <Modal title="Novo item de campanha" onClose={() => setSheet(null)}>
          <ItemForm
            submitLabel="Criar item"
            onSubmit={(item) => {
              dispatch({ type: 'ADD_CAMPAIGN_ITEMS', items: [item] })
              setSheet(null)
            }}
          />
        </Modal>
      ) : null}

      {sheet === 'import' ? <ImportSheet onClose={() => setSheet(null)} /> : null}

      {editing ? (
        <Modal title="Editar item de campanha" onClose={() => setEditing(null)}>
          <ItemForm
            item={editing}
            submitLabel="Salvar alterações"
            onSubmit={(item) => {
              dispatch({ type: 'UPDATE_CAMPAIGN_ITEM', item })
              setEditing(null)
            }}
          />
        </Modal>
      ) : null}
    </div>
  )
}

function Folder({ label, count, isOpen, onToggle, children }) {
  return (
    <section className="stack" style={{ gap: 'var(--sp-2)' }}>
      <button type="button" className="folder__head" onClick={onToggle} aria-expanded={!!isOpen}>
        <span className={`caret${isOpen ? ' caret--open' : ''}`}>›</span>
        {label}
        <span className="folder__count">{count}</span>
      </button>
      {isOpen ? <div className="stack">{children}</div> : null}
    </section>
  )
}

/** Importador: cola o JSON de um ou mais itens dos packs do Foundry. */
function ImportSheet({ onClose }) {
  const { dispatch } = useStore()
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)

  const preview = () => setResult(importFoundryJson(text))

  const confirm = () => {
    if (!result?.items.length) return
    dispatch({ type: 'ADD_CAMPAIGN_ITEMS', items: result.items })
    onClose()
  }

  return (
    <Modal title="Importar JSON do Foundry" onClose={onClose}>
      <div className="stack">
        <p className="card__sub">
          Cole o conteúdo de um arquivo de <code>packs/pf2e/equipment</code>. Aceita um item, uma
          lista de itens, ou um item por linha.
        </p>

        <textarea
          className="textarea"
          style={{ minHeight: 160, fontFamily: 'ui-monospace, monospace', fontSize: 'var(--fs-xs)' }}
          placeholder='{ "name": "Steel Shield", "type": "shield", "system": { … } }'
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setResult(null)
          }}
        />

        <button type="button" className="btn btn--block" onClick={preview}>
          Conferir
        </button>

        {result ? (
          <div className="stack">
            {result.errors.map((error, index) => (
              <div key={index} className="notice notice--error">
                {error}
              </div>
            ))}

            {result.items.length ? (
              <>
                <div className="notice notice--ok">
                  {plural(result.items.length, 'item pronto', 'itens prontos')} para entrar na
                  biblioteca.
                </div>
                {result.items.map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
                <button type="button" className="btn btn--primary btn--block" onClick={confirm}>
                  Importar {plural(result.items.length, 'item', 'itens')}
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
