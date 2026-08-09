import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { traitDescription, traitLabel } from '../data/traits.js'

/** Traços clicáveis: tocar abre o verbete da regra num diálogo centrado. */
export default function TraitList({ traits = [] }) {
  const [selected, setSelected] = useState(null)
  if (!traits.length) return null

  return (
    <>
      <div className="traits">
        {traits.map((slug) => (
          <button key={slug} type="button" className="trait" onClick={() => setSelected(slug)}>
            {traitLabel(slug)}
          </button>
        ))}
      </div>

      {selected ? (
        <Sheet center onClose={() => setSelected(null)}>
          <div className="sheet__title">{traitLabel(selected)}</div>
          <div className="sheet__body">{traitDescription(selected)}</div>
          <div className="sheet__actions">
            <button
              type="button"
              className="btn btn--solid btn--block"
              onClick={() => setSelected(null)}
            >
              Fechar
            </button>
          </div>
        </Sheet>
      ) : null}
    </>
  )
}
