// Gera o corpus de verbetes da ficha: feats, features de classe, heranças,
// traços de ancestralidade, ações, magias e condições, mais os sentidos que só
// existem no arquivo de localização.
//
// Uso:
//   npm run build:lore
//
// Quatro artefatos, e a razão de cada divisão:
//
//   src/data/index.spells.json   índice de magias SEM descrição, ~2.000 entradas.
//                                Vai no bundle porque o compêndio navega tudo,
//                                offline, e navegar precisa ser instantâneo.
//   src/data/conditions.json     as 43 condições INTEIRAS. São pequenas e
//                                aparecem em toda rolagem: pedir ao servidor
//                                seria ida à rede no meio do combate.
//   src/data/unarmed.json        o Punho básico (ver mais abaixo).
//   server/data/entries.bin      todo verbete sanitizado, concatenado.
//   server/data/entries.idx.json slug -> [offset, tamanho], mais o índice de
//                                nomes usado para resolver o que o Pathbuilder
//                                manda.
//
// O corpus somado passa de 30 MB. Mandar isso para um Android baratinho no
// primeiro carregamento é o que a decisão D10 evita: o servidor lê por offset,
// um verbete por vez, sem carregar o arquivo em memória — ele pode estar
// rodando num Termux.

import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  writeSync,
} from 'node:fs'
import path from 'node:path'

import { sanitizeDescription, toPlainText, readSource } from '../src/lib/foundryImport.js'
import { normalizeName } from '../src/lib/loreResolve.js'
import { DEFAULT_VENDOR, ROOT, resolveLangFile, resolvePack, resolveSystemFile } from './vendor-pf2e.mjs'

const vendor = process.argv[2] ?? DEFAULT_VENDOR

/**
 * Ordem de prioridade no empate de nome, e ela é obrigatória (§5.4 da espec).
 *
 * Medido no fixture do Rurik: "Rage" existe em `actions` E em `class-features`;
 * "Dromaar" existe em `feats` E em `heritages`. Sem uma ordem fixa, o mesmo
 * personagem importado duas vezes mostraria descrições diferentes.
 *
 * A ordem vai do mais específico ao mais genérico: o que a classe te deu ganha
 * do feat homônimo, que ganha da ação genérica.
 */
const PACKS = [
  { pack: 'class-features', kind: 'class-feature' },
  { pack: 'heritages', kind: 'heritage' },
  { pack: 'ancestry-features', kind: 'ancestry-feature' },
  { pack: 'feats', kind: 'feat' },
  { pack: 'actions', kind: 'action' },
  { pack: 'spells', kind: 'spell' },
  { pack: 'conditions', kind: 'condition' },
]

/*
 * Prioridade de NOME. Os cinco primeiros são a ordem obrigatória da espec; os
 * três últimos são a consequência de medir.
 *
 * O glossário entra ACIMA de magias porque existe uma magia chamada Darkvision.
 * Quando o Pathbuilder põe "Darkvision" em `specials`, ele está falando do
 * sentido do anão, nunca da magia — e com a ordem ingênua o anão ganhava a
 * descrição da magia, calado. Magia e condição são alcançadas por id, a partir
 * do compêndio e da folha de condições, então não precisam ganhar nome nenhum.
 */
const PRIORIDADE_DE_NOME = [
  'class-feature',
  'heritage',
  'ancestry-feature',
  'feat',
  'action',
  'glossary',
  'spell',
  'condition',
]
const prioridade = (kind) => {
  const i = PRIORIDADE_DE_NOME.indexOf(kind)
  return i === -1 ? PRIORIDADE_DE_NOME.length : i
}

/* --------------------------------------------------------------- utilidades */

/* Os packs têm subpastas (feats/ancestry/gnome/level-5/…), então a varredura é
   recursiva. `_folders.json` é metadado de organização do Foundry, não verbete. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '_folders.json') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.json')) out.push(full)
  }
  return out
}

const slugFromFile = (file) => path.basename(file, '.json')

/**
 * Custo em ações, normalizado. O UI é quem desenha os losangos; aqui fica o
 * fato: quantas ações, ou que tipo de ação é.
 *
 * `null` = passivo, sem custo. `text` guarda o que não cabe em 1/2/3 —
 * "10 minutes", "1 hour" — em vez de arredondar para um número errado.
 */
