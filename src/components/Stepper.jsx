/** Controle +/- usado tanto na quantidade do inventário quanto no carrinho. */
export default function Stepper({ value, onChange, min = 0, max = Number.POSITIVE_INFINITY, label = 'quantidade' }) {
  return (
    <div className="stepper">
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(value - 1)}
        disabled={value <= min}
        aria-label={`Diminuir ${label}`}
      >
        −
      </button>
      <span className="stepper__value" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="stepper__btn"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`Aumentar ${label}`}
      >
        +
      </button>
    </div>
  )
}
