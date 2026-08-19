import { TABLE_KEYS } from '../state/initialState.js'

/*
 * A mesa em arquivo: exportar para um JSON e ler um JSON de volta.
 *
 * É o backup que o mestre leva no pendrive e a mudança de PC: a mesa vive no
 * disco do servidor, e sem isto a única forma de tirá-la de lá era copiar
 * `data/mesa.json` à mão.
 *
 * O que sai no arquivo são as chaves de `TABLE_KEYS` e mais nada — a mesma
 * forma que o servidor guarda e a mesma que ele aceita de volta. Sessão (em
 * qual personagem este aparelho está olhando, o carrinho) fica de fora, porque
 * não é mesa.
 *
 * A leitura aqui é só de forma: quem migra versão velha e completa campo que
 * falta é o `sanitizeTable` do servidor, no `RESET`. Duas validações do mesmo
 * dado divergiriam na primeira mudança de schema.
 */

/** O objeto que vai para o arquivo: a mesa, sem o que é deste aparelho. */
export function tableToFile(state) {
  return Object.fromEntries(TABLE_KEYS.map((key) => [key, state[key]]))
}

/** "Mesa do Julio" -> "mesa-do-julio". Vazio vira `null`. */
function slug(name) {
  const limpo = String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return limpo || null
}

/**
 * Nome do arquivo: `mesa-<nome>-<AAAA-MM-DD>.json`. A data entra sempre —
 * exportar duas vezes no mesmo dia sobrescreve, mas exportar em dias
 * diferentes guarda as duas, que é o que se quer de um backup.
 */
export function fileNameFor(state, now = new Date()) {
  const dia = now.toISOString().slice(0, 10)
  const nome = slug(state?.settings?.tableName)
  return nome ? `mesa-${nome}-${dia}.json` : `mesa-${dia}.json`
}

/**
 * Lê o texto de um arquivo escolhido. Devolve `{ ok, table }` ou
 * `{ ok: false, erro }` com o motivo em português — arquivo que não serve diz
 * por que não serve, em vez de não acontecer nada.
 */
export function tableFromFile(text) {
  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    return { ok: false, erro: 'Esse arquivo não é um JSON válido.' }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, erro: 'Esse JSON não tem uma mesa dentro.' }
  }
  if (!Array.isArray(parsed.players) || parsed.players.length === 0) {
    return { ok: false, erro: 'Esse JSON não tem personagem nenhum — não é uma mesa exportada daqui.' }
  }
  return { ok: true, table: parsed }
}

/**
 * Entrega o arquivo ao navegador. Fica aqui, e não na tela, para a tela não
 * precisar saber de Blob nem de âncora inventada.
 */
export function downloadTable(state, now = new Date()) {
  const blob = new Blob([JSON.stringify(tableToFile(state), null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileNameFor(state, now)
  link.click()
  URL.revokeObjectURL(url)
}
