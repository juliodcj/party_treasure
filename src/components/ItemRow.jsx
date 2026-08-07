import { PriceBadges } from './Coins.jsx'
import TraitList from './TraitList.jsx'
import { ChevronRight } from './Icons.jsx'
import { categoryLabel } from '../data/catalog.js'
import { formatBulk, parseBulk } from '../lib/bulk.js'

/**
 * A linha de item do protótipo, usada pelo Inventário, pela Loja e pela
 * Biblioteca. Só um item fica aberto por vez, então quem controla é a tela.
 */
export default function ItemRow({
  item,
  qty = 0,
  open = false,
  onToggle,
  priceInHead = false,
  priceInBody = false,
  cart = null,
  nested = false,
  children,
}) {
  return (
    <div className={nested ? 'subitem' : 'card'}>
      <div className="item__head">
        <button type="button" className="item__name-btn" onClick={onToggle} aria-expanded={open}>
          <span className={`item__name${open ? ' item__name--open' : ''}`}>{item.name}</span>
          <span className="item__level">Nv {item.level ?? 0}</span>
        </button>

        {qty > 0 ? <span className="item__qty">x{qty}</span> : null}

        {priceInHead ? <PriceBadges totalCp={item.priceCp} /> : null}

        {cart ? <div className="item__cart">{cart}</div> : null}

        <button type="button" onClick={onToggle} aria-label={open ? 'Fechar item' : 'Abrir item'}>
          <ChevronRight open={open} />
        </button>
      </div>

      {open ? (
        <div className="item__body">
          <div className="item__meta">
            <span className="item__meta-label">
              {categoryLabel(item.category)} · Bulk {formatBulk(parseBulk(item.bulk))}
            </span>
            {priceInBody ? (
              <span className="coin-badges">
                <PriceBadges totalCp={item.priceCp} size="lg" />
                <span className="item__unit">/un</span>
              </span>
            ) : null}
          </div>

          <TraitList traits={item.traits} />

          {item.shield ? (
            <div className="item__meta-label" style={{ marginTop: 8 }}>
              Dureza {item.shield.hardness} · PV {item.shield.hpMax} · LR {item.shield.bt}
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
            <div className="item__source">
              {item.source.title}
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
