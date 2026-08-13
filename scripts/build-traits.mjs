// Gera src/data/traits.equipment.json com nome + descricao REAIS de todo
// traco que aparece no catalogo, extraidos do arquivo de localizacao oficial
// do foundryvtt/pf2e (`static/lang/en.json`, chaves `PF2E.Trait*`).
//
// Uso:
//   node scripts/build-traits.mjs
//
// Le do mesmo clone do build-catalog.mjs (vendor/pf2e por padrao). Pode receber
// a raiz do clone ou o proprio en.json.
//
// O Foundry deriva a chave de localizacao do slug capitalizando cada trecho
// separado por hifen e concatenando (ex.: "deadly-d10" -> "TraitDeadlyD10").
// Fazemos o mesmo caminho de ida para cada slug que o catalogo realmente usa;
// o que nao tiver verbete oficial fica de fora e cai no formatador de
// fallback que ja existe em src/data/traits.js.
//
// Tracos parametrizados (versatile-p, thrown-10, deadly-d10, fatal-aim-d12...)
// tem NOME proprio no en.json mas nao tem descricao propria — a descricao e
// a do traco base (versatile, thrown, deadly, fatal-aim). Por isso, quando o
// slug exato nao tem `TraitDescription*`, tentamos prefixos cada vez mais
// curtos do slug (removendo um trecho por vez) ate achar uma descricao.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { DEFAULT_VENDOR, resolveLangFile } from './vendor-pf2e.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const enJsonPath = resolveLangFile(process.argv[2] ?? DEFAULT_VENDOR)
console.log(`Lendo ${enJsonPath}`)

const catalog = JSON.parse(readFileSync(path.join(__dirname, '../src/data/catalog.equipment.json'), 'utf8'))
const en = JSON.parse(readFileSync(enJsonPath, 'utf8'))
const PF2E = en.PF2E ?? {}

const slugs = new Set()
for (const item of catalog) {
  for (const trait of item.traits ?? []) slugs.add(trait)
}

function keyFor(slug) {
  return 'Trait' + slug.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
}

/** Descricao do slug exato, ou do prefixo mais longo que tiver verbete (traco base). */
function findDescription(slug) {
  const parts = slug.split('-')
  for (let end = parts.length; end > 0; end -= 1) {
    const candidate = parts.slice(0, end).join('-')
    const description = PF2E[`TraitDescription${keyFor(candidate).slice('Trait'.length)}`]
    if (description) return description
  }
  return null
}

const traits = {}
let hits = 0
let fallbackDescriptions = 0
const misses = []

for (const slug of [...slugs].sort()) {
  const key = keyFor(slug)
  const name = PF2E[key]
  if (typeof name !== 'string') {
    misses.push(slug)
    continue
  }
  hits += 1
  const ownDescription = PF2E[`TraitDescription${key.slice('Trait'.length)}`]
  const description = ownDescription ?? findDescription(slug)
  if (!ownDescription && description) fallbackDescriptions += 1
  traits[slug] = { name, ...(description ? { description } : {}) }
}

const outPath = path.join(__dirname, '../src/data/traits.equipment.json')
writeFileSync(outPath, JSON.stringify(traits), 'utf8')

console.log(
  `Gerados ${hits} tracos (${fallbackDescriptions} com descricao herdada do traco base, ` +
    `${misses.length} sem verbete oficial: ${misses.join(', ')}) em ${outPath}`,
)
