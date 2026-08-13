import { useState } from 'react'
import Sheet from '../../components/Sheet.jsx'
import Stepper from '../../components/Stepper.jsx'
import { useStore } from '../../state/store.jsx'

/*
 * Dano e cura.
 *
 * O stepper cobre o caso comum da mesa — "tomei 3" — em um toque por ponto, e o
 * campo cobre o dano grande sem obrigar a apertar dezenove vezes. Os dois
 * escrevem no mesmo número.
 *
 * "Acrescentar" vem antes de "Reduzir" pela regra da casa: a ação positiva à
 * esquerda. As duas agem, então nenhuma é o "cancelar" do par.
 */
export default function HpSheet({ player, view, onClose }) {
  const { dispatch } = useStore()
  const [valor, setValor] = useState(1)
  const [temp, setTemp] = useState('')

  const aplicar = (tipo) => {
    if (valor > 0) dispatch({ type: tipo, playerId: player.id, amount: valor })
    onClose()
  }

  return (
    <Sheet title={`Pontos de vida de ${player.sheet.name}`} onClose={onClose}>
      <div className="hp-sheet__now">
        <span className="hp-sheet__hp">{view.hp}</span>
        <span className="hp-sheet__max">/ {view.hpMax}</span>
        {view.tempHp > 0 ? <span className="hp-sheet__temp">+{view.tempHp} temp</span> : null}
      </div>

      <div className="field-label">Quanto?</div>
      <div className="sheet__center-row">
        <Stepper
          size="lg"
          value={valor}
          canDec={valor > 1}
          onDec={() => setValor((n) => Math.max(1, n - 1))}
          onInc={() => setValor((n) => n + 1)}
        />
      </div>

      <div className="hp-sheet__pair">
        <button type="button" className="btn btn--solid btn--wide" onClick={() => aplicar('APPLY_HEAL')}>
          Curar {valor}
        </button>
        <button type="button" className="btn btn--danger btn--wide" onClick={() => aplicar('APPLY_DAMAGE')}>
          Dano {valor}
        </button>
      </div>

      <div className="hp-sheet__temp-box">
        <div className="hp-sheet__temp-head">
          <span className="field-label">HP temporário</span>
          <span className="hp-sheet__temp-now">atual: {view.tempHp}</span>
        </div>
        {/* Não acumula: vale o maior entre o que já tinha e o novo. Definir 0
            é como se tira o que sobrou de uma fonte que acabou. */}
        <div className="hp-sheet__temp-row">
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={temp}
            onChange={(event) => setTemp(event.target.value)}
            aria-label="HP temporário"
          />
          <button
            type="button"
            className="btn btn--tint"
            onClick={() => {
              dispatch({ type: 'SET_TEMP_HP', playerId: player.id, value: Number(temp) || 0 })
              setTemp('')
            }}
          >
            Definir
          </button>
        </div>
      </div>

      {/* Um botão só: aqui não há par aceitar/cancelar. Curar e Dano já são as
          ações, e as duas fecham a folha sozinhas. */}
      <button type="button" className="btn btn--neutral btn--block" onClick={onClose}>
        Fechar
      </button>
    </Sheet>
  )
}
