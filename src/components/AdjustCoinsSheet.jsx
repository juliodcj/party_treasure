import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { CoinInputs } from './ItemForm.jsx'
import { useStore } from '../state/store.jsx'
import { toCopper } from '../lib/money.js'

/**
 * Ajustar moedas: soma ou subtrai um total (não por denominação) da carteira
 * do próprio personagem em foco. Igual ao croqui — dois botões, "+ Adicionar"
 * e "− Remover", nunca deixa o saldo ficar negativo.
 */
export default function AdjustCoinsSheet({ player, onClose }) {
  const { dispatch } = useStore()
  const [gold, setGold] = useState('')
  const [silver, setSilver] = useState('')
  const [copper, setCopper] = useState('')

  const amountCp = toCopper({
    gold: Number.parseInt(gold, 10) || 0,
    silver: Number.parseInt(silver, 10) || 0,
    copper: Number.parseInt(copper, 10) || 0,
  })

  const apply = (sign) => {
    if (!amountCp) return
    dispatch({ type: 'ADJUST_COINS', playerId: player.id, deltaCp: amountCp * sign })
    onClose()
  }

  return (
    <Sheet center title="Ajustar moedas" onClose={onClose}>
      <CoinInputs
        gold={gold}
        silver={silver}
        copper={copper}
        onGold={setGold}
        onSilver={setSilver}
        onCopper={setCopper}
      />
      <div className="sheet__actions">
        <button type="button" className="btn btn--danger btn--wide" onClick={() => apply(-1)}>
          − Remover
        </button>
        <button type="button" className="btn btn--solid btn--wide" onClick={() => apply(1)}>
          + Adicionar
        </button>
      </div>
    </Sheet>
  )
}
