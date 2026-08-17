import { fromCopper } from '../lib/money.js'

/**
 * Moedas: o número em tinta cheia e o pontinho colorido da denominação ao lado.
 *
 * É o único desenho de moeda do aplicativo. Antes eram três marcações escritas
 * à mão — preços, bolsa do cabeçalho e listas do Mestre — com três tamanhos de
 * ponto, três corpos de número e três esquemas de cor para o mesmo dado.
 *
 * `sm` nas listas do Mestre e na troca de personagem, `md` nos preços, `lg` na
 * bolsa do cabeçalho e no preço unitário do item aberto.
 */
export default function Coins({ gold = 0, silver = 0, copper = 0, size = 'md', showZeros = false }) {
  const entries = [
    ['gold', gold],
    ['silver', silver],
    ['copper', copper],
  ]
  // Denominação zerada não aparece — mas um total zero precisa mostrar "0".
  const shown = showZeros ? entries : entries.filter(([, amount]) => amount > 0)
  const badges = shown.length ? shown : [['gold', 0]]

  return (
    <span className={`coins coins--${size}`}>
      {badges.map(([coin, amount]) => (
        <span className="coin" key={coin}>
          <span className="coin__amount">{amount}</span>
          <span className={`coin-dot coin-dot--${coin}`} />
        </span>
      ))}
    </span>
  )
}

/** O mesmo desenho, a partir de um total em cobre (preço, carteira, carrinho). */
export function Price({ totalCp, size = 'md' }) {
  return <Coins {...fromCopper(totalCp)} size={size} />
}
