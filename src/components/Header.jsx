import { GearIcon, PaperPlaneIcon } from './Icons.jsx'

/** Título grande da tela e, nas telas de personagem, a pílula com a carteira. */
export default function Header({
  title,
  player = null,
  showAdjust = false,
  showSend = false,
  showSettings = false,
  onAdjust,
  onSend,
  onSettings,
  onEditWallet,
}) {
  return (
    <header className="header">
      <div className="header__title">{title}</div>
      {showSettings ? (
        <button
          type="button"
          className="header-icon-btn"
          title="Configurações"
          aria-label="Configurações"
          onClick={onSettings}
        >
          <GearIcon />
        </button>
      ) : null}
      {player ? (
        <div className="header-coins">
          {showAdjust ? (
            <button
              type="button"
              className="header-icon-btn"
              title="Ajustar moedas"
              aria-label="Ajustar moedas"
              onClick={onAdjust}
            >
              ±
            </button>
          ) : null}
          {showSend ? (
            <button
              type="button"
              className="header-icon-btn"
              title="Enviar dinheiro"
              aria-label="Enviar dinheiro"
              onClick={onSend}
            >
              <PaperPlaneIcon />
            </button>
          ) : null}
          <button
            type="button"
            className="gold-pill"
            onClick={onEditWallet}
            aria-label={`Editar moedas de ${player.name}`}
          >
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
        </div>
      ) : null}
    </header>
  )
}