function readActionCost(system, kind) {
  if (kind === 'spell') {
    const raw = String(system?.time?.value ?? '').trim()
    if (!raw) return null
    if (/^[123]$/.test(raw)) return { type: 'action', value: Number(raw) }
    if (/^reaction$/i.test(raw)) return { type: 'reaction', value: null }
    if (/^free$/i.test(raw)) return { type: 'free', value: null }
    return { type: 'text', value: null, text: raw }
  }

  const type = system?.actionType?.value ?? null
  if (!type || type === 'passive') return null
  const value = Number(system?.actions?.value)
  if (type === 'action') return { type: 'action', value: Number.isFinite(value) ? value : 1 }
  return { type, value: null }
}

/* --------------------------------------------------------- leitura dos packs */

/*
 * A chave de um verbete é `kind:slug`, não o slug pelo. Medido: 119 magias e 46
 * ações têm o mesmo slug de um feat — `fly` é ação E magia, `pack-attack` é feat
 * E magia. Guardar por slug puro fazia a magia Fly sumir do compêndio sem um
 * pio. A prioridade de PACKS resolve o empate de NOME, que é outra pergunta:
 * "o Pathbuilder disse Rage, qual dos Rage é?".
 */
const entries = new Map() // "spell:fly" -> verbete
const nameIndex = new Map() // nome normalizado -> { id, prio }
const slugIndex = new Map() // slug puro -> { id, prio }, para busca solta

/** Quem tem prioridade melhor fica com o nome. Empate: o primeiro que chegou. */
function reivindicar(mapa, chave, id, kind) {
  const prio = prioridade(kind)
  const atual = mapa.get(chave)
  if (!atual || prio < atual.prio) mapa.set(chave, { id, prio })
}
const spellIndex = []
const actionIndex = []
const conditions = []
const counts = {}
let semNome = 0

for (const { pack, kind } of PACKS) {
  const dir = resolvePack(pack, vendor)
  const files = walk(dir)
  counts[pack] = 0

  for (const file of files) {
    let raw
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'))
    } catch (error) {
      console.warn(`  ! ${path.relative(dir, file)}: JSON ilegível (${error.message})`)
      continue
    }
    if (!raw?.name) {
      semNome += 1
      continue
    }

    const system = raw.system ?? {}
    const slug = slugFromFile(file)
    /* A primeira pasta dentro do pack. No `actions` ela é o agrupamento que a
       ficha mostra — `basic/`, `skill/`, `class/` —, e vem da organização da
       própria Paizo em vez de uma lista nossa. */
    const grupo = path.relative(dir, file).split(path.sep)[0].replace(/\.json$/, '') || null
    const html = sanitizeDescription(system?.description?.value ?? '')
    const traitBlock = system?.traits ?? {}

    const entry = {
      id: `${kind}:${slug}`,
      slug,
      name: String(raw.name).trim(),
      kind,
      pack,
      level: Number.isFinite(Number(system?.level?.value)) ? Number(system.level.value) : null,
      category: system?.category ?? null,
      group: grupo,
      rarity: traitBlock.rarity ?? null,
      traits: Array.isArray(traitBlock.value) ? traitBlock.value : [],
      traditions: Array.isArray(traitBlock.traditions) ? traitBlock.traditions : [],
      actionCost: readActionCost(system, kind),
      descriptionHtml: html,
      descriptionText: toPlainText(html),
      // Requisito de licença, não zelo: ORC e OGL exigem a atribuição.
      source: readSource(system),
    }

    if (entries.has(entry.id)) {
      // Mesmo pack, mesmo slug: aí sim é duplicata de verdade.
      console.warn(`  ! verbete repetido: ${entry.id}`)
      continue
    }
    entries.set(entry.id, entry)
    counts[pack] += 1

    /* Aqui, sim, vale a prioridade: é o que faz "Rage" resolver sempre para a
       feature de classe, e nunca ora para ela, ora para a ação. */
    reivindicar(nameIndex, normalizeName(entry.name), entry.id, kind)
    reivindicar(slugIndex, slug, entry.id, kind)

    if (kind === 'spell') {
      /* O índice do bundle NÃO leva descrição: são ~2.000 magias, e a descrição
         é 90% do peso. Quem abre uma magia pede o verbete ao servidor. */
      spellIndex.push({
        id: entry.id,
        slug,
        name: entry.name,
        rank: entry.level ?? 0,
        traditions: entry.traditions,
        traits: entry.traits,
        rarity: entry.rarity,
        actionCost: entry.actionCost,
      })
    }
    /* Só `basic` e `skill` vão no bundle: são 84 verbetes, valem para todo
       personagem e a aba precisa deles de cara. As 196 ações de classe só
       aparecem se o personagem tiver a feature, e essas chegam resolvidas pela
       importação. */
    if (kind === 'action' && (grupo === 'basic' || grupo === 'skill')) {
      actionIndex.push({
        id: entry.id,
        slug,
        name: entry.name,
        group: grupo,
        actionCost: entry.actionCost,
        traits: entry.traits,
        rarity: entry.rarity,
      })
    }
    if (kind === 'condition') {
      conditions.push({
        id: entry.id,
        slug,
        name: entry.name,
        // `system.value.isValued` marca as que têm número (Frightened 2)
        valued: Boolean(system?.value?.isValued),
        group: system?.group ?? null,
        descriptionHtml: entry.descriptionHtml,
        descriptionText: entry.descriptionText,
        source: entry.source,
      })
    }
  }
}

