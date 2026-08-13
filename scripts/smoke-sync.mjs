import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { io } from 'socket.io-client'

/**
 * A prova de que "o que um faz o outro vê".
 *
 * Sobe o servidor num arquivo de mesa descartável, conecta dois clientes como
 * se fossem dois celulares, e confere o que a mesa promete: alteração de um
 * chega no outro, o servidor recusa o que não pode acontecer, o contador de
 * ordem não pula, e desligar o servidor não perde nada.
 *
 *   npm run smoke
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 3999
const URL = `http://127.0.0.1:${PORT}`

const dataDir = mkdtempSync(join(tmpdir(), 'party-treasure-smoke-'))
const mesaFile = join(dataDir, 'mesa.json')

let server = null
const clients = []

function startServer() {
  return new Promise((done, fail) => {
    // `--dev` porque aqui não interessa servir o app, só o estado.
    server = spawn('node', [join(ROOT, 'server', 'index.js'), '--dev'], {
      cwd: ROOT,
      env: { ...process.env, PORT: String(PORT), MESA_FILE: mesaFile },
      stdio: ['ignore', 'pipe', 'inherit'],
    })
    const timer = setTimeout(() => fail(new Error('o servidor nao subiu em 20s')), 20_000)
    server.stdout.on('data', (chunk) => {
      if (String(chunk).includes('servidor de estado')) {
        clearTimeout(timer)
        done()
      }
    })
    server.on('exit', (code) => {
      clearTimeout(timer)
      if (code) fail(new Error(`o servidor saiu com codigo ${code}`))
    })
  })
}

function stopServer() {
  if (!server) return Promise.resolve()
  const dying = server
  server = null
  return new Promise((done) => {
    dying.on('exit', done)
    dying.kill('SIGINT')
    setTimeout(() => dying.kill('SIGKILL'), 3000).unref()
  })
}

/**
 * Um "celular": mantém a própria cópia da mesa a partir de `table:full` e
 * `table:patch`, exatamente como o `state/store.jsx` faz no navegador. Se o
 * protocolo estiver errado, é aqui que a cópia diverge.
 */
function connect(name) {
  const socket = io(URL, { transports: ['websocket'] })
  const client = { name, socket, table: null, seq: 0, gaps: 0 }
  clients.push(client)

  socket.on('table:full', ({ seq, table }) => {
    client.seq = seq
    client.table = table
  })
  socket.on('table:patch', ({ seq, patch }) => {
    if (seq !== client.seq + 1) client.gaps += 1
    client.seq = seq
    client.table = { ...client.table, ...patch }
  })

  return new Promise((done, fail) => {
    const timer = setTimeout(() => fail(new Error(`${name} nao conectou`)), 5000)
    socket.on('table:full', () => {
      clearTimeout(timer)
      done(client)
    })
  })
}

function send(client, action) {
  return new Promise((done) => client.socket.emit('action', action, done))
}

/** Espera até a condição valer, ou desiste — sincronização é rápida ou é bug. */
async function until(label, check, timeout = 3000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    if (check()) return
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error(`nunca aconteceu: ${label}`)
}

const wallet = (client, id) => {
  const player = client.table.players.find((current) => current.id === id)
  return player.gold * 100 + player.silver * 10 + player.copper
}
const qty = (client, id, itemId) =>
  client.table.players.find((current) => current.id === id).items[itemId] ?? 0
const vitals = (client, id) => client.table.players.find((current) => current.id === id).vitals ?? {}
const sheetOf = (client, id) => client.table.players.find((current) => current.id === id).sheet

const check = (label) => console.log(`  ok  ${label}`)

