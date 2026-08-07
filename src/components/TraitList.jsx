import { useState } from 'react'
import Modal from './Modal.jsx'
import { traitDescription, traitLabel } from '../data/traits.js'

const HIGHLIGHTED = new Set(['rare', 'uncommon', 'unique'])

/** Traços clicáveis: tocar abre o verbete da regra. */
export default function TraitList({ traits = [] }) {
  const [selected, setSelected] = useState(null)
  if (!traits.length) return null

  return (
    <>
      <div className="row row--wrap">
        {traits.map((slug) => (
          <button
            key={slug}
            type="button"
            className={`trait${HIGHLIGHTED.has(slug) ? ' trait--rare' : ''}`}
            onClick={() => setSelected(slug)}
          >
            {traitLabel(slug)}
          </button>
        ))}
      </div>

      {selected ? (
        <Modal title={traitLabel(selected)} onClose={() => setSelected(null)}>
          <p className="item__desc">{traitDescription(selected)}</p>
        </Modal>
      ) : null}
    </>
  )
}
