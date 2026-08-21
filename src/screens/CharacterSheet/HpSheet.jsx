import { useState } from 'react'
import Sheet from '../../components/Sheet.jsx'
import { ClockIcon } from '../../components/Icons.jsx'
import { useStore } from '../../state/store.jsx'

/* Rótulo do que aconteceu, para o registro. A chave vem do reducer; se um dia
   vier uma que não está aqui, aparece como veio em vez de sumir. */
const ROTULO_LOG = { dano: 'Dano', cura: 'Cura', temp: 'HP temp.' }

/* Atalhos de digitação: o dano da mesa quase sempre passa por estes três. */
const ATALHOS = [1, 5, 10]

function hora(at) {
  if (!at) return ''
  return new Date(at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

/*
 * Dano e cura.
 *
 * Um campo só, como no protótipo: o dano da mesa tanto é 3 quanto é 19, e
 * digitar custa o mesmo nos dois casos. O stepper cobrava um toque por ponto.
 * Os atalhos +1/+5/+10 somam no campo — não aplicam nada sozinhos.
 *
 * "Acrescentar" vem antes de "Reduzir" pela regra da casa: a ação positiva à
 * esquerda. As duas agem, então nenhuma é o "cancelar" do par.
 *
 * O relógio do cabeçalho abre o registro dos dez últimos danos e curas, que é
 * fato de mesa e vem do servidor — quem estava com 40 e está com 12 consegue
 * ver onde foi parar a diferença.
 */
export default function HpSheet({ player, view, onClose }) {
  const { dispatch } = useStore()
  const [valor, setValor] = useState('')
  const [temp, setTemp] = useState('')
  const [logAberto, setLogAberto] = useState(false)

  const log = player.vitals?.hpLog ?? []
  const cheio = view.hp >= view.hpMax

  const somar = (campo, definir) => (n) => {
    definir(String(Math.max(0, Math.trunc(Number(campo) || 0)) + n))
  }

  const aplicar = (tipo) => {
    const quantia = Math.max(0, Math.trunc(Number(valor) || 0))
    if (quantia > 0) dispatch({ type: tipo, playerId: player.id, amount: quantia })
    onClose()
  }

  return (
    <Sheet
      title={`Pontos de vida de ${player.sheet.name}`}
      onClose={onClose}
      action={
        <button
          type="button"
          className="icon-btn icon-btn--accent"
          onClick={() => setLogAberto((aberto) => !aberto)}
          aria-expanded={logAberto}
          aria-label="Últimos danos e curas"
          title="Últimos danos e curas"
        >
          <ClockIcon />
        </button>
      }
    >
      <div className="hp-sheet__top">
        <div className="hp-sheet__now">
          <span className="hp-sheet__hp">{view.hp}</span>
          <span className="hp-sheet__max">/ {view.hpMax}</span>
          <button
            type="button"
            className="btn btn--tint hp-sheet__full"
            disabled={cheio}
            onClick={() =>
              dispatch({ type: 'APPLY_HEAL', playerId: player.id, amount: view.hpMax - view.hp })
            }
          >
            Curar tudo
          </button>
        </div>
        {view.tempHp > 0 ? (
          <div className="hp-sheet__temp-badge">
            <span className="label hp-sheet__temp-label">HP temp.</span>
            <span className="hp-sheet__temp-value">+{view.tempHp}</span>
          </div>
        ) : null}
      </div>

      {logAberto ? (
        <div className="hp-sheet__log">
          {log.length === 0 ? (
            <div className="empty empty--inline">Nada aconteceu ainda.</div>
          ) : (
            log.map((entrada, indice) => (
              <div className="hp-sheet__log-row" key={`${entrada.at}-${indice}`}>
                <span className="hp-sheet__log-kind">
                  {ROTULO_LOG[entrada.kind] ?? entrada.kind}
                </span>
                <span
                  className={`hp-sheet__log-amount${entrada.kind === 'dano' ? ' hp-sheet__log-amount--dano' : ''}`}
                >
                  {/* "HP temp. 0" é a fonte de temporário que acabou; um "+0"
                      ali leria como se tivesse ganhado alguma coisa. */}
                  {entrada.kind === 'dano' ? '−' : entrada.amount > 0 ? '+' : ''}
                  {entrada.amount}
                </span>
                <span className="hp-sheet__log-time">{hora(entrada.at)}</span>
              </div>
            ))
          )}
        </div>
      ) : null}

      <div className="hp-sheet__amount-row">
        <span className="field-label">Quanto?</span>
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
        {ATALHOS.map((n) => (
          <button
            key={n}
            type="button"
            className="btn btn--tint hp-sheet__quick"
            onClick={() => somar(valor, setValor)(n)}
          >
            +{n}
          </button>
        ))}
      </div>

      <div className="hp-sheet__pair">
        <button type="button" className="btn btn--solid btn--wide" onClick={() => aplicar('APPLY_HEAL')}>
          Acrescentar
        </button>
        <button type="button" className="btn btn--danger btn--wide" onClick={() => aplicar('APPLY_DAMAGE')}>
          Reduzir
        </button>
      </div>

      <div className="hp-sheet__temp-box">
        {/* Não acumula: vale o maior entre o que já tinha e o novo. Definir 0
            é como se tira o que sobrou de uma fonte que acabou. Por isso o
            botão é "Definir", e não "Adicionar". */}
        <span className="field-label">HP temporário</span>
        <div className="hp-sheet__temp-row">
          <input
            className="input input--sm hp-sheet__temp-amount"
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={temp}
            onChange={(event) => setTemp(event.target.value)}
            aria-label="HP temporário"
          />
          {ATALHOS.map((n) => (
            <button
              key={n}
              type="button"
              className="btn btn--tint hp-sheet__quick hp-sheet__quick--temp"
              onClick={() => somar(temp, setTemp)(n)}
            >
              +{n}
            </button>
          ))}
          <button
            type="button"
            className="btn btn--solid hp-sheet__temp-apply"
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
