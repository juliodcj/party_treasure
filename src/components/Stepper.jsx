import { StepperMinus, StepperPlus } from './Icons.jsx'

/**
 * O "−" cinza e o "+" azul dentro de uma pílula tingida — um desenho só, em
 * dois tamanhos: `sm` na linha de lista, `lg` no diálogo em que a quantidade
 * é a decisão principal da tela.
 *
 * Antes havia quatro tamanhos (22, 24, 30, 34) e só a Loja tinha a pílula,
 * então a operação mais repetida do aplicativo parecia uma coisa diferente em
 * cada aba. Tamanho, vão e corpo do número agora saem do CSS, não de contas
 * aqui dentro.
 */
export default function Stepper({
  value,
  onDec,
  onInc,
  size = 'sm',
  canDec = true,
  canInc = true,
  label = 'quantidade',
}) {
  return (
    <div className={`stepper stepper--${size}`}>
      <button
        type="button"
        className="step step--minus"
        onClick={onDec}
        disabled={!canDec}
        aria-label={`Diminuir ${label}`}
      >
        <StepperMinus />
      </button>
      <span className="stepper__value">{value}</span>
      <button
        type="button"
        className="step step--plus"
        onClick={onInc}
        disabled={!canInc}
        aria-label={`Aumentar ${label}`}
      >
        <StepperPlus />
      </button>
    </div>
  )
}