async function run() {
  console.log('\n  Sincronizacao da mesa\n')
  await startServer()

  const celularA = await connect('A')
  const celularB = await connect('B')
  const valeros = celularA.table.players[0].id
  check('dois celulares recebem a mesma mesa ao conectar')
  assert.deepEqual(celularA.table.players, celularB.table.players)

  // 1. O que um faz, o outro vê.
  const antes = wallet(celularB, valeros)
  await send(celularA, { type: 'GIVE_COINS', playerId: valeros, coins: { gold: 10 }, by: valeros })
  await until('o outro celular ver as moedas', () => wallet(celularB, valeros) === antes + 1000)
  check('moedas dadas num celular aparecem no outro')

  // 2. A compra debita e entrega, com o preço lido do catálogo do servidor.
  const shop = celularA.table.shops[0]
  const itemId = shop.itemIds[0]
  const carteiraAntes = wallet(celularB, valeros)
  const quantidadeAntes = qty(celularB, valeros, itemId)
  await send(celularA, {
    type: 'BUY_CART',
    playerId: valeros,
    lines: [{ itemId, qty: 1 }],
    by: valeros,
  })
  await until('a compra chegar no outro celular', () => qty(celularB, valeros, itemId) === quantidadeAntes + 1)
  assert.ok(wallet(celularB, valeros) < carteiraAntes, 'a compra tinha que debitar a carteira')
  check('compra num celular debita e entrega no outro')

  // 3. O servidor é o dono do saldo: comprar sem dinheiro não muda nada.
  const carteiraCheia = wallet(celularB, valeros)
  await send(celularA, {
    type: 'BUY_CART',
    playerId: valeros,
    lines: [{ itemId, qty: 100_000 }],
    by: valeros,
  })
  await new Promise((r) => setTimeout(r, 200))
  assert.equal(wallet(celularB, valeros), carteiraCheia)
  check('compra sem saldo e recusada pelo servidor')

  // 3b. A ficha é fato do personagem, e mora no servidor: vincular num celular
  // e bater nele ali faz o outro ver o HP descer. Se HP fosse do aparelho, cada
  // um teria a sua contagem e ninguém saberia qual é a verdadeira.
  const ficha = { name: 'Rurik', level: 1, hpMax: 24, class: 'Barbarian' }
  await send(celularA, { type: 'IMPORT_SHEET', playerId: valeros, sheet: ficha, by: valeros })
  await until('a ficha chegar no outro celular', () => vitals(celularB, valeros).hp === 24)

  await send(celularB, { type: 'APPLY_DAMAGE', playerId: valeros, amount: 9, by: valeros })
  await until('o dano chegar no primeiro celular', () => vitals(celularA, valeros).hp === 15)
  check('dano aplicado num celular aparece no outro')

  await send(celularA, { type: 'SET_CONDITION', playerId: valeros, key: 'frightened', value: 2, by: valeros })
  await until('a condicao chegar', () => vitals(celularB, valeros).conditions.frightened === 2)
  check('condicao marcada num celular aparece no outro')

  // Remover a ficha não pode levar a mochila junto.
  const mochilaAntes = qty(celularB, valeros, itemId)
  await send(celularA, { type: 'REMOVE_SHEET', playerId: valeros, by: valeros })
  await until('a ficha sumir nos dois', () => sheetOf(celularB, valeros) === null)
  assert.equal(qty(celularB, valeros, itemId), mochilaAntes, 'remover ficha nao pode mexer no inventario')
  assert.equal(vitals(celularB, valeros).hp, 15, 'o HP e fato de mesa e sobrevive')
  check('remover a ficha nao leva inventario nem HP junto')

  // 4. Ação inventada não passa.
  const recusa = await send(celularA, { type: 'DAR_TUDO_PRA_MIM' })
  assert.equal(recusa.ok, false)
  check('acao desconhecida e recusada')

  // 5. Nenhum dos dois perdeu um aviso pelo caminho.
  assert.equal(celularA.gaps, 0)
  assert.equal(celularB.gaps, 0)
  assert.equal(celularA.seq, celularB.seq)
  check('os dois celulares estao no mesmo ponto da fila')

  // 6. O que foi jogado está no disco.
  const carteiraFinal = wallet(celularA, valeros)
  const noDisco = () => {
    try {
      const gravado = JSON.parse(readFileSync(mesaFile, 'utf8'))
      const player = gravado.players.find((current) => current.id === valeros)
      return player.gold * 100 + player.silver * 10 + player.copper
    } catch {
      return null
    }
  }
  await until('a mesa chegar no arquivo', () => noDisco() === carteiraFinal)
  check('a mesa foi gravada no disco')

  // 7. E volta igual quando o servidor sobe de novo.
  for (const client of clients) client.socket.close()
  clients.length = 0
  await stopServer()

  await startServer()
  const depoisDoRestart = await connect('C')
  assert.equal(wallet(depoisDoRestart, valeros), carteiraFinal)
  assert.equal(qty(depoisDoRestart, valeros, itemId), quantidadeAntes + 1)
  check('a mesa volta igual depois de reiniciar o servidor')

  console.log('\n  Tudo certo.\n')
}

try {
  await run()
} catch (error) {
  console.error(`\n  FALHOU: ${error.message}\n`)
  process.exitCode = 1
} finally {
  for (const client of clients) client.socket.close()
  await stopServer()
  rmSync(dataDir, { recursive: true, force: true })
}
