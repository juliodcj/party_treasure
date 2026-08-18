import { useState } from 'react'
import Sheet, { SheetActions } from '../../components/Sheet.jsx'
import Stepper from '../../components/Stepper.jsx'
import { ChevronRight } from '../../components/Icons.jsx'
import CONDITIONS from '../../data/conditions.json' with { type: 'json' }
import { MECHANICAL, conditionKey } from '../../lib/conditions.js'
import { useStore } from '../../state/store.jsx'

/*
 * As 43 condições do PF2e, vindas do pack do Foundry — em inglês, com a
 * descrição que a Paizo publicou. Nenhum texto de regra escrito à mão aqui: o
 * protótipo trazia 32 condições traduzidas por conta própria, e é exatamente
 * isso que não podia ser reaproveitado.
 *
 * A lista curta tem dez. Dying e Wounded abrem, e as oito com efeito mecânico
 * vêm em seguida. As outras 33 são marcação — o jogador aplica na mesa e a
 * ficha lembra dele — e ficam atrás do "Mais condições".
 */

const chaveDe = (condicao) => conditionKey(condicao.slug)

/* Dying e Wounded não mudam número nenhum na tela, e mesmo assim são as duas
   primeiras: são as que a mesa mais mexe e as únicas em que errar o valor
   custa o personagem. Vêm antes das oito com efeito por decisão de uso, não
   por regra do sistema. */
const DESTAQUE = ['dying', 'wounded']

/* A ordem das oito é a de `MECHANICAL`, não a alfabética do pack: Frightened e
   Sickened são as que mais aparecem na mesa e por isso abrem o grupo. */
const ORDEM = Object.keys(MECHANICAL)

const emDestaque = (c) => DESTAQUE.includes(c.slug)

const DE_MORTE = CONDITIONS.filter(emDestaque).sort(
  (a, b) => DESTAQUE.indexOf(a.slug) - DESTAQUE.indexOf(b.slug),
)
const COM_EFEITO = CONDITIONS.filter((c) => !emDestaque(c) && MECHANICAL[chaveDe(c)]).sort(
  (a, b) => ORDEM.indexOf(chaveDe(a)) - ORDEM.indexOf(chaveDe(b)),
)
const SEM_EFEITO = CONDITIONS.filter((c) => !emDestaque(c) && !MECHANICAL[chaveDe(c)])

const CURTA = [...DE_MORTE, ...COM_EFEITO]

/* Encumbered aparece na lista sem efeito de propósito: o bulk foi adiado (D8),
   então marcá-la não muda número nenhum, e prometer que muda seria pior. */

export default function ConditionsSheet({ player, onClose }) {
  const { dispatch } = useStore()
  const [mostrarTodas, setMostrarTodas] = useState(false)
  const [aberta, setAberta] = useState(null)
  const ativas = player.vitals?.conditions ?? {}

  /* O mapa como estava quando a folha abriu. É o que o "Cancelar" devolve —
     inclusive depois de um "Limpar todas", que por isso não pede confirmação:
     aqui desfazer é um botão, não um diálogo. Se outro aparelho mexer nas
     condições enquanto a folha está aberta, cancelar desfaz aquilo também; é o
     que cancelar quer dizer, e a folha fica aberta segundos. */
  const [inicial] = useState(ativas)

  const definir = (key, value) =>
    dispatch({ type: 'SET_CONDITION', playerId: player.id, key, value })

  const cancelar = () => {
    dispatch({ type: 'SET_CONDITIONS', playerId: player.id, conditions: inicial })
    onClose()
  }

  const lista = mostrarTodas ? [...CURTA, ...SEM_EFEITO] : CURTA

  return (
    <Sheet
      title="Condições"
      onClose={onClose}
      fill
      /* "Limpar todas" age sobre a folha inteira, e não sobre uma linha: por
         isso mora no cabeçalho, e não no rodapé, que é do par Pronto/Cancelar.
         Vermelho tingido, e não cheio — o vermelho cheio é do botão largo do
         diálogo de confirmação (ver o comentário de `--danger`). */
      action={
        <button
          type="button"
          className="btn btn--danger-tint"
          onClick={() => dispatch({ type: 'CLEAR_CONDITIONS', playerId: player.id })}
        >
          Limpar todas
        </button>
      }
    >
      <div className="cond__list">
        {lista.map((condicao) => {
          const key = chaveDe(condicao)
          const bruto = ativas[key]
          const valor = bruto === true ? 1 : Number(bruto) || 0
          const comValor = condicao.valued
          const explicada = aberta === condicao.slug

          return (
            <div className={`cond__row${valor ? ' cond__row--on' : ''}`} key={condicao.slug}>
              <div className="cond__head">
                <button
                  type="button"
                  className="cond__toggle"
                  aria-expanded={explicada}
                  onClick={() => setAberta(explicada ? null : condicao.slug)}
                >
                  <span className="cond__name">{condicao.name}</span>
                  <span className="cond__caret">
                    <ChevronRight open={explicada} />
                  </span>
                </button>

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

              {explicada ? <p className="cond__desc">{condicao.descriptionText}</p> : null}
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
          ? 'Só a lista curta'
          : `Mais condições (${SEM_EFEITO.length})`}
      </button>

      <SheetActions confirmLabel="Pronto" onConfirm={onClose} onCancel={cancelar} />
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
