import { useState } from 'react'
import Modal from './Modal.jsx'
import { CoinBadges } from './Coins.jsx'
import { useStore } from '../state/store.jsx'
import { formatCopper, parsePriceInput, toCopper } from '../lib/money.js'

const DENOMINATIONS = [
  { key: 'gold', label: 'Ouro', unit: 'po', modifier: 'gold' },
  { key: 'silver', label: 'Prata', unit: 'pp', modifier: 'silver' },
  { key: 'copper', label: 'Cobre', unit: 'pc', modifier: 'copper' },
]

/** Ajustar moedas, enviar dinheiro e simplificar — tudo do mesmo lugar. */
export default function WalletSheet({ player, onClose }) {
  const { state, dispatch } = useStore()
  const [tab, setTab] = useState('adjust')
  const [amount, setAmount] = useState('')
  const [targetId, setTargetId] = useState(
    state.players.find((other) => other.id !== player.id)?.id ?? '',
  )
  const [error, setError] = useState('')

  const totalCp = toCopper(player)

  const send = () => {
    const amountCp = parsePriceInput(amount)
    if (!amountCp) {
      setError('Informe quanto enviar. Ex.: "2 po" ou "50 pc".')
      return
    }
    if (!targetId) {
      setError('Escolha para quem enviar.')
      return
    }
    if (amountCp > totalCp) {
      setError(`Saldo insuficiente: você tem ${formatCopper(totalCp)}.`)
      return
    }
    dispatch({ type: 'TRANSFER_COINS', fromId: player.id, toId: targetId, amountCp })
    setAmount('')
    setError('')
    onClose()
  }

  return (
    <Modal title={`Carteira de ${player.name}`} onClose={onClose}>
      <div className="stack">
        <div className="total-bar">
          Total
          <span className="total-bar__value">{formatCopper(totalCp)}</span>
        </div>

        <div className="chips">
          <button
            type="button"
            className={`chip${tab === 'adjust' ? ' chip--on' : ''}`}
            onClick={() => setTab('adjust')}
          >
            Ajustar
          </button>
          <button
            type="button"
            className={`chip${tab === 'send' ? ' chip--on' : ''}`}
            onClick={() => setTab('send')}
          >
            Enviar
          </button>
        </div>

        {tab === 'adjust' ? (
          <div className="stack">
            {DENOMINATIONS.map(({ key, label, unit }) => (
              <div className="row" key={key}>
                <span className="field__label" style={{ flex: 1 }}>
                  {label} ({unit})
                </span>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() =>
                    dispatch({ type: 'ADJUST_COINS', playerId: player.id, coins: { [key]: -1 } })
                  }
                  disabled={player[key] <= 0}
                  aria-label={`Tirar 1 de ${label}`}
                >
                  −1
                </button>
                <input
                  className="input"
                  style={{ width: 84, textAlign: 'center' }}
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={player[key]}
                  onChange={(event) =>
                    dispatch({
                      type: 'SET_COINS',
                      playerId: player.id,
                      coins: { [key]: Number.parseInt(event.target.value, 10) || 0 },
                    })
                  }
                  aria-label={`Quantidade de ${label}`}
                />
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() =>
                    dispatch({ type: 'ADJUST_COINS', playerId: player.id, coins: { [key]: 1 } })
                  }
                  aria-label={`Adicionar 1 de ${label}`}
                >
                  +1
                </button>
              </div>
            ))}

            <button
              type="button"
              className="btn btn--block"
              onClick={() => dispatch({ type: 'SIMPLIFY_COINS', playerId: player.id })}
            >
              Simplificar moedas
            </button>
            <p className="card__sub">
              Junta tudo e devolve na menor quantidade de moedas possível, sem mudar o valor.
            </p>
          </div>
        ) : (
          <div className="stack">
            <label className="field">
              <span className="field__label">Quanto</span>
              <input
                className="input"
                placeholder="ex.: 2 po ou 1 po 5 pp"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </label>

            <label className="field">
              <span className="field__label">Para quem</span>
              <select
                className="select"
                value={targetId}
                onChange={(event) => setTargetId(event.target.value)}
              >
                {state.players
                  .filter((other) => other.id !== player.id)
                  .map((other) => (
                    <option key={other.id} value={other.id}>
                      {other.name}
                    </option>
                  ))}
              </select>
            </label>

            {error ? <div className="notice notice--error">{error}</div> : null}

            <button
              type="button"
              className="btn btn--primary btn--block"
              onClick={send}
              disabled={state.players.length < 2}
            >
              Enviar dinheiro
            </button>

            <div className="row">
              <span className="card__sub">Você fica com</span>
              <div className="spacer" />
              <CoinBadges wallet={player} />
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
