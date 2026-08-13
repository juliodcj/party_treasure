// Gera src/data/catalog.equipment.json a partir dos packs `equipment/` do
// repositorio foundryvtt/pf2e (dados reais, licenciados em ORC/OGL pela Paizo).
//
// Uso:
//   git clone --depth 1 --filter=blob:none --sparse https://github.com/foundryvtt/pf2e.git vendor/pf2e
//   cd vendor/pf2e && git sparse-checkout set packs/pf2e static/lang
//   node scripts/build-catalog.mjs
//
// Sem argumento, procura em vendor/pf2e. Pode receber a raiz do clone, a pasta
// packs/pf2e ou a pasta equipment direto — resolve os tres.
//
// O repositorio do Foundry mudou de layout: os packs sairam de `packs/…` para
// `packs/pf2e/…`, e ganharam um vizinho `packs/sf2e/…` que e Starfinder e nao
// entra aqui.
//
// Reaproveita as mesmas funcoes de leitura de src/lib/foundryImport.js (o
// importador manual do GM), so com id estavel (derivado do nome do arquivo)
// em vez do id aleatorio de item colado a mao, e sem o campo `raw` (que
// triplicaria o tamanho do catalogo sem uso na interface).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import {
  TYPE_TO_CATEGORY,
  priceToCopper,
  readArmor,
  readBulk,
  readCategory,
  readShield,
  readSource,
  readSubcategory,
  readWeapon,
  sanitizeDescription,
  toPlainText,
} from '../src/lib/foundryImport.js'
import { DEFAULT_VENDOR, resolvePack } from './vendor-pf2e.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const srcDir = resolvePack('equipment', process.argv[2] ?? DEFAULT_VENDOR)
console.log(`Lendo ${srcDir}`)

function slugFromFile(file) {
  return file.replace(/\.json$/, '')
}

const files = readdirSync(srcDir).filter((f) => f.endsWith('.json') && f !== '_folders.json')

const items = []
const seenIds = new Set()
let skipped = 0

for (const file of files) {
  let raw
  try {
    raw = JSON.parse(readFileSync(path.join(srcDir, file), 'utf8'))
  } catch {
    skipped += 1
    continue
  }

  if (!TYPE_TO_CATEGORY[raw?.type] || !raw?.name) {
    skipped += 1
    continue
  }

  const system = raw?.system ?? {}
  const category = readCategory(raw.type, system)
  const html = sanitizeDescription(system?.description?.value ?? '')
  const traits = Array.isArray(system?.traits?.value) ? system.traits.value : []
  const rarity = system?.traits?.rarity ?? null
  // hardness/hp existem em todo item fisico (rastreio de sunder do Foundry);
  // so contam como "escudo" quando o item de fato e um escudo.
  const shield = raw.type === 'shield' ? readShield(system) : null
  const weapon = raw.type === 'weapon' ? readWeapon(system) : null
  const armor = raw.type === 'armor' ? readArmor(system) : null
  const subcategory = raw.type === 'consumable' || raw.type === 'treasure' ? readSubcategory(system) : null
  const source = readSource(system)

  const id = `cat-${slugFromFile(file)}`
  if (seenIds.has(id)) {
    skipped += 1
    continue
  }
  seenIds.add(id)

  items.push({
    id,
    name: raw.name.trim(),
    level: Number.isFinite(Number(system?.level?.value)) ? Number(system.level.value) : 0,
    category,
    priceCp: Math.max(0, Math.round(priceToCopper(system?.price))),
    bulk: readBulk(system),
    traits: rarity && rarity !== 'common' ? [rarity, ...traits] : traits,
    description: toPlainText(html),
    ...(html ? { descriptionHtml: html } : {}),
    ...(rarity ? { rarity } : {}),
    ...(shield ? { shield } : {}),
    ...(weapon ? { weapon } : {}),
    ...(armor ? { armor } : {}),
    ...(subcategory ? { subcategory } : {}),
    ...(source ? { source } : {}),
    ...(system?.usage?.value ? { usage: system.usage.value } : {}),
    ...(raw.img ? { img: raw.img } : {}),
  })
}

items.sort((a, b) => a.name.localeCompare(b.name))

const outPath = path.join(__dirname, '../src/data/catalog.equipment.json')
writeFileSync(outPath, JSON.stringify(items), 'utf8')

const counts = {}
for (const item of items) counts[item.category] = (counts[item.category] ?? 0) + 1

console.log(`Gerados ${items.length} itens (${skipped} ignorados) em ${outPath}`)
console.log('Por categoria:', counts)
