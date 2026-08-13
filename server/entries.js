// O corpus de verbetes: feats, features de classe, heranças, ações, magias,
// condições e os sentidos do glossário.
//
// São ~15 MB de texto, divididos em duas partes:
//
//   entries.idx.json   o índice, ~1,3 MB — fica em memória, é o que permite
//                      responder "existe?" sem tocar no disco.
//   entries.bin        o texto, ~15 MB — lido por offset, um verbete por vez,
//                      e guardado em memória depois da primeira leitura.
//
// A leitura por offset nasceu de uma restrição que não existe mais (o servidor
// podia ser um celular com Termux). Continua valendo por mérito próprio: o
// servidor sobe instantâneo em vez de parsear dez mil objetos no boot, e paga
// só pelo que a mesa realmente abrir. Rodando num PC, o cache abaixo faz a
// segunda leitura de um verbete custar zero.
//
// Gerado por `npm run build:lore`. Sem ele, as rotas respondem 503 dizendo o
// que rodar — o resto do app (inventário, loja, carteira) funciona igual.

import { closeSync, existsSync, openSync, readFileSync, readSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { normalizeName } from '../src/lib/loreResolve.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const BIN = path.join(DATA_DIR, 'entries.bin')
const IDX = path.join(DATA_DIR, 'entries.idx.json')

export const FALTA_INGESTAO =
  'O corpus de verbetes não foi gerado. Rode `npm run build:lore` uma vez (precisa do clone em vendor/pf2e).'

export function createEntries() {
  if (!existsSync(BIN) || !existsSync(IDX)) {
    return {
      ok: false,
      motivo: FALTA_INGESTAO,
      get: () => null,
      getMany: () => ({}),
      resolveName: () => null,
      close: () => {},
      size: 0,
    }
  }

  const index = JSON.parse(readFileSync(IDX, 'utf8'))
  const offsets = index.entries ?? {}
  const names = index.names ?? {}
  const slugs = index.slugs ?? {}

  /* Aberto uma vez e mantido aberto: abrir e fechar a cada verbete faria uma
     syscall a mais por linha de lista de feats. */
  const fd = openSync(BIN, 'r')

  /* O servidor é o PC do mestre, então memória é barata: verbete lido uma vez
     não volta ao disco. Uma sessão inteira abre algumas centenas de verbetes,
     não os dez mil. */
  const cache = new Map()

  /**
   * Aceita a chave completa (`spell:fly`) ou o slug solto (`fly`). O slug solto
   * cai na prioridade de pack decidida na ingestão — é o mesmo desempate que
   * vale para nome, e não uma segunda regra.
   */
  function keyFor(ref) {
    const key = String(ref ?? '').trim()
    if (!key) return null
    if (offsets[key]) return key
    return slugs[key] ?? null
  }

  function get(ref) {
    const key = keyFor(ref)
    if (!key) return null
    if (cache.has(key)) return cache.get(key)
    const [offset, length] = offsets[key]
    const buffer = Buffer.allocUnsafe(length)
    readSync(fd, buffer, 0, length, offset)
    try {
      const entry = JSON.parse(buffer.toString('utf8'))
      cache.set(key, entry)
      return entry
    } catch {
      // Índice e .bin fora de sincronia: reingerir resolve, mas não podemos
      // derrubar o servidor da mesa por causa de um verbete.
      console.error(`entries: verbete "${key}" ilegível no offset ${offset}; regere com npm run build:lore`)
      return null
    }
  }

  function getMany(refs) {
    const out = {}
    for (const ref of refs) {
      const entry = get(ref)
      if (entry) out[entry.id] = entry
    }
    return out
  }

  /** Nome exato, com caixa e pontuação normalizadas. Nada de aproximação. */
  const resolveName = (name) => names[normalizeName(name)] ?? null

  return {
    ok: true,
    get,
    getMany,
    resolveName,
    size: Object.keys(offsets).length,
    geradoEm: index.geradoEm ?? null,
    close: () => {
      cache.clear()
      closeSync(fd)
    },
  }
}

