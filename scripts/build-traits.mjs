// Gera src/data/traits.json com nome + descricao REAIS de todo traco que
// aparece em QUALQUER lugar do app — catalogo de equipamento, magia, condicao,
// feat, feature de classe, heranca e acao — extraidos do arquivo de localizacao
// oficial do foundryvtt/pf2e (`static/lang/en.json`, chaves `PF2E.Trait*`).
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

import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { DEFAULT_VENDOR, resolveLangFile } from './vendor-pf2e.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const enJsonPath = resolveLangFile(process.argv[2] ?? DEFAULT_VENDOR)
console.log(`Lendo ${enJsonPath}`)

const en = JSON.parse(readFileSync(enJsonPath, 'utf8'))
const PF2E = en.PF2E ?? {}

/*
 * Os tracos vem de quatro lugares, e todos precisam de verbete: o catalogo de
 * equipamento e, desde a ficha, as magias, as condicoes e o corpus de verbetes
 * (feat, feature de classe, heranca, acao).
 *
 * O corpus mora em server/data/ e nao vai para o Git, entao pode nao existir
 * ainda — nesse caso geramos com o que houver e dizemos o que faltou, em vez de
 * quebrar. Rodar `npm run build:lore` antes cobre tudo.
 */
const FONTES = [
  { arquivo: '../src/data/catalog.equipment.json', obrigatoria: true },
  { arquivo: '../src/data/index.spells.json', obrigatoria: false },
  { arquivo: '../src/data/conditions.json', obrigatoria: false },
]

const slugs = new Set()
const ausentes = []

for (const { arquivo, obrigatoria } of FONTES) {
  const caminho = path.join(__dirname, arquivo)
  if (!existsSync(caminho)) {
    if (obrigatoria) {
      console.error(`Falta ${arquivo}. Rode antes: npm run build:catalog`)
      process.exit(1)
    }
    ausentes.push(arquivo)
    continue
  }
  const dado = JSON.parse(readFileSync(caminho, 'utf8'))
  if (!Array.isArray(dado)) continue
  for (const registro of dado) {
    for (const trait of registro.traits ?? []) slugs.add(trait)
  }
}

/* O corpus de verbetes e grande demais para ser relido inteiro so por causa dos
   tracos, mas o .bin e uma concatenacao de JSON: uma varredura por
   "traits":[...] pega todos sem parsear 10 mil objetos. */
const binPath = path.join(__dirname, '../server/data/entries.bin')
if (existsSync(binPath)) {
  const bin = readFileSync(binPath, 'utf8')
  for (const match of bin.matchAll(/"traits":\[([^\]]*)\]/g)) {
    for (const t of match[1].matchAll(/"([^"]+)"/g)) slugs.add(t[1])
  }
} else {
  ausentes.push('server/data/entries.bin')
}

if (ausentes.length) {
  console.warn(
    `Aviso: ${ausentes.join(', ')} nao existe(m) ainda, entao os tracos de magia,\n` +
      'condicao e feat ficam de fora. Rode `npm run build:lore` e repita.',
  )
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

const outPath = path.join(__dirname, '../src/data/traits.json')
writeFileSync(outPath, JSON.stringify(traits), 'utf8')

console.log(
  `Gerados ${hits} tracos (${fallbackDescriptions} com descricao herdada do traco base, ` +
    `${misses.length} sem verbete oficial: ${misses.join(', ')}) em ${outPath}`,
)
