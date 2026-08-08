import { useMemo, useState } from 'react'
import ItemRow from '../components/ItemRow.jsx'
import Sheet, { SheetActions } from '../components/Sheet.jsx'
import ItemForm from '../components/ItemForm.jsx'
import { ChevronRight, EditIcon, PlusIcon, TrashIcon } from '../components/Icons.jsx'
import { useStore } from '../state/store.jsx'
import { CATALOG, CATEGORY_ORDER, categoryLabel } from '../data/catalog.js'
import { importFoundryJson } from '../lib/foundryImport.js'
import { matchesContent, matchesFilters, matchesSearch } from '../lib/items.js'
import { plural } from '../lib/text.js'

export default function LibraryScreen({ filters, openId, onToggle }) {
  const { state, dispatch } = useStore()
  // Como no protótipo, só uma pasta fica aberta de cada vez.
  const [openFolder, setOpenFolder] = useState(null)
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const keep = (item) =>
    matchesSearch(item, filters.search) &&
    matchesFilters(item, filters) &&
    matchesContent(item, state.settings)

  const campaign = state.campaignItems.filter(keep)
  const folders = useMemo(() => {
    const official = CATALOG.filter(keep)
    return CATEGORY_ORDER.map((id) => ({
      id,
      label: categoryLabel(id),
      items: official.filter((item) => item.category === id).sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((folder) => folder.items.length > 0)
  }, [filters.search, filters.category, filters.levels, state.settings])

  return (
    <>
      {campaign.length ? (
        <section className="list-group">
          <h2 className="label list-group__title">Itens da Campanha</h2>
          <div className="list-rows">
            {campaign.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                priceInHead
                open={openId === item.id}
                onToggle={() => onToggle(item.id)}
              >
                <div className="item__foot">
                  <div className="item__tools">
                    <button
                      type="button"
                      className="icon-btn icon-btn--danger"
                      title="Excluir"
                      aria-label={`Excluir ${item.name}`}
                      onClick={() => setDeleting(item)}
                    >
                      <TrashIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn icon-btn--accent"
                      title="Editar"
                      aria-label={`Editar ${item.name}`}
                      onClick={() => setEditing(item)}
                    >
                      <EditIcon />
                    </button>
                  </div>
                </div>
              </ItemRow>
            ))}
          </div>
        </section>
      ) : null}

      <section className="list-group">
        <h2 className="label list-group__title">Itens Oficiais</h2>
        {folders.length === 0 ? <div className="empty">Nenhum item encontrado.</div> : null}
        <div className="list-rows">
          {folders.map((folder) => {
            const isOpen = openFolder === folder.id
            return (
              <div className="folder" key={folder.id}>
                <button
                  type="button"
                  className="folder__head"
                  onClick={() => setOpenFolder(isOpen ? null : folder.id)}
                  aria-expanded={isOpen}
                >
                  <span className="gm__grow">
                    <span className="folder__name">{folder.label}</span>
                    <span className="folder__count">
                      {plural(folder.items.length, 'item', 'itens')}
                    </span>
                  </span>
                  <span className="icon-btn icon-btn--ghost">
                    <ChevronRight open={isOpen} />
                  </span>
                </button>
                {isOpen ? (
                  <div className="folder__body">
                    {folder.items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        priceInHead
                        open={openId === item.id}
                        onToggle={() => onToggle(item.id)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </section>

      <button
        type="button"
        className="fab"
        onClick={() => setCreating(true)}
        aria-label="Novo item de campanha"
      >
        <PlusIcon />
      </button>

      {creating ? <CreateSheet onClose={() => setCreating(false)} /> : null}

      {editing ? (
        <Sheet title="Editar item da campanha" onClose={() => setEditing(null)}>
          <ItemForm
            item={editing}
            submitLabel="Salvar"
            onCancel={() => setEditing(null)}
            onSubmit={(item) => {
              dispatch({ type: 'UPDATE_CAMPAIGN_ITEM', item })
              setEditing(null)
            }}
          />
        </Sheet>
      ) : null}

      {deleting ? (
        <Sheet center onClose={() => setDeleting(null)}>
          <div className="sheet__question">Excluir {deleting.name} da biblioteca?</div>
          <SheetActions
            onCancel={() => setDeleting(null)}
            onConfirm={() => {
              dispatch({ type: 'REMOVE_CAMPAIGN_ITEM', itemId: deleting.id })
              setDeleting(null)
            }}
            confirmLabel="Excluir"
          />
        </Sheet>
      ) : null}
    </>
  )
}

/** Criar item da campanha: à mão, ou colando o JSON de um pack do Foundry. */
function CreateSheet({ onClose }) {
  const { dispatch } = useStore()
  const [mode, setMode] = useState('manual')

  return (
    <Sheet onClose={onClose}>
      <div className="seg">
        <button
          type="button"
          className={`seg__tab${mode === 'manual' ? ' seg__tab--on' : ''}`}
          onClick={() => setMode('manual')}
        >
          Item manual
        </button>
        <button
          type="button"
          className={`seg__tab${mode === 'import' ? ' seg__tab--on' : ''}`}
          onClick={() => setMode('import')}
        >
          Importar JSON
        </button>
      </div>

      {mode === 'manual' ? (
        <ItemForm
          submitLabel="Criar item"
          onCancel={onClose}
          onSubmit={(item) => {
            dispatch({ type: 'ADD_CAMPAIGN_ITEMS', items: [item] })
            onClose()
          }}
        />
      ) : (
        <ImportPanel onClose={onClose} />
      )}
    </Sheet>
  )
}

function ImportPanel({ onClose }) {
  const { dispatch } = useStore()
  const [text, setText] = useState('')
  const [result, setResult] = useState(null)

  return (
    <>
      <p className="import__hint">
        Cole o conteúdo de um arquivo de <code>packs/pf2e/equipment</code>. Aceita um item, uma
        lista, ou um item por linha.
      </p>

      <textarea
        className="textarea import__field"
        placeholder='{ "name": "Steel Shield", "type": "shield", "system": { … } }'
        value={text}
        onChange={(event) => {
          setText(event.target.value)
          setResult(null)
        }}
        aria-label="JSON do item"
      />

      <button
        type="button"
        className="btn btn--neutral btn--block"
        onClick={() => setResult(importFoundryJson(text))}
      >
        Conferir
      </button>

      {result ? (
        <div className="import__result">
          {result.errors.map((error, index) => (
            <p className="form-error" key={index}>
              {error}
            </p>
          ))}

          {result.items.length ? (
            <>
              <p className="import__hint">
                {plural(result.items.length, 'item pronto', 'itens prontos')} para entrar na
                biblioteca:
              </p>
              {result.items.map((item) => (
                <div className="gm__row" key={item.id}>
                  <span className="gm__row-name">{item.name}</span>
                  <span className="item__level">Nv {item.level}</span>
                </div>
              ))}
              <SheetActions
                onCancel={onClose}
                onConfirm={() => {
                  dispatch({ type: 'ADD_CAMPAIGN_ITEMS', items: result.items })
                  onClose()
                }}
                confirmLabel={`Importar ${plural(result.items.length, 'item', 'itens')}`}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </>
  )
}
