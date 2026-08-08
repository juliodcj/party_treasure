import { GearIcon, PaperPlaneIcon } from './Icons.jsx'

/** Título grande da tela (ou o seletor de loja) e, nas telas de personagem,
 *  a pílula da bolsa com moedas, ajustar e enviar. */
export default function Header({
  title,
  titleContent = null,
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
      <div className="header__title-slot">
        {titleContent ?? <div className="header__title">{title}</div>}
      </div>
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
        <div className="gold-pill">
          <button
            type="button"
            className="gold-pill__wallet"
            onClick={onEditWallet}
            aria-label={`Editar moedas de ${player.name}`}
          >
            <span className="gold-pill__label">Bolsa</span>
            <span className="gold-pill__coins">
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
            </span>
          </button>

          {showAdjust || showSend ? (
            <div className="gold-pill__actions">
              {showAdjust ? (
                <button
                  type="button"
                  className="gold-pill__action"
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
                  className="gold-pill__action"
                  title="Enviar dinheiro"
                  aria-label="Enviar dinheiro"
                  onClick={onSend}
                >
                  <PaperPlaneIcon />
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
