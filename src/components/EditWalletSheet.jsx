import { useState } from 'react'
import Sheet, { SheetActions } from './Sheet.jsx'
import { CoinInputs } from './ItemForm.jsx'
import { useStore } from '../state/store.jsx'

/**
 * Clicar no dinheiro e definir o valor exato — diferente do "±" (soma/subtrai)
 * e do "Dar moedas" do Mestre (presenteia). Aqui é "o certo é este valor".
 */
export default function EditWalletSheet({ player, onClose }) {
  const { dispatch } = useStore()
  const [gold, setGold] = useState(String(player.gold))
  const [silver, setSilver] = useState(String(player.silver))
  const [copper, setCopper] = useState(String(player.copper))

  const save = () => {
    dispatch({
      type: 'SET_COINS',
      playerId: player.id,
      coins: {
        gold: Number.parseInt(gold, 10) || 0,
        silver: Number.parseInt(silver, 10) || 0,
        copper: Number.parseInt(copper, 10) || 0,
      },
    })
    onClose()
  }

  return (
    <Sheet center title={`Editar moedas de ${player.name}`} onClose={onClose}>
      <CoinInputs
        gold={gold}
        silver={silver}
        copper={copper}
        onGold={setGold}
        onSilver={setSilver}
        onCopper={setCopper}
      />
      <SheetActions onCancel={onClose} onConfirm={save} confirmLabel="Salvar" />
    </Sheet>
  )
}
