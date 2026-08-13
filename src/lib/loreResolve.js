/* Resolve os nomes que o Pathbuilder manda contra o corpus do Foundry.
 *
 * O Pathbuilder exporta só nomes: `feats` traz ["Sudden Charge", …] e
 * `specials` traz ["Rage", "Giant Instinct", "Darkvision", …]. Descrição,
 * traços e custo em ações vêm dos packs — e vêm do servidor, porque o corpus
 * tem 15 MB e não cabe no bundle de um Android baratinho (D10).
 *
 * **Casamento por nome exato**, com caixa e pontuação normalizadas, e nada além
 * disso. Nada de aproximação: é exatamente o mesmo erro que fez o app não
 * importar item do Pathbuilder (D2). "Hide" e "Hide Armor" são itens
 * diferentes, e um casamento fuzzy que acerta 95% das vezes é um que erra
 * calado nos outros 5%.
 *
 * Taxa medida com os 10 nomes do Rurik: 9 resolvem — 7 nos packs, 2 no
 * glossário do arquivo de localização (`Darkvision`, `Low-Light Vision`).
 * `Sailing Lore` não resolve, e está certo: é perícia, não feat.
 */

/**
 * Chave de casamento de nome. Um lugar só: a ingestão, o servidor e o cliente
 * precisam concordar, e duas cópias que divergem produzem "não encontrado" para
 * um nome que está lá.
 *
 * Normaliza caixa, acento, aspa curva e espaço repetido — e **hífen vira
 * espaço**. Isto não é casamento aproximado: é a mesma sequência de letras com
 * a pontuação padronizada. O motivo é concreto: o glossário do Foundry grava a
 * chave `LowLightVision`, que vira "Low Light Vision", e o Pathbuilder escreve
 * "Low-Light Vision". Sem isso, um dos dois sentidos do Rurik ficava sem
 * descrição.
 */
export const normalizeName = (name) =>
  String(name ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[‘’']/g, "'")
    .replace(/[-‐-―]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * Todo nome que a ficha precisa resolver, sem repetição.
 *
 * Vale para os dois: `feats` e `specials`. "Dromaar" está nas duas listas do
 * Rurik — pedir duas vezes seria desperdício, e cada lista guarda de onde veio.
 */
export function namesToResolve(sheet) {
  if (!sheet) return []
  const nomes = [...(sheet.feats ?? []).map((f) => f.name), ...(sheet.specials ?? [])]
  return [...new Set(nomes.filter(Boolean))]
}

/**
 * Pede ao servidor os verbetes de uma lista de nomes.
 *
 * @param {string[]} names
 * @param {(url: string) => Promise<Response>} fetcher — injetado para o teste
 *   não precisar de rede, e para o servidor poder usar o corpus direto.
 * @returns {Promise<{ entries: object, resolved: object, unresolved: string[] }>}
 */
export async function fetchEntriesByName(names, fetcher = fetch) {
  const lista = [...new Set(names.filter(Boolean))]
  if (!lista.length) return { entries: {}, resolved: {}, unresolved: [] }

  /* Um GET com 300 nomes estoura o limite de URL de alguns proxies, então vai
     em lotes. Na mesa é localhost, mas o custo de lotear é zero. */
  const LOTE = 80
  const juntos = { entries: {}, resolved: {}, unresolved: [] }

  for (let i = 0; i < lista.length; i += LOTE) {
    const fatia = lista.slice(i, i + LOTE)
    const url = `/api/entries?names=${fatia.map(encodeURIComponent).join(',')}`
    let payload
    try {
      const response = await fetcher(url)
      if (!response.ok) {
        /* Servidor sem corpus (503) ou fora do ar: a ficha entra assim mesmo,
           com os nomes que vieram e sem descrição. Ficha sem descrição é pior
           que ficha com — mas é muito melhor que importação recusada. */
        juntos.unresolved.push(...fatia)
        continue
      }
      payload = await response.json()
    } catch {
      juntos.unresolved.push(...fatia)
      continue
    }
    Object.assign(juntos.entries, payload.entries ?? {})
    Object.assign(juntos.resolved, payload.resolved ?? {})
    juntos.unresolved.push(...(payload.unresolved ?? []))
  }

  return juntos
}

/* Verbete de qual pack vira ação em vez de feat. "Rage" resolve para a feature
   de classe (a prioridade manda), e feature de classe é o que a aba Feats
   mostra; o pack `actions` é o que alimenta a aba Ações. */
const KIND_ACAO = new Set(['action'])

const custo = (entry) => entry?.actionCost ?? null

/**
 * Junta os verbetes resolvidos à ficha, sem perder nada.
 *
 * Função pura: recebe a ficha e o resultado da resolução, devolve ficha nova.
 * O que não resolveu **continua na lista**, com o nome que veio e sem
 * descrição, e mais uma vez em `sheet.unresolved` — some da tela é o único
 * desfecho proibido.
 */
export function applyResolution(sheet, { entries = {}, resolved = {} } = {}) {
  if (!sheet) return sheet

  const verbete = (name) => {
    const id = resolved[name]
    return id ? entries[id] ?? null : null
  }

  const enriquecer = (base, entry) => ({
    ...base,
    id: entry?.id ?? null,
    slug: entry?.slug ?? null,
    actionCost: custo(entry),
    traits: entry?.traits ?? [],
    rarity: entry?.rarity ?? null,
    descriptionHtml: entry?.descriptionHtml ?? null,
    descriptionText: entry?.descriptionText ?? null,
    // Requisito de licença (ORC/OGL): a atribuição viaja com o verbete.
    entrySource: entry?.source ?? null,
    kind: entry?.kind ?? null,
    resolved: Boolean(entry),
  })

  const feats = (sheet.feats ?? []).map((feat) => enriquecer(feat, verbete(feat.name)))

  /* Um special vira ação quando o corpus diz que ele é ação, e feature quando
     diz que é feature. Nome que já veio em `feats` não entra de novo. */
  const jaEmFeats = new Set(feats.map((f) => f.name))
  const acoes = []
  const featsDeSpecials = []

  for (const name of sheet.specials ?? []) {
    if (jaEmFeats.has(name)) continue
    const entry = verbete(name)
    const base = {
      name,
      choice: null,
      category: entry?.category ?? null,
      level: entry?.level ?? null,
      source: entry?.name && entry.kind ? LABEL_KIND[entry.kind] ?? null : null,
      origin: 'specials',
    }
    if (entry && KIND_ACAO.has(entry.kind)) acoes.push(enriquecer(base, entry))
    else featsDeSpecials.push(enriquecer(base, entry))
  }

  const todos = [...feats, ...featsDeSpecials, ...acoes]
  const unresolved = todos.filter((f) => !f.resolved).map((f) => f.name)

  return {
    ...sheet,
    feats: [...feats, ...featsDeSpecials],
    actions: acoes,
    unresolved,
  }
}

/* Só rótulo de moldura nossa, por isso em português. O conteúdo — nome do feat,
   descrição, traço — continua em inglês, como o pack publica (D12). */
const LABEL_KIND = {
  'class-feature': 'Feature de classe',
  heritage: 'Herança',
  'ancestry-feature': 'Ancestralidade',
  feat: 'Feat',
  action: 'Ação',
  glossary: 'Sentido',
}
