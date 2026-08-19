/* A bagagem que veio no JSON do Pathbuilder, casada com o catálogo.
 *
 * `parsePathbuilder` entrega nome cru (`{ name, qty, kind }`); aqui ele vira id
 * do catálogo — ou não vira, e então vira item avulso com o nome que veio.
 *
 * Por que este arquivo existe separado do leitor e do reducer: o casamento por
 * nome é a parte perigosa da importação de itens, a que fez D2 fechar a porta
 * ("Hide" no Pathbuilder é "Hide Armor" no catálogo). Num lugar só, ele tem
 * teste, tem regra escrita e — o que mais importa — tem como dizer o que não
 * casou. Nome que não casa não some e não é aproximado: entra como item avulso
 * e aparece na conferência antes de a pessoa confirmar.
 *
 * A tela usa isto para MOSTRAR o que vai entrar; o reducer usa para APLICAR.
 * A mesma função nos dois lados, senão a conferência mente.
 */

import { CATALOG } from '../data/catalog.js'

/* Índice nome → item, montado na primeira chamada e reaproveitado: são ~5.700
   itens e a importação percorre a lista inteira uma vez por nome. Os nomes do
   catálogo são únicos (conferido no teste), então não há desempate a fazer. */
let porNome = null
function catalogoPorNome() {
  if (porNome) return porNome
  porNome = new Map()
  for (const item of CATALOG) porNome.set(item.name.trim().toLowerCase(), item)
  return porNome
}

/** Categoria do item avulso quando o nome não casa: a lista de onde ele veio. */
const CATEGORY_BY_KIND = { weapon: 'weapon', armor: 'armor', equipment: 'equipment' }

/*
 * Os nomes que vale a pena tentar, em ordem, para uma entrada do Pathbuilder.
 *
 * A lista é curta de propósito. Cada tentativa nova é uma chance de casar com o
 * item errado calado, que é pior que não casar: o item avulso aparece na tela
 * com o nome que veio, e o item errado ninguém percebe.
 *
 * - Exato, sempre. É o caso de quase tudo — "Rope", "Javelin", "Steel Shield".
 * - `+ " Armor"`, só para quem veio da lista `armor`: o Pathbuilder grava
 *   "Hide" e "Leather", o catálogo publica "Hide Armor" e "Leather Armor". Não
 *   vale para as outras listas — "Chain" na mochila não é armadura.
 */
function candidatos(name, kind) {
  const base = name.trim().toLowerCase()
  return kind === 'armor' ? [base, `${base} armor`] : [base]
}

/**
 * Resolve a bagagem contra o catálogo.
 *
 * @param {Array<{name: string, qty: number, kind: string}>} entries `sheet.startingItems`
 * @returns {{matched: Array, unmatched: Array}} `matched` traz `{ itemId, name,
 *   qty }` do catálogo; `unmatched` traz `{ name, qty, category }` para virar
 *   item avulso. Quantidades do mesmo item somam — quem tem a azagaia em duas
 *   listas do Pathbuilder fica com uma linha só na mochila.
 */
export function resolveStartingItems(entries) {
  const indice = catalogoPorNome()
  const matched = new Map()
  const unmatched = new Map()

  for (const entry of Array.isArray(entries) ? entries : []) {
    const name = typeof entry?.name === 'string' ? entry.name.trim() : ''
    if (!name) continue
    const qty = Math.max(1, Math.round(Number(entry.qty) || 1))

    const achado = candidatos(name, entry.kind).map((chave) => indice.get(chave)).find(Boolean)

    if (achado) {
      const atual = matched.get(achado.id)
      if (atual) atual.qty += qty
      else matched.set(achado.id, { itemId: achado.id, name: achado.name, qty })
      continue
    }

    const category = CATEGORY_BY_KIND[entry.kind] ?? 'equipment'
    const chave = `${category}:${name.toLowerCase()}`
    const atual = unmatched.get(chave)
    if (atual) atual.qty += qty
    else unmatched.set(chave, { name, qty, category })
  }

  return { matched: [...matched.values()], unmatched: [...unmatched.values()] }
}
