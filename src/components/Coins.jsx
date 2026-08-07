import { fromCopper } from '../lib/money.js'

/**
 * Preço como o protótipo mostra: o número seguido de um pontinho colorido da
 * denominação. Denominação zerada não aparece — mas um preço zero mostra "0".
 */
export function PriceBadges({ totalCp, size = 'md' }) {
  const { gold, silver, copper } = fromCopper(totalCp)
  const badges = []
  if (gold) badges.push(['gold', gold])
  if (silver) badges.push(['silver', silver])
  if (copper) badges.push(['copper', copper])
  if (!badges.length) badges.push(['gold', 0])

  return (
    <span className="coin-badges">
      {badges.map(([coin, amount]) => (
        <span className="coin-badge" key={coin}>
          <span className="coin-badge__amount" style={size === 'lg' ? { fontSize: 14 } : undefined}>
            {amount}
          </span>
          <span className={`coin-dot coin-dot--${coin}`} />
        </span>
      ))}
    </span>
  )
}

export const COIN_ORDER = [
  { key: 'gold', label: 'Ouro' },
  { key: 'silver', label: 'Prata' },
  { key: 'copper', label: 'Cobre' },
]
