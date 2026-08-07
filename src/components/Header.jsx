/** Título grande da tela e, nas telas de personagem, a pílula com a carteira. */
export default function Header({ title, player = null, onWallet }) {
  return (
    <header className="header">
      <div className="header__title">{title}</div>
      {player ? (
        <button type="button" className="gold-pill" onClick={onWallet} aria-label="Abrir carteira">
          <span className="gold-pill__coin">
            <span className="gold-pill__value gold-pill__value--gold">{player.gold}</span>
            <span className="coin-dot coin-dot--gold" />
          </span>
          <span className="gold-pill__coin">
            <span className="gold-pill__value gold-pill__value--silver">{player.silver}</span>
            <span className="coin-dot coin-dot--silver" />
          </span>
          <span className="gold-pill__coin">
            <span className="gold-pill__value gold-pill__value--copper">{player.copper}</span>
            <span className="coin-dot coin-dot--copper" />
          </span>
        </button>
      ) : null}
    </header>
  )
}
