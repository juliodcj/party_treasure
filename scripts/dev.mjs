import { spawn } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { printStartupBanner } from '../server/net.js'

/**
 * Modo desenvolvimento: dois processos, uma porta só para quem usa.
 *
 *   Vite na 3000  — serve o app com hot reload e repassa /socket.io pra 3001
 *   servidor 3001 — o dono da mesa (ver vite.config.js)
 *
 * O endereço que o celular digita é o mesmo dos dois modos (3000), então dá
 * para testar na mesa de verdade sem trocar de URL no meio do caminho.
 */

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'

const children = []

function start(command, args, name) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
  })
  child.on('exit', (code) => {
    // Um caiu, o outro não serve para nada sozinho: derruba os dois.
    if (!closing) {
      console.error(`\n[dev] ${name} encerrou (codigo ${code}). Derrubando o resto.`)
      stop()
    }
  })
  children.push(child)
  return child
}

let closing = false
function stop() {
  if (closing) return
  closing = true
  for (const child of children) child.kill()
  setTimeout(() => process.exit(0), 300).unref()
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)

start('node', [resolve(ROOT, 'server', 'index.js'), '--dev'], 'servidor')
start(npx, ['vite', '--host', '--port', '3000'], 'vite')

// O Vite imprime os endereços dele, mas sem contexto de qual usar na mesa.
setTimeout(() => printStartupBanner(3000, { dev: true }), 1200).unref()
