import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { Server } from 'socket.io'
import { createStorage } from './storage.js'
import { createTable } from './table.js'
import { FALTA_INGESTAO, createEntries } from './entries.js'
import { printStartupBanner } from './net.js'

/**
 * O servidor da mesa. Roda no PC do mestre, serve o app para os celulares da
 * rede local e é o dono único do estado — cada aparelho é só uma tela dele.
 *
 * Protocolo, do lado do servidor:
 *   conectou           -> manda `table:full` com a mesa inteira e o `seq` atual
 *   recebeu `action`   -> aplica, grava, manda `table:patch` para TODOS
 *                         (inclusive quem pediu: ninguém aplica nada sozinho)
 *   recebeu `resync`   -> manda `table:full` de novo
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const args = new Set(process.argv.slice(2))
const isDev = args.has('--dev')
const port = Number(process.env.PORT) || (isDev ? 3001 : 3000)
const dataFile = process.env.MESA_FILE ?? join(ROOT, 'data', 'mesa.json')

const storage = createStorage(dataFile)
const table = createTable(storage)

const app = express()
const http = createServer(app)
const io = new Server(http)

/*
 * O corpus de verbetes (§5.3). Só leitura, e por isso fora do WebSocket: uma
 * descrição de feat não muda durante a sessão, então não precisa de patch nem
 * de número de sequência — é uma consulta como qualquer outra.
 *
 * Sem autenticação, porque o app não tem: é uma mesa de amigos numa rede local.
 */
const entries = createEntries()
if (!entries.ok) console.warn(`[mesa] ${entries.motivo}`)

const semCorpus = (response) => response.status(503).json({ error: FALTA_INGESTAO })

app.get('/api/entry/:ref', (request, response) => {
  if (!entries.ok) return semCorpus(response)
  const entry = entries.get(request.params.ref)
  if (!entry) return response.status(404).json({ error: 'Verbete não encontrado', ref: request.params.ref })
  return response.json(entry)
})

/*
 * Lote, usado na importação da ficha. Aceita as duas perguntas que a importação
 * faz, e devolve as duas respostas separadas:
 *
 *   ?slugs=feat:sudden-charge,rage    "me dê estes verbetes"
 *   ?names=Rage,Darkvision            "o Pathbuilder disse isto; o que é?"
 *
 * O que não resolveu sai em `unresolved` com o nome que veio, para a tela
 * mostrar assim mesmo. Nome que some é o erro que a espec chama de inaceitável.
 */
app.get('/api/entries', (request, response) => {
  if (!entries.ok) return semCorpus(response)

  const lista = (valor) =>
    String(valor ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

  const refs = lista(request.query.slugs)
  const names = lista(request.query.names)
  if (!refs.length && !names.length) {
    return response.status(400).json({ error: 'Informe slugs= ou names=' })
  }

  const resolved = {}
  const unresolved = []
  const encontrados = []

  for (const ref of refs) {
    const entry = entries.get(ref)
    if (entry) encontrados.push(entry)
    else unresolved.push(ref)
  }
  for (const name of names) {
    const key = entries.resolveName(name)
    const entry = key ? entries.get(key) : null
    if (entry) {
      resolved[name] = entry.id
      encontrados.push(entry)
    } else {
      unresolved.push(name)
    }
  }

  return response.json({
    entries: Object.fromEntries(encontrados.map((e) => [e.id, e])),
    resolved,
    unresolved,
  })
})

// Em desenvolvimento quem serve o app é o Vite (com hot reload), e este
// processo cuida só do WebSocket. Na mesa é este processo que serve tudo.
if (!isDev) {
  const dist = join(ROOT, 'dist')
  if (!existsSync(dist)) {
    console.error('')
    console.error('  Falta a pasta dist/ — o app ainda nao foi compilado.')
    console.error('  Rode:  npm start   (que compila e sobe a mesa)')
    console.error('')
    process.exit(1)
  }
  app.use(express.static(dist))
  // O app é uma página só: qualquer outro caminho devolve o index.
  app.use((request, response, next) => {
    if (request.method !== 'GET') return next()
    response.sendFile(join(dist, 'index.html'))
  })
}

io.on('connection', (socket) => {
  socket.emit('table:full', table.snapshot())

  socket.on('action', (action, ack) => {
    const result = table.apply(action)
    if (result.ok && result.patch) {
      io.emit('table:patch', { seq: result.seq, patch: result.patch })
    }
    if (typeof ack === 'function') ack({ ok: result.ok, error: result.error })
  })

  socket.on('resync', () => {
    socket.emit('table:full', table.snapshot())
  })
})

// Sem endereço fixo de propósito: o Node escuta em tudo, IPv4 e IPv6 juntos.
// Amarrar em '0.0.0.0' deixaria de fora o ::1, e no Windows é para lá que
// `localhost` aponta primeiro — o mestre abriria o próprio app e não acharia
// servidor nenhum, mesmo com ele no ar para os celulares.
http.listen(port, () => {
  if (isDev) console.log(`[mesa] servidor de estado na porta ${port}`)
  else printStartupBanner(port)
  console.log(`[mesa] arquivo: ${storage.path}`)
})

// Ctrl+C não pode custar a última compra: grava o que estiver pendente antes
// de sair. A gravação normal é adiada de propósito (ver storage.js).
let closing = false
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (closing) return
    closing = true
    storage.flush()
    entries.close()
    io.close()
    http.close(() => process.exit(0))
    // Se algum celular segurar a conexão, não esperamos para sempre.
    setTimeout(() => process.exit(0), 1500).unref()
  })
}
