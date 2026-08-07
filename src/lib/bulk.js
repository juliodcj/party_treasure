// Bulk no PF2e nao e um numero simples: existe "L" (leve) e "—" (negligenciavel).
// Guardamos internamente em decimos de Bulk para poder somar sem ponto flutuante feio.
// 1 Bulk = 10 unidades, L = 1 unidade, negligenciavel = 0.

const LIGHT = 1
const PER_BULK = 10

/**
 * Aceita as varias formas em que o bulk chega: 2, "2", "L", "l", "—", "-",
 * "negligible", null, ou o objeto { value } dos packs do Foundry.
 */
export function parseBulk(raw) {
  if (raw == null || raw === '') return 0
  if (typeof raw === 'object') return parseBulk(raw.value ?? raw.normal ?? 0)

  if (typeof raw === 'number') return Math.round(raw * PER_BULK)

  const text = String(raw).trim().toLowerCase()
  if (!text || text === '—' || text === '-' || text === 'negligible' || text === '0') return 0
  if (text === 'l' || text === 'light' || text === 'leve') return LIGHT

  const numeric = Number.parseFloat(text.replace(',', '.'))
  return Number.isFinite(numeric) ? Math.round(numeric * PER_BULK) : 0
}

/** Volta para a notacao que o jogador le na ficha. */
export function formatBulk(units) {
  const value = Math.max(0, Math.round(units || 0))
  if (value === 0) return '—'
  if (value < PER_BULK) return value === LIGHT ? 'L' : `${value}L`
  const whole = Math.floor(value / PER_BULK)
  const rest = value % PER_BULK
  return rest ? `${whole} + ${rest}L` : String(whole)
}
