import { CATALOG } from '../data/catalog.js'

/** Mesa de exemplo, usada na primeira vez que o app abre no aparelho. */
export function createInitialState() {
  return {
    version: 1,
    activePlayerId: 'p-valeros',
    players: [
      {
        id: 'p-valeros',
        name: 'Valeros',
        gold: 12,
        silver: 4,
        copper: 8,
        items: { 'cat-longsword': 1, 'cat-chain-mail': 1, 'cat-healing-potion-minor': 2 },
        customItems: [],
      },
      {
        id: 'p-seelah',
        name: 'Seelah',
        gold: 9,
        silver: 0,
        copper: 5,
        items: { 'cat-steel-shield': 1, 'cat-adventurers-pack': 1, 'cat-antidote-lesser': 1 },
        customItems: [],
      },
      {
        id: 'p-ezren',
        name: 'Ezren',
        gold: 15,
        silver: 6,
        copper: 0,
        items: { 'cat-dagger': 1, 'cat-rope': 1, 'cat-healing-potion-lesser': 1 },
        customItems: [],
      },
    ],
    campaignItems: [],
    shops: [
      {
        id: 'shop-general',
        name: 'Armazém do Vilarejo',
        itemIds: ['cat-rope', 'cat-adventurers-pack', 'cat-thieves-tools', 'cat-dagger'],
      },
      {
        id: 'shop-smith',
        name: 'Forja do Anão',
        itemIds: ['cat-longsword', 'cat-greataxe', 'cat-steel-shield', 'cat-chain-mail', 'cat-leather-armor'],
      },
      {
        id: 'shop-alchemist',
        name: 'Botica da Alquimista',
        itemIds: [
          'cat-healing-potion-minor',
          'cat-healing-potion-lesser',
          'cat-antidote-lesser',
          'cat-alchemists-fire-lesser',
        ],
      },
      {
        id: 'shop-curiosities',
        name: 'Curiosidades do Andarilho',
        itemIds: ['cat-bag-of-holding', 'cat-shortbow'],
      },
    ],
  }
}

/** Ids do catalogo semente, para validar referencias vindas do armazenamento. */
export const CATALOG_IDS = new Set(CATALOG.map((item) => item.id))
