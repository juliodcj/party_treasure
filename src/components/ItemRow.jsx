import { PriceBadges } from './Coins.jsx'
import TraitList from './TraitList.jsx'
import { ChevronRight } from './Icons.jsx'
import { categoryLabel } from '../data/catalog.js'
import { formatBulk, parseBulk } from '../lib/bulk.js'
import { withoutTables } from '../lib/html.js'
import { titleCase } from '../lib/text.js'

const PHYSICAL_DAMAGE_ABBR = { bludgeoning: 'B', piercing: 'P', slashing: 'S' }

/** "1d12" + "slashing" -> "1d12 S" (abreviação padrão do PF2e para dano físico). */
function formatDamage(damage) {
  if (!damage) return null
  const abbr = PHYSICAL_DAMAGE_ABBR[damage.damageType] ?? titleCase(damage.damageType)
  return `${damage.dice}${damage.die}${abbr ? ` ${abbr}` : ''}`
}

/**
 * Campos reais da arma, na ordem em que a ficha os lê. `null` some da tabela.
 * Rótulo e valor ficam em inglês — é como o pack do Foundry chama cada coisa,
 * sem tradução nossa.
 */
function weaponFields(weapon) {
  if (!weapon) return null
  return [
    ['Category', weapon.category ? titleCase(weapon.category) : null],
    ['Damage', formatDamage(weapon.damage)],
    ['Hands', weapon.hands],
    ['Type', weapon.ranged ? 'Ranged' : 'Melee'],
    ['Group', weapon.group ? titleCase(weapon.group) : null],
    // Range e Reload só existem em arma à distância.
    ['Range', weapon.ranged && weapon.range ? `${weapon.range} ft` : null],
    ['Reload', weapon.ranged && weapon.reload ? weapon.reload : null],
  ]
}

/** Campos reais da armadura: CA, limite de Destreza, penalidades e Força mínima. */
function armorFields(armor) {
  if (!armor) return null
  return [
    ['Category', armor.category ? titleCase(armor.category) : null],
    ['AC Bonus', armor.acBonus != null ? `+${armor.acBonus}` : null],
    ['Dex Cap', armor.dexCap != null ? `+${armor.dexCap}` : null],
    ['Check Penalty', armor.checkPenalty || null],
    ['Speed Penalty', armor.speedPenalty ? `${armor.speedPenalty} ft` : null],
    ['Strength', armor.strength],
    ['Group', armor.group ? titleCase(armor.group) : null],
  ]
}

/** Campos reais do escudo — os mesmos números que o pack às vezes repete na descrição. */
function shieldFields(shield) {
  if (!shield) return null
  return [
    ['Hardness', shield.hardness],
    ['HP', shield.hpMax],
    ['BT', shield.bt],
    ['AC Bonus', shield.acBonus != null ? `+${shield.acBonus}` : null],
    ['Speed Penalty', shield.speedPenalty ? `${shield.speedPenalty} ft` : null],
  ]
}

/**
 * Grade de dois campos por linha, rótulo pequeno em cima e valor em destaque
 * embaixo — a ficha real de arma/armadura/escudo. Campo nulo nem entra.
 */
function StatTable({ fields }) {
  const rows = (fields ?? []).filter(([, value]) => value != null && value !== '')
  if (!rows.length) return null
  return (
    <dl className="stat-table">
      {rows.map(([label, value]) => (
        <div className="stat-table__cell" key={label}>
          <dt className="stat-table__label">{label}</dt>
          <dd className="stat-table__value">{value}</dd>
        </div>
      ))}
    </dl>
  )
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
  hasNote = false,
  children,
}) {
  // Escudo: a tabela de Dureza/PV/Limiar de Avaria abaixo já mostra o que o
  // pack às vezes repete dentro da descrição — tira a duplicata na hora de
  // renderizar, sem mexer no dado guardado.
  const descriptionHtml = item.shield ? withoutTables(item.descriptionHtml) : item.descriptionHtml

  return (
    // A linha vive dentro de uma .list-rows: quem desenha borda e fundo é o
    // bloco do grupo, aqui fica só o filete que separa uma linha da outra.
    <div className="list-row">
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
              {item.subcategory ? ` · ${titleCase(item.subcategory)}` : ''} · Volume{' '}
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

          <StatTable fields={weaponFields(item.weapon)} />
          <StatTable fields={armorFields(item.armor)} />
          <StatTable fields={shieldFields(item.shield)} />

          {descriptionHtml ? (
            <div
              className="item__desc"
              // O HTML vem sanitizado da importação (sem script nem handler inline).
              dangerouslySetInnerHTML={{ __html: descriptionHtml }}
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
