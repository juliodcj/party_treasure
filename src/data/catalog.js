// Catalogo semente. Na Fase 2 ele e substituido pelo SQLite gerado a partir dos
// packs `equipment/` do repositorio foundryvtt/pf2e (~5.700 itens).
// Os nomes ficam em ingles porque e assim que os dados do PF2e serao ingeridos;
// so a interface e traduzida.

import { CP_PER_GP, CP_PER_SP } from '../lib/money.js'

/** Categorias espelham o campo `type` dos packs do Foundry. */
export const CATEGORIES = {
  weapon: { label: 'Arma', group: 'equipment' },
  armor: { label: 'Armadura', group: 'equipment' },
  shield: { label: 'Escudo', group: 'equipment' },
  equipment: { label: 'Equipamento', group: 'equipment' },
  backpack: { label: 'Recipiente', group: 'equipment' },
  consumable: { label: 'Consumível', group: 'consumable' },
  treasure: { label: 'Tesouro', group: 'other' },
}

export const GROUPS = [
  { id: 'equipment', label: 'Equipamentos' },
  { id: 'consumable', label: 'Consumíveis' },
  { id: 'other', label: 'Outros' },
]

export function categoryLabel(category) {
  return CATEGORIES[category]?.label ?? 'Outro'
}

export function groupOf(category) {
  return CATEGORIES[category]?.group ?? 'other'
}

const gp = (n) => Math.round(n * CP_PER_GP)
const sp = (n) => Math.round(n * CP_PER_SP)

export const CATALOG = [
  {
    id: 'cat-longsword',
    name: 'Longsword',
    level: 0,
    category: 'weapon',
    priceCp: gp(1),
    bulk: 1,
    traits: ['versatile'],
    description: 'Espada de lâmina reta e gume duplo, arma marcial de uma mão. Dano 1d8 cortante.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-dagger',
    name: 'Dagger',
    level: 0,
    category: 'weapon',
    priceCp: sp(2),
    bulk: 'L',
    traits: ['agile', 'finesse', 'thrown', 'versatile'],
    description: 'Lâmina curta e leve, fácil de esconder e de arremessar. Dano 1d4 perfurante.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-greataxe',
    name: 'Greataxe',
    level: 0,
    category: 'weapon',
    priceCp: gp(2),
    bulk: 2,
    traits: ['sweep', 'two-hand-d10'],
    description: 'Machado pesado de duas mãos, arma marcial. Dano 1d12 cortante.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-shortbow',
    name: 'Shortbow',
    level: 0,
    category: 'weapon',
    priceCp: gp(3),
    bulk: 1,
    traits: ['deadly-d10'],
    description: 'Arco curto, alcance 18 m. Dano 1d6 perfurante.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-leather-armor',
    name: 'Leather Armor',
    level: 0,
    category: 'armor',
    priceCp: gp(2),
    bulk: 1,
    traits: [],
    description: 'Armadura leve de couro tratado. Bônus na CA +1, limite de Destreza +4.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-chain-mail',
    name: 'Chain Mail',
    level: 0,
    category: 'armor',
    priceCp: gp(6),
    bulk: 2,
    traits: ['flexible', 'noisy'],
    description: 'Cota de malha. Bônus na CA +4, limite de Destreza +1, penalidade em testes -2.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-steel-shield',
    name: 'Steel Shield',
    level: 0,
    category: 'shield',
    priceCp: gp(2),
    bulk: 1,
    traits: [],
    // Dureza, PV e LR vem dos packs do Foundry. LR = piso de PV maximo / 2.
    shield: { hardness: 5, hpMax: 20, bt: 10 },
    description: 'Escudo de aço. Bônus na CA +2 quando erguido. Dureza 5, PV 20, LR 10.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-healing-potion-minor',
    name: 'Healing Potion (Minor)',
    level: 1,
    category: 'consumable',
    priceCp: gp(4),
    bulk: 'L',
    traits: ['consumable', 'healing', 'magical', 'potion'],
    description: 'Ao beber, você recupera 1d8 Pontos de Vida.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-healing-potion-lesser',
    name: 'Healing Potion (Lesser)',
    level: 3,
    category: 'consumable',
    priceCp: gp(12),
    bulk: 'L',
    traits: ['consumable', 'healing', 'magical', 'potion'],
    description: 'Ao beber, você recupera 2d8+5 Pontos de Vida.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-alchemists-fire-lesser',
    name: "Alchemist's Fire (Lesser)",
    level: 1,
    category: 'consumable',
    priceCp: gp(3),
    bulk: 'L',
    traits: ['alchemical', 'bomb', 'consumable', 'fire', 'splash'],
    description: 'Bomba arremessada: 1d8 de dano de fogo, 1 de dano persistente e 1 de respingo.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-antidote-lesser',
    name: 'Antidote (Lesser)',
    level: 1,
    category: 'consumable',
    priceCp: gp(3),
    bulk: 'L',
    traits: ['alchemical', 'consumable', 'elixir', 'healing'],
    description: 'Concede +2 de bônus de item em salvaguardas contra veneno por 6 horas.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-adventurers-pack',
    name: "Adventurer's Pack",
    level: 0,
    category: 'backpack',
    priceCp: sp(7),
    bulk: 1,
    traits: [],
    description:
      'Mochila, saco de dormir, dois sabonetes, isqueiro, 21 m de corda, ração para 2 semanas, cantil e kit de cozinha.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-rope',
    name: 'Rope (50 feet)',
    level: 0,
    category: 'equipment',
    priceCp: sp(5),
    bulk: 'L',
    traits: [],
    description: '15 metros de corda de cânhamo.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-thieves-tools',
    name: "Thieves' Tools",
    level: 0,
    category: 'equipment',
    priceCp: gp(3),
    bulk: 'L',
    traits: [],
    description: 'Necessárias para Arrombar fechaduras e Desarmar armadilhas com Ladinagem.',
    source: { title: 'Pathfinder Player Core', license: 'ORC', remaster: true },
  },
  {
    id: 'cat-bag-of-holding',
    name: 'Bag of Holding (Type I)',
    level: 4,
    category: 'backpack',
    priceCp: gp(75),
    bulk: 1,
    traits: ['extradimensional', 'magical', 'uncommon'],
    description: 'Carrega até 25 Bulk de itens mantendo o Bulk de 1 para quem a leva.',
    source: { title: 'Pathfinder GM Core', license: 'ORC', remaster: true },
  },
]
