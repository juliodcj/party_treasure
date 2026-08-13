// Dicionario real de tracos, gerado por scripts/build-traits.mjs a partir do
// arquivo de localizacao oficial do foundryvtt/pf2e (static/lang/en.json).
// Fica em ingles de proposito: e a mesma lingua dos nomes de item, e evita
// tradução amadora de texto de regra.

import TRAIT_DICT from './traits.json' with { type: 'json' }

export const TRAITS = TRAIT_DICT

/** Converte o slug do traco para um rotulo apresentavel mesmo sem verbete oficial. */
export function traitLabel(slug) {
  const entry = TRAITS[slug]
  if (entry) return entry.name
  return String(slug)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function traitDescription(slug) {
  return TRAITS[slug]?.description ?? 'No official description for this trait yet.'
}
