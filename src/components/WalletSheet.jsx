import { useState } from 'react'
import Sheet, { SheetActions } from './Sheet.jsx'
import { CoinInputs } from './ItemForm.jsx'
import { useStore } from '../state/store.jsx'
import { formatCopper, toCopper } from '../lib/money.js'

/**
 * Enviar dinheiro a outro personagem. Fica atrás da pílula da carteira —
 * o protótipo não tinha esta tela, mas o roteiro pede o envio entre jogadores.
 */
export default function WalletSheet({ player, onClose }) {
  const { state, dispatch } = useStore()
  const others = state.players.filter((other) => other.id !== player.id)
  const [targetId, setTargetId] = useState(others[0]?.id ?? '')
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

  const send = () => {
    if (!amountCp || !targetId || tooMuch) return
    dispatch({ type: 'TRANSFER_COINS', fromId: player.id, toId: targetId, amountCp })
    onClose()
  }

  return (
    <Sheet title={`Carteira de ${player.name}`} onClose={onClose}>
      <div style={{ fontSize: 13, color: 'var(--text-soft)', marginBottom: 12 }}>
        Total: {formatCopper(totalCp)}
      </div>

      {others.length === 0 ? (
        <div className="empty">Não há outro personagem na mesa para receber.</div>
      ) : (
        <>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 6 }}>
            Enviar para
          </div>
          <select
            className="input"
            style={{ marginBottom: 10 }}
            value={targetId}
            onChange={(event) => setTargetId(event.target.value)}
            aria-label="Para quem enviar"
          >
            {others.map((other) => (
              <option key={other.id} value={other.id}>
                {other.name}
              </option>
            ))}
          </select>

          <CoinInputs
            gold={gold}
            silver={silver}
            copper={copper}
            onGold={setGold}
            onSilver={setSilver}
            onCopper={setCopper}
          />

          {tooMuch ? (
            <div style={{ fontSize: 12.5, color: 'var(--danger)', marginTop: 8 }}>
              Saldo insuficiente: você tem {formatCopper(totalCp)}.
            </div>
          ) : null}

          <SheetActions
            onCancel={onClose}
            onConfirm={send}
            confirmLabel="Enviar"
            disabled={!amountCp || tooMuch}
          />
        </>
      )}
    </Sheet>
  )
}
