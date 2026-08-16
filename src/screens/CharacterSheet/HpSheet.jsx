import { useState } from 'react'
import Sheet from '../../components/Sheet.jsx'
import { useStore } from '../../state/store.jsx'

/*
 * Dano e cura.
 *
 * Um campo só, como no protótipo: o dano da mesa tanto é 3 quanto é 19, e
 * digitar custa o mesmo nos dois casos. O stepper cobrava um toque por ponto.
 *
 * "Acrescentar" vem antes de "Reduzir" pela regra da casa: a ação positiva à
 * esquerda. As duas agem, então nenhuma é o "cancelar" do par.
 */
export default function HpSheet({ player, view, onClose }) {
  const { dispatch } = useStore()
  const [valor, setValor] = useState('')
  const [temp, setTemp] = useState('')

  const aplicar = (tipo) => {
    const quantia = Math.max(0, Math.trunc(Number(valor) || 0))
    if (quantia > 0) dispatch({ type: tipo, playerId: player.id, amount: quantia })
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
      <input
        className="input hp-sheet__amount"
        type="number"
        inputMode="numeric"
        min="0"
        placeholder="0"
        value={valor}
        onChange={(event) => setValor(event.target.value)}
        aria-label="Quanto?"
      />

      <div className="hp-sheet__pair">
        <button type="button" className="btn btn--solid btn--wide" onClick={() => aplicar('APPLY_HEAL')}>
          Acrescentar
        </button>
        <button type="button" className="btn btn--danger btn--wide" onClick={() => aplicar('APPLY_DAMAGE')}>
          Reduzir
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
