import Sheet from './Sheet.jsx'
import { useStore } from '../state/store.jsx'

/** Primeira letra do nome, o mesmo desenho do botão na barra de abas. */
export function initialOf(name) {
  return name.trim().charAt(0).toUpperCase()
}

/**
 * Troca de personagem. Substitui a faixa fixa que morava acima da barra de
 * abas: agora quem chama é o primeiro botão da barra, e a mesa inteira cabe
 * na folha — com as moedas de cada um à vista, o que a faixa não mostrava.
 */
export default function CharacterPicker({ activeId, onClose }) {
  const { state, dispatch } = useStore()

  return (
    <Sheet title="Personagem" onClose={onClose}>
      <div className="char-list">
        {state.players.map((player) => {
          const on = player.id === activeId
          return (
            <button
              key={player.id}
              type="button"
              className={`char-list__row${on ? ' char-list__row--on' : ''}`}
              aria-current={on ? 'true' : undefined}
              onClick={() => {
                dispatch({ type: 'SELECT_PLAYER', playerId: player.id })
                onClose()
              }}
            >
              <span className="char-list__avatar" aria-hidden="true">
                {initialOf(player.name)}
              </span>
              <span className="char-list__body">
                <span className="char-list__name">{player.name}</span>
                <span className="gm__coins">
                  {[
                    ['gold', player.gold],
                    ['silver', player.silver],
                    ['copper', player.copper],
                  ].map(([coin, value]) => (
                    <span className="gm__coin" key={coin}>
                      <span className="gm__coin-value">{value}</span>
                      <span className={`coin-dot coin-dot--${coin}`} />
                    </span>
                  ))}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </Sheet>
  )
}
