import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { CoinInputs } from './ItemForm.jsx'
import { useStore } from '../state/store.jsx'
import { formatCopper, toCopper } from '../lib/money.js'

/**
 * Enviar dinheiro a outro personagem: dois passos, igual ao croqui —
 * escolhe quantia e destino, depois confirma numa tela separada.
 */
export default function SendMoneySheet({ player, onClose }) {
  const { state, dispatch } = useStore()
  const others = state.players.filter((other) => other.id !== player.id)
  const [step, setStep] = useState('pick') // 'pick' | 'confirm'
  const [targetId, setTargetId] = useState(null)
  const [gold, setGold] = useState('')
  const [silver, setSilver] = useState('')
  const [copper, setCopper] = useState('')

  const amountCp = toCopper({
    gold: Number.parseInt(gold, 10) || 0,
    silver: Number.parseInt(silver, 10) || 0,
    copper: Number.parseInt(copper, 10) || 0,
  })
  const totalCp = toCopper(player)
  const tooMuch = amountCp > totalCp
  const target = others.find((other) => other.id === targetId)

  const confirm = () => {
    if (!target || amountCp <= 0 || tooMuch) return
    dispatch({ type: 'TRANSFER_COINS', fromId: player.id, toId: target.id, amountCp })
    onClose()
  }

  if (others.length === 0) {
    return (
      <Sheet center title="Enviar dinheiro" onClose={onClose}>
        <div className="empty">Não há outro personagem na mesa para receber.</div>
      </Sheet>
    )
  }

  if (step === 'confirm' && target) {
    return (
      <Sheet center onClose={onClose}>
        <div className="sheet__question">
          {player.name} quer enviar {formatCopper(amountCp)} para {target.name}?
        </div>
        <div className="sheet__actions">
          <button type="button" className="btn btn--neutral btn--wide" onClick={() => setStep('pick')}>
            Voltar
          </button>
          <button type="button" className="btn btn--solid btn--wide" onClick={confirm}>
            Confirmar
          </button>
        </div>
      </Sheet>
    )
  }

  return (
    <Sheet center title="Enviar dinheiro" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <CoinInputs
          gold={gold}
          silver={silver}
          copper={copper}
          onGold={setGold}
          onSilver={setSilver}
          onCopper={setCopper}
        />
      </div>

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 8 }}>
        Para qual personagem?
      </div>
      <div className="target-list">
        {others.map((other) => (
          <button
            key={other.id}
            type="button"
            className={`target-row${targetId === other.id ? ' target-row--on' : ''}`}
            onClick={() => setTargetId(other.id)}
          >
            {other.name}
          </button>
        ))}
      </div>

      {tooMuch ? (
        <div style={{ fontSize: 12.5, color: 'var(--danger)', marginBottom: 8 }}>
          Saldo insuficiente: você tem {formatCopper(totalCp)}.
        </div>
      ) : null}

      <div className="sheet__actions">
        <button type="button" className="btn btn--neutral btn--wide" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          className="btn btn--solid btn--wide"
          disabled={!amountCp || !targetId || tooMuch}
          onClick={() => setStep('confirm')}
        >
          Continuar
        </button>
      </div>
    </Sheet>
  )
}
