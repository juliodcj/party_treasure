// Catalogo real, gerado por scripts/build-catalog.mjs a partir dos packs
// `equipment/` do repositorio foundryvtt/pf2e (~5.700 itens, licenca ORC).
// Os nomes ficam em ingles porque e assim que os dados do PF2e sao publicados;
// so a interface em volta e traduzida. Para atualizar, veja o cabecalho do script.

import RAW_CATALOG from './catalog.equipment.json' with { type: 'json' }

/**
 * Categorias reais do PF2e: o proprio `type` de cada item nos packs do
 * Foundry, sem agrupamento artificial. A ordem aqui e a ordem de exibicao.
 *
 * Os rotulos sao em portugues porque sao moldura nossa, nao dado do pack — eles
 * viram cabecalho de grupo na lista, ao lado de "Jogadores" e "Historico". O
 * nome do item continua em ingles (e como o PF2e publica), e a ficha tecnica de
 * arma/armadura tambem — ali o rotulo e o campo do proprio Foundry.
 */
export const CATEGORIES = {
  weapon: { label: 'Arma' },
  armor: { label: 'Armadura' },
  shield: { label: 'Escudo' },
  // Não é um `type` do Foundry — é "equipment" com system.usage "etched-onto-*"
  // (ver readCategory em lib/foundryImport.js). Separado pra não misturar com
  // baú, kit, óculos etc. na mesma categoria "Equipamento".
  rune: { label: 'Runa' },
  ammo: { label: 'Munição' },
  consumable: { label: 'Consumível' },
  equipment: { label: 'Equipamento' },
  backpack: { label: 'Recipiente' },
  treasure: { label: 'Tesouro' },
  kit: { label: 'Kit' },
}

export const CATEGORY_ORDER = Object.keys(CATEGORIES)

export function categoryLabel(category) {
  return CATEGORIES[category]?.label ?? 'Outro'
}

/** Catalogo completo de equipamentos do PF2e, ~5.700 itens. */
export const CATALOG = RAW_CATALOG
