import { useState } from 'react'
import Sheet from '../../components/Sheet.jsx'
import Stepper from '../../components/Stepper.jsx'
import CONDITIONS from '../../data/conditions.json' with { type: 'json' }
import { MECHANICAL, conditionKey } from '../../lib/conditions.js'
import { useStore } from '../../state/store.jsx'

/*
 * As 43 condições do PF2e, vindas do pack do Foundry — em inglês, com a
 * descrição que a Paizo publicou. Nenhum texto de regra escrito à mão aqui: o
 * protótipo trazia 32 condições traduzidas por conta própria, e é exatamente
 * isso que não podia ser reaproveitado.
 *
 * As oito com efeito mecânico vêm primeiro, porque são as que mudam número na
 * tela. As outras 35 são marcação — o jogador aplica na mesa e a ficha lembra
 * dele — e ficam atrás do "Mais condições", para a lista curta ser a útil.
 */

const chaveDe = (condicao) => conditionKey(condicao.slug)

const COM_EFEITO = CONDITIONS.filter((c) => MECHANICAL[chaveDe(c)])
const SEM_EFEITO = CONDITIONS.filter((c) => !MECHANICAL[chaveDe(c)])

/* Encumbered aparece na lista sem efeito de propósito: o bulk foi adiado (D8),
   então marcá-la não muda número nenhum, e prometer que muda seria pior. */

export default function ConditionsSheet({ player, onClose }) {
  const { dispatch } = useStore()
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const ativas = player.vitals?.conditions ?? {}

  const definir = (key, value) =>
    dispatch({ type: 'SET_CONDITION', playerId: player.id, key, value })

  const lista = mostrarTodas ? [...COM_EFEITO, ...SEM_EFEITO] : COM_EFEITO

  return (
    <Sheet title="Condições" onClose={onClose}>
      <div className="cond__list">
        {lista.map((condicao) => {
          const key = chaveDe(condicao)
          const bruto = ativas[key]
          const valor = bruto === true ? 1 : Number(bruto) || 0
          const comValor = condicao.valued

          return (
            <div className={`cond__row${valor ? ' cond__row--on' : ''}`} key={condicao.slug}>
              <div className="cond__text">
                <span className="cond__name">{condicao.name}</span>
                <span className="cond__desc">{condicao.descriptionText}</span>
              </div>

              {comValor ? (
                <Stepper
                  value={valor}
                  label={condicao.name}
                  canDec={valor > 0}
                  onDec={() => definir(key, valor - 1)}
                  onInc={() => definir(key, valor + 1)}
                />
              ) : (
                <button
                  type="button"
                  className={`cond__check${valor ? ' cond__check--on' : ''}`}
                  role="switch"
                  aria-checked={valor > 0}
                  aria-label={condicao.name}
                  onClick={() => definir(key, !valor)}
                />
              )}
            </div>
          )
        })}
      </div>

      <button
        type="button"
        className="btn btn--neutral btn--block cond__more"
        onClick={() => setMostrarTodas((v) => !v)}
      >
        {mostrarTodas
          ? 'Só as que mudam número'
          : `Mais condições (${SEM_EFEITO.length})`}
      </button>

      {/* Par montado à mão, e não com <SheetActions>, por um motivo: "Limpar
          todas" é vermelho (§12.1 lista limpar condições como destrutivo), e o
          componente só sabe pintar o botão da esquerda. A ordem da casa fica
          igual — a ação que a pessoa veio fazer primeiro, a saída depois. */}
      <div className="sheet__actions">
        <button type="button" className="btn btn--solid btn--wide" onClick={onClose}>
          Pronto
        </button>
        <button
          type="button"
          className="btn btn--danger btn--wide"
          onClick={() => dispatch({ type: 'CLEAR_CONDITIONS', playerId: player.id })}
        >
          Limpar todas
        </button>
      </div>
    </Sheet>
  )
}

/** Os chips do bloco de condições, no Resumo. */
export function ConditionChips({ conditions }) {
  const ativas = CONDITIONS.filter((c) => {
    const valor = conditions[chaveDe(c)]
    return valor === true || Number(valor) > 0
  })

  if (!ativas.length) return <span className="charsheet__none">Nenhuma ativa</span>

  return (
    <span className="cond__chips">
      {ativas.map((condicao) => {
        const valor = conditions[chaveDe(condicao)]
        return (
          <span className="cond__chip" key={condicao.slug}>
            {condicao.name}
            {typeof valor === 'number' ? ` ${valor}` : ''}
          </span>
        )
      })}
    </span>
  )
}
