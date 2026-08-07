import { fromCopper } from '../lib/money.js'

/** Três badges lado a lado: ouro, prata, cobre. */
export function CoinBadges({ wallet }) {
  return (
    <span className="coins">
      <span className="coin coin--gold">
        <span className="coin__dot" />
        {wallet.gold} po
      </span>
      <span className="coin coin--silver">
        <span className="coin__dot" />
        {wallet.silver} pp
      </span>
      <span className="coin coin--copper">
        <span className="coin__dot" />
        {wallet.copper} pc
      </span>
    </span>
  )
}

/** Mesma leitura, mas a partir de um total em cobre (preços, somas). */
export function CoinBadgesFromCopper({ totalCp }) {
  return <CoinBadges wallet={fromCopper(totalCp)} />
}
