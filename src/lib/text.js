/** "1 item" / "3 itens" — a interface é em português, então o plural importa. */
export function plural(count, singular, many) {
  return `${count} ${count === 1 ? singular : many}`
}

/** "two-handed" -> "Two Handed" — para slugs do Foundry (group, category, subcategory). */
export function titleCase(slug) {
  return String(slug ?? '')
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
