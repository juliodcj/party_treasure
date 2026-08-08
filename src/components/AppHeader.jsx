import { PaperPlaneIcon } from './Icons.jsx'

/**
 * A moldura fixa no topo, igual nas quatro abas: o que entra aqui não rola
 * junto com a lista.
 *
 * O conteúdo é montado em faixas empilhadas. A primeira é sempre a do título
 * (com um canto à esquerda para voltar, quando a tela é filha de outra, e um
 * à direita para ações, como a engrenagem do Mestre); as demais cada aba
 * escolhe e passa como `children`, na ordem em que devem aparecer — bolsa,
 * contagem, busca. Fixar mais uma coisa amanhã é só passar mais um filho, sem
 * mexer no cabeçalho nem nas outras abas.
 */
export default function AppHeader({
  title,
  titleContent = null,
  onBack = null,
  actions = null,
  children,
}) {
  return (
    <header className="app-header">
      <div className="app-header__row">
        {onBack ? (
          <button
            type="button"
            className="app-header__back"
            onClick={onBack}
            aria-label="Voltar"
            title="Voltar"
          >
            <span className="app-header__chevron" aria-hidden="true" />
          </button>
        ) : null}
        <div className="app-header__title-slot">
          {titleContent ?? <h1 className="app-header__title">{title}</h1>}
        </div>
        {actions}
      </div>
      {children}
    </header>
  )
}

/** Faixa de contagem ("3 jogadores · 2 lojas cadastradas"). */
export function HeaderCount({ children }) {
  return (
    <div className="subhead">
      <span className="subhead__label">{children}</span>
    </div>
  )
}

/** Faixa da bolsa: moedas (abrem a edição) à esquerda, ajustar/enviar à direita. */
export function WalletPill({
  player,
  showAdjust = false,
  showSend = false,
  onAdjust,
  onSend,
  onEditWallet,
}) {
  return (
    <div className="gold-pill">
      <button
        type="button"
        className="gold-pill__wallet"
        onClick={onEditWallet}
        aria-label={`Editar moedas de ${player.name}`}
      >
        <span className="gold-pill__label">Bolsa de {player.name}</span>
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
  )
}