/* ------------------------------------------------- sentidos: só no en.json */

/*
 * Darkvision e Low-Light Vision não estão em pack nenhum — o Pathbuilder os
 * manda em `specials`, e sem isto 2 dos 10 nomes do Rurik ficariam sem
 * descrição. Eles vivem no arquivo de localização, sob
 * PF2E.NPC.Abilities.Glossary, com a chave em PascalCase sem hífen.
 */
const en = JSON.parse(readFileSync(resolveLangFile(vendor), 'utf8'))
const glossary = en?.PF2E?.NPC?.Abilities?.Glossary ?? {}
let glossarioAdicionado = 0

for (const [chave, valor] of Object.entries(glossary)) {
  if (typeof valor !== 'string') continue
  // "LowLightVision" -> "Low Light Vision" -> slug "low-light-vision"
  const nome = chave.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim()
  const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const id = `glossary:${slug}`
  if (entries.has(id)) continue

  const html = sanitizeDescription(valor)
  entries.set(id, {
    id,
    slug,
    name: nome,
    kind: 'glossary',
    pack: 'en.json',
    level: null,
    category: null,
    rarity: null,
    traits: [],
    traditions: [],
    actionCost: null,
    descriptionHtml: html,
    descriptionText: toPlainText(html),
    source: null,
  })
  glossarioAdicionado += 1

  reivindicar(nameIndex, normalizeName(nome), id, 'glossary')
  reivindicar(slugIndex, slug, id, 'glossary')
}

/* --------------------------------------------- o Punho, que não está em pack */

/*
 * `Unarmed Strike` precisa existir sempre (§10.3), mas não é equipamento: no
 * Foundry ele é montado em código, na criação do personagem. Em vez de copiar
 * 1d4 bludgeoning para dentro do nosso código e esquecer, extraímos o bloco do
 * arquivo original — e falhamos alto se ele mudar de forma. No dia em que a
 * Paizo mexer no Punho, isto quebra o build em vez de passar calado.
 */
