// Gera src/data/catalog.equipment.json a partir dos packs `equipment/` do
// repositorio foundryvtt/pf2e (dados reais, licenciados em ORC/OGL pela Paizo).
//
// Uso:
//   git clone --depth 1 --filter=blob:none --sparse https://github.com/foundryvtt/pf2e.git <dir>
//   cd <dir> && git sparse-checkout set packs/pf2e/equipment
//   node scripts/build-catalog.mjs <dir>/packs/pf2e/equipment
//
// Reaproveita as mesmas funcoes de leitura de src/lib/foundryImport.js (o
// importador manual do GM), so com id estavel (derivado do nome do arquivo)
// em vez do id aleatorio de item colado a mao, e sem o campo `raw` (que
// triplicaria o tamanho do catalogo sem uso na interface).

import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import {
  priceToCopper,
  readArmor,
  readBulk,
  readShield,
  readSource,
  readSubcategory,
  readWeapon,
  sanitizeDescription,
  toPlainText,
} from '../src/lib/foundryImport.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const srcDir = process.argv[2]
if (!srcDir) {
  console.error('Uso: node scripts/build-catalog.mjs <pasta com os .json de packs/pf2e/equipment>')
  process.exit(1)
}

// Identidade proposital: cada tipo do Foundry vira a propria categoria,
// nenhuma e fundida em outra (ver mesma nota em foundryImport.js).
const TYPE_TO_CATEGORY = {
  weapon: 'weapon',
  armor: 'armor',
  shield: 'shield',
  equipment: 'equipment',
  consumable: 'consumable',
  treasure: 'treasure',
  backpack: 'backpack',
  ammo: 'ammo',
  kit: 'kit',
}

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

  const category = TYPE_TO_CATEGORY[raw?.type]
  if (!category || !raw?.name) {
    skipped += 1
    continue
  }

  const system = raw?.system ?? {}
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
  })
}

items.sort((a, b) => a.name.localeCompare(b.name))

const outPath = path.join(__dirname, '../src/data/catalog.equipment.json')
writeFileSync(outPath, JSON.stringify(items), 'utf8')

console.log(`Gerados ${items.length} itens (${skipped} ignorados) em ${outPath}`)
