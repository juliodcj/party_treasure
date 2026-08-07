import { useState } from 'react'
import TraitList from './TraitList.jsx'
import { categoryLabel } from '../data/catalog.js'
import { formatBulk, parseBulk } from '../lib/bulk.js'
import { formatCopper } from '../lib/money.js'

/**
 * Linha de item que abre ao toque. O cabeçalho é o alvo de toque; `right` fica
 * fora dele para que steppers e botões não disparem a expansão.
 */
export default function ItemCard({ item, qty = null, right = null, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="card">
      <div className="row" style={{ paddingRight: right ? 'var(--sp-3)' : 0 }}>
        <button
          type="button"
          className="card__head"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <span className={`caret${open ? ' caret--open' : ''}`}>›</span>
          {qty != null ? <span className="item__qty">{qty}×</span> : null}
          <span style={{ flex: 1, minWidth: 0 }}>
            <span className="card__title">{item.name}</span>
            <span className="card__sub" style={{ display: 'block' }}>
              Nv {item.level ?? 0} · {categoryLabel(item.category)} · {formatBulk(parseBulk(item.bulk))} Bulk
            </span>
          </span>
          <span className="item__price">{formatCopper(item.priceCp)}</span>
        </button>
        {right}
      </div>

      {open ? (
        <div className="card__body stack">
          <TraitList traits={item.traits} />

          {item.shield ? (
            <div className="item__stats">
              <span className="item__stat">
                Dureza <strong>{item.shield.hardness}</strong>
              </span>
              <span className="item__stat">
                PV <strong>{item.shield.hpMax}</strong>
              </span>
              <span className="item__stat">
                LR <strong>{item.shield.bt}</strong>
              </span>
            </div>
          ) : null}

          {item.descriptionHtml ? (
            <div
              className="item__desc"
              // O HTML vem sanitizado da importação (sem script nem handler inline).
              dangerouslySetInnerHTML={{ __html: item.descriptionHtml }}
            />
          ) : (
            <p className="item__desc" style={{ whiteSpace: 'pre-line' }}>
              {item.description || 'Sem descrição.'}
            </p>
          )}

          {item.source ? (
            <div className="card__sub">
              Fonte: {item.source.title}
              {item.source.license ? ` · ${item.source.license}` : ''}
              {item.source.remaster ? ' · remaster' : ''}
            </div>
          ) : null}

          {children}
        </div>
      ) : null}
    </div>
  )
}
