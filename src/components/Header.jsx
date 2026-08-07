import { useState } from 'react'
import WalletSheet from './WalletSheet.jsx'
import { formatCopper, toCopper } from '../lib/money.js'

/** Cabeçalho fixo: quem está em foco e a carteira dele. */
export default function Header({ title, subtitle, player = null }) {
  const [walletOpen, setWalletOpen] = useState(false)

  return (
    <header className="header">
      <div className="header__top">
        <div style={{ minWidth: 0 }}>
          <div className="header__role">{subtitle}</div>
          <div className="header__name">{title}</div>
        </div>
        <div className="spacer" />
        {player ? (
          <span className="item__price">{formatCopper(toCopper(player))}</span>
        ) : null}
      </div>

      {player ? (
        <button
          type="button"
          className="wallet"
          onClick={() => setWalletOpen(true)}
          aria-label="Abrir carteira"
        >
          <span className="wallet__coins">
            <span className="wallet__coin wallet__coin--gold">
              <span className="wallet__value">{player.gold}</span>
              <span className="wallet__unit">ouro</span>
            </span>
            <span className="wallet__coin wallet__coin--silver">
              <span className="wallet__value">{player.silver}</span>
              <span className="wallet__unit">prata</span>
            </span>
            <span className="wallet__coin wallet__coin--copper">
              <span className="wallet__value">{player.copper}</span>
              <span className="wallet__unit">cobre</span>
            </span>
          </span>
        </button>
      ) : null}

      {walletOpen && player ? (
        <WalletSheet player={player} onClose={() => setWalletOpen(false)} />
      ) : null}
    </header>
  )
}
