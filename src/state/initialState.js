import { CATALOG } from '../data/catalog.js'
import { emptySheetFields } from './migrations.js'
import { parsePathbuilder } from '../lib/pathbuilder.js'
import { reducer } from './reducer.js'
import RURIK from '../data/seed-sheets/rurik.json' with { type: 'json' }
import WIZARD from '../data/seed-sheets/wizard.json' with { type: 'json' }

/*
 * Duas fichas já vinculadas na mesa de exemplo — uma de bárbaro e uma com
 * magias — para a ficha abrir sem antes colar um JSON do Pathbuilder.
 *
 * Entram pelo mesmo `IMPORT_SHEET` que a tela despacha, e não escritas à mão:
 * assim HP inicial e magias preparadas saem da mesma regra, e a mesa de exemplo
 * não pode divergir do que uma importação de verdade produz.
 *
 * O que elas não têm é a resolução dos packs, que é do servidor e acontece na
 * importação: feat aparece com o nome e sem o texto de regra, a mesma degradação
 * de quando o corpus não foi gerado. Quem quiser as descrições reimporta pela
 * tela do Mestre.
 */
const FICHAS_DE_EXEMPLO = {
  'p-valeros': RURIK,
  'p-ezren': WIZARD,
}

function comFichasDeExemplo(state) {
  return Object.entries(FICHAS_DE_EXEMPLO).reduce((atual, [playerId, json]) => {
    const sheet = parsePathbuilder(JSON.stringify(json))
    return sheet.ok ? reducer(atual, { type: 'IMPORT_SHEET', playerId, sheet }) : atual
  }, state)
}

/**
 * Mesa de exemplo, usada na primeira vez que o servidor sobe (quando ainda não
 * existe `data/mesa.json`). Só dado compartilhado: em qual personagem cada
 * aparelho está olhando é sessão, não mesa — ver `state/session.js`.
 */
export function createInitialState() {
  return comFichasDeExemplo({
    version: 6,
    // Config da mesa: livros que o mestre possui + remaster/legado, persistida
    // e compartilhada por todas as telas (não é um filtro por aba, como os outros).
    settings: { ownedCategories: [], remasterFilter: 'all' },
    // Log das últimas alterações "perigosas", para o mestre poder reverter.
    history: [],
    players: [
      {
        id: 'p-valeros',
        name: 'Valeros',
        gold: 45,
        silver: 7,
        copper: 13,
        items: {
          'cat-longsword': 1,
          'cat-dagger': 1,
          'cat-leather-armor': 1,
          'cat-steel-shield': 1,
          'cat-rope': 1,
          'cat-healing-potion-minor': 2,
        },
        customItems: [],
        itemNotes: {},
        ...emptySheetFields(),
      },
      {
        id: 'p-seelah',
        name: 'Seelah',
        gold: 80,
        silver: 5,
        copper: 0,
        items: {
          'cat-chain-mail': 1,
          'cat-steel-shield': 1,
          'cat-antidote-lesser': 2,
          'cat-healing-potion-lesser': 1,
        },
        customItems: [],
        itemNotes: {},
        ...emptySheetFields(),
      },
      {
        id: 'p-ezren',
        name: 'Ezren',
        gold: 30,
        silver: 15,
        copper: 24,
        items: {
          'cat-dagger': 1,
          'cat-shortbow': 1,
          'cat-spacious-pouch-type-i': 1,
          'cat-healing-potion-minor': 1,
        },
        customItems: [],
        itemNotes: {},
        ...emptySheetFields(),
      },
    ],
    campaignItems: [],
    shops: [
      {
        id: 'shop-smith',
        name: 'Ferreiro de Venis',
        itemIds: [
          'cat-longsword',
          'cat-dagger',
          'cat-greataxe',
          'cat-leather-armor',
          'cat-chain-mail',
          'cat-steel-shield',
        ],
      },
      {
        id: 'shop-apothecary',
        name: 'Botica da Serena',
        itemIds: [
          'cat-healing-potion-minor',
          'cat-healing-potion-lesser',
          'cat-antidote-lesser',
          'cat-alchemists-fire-lesser',
        ],
      },
      {
        id: 'shop-arcane',
        name: 'Empório Arcano',
        itemIds: ['cat-spacious-pouch-type-i'],
      },
      {
        id: 'shop-general',
        name: 'Mercado Geral',
        itemIds: ['cat-rope', 'cat-adventurers-pack', 'cat-thieves-toolkit', 'cat-shortbow'],
      },
    ],
  })
}

/** Ids do catalogo semente, para validar referencias vindas do armazenamento. */
export const CATALOG_IDS = new Set(CATALOG.map((item) => item.id))
