import { StepperMinus, StepperPlus } from './Icons.jsx'

/**
 * Passo redondo do protótipo: o "−" cinza e o "+" azul.
 * O tamanho muda conforme o lugar — 22 nas listas do mestre, 24 no carrinho,
 * 30 dentro do item aberto, 34 no diálogo de venda.
 */
export default function Stepper({
  value,
  onDec,
  onInc,
  size = 30,
  canDec = true,
  canInc = true,
  valueSize,
  gap,
  label = 'quantidade',
}) {
  const glyph = Math.round(size * 0.36)
  return (
    <div className="stepper" style={{ gap: gap ?? (size >= 30 ? 10 : 6) }}>
      <button
        type="button"
        className="step step--minus"
        style={{ width: size, height: size }}
        onClick={onDec}
        disabled={!canDec}
        aria-label={`Diminuir ${label}`}
      >
        <StepperMinus width={glyph} />
      </button>
      <span
        className="stepper__value"
        style={{ fontSize: valueSize ?? (size >= 30 ? 16 : 13), minWidth: size >= 30 ? 16 : 14 }}
      >
        {value}
      </span>
      <button
        type="button"
        className="step step--plus"
        style={{ width: size, height: size }}
        onClick={onInc}
        disabled={!canInc}
        aria-label={`Aumentar ${label}`}
      >
        <StepperPlus size={glyph} />
      </button>
    </div>
  )
}
