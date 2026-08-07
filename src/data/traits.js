// Dicionario minimo de tracos, so para alimentar o popup de traco clicavel.
// Na Fase 2 isto e substituido pelas tabelas `traits`/`item_traits` geradas
// pela ingestao de `static/lang/en.json` do repositorio foundryvtt/pf2e.

export const TRAITS = {
  agile: {
    name: 'Ágil',
    description:
      'A penalidade em ataques múltiplos com esta arma é de -4 no segundo ataque e -8 nos demais, em vez de -5 e -10.',
  },
  alchemical: {
    name: 'Alquímico',
    description:
      'Item produzido por meios alquímicos, sem magia. Efeitos que afetam magia não o afetam.',
  },
  bomb: { name: 'Bomba', description: 'Consumível alquímico arremessado que causa dano em área.' },
  consumable: {
    name: 'Consumível',
    description: 'O item é gasto ao ser usado, normalmente com uma ação de Interagir.',
  },
  finesse: {
    name: 'Perícia',
    description:
      'Você pode usar seu modificador de Destreza em vez do de Força nas jogadas de ataque corpo a corpo.',
  },
  healing: { name: 'Cura', description: 'Efeito que restaura Pontos de Vida.' },
  magical: { name: 'Mágico', description: 'Item ou efeito produzido por magia.' },
  potion: {
    name: 'Poção',
    description: 'Consumível mágico bebido com uma ação de Interagir; afeta apenas quem bebe.',
  },
  thrown: {
    name: 'Arremesso',
    description: 'A arma pode ser arremessada; o alcance é indicado junto do traço.',
  },
  versatile: {
    name: 'Versátil',
    description: 'A arma pode causar um tipo de dano alternativo, indicado junto do traço.',
  },
  'deadly-d10': {
    name: 'Letal d10',
    description: 'Em um acerto crítico, a arma causa um dado de dano extra de d10.',
  },
  'two-hand-d10': {
    name: 'Duas Mãos d10',
    description: 'Empunhada com as duas mãos, o dado de dano da arma passa a ser d10.',
  },
  reach: { name: 'Alcance', description: 'A arma estende seu alcance em 1,50 m.' },
  parry: { name: 'Aparar', description: 'A arma pode ser usada defensivamente para ganhar bônus na CA.' },
  invested: {
    name: 'Investido',
    description: 'É preciso investir o item para usar seus efeitos mágicos. O limite é 10 itens investidos por dia.',
  },
  uncommon: { name: 'Incomum', description: 'Item de raridade incomum; exige acesso especial.' },
  rare: { name: 'Raro', description: 'Item de raridade rara; difícil de encontrar à venda.' },
}

/** Converte o slug do traco para um rotulo apresentavel mesmo sem verbete. */
export function traitLabel(slug) {
  const entry = TRAITS[slug]
  if (entry) return entry.name
  return String(slug)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export function traitDescription(slug) {
  return TRAITS[slug]?.description ?? 'Sem descrição cadastrada para este traço.'
}
