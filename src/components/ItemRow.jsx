import { PriceBadges } from './Coins.jsx'
import TraitList from './TraitList.jsx'
import { ChevronRight } from './Icons.jsx'
import { categoryLabel } from '../data/catalog.js'
import { formatBulk, parseBulk } from '../lib/bulk.js'
import { titleCase } from '../lib/text.js'

const PHYSICAL_DAMAGE_ABBR = { bludgeoning: 'B', piercing: 'P', slashing: 'S' }

/** "1d12" + "slashing" -> "1d12 S" (abreviação padrão do PF2e para dano físico). */
function formatDamage(damage) {
  if (!damage) return null
  const abbr = PHYSICAL_DAMAGE_ABBR[damage.damageType] ?? titleCase(damage.damageType)
  return `${damage.dice}${damage.die}${abbr ? ` ${abbr}` : ''}`
}

/** Linha de stats real da arma: dano, mãos, alcance e grupo — vêm direto do pack do Foundry. */
function weaponSummary(weapon) {
  if (!weapon) return null
  const parts = []
  const damage = formatDamage(weapon.damage)
  if (damage) parts.push(`Damage ${damage}`)
  if (weapon.hands) parts.push(`Hands ${weapon.hands}`)
  parts.push(`Type ${weapon.ranged ? 'Ranged' : 'Melee'}`)
  if (weapon.group) parts.push(`Group ${titleCase(weapon.group)}`)
  if (weapon.ranged && weapon.range) parts.push(`Range ${weapon.range} ft`)
  if (weapon.ranged && weapon.reload) parts.push(`Reload ${weapon.reload}`)
  return parts.join(' · ')
}

/** Linha de stats real da armadura: CA, limite de Destreza, penalidades e Força mínima. */
function armorSummary(armor) {
  if (!armor) return null
  const parts = []
  if (armor.acBonus != null) parts.push(`AC +${armor.acBonus}`)
  if (armor.dexCap != null) parts.push(`Dex Cap +${armor.dexCap}`)
  if (armor.checkPenalty) parts.push(`Check ${armor.checkPenalty}`)
  if (armor.speedPenalty) parts.push(`Speed ${armor.speedPenalty} ft`)
  if (armor.strength != null) parts.push(`Str ${armor.strength}`)
  if (armor.group) parts.push(titleCase(armor.group))
  return parts.join(' · ')
}

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
  hasNote = false,
  children,
}) {
  const weaponStats = weaponSummary(item.weapon)
  const armorStats = armorSummary(item.armor)

  return (
    <div className={nested ? 'subitem' : 'card'}>
      <div className="item__head">
        <button type="button" className="item__name-btn" onClick={onToggle} aria-expanded={open}>
          <span className={`item__name${open ? ' item__name--open' : ''}`}>{item.name}</span>
          {hasNote ? <span className="item__note-dot" title="Tem observação" aria-hidden="true" /> : null}
          <span className="item__level">Nv {item.level ?? 0}</span>
        </button>

        {qty > 0 ? <span className="item__qty">{qty}</span> : null}

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
              {categoryLabel(item.category)}
              {item.subcategory ? ` · ${titleCase(item.subcategory)}` : ''} · Bulk{' '}
              {formatBulk(parseBulk(item.bulk))}
            </span>
            {priceInBody ? (
              <span className="coin-badges">
                <PriceBadges totalCp={item.priceCp} size="lg" />
                <span className="item__unit">/un</span>
              </span>
            ) : null}
          </div>

          <TraitList traits={item.traits} />

          {weaponStats ? <div className="item__stats">{weaponStats}</div> : null}

          {armorStats ? <div className="item__stats">{armorStats}</div> : null}

          {item.shield ? (
            <div className="item__stats">
              Hardness {item.shield.hardness} · HP {item.shield.hpMax} · BT {item.shield.bt}
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

          {item.source ? <div className="item__source">{item.source.title}</div> : null}

          {children}
        </div>
      ) : null}
    </div>
  )
}
