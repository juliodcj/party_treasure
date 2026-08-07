// Catalogo real, gerado por scripts/build-catalog.mjs a partir dos packs
// `equipment/` do repositorio foundryvtt/pf2e (~5.700 itens, licenca ORC).
// Os nomes ficam em ingles porque e assim que os dados do PF2e sao publicados;
// so a interface em volta e traduzida. Para atualizar, veja o cabecalho do script.

import RAW_CATALOG from './catalog.equipment.json' with { type: 'json' }

/**
 * Categorias reais do PF2e: o proprio `type` de cada item nos packs do
 * Foundry, sem agrupamento artificial. A ordem aqui e a ordem de exibicao.
 */
export const CATEGORIES = {
  weapon: { label: 'Weapon' },
  armor: { label: 'Armor' },
  shield: { label: 'Shield' },
  ammo: { label: 'Ammunition' },
  consumable: { label: 'Consumable' },
  equipment: { label: 'Equipment' },
  backpack: { label: 'Container' },
  treasure: { label: 'Treasure' },
  kit: { label: 'Kit' },
}

export const CATEGORY_ORDER = Object.keys(CATEGORIES)

export function categoryLabel(category) {
  return CATEGORIES[category]?.label ?? 'Other'
}

/** Catalogo completo de equipamentos do PF2e, ~5.700 itens. */
export const CATALOG = RAW_CATALOG
