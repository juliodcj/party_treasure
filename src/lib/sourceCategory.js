// Os 153 livros de origem do catálogo não têm uma "linha de produto" nos
// dados do Foundry — só o título. Agrupamos por padrão de nome nas quatro
// categorias que o mestre pensa na hora de escolher o que possui.

export const CONTENT_CATEGORIES = [
  { id: 'core', label: 'Core' },
  { id: 'supplements', label: 'Suplementos' },
  { id: 'lost-omens', label: 'Lost Omens' },
  { id: 'adventure-paths', label: 'Aventuras' },
]

const CORE_TITLES = new Set([
  'Pathfinder Core Rulebook',
  'Pathfinder Player Core',
  'Pathfinder Player Core 2',
  'Pathfinder GM Core',
  'Pathfinder Gamemastery Guide',
  'Pathfinder NPC Core',
  'Pathfinder Monster Core',
  'Pathfinder Monster Core 2',
  'Pathfinder Bestiary',
  'Pathfinder Bestiary 2',
  "Pathfinder Advanced Player's Guide",
])

function isAdventure(title) {
  return (
    /^Pathfinder #\d+:/.test(title) ||
    /^Pathfinder Adventure Path:/.test(title) ||
    /^Pathfinder Adventures?:/.test(title) ||
    /^Pathfinder Special:/.test(title) ||
    /^Pathfinder Society (Scenario|Quest)/.test(title) ||
    /^Pathfinder One-Shot/.test(title) ||
    /^Pathfinder Wake the Dead/.test(title) ||
    /^Pathfinder Beginner Box/.test(title) ||
    /^Pathfinder Kingmaker$/.test(title) ||
    /Hardcover Compilation$/.test(title)
  )
}

/** 'core' | 'supplements' | 'lost-omens' | 'adventure-paths' | null (sem fonte). */
export function sourceCategory(title) {
  if (!title) return null
  const trimmed = title.trim()
  if (/Lost Omens/i.test(trimmed)) return 'lost-omens'
  if (CORE_TITLES.has(trimmed)) return 'core'
  if (isAdventure(trimmed)) return 'adventure-paths'
  return 'supplements'
}