const FONTE_PUNHO = 'src/module/actor/character/document.ts'
const codigo = readFileSync(resolveSystemFile(FONTE_PUNHO, vendor), 'utf8')
const bloco = codigo.match(/slug:\s*"basic-unarmed"[\s\S]{0,1200}?traits:\s*\{\s*value:\s*\[([^\]]*)\]/)
const dano = bloco && codigo.slice(bloco.index).match(/damage:\s*\{\s*dice:\s*(\d+),\s*die:\s*"(d\d+)",\s*damageType:\s*"(\w+)"/)
const categoria = bloco && codigo.slice(bloco.index).match(/category:\s*"(\w+)"/)
const grupo = bloco && codigo.slice(bloco.index).match(/group:\s*"([\w-]+)"/)

if (!bloco || !dano || !categoria || !grupo) {
  console.error(
    `\nNão achei o Punho básico em ${FONTE_PUNHO}.\n` +
      'Ele é montado em código no Foundry, e este script extrai o bloco `slug: "basic-unarmed"`.\n' +
      'Se o arquivo mudou de forma, conserte o extrator — não escreva os números à mão.\n',
  )
  process.exit(1)
}

const punho = {
  id: 'unarmed-strike',
  // Vem do arquivo de localização, como todo nome de tela do Foundry
  name: en?.PF2E?.WeaponTypeUnarmed ?? 'Unarmed Strike',
  category: 'weapon',
  level: 0,
  priceCp: 0,
  bulk: 0,
  traits: [...bloco[1].matchAll(/"([\w-]+)"/g)].map((m) => m[1]),
  weapon: {
    category: categoria[1],
    group: grupo[1],
    hands: 0,
    ranged: false,
    range: null,
    reload: null,
    damage: { dice: Number(dano[1]), die: dano[2], damageType: dano[3] },
  },
  origem: `foundryvtt/pf2e ${FONTE_PUNHO}`,
}

/* --------------------------------------------------------------- gravação */

const dataDir = path.join(ROOT, 'src', 'data')
const serverDataDir = path.join(ROOT, 'server', 'data')
mkdirSync(serverDataDir, { recursive: true })

spellIndex.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
conditions.sort((a, b) => a.name.localeCompare(b.name))

writeFileSync(path.join(dataDir, 'index.spells.json'), JSON.stringify(spellIndex))
actionIndex.sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(path.join(dataDir, 'index.actions.json'), JSON.stringify(actionIndex))
writeFileSync(path.join(dataDir, 'conditions.json'), JSON.stringify(conditions))
writeFileSync(path.join(dataDir, 'unarmed.json'), `${JSON.stringify(punho, null, 2)}\n`)

/* Um arquivo só, concatenado, com um índice de offsets ao lado. Nove mil
   arquivinhos soltos seriam nove mil inodes e um `readdir` lento em Android;
   um JSON gigante seria 30 MB em memória no servidor. */
const binPath = path.join(serverDataDir, 'entries.bin')
const fd = openSync(binPath, 'w')
const offsets = {}
let offset = 0

for (const [id, entry] of entries) {
  const buffer = Buffer.from(JSON.stringify(entry), 'utf8')
  writeSync(fd, buffer, 0, buffer.length, offset)
  offsets[id] = [offset, buffer.length]
  offset += buffer.length
}
closeSync(fd)

writeFileSync(
  path.join(serverDataDir, 'entries.idx.json'),
  JSON.stringify({
    geradoEm: new Date().toISOString().slice(0, 10),
    byteLength: offset,
    /* O desempate de nome, gravado junto: quem for depurar por que "Rage" virou
       feature de classe lê o critério aqui, sem abrir o script. */
    prioridade: PRIORIDADE_DE_NOME,
    entries: offsets,
    names: Object.fromEntries([...nameIndex].map(([k, v]) => [k, v.id])),
    slugs: Object.fromEntries([...slugIndex].map(([k, v]) => [k, v.id])),
  }),
)

/* ---------------------------------------------------------------- relatório */

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const bytes = (p) => readFileSync(p).length

console.log(`\nVerbetes por pack:`)
for (const { pack } of PACKS) console.log(`  ${pack.padEnd(18)} ${String(counts[pack]).padStart(5)}`)
console.log(`  ${'en.json (sentidos)'.padEnd(18)} ${String(glossarioAdicionado).padStart(5)}`)
if (semNome) console.log(`  ${String(semNome)} arquivo(s) sem nome, ignorados`)

console.log(`\nGerado:`)
console.log(`  src/data/index.spells.json     ${spellIndex.length} magias, ${kb(bytes(path.join(dataDir, 'index.spells.json')))}`)
console.log(`  src/data/index.actions.json    ${actionIndex.length} ações básicas e de perícia, ${kb(bytes(path.join(dataDir, 'index.actions.json')))}`)
console.log(`  src/data/conditions.json       ${conditions.length} condições, ${kb(bytes(path.join(dataDir, 'conditions.json')))}`)
console.log(`  src/data/unarmed.json          ${punho.name} ${punho.weapon.damage.dice}${punho.weapon.damage.die} ${punho.weapon.damage.damageType} [${punho.traits.join(' ')}]`)
console.log(`  server/data/entries.bin        ${entries.size} verbetes, ${kb(offset)}`)
console.log(`  server/data/entries.idx.json   ${nameIndex.size} nomes indexados, ${kb(bytes(path.join(serverDataDir, 'entries.idx.json')))}`)
