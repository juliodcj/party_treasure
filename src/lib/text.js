/** "1 item" / "3 itens" — a interface é em português, então o plural importa. */
export function plural(count, singular, many) {
  return `${count} ${count === 1 ? singular : many}`
}
