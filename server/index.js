import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import { Server } from 'socket.io'
import { createStorage } from './storage.js'
import { createTable } from './table.js'
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
    io.close()
    http.close(() => process.exit(0))
    // Se algum celular segurar a conexão, não esperamos para sempre.
    setTimeout(() => process.exit(0), 1500).unref()
  })
}
