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

const children = []

/**
 * Sempre `node <arquivo.js>`, nunca `npx` e nunca com `shell: true`.
 *
 * Com shell, o Windows junta os argumentos num texto só e quebra no primeiro
 * espaço — num caminho como "C:\Users\Julio Carvalho\..." o comando vira
 * "C:\Users\Julio" e o Node reclama de módulo inexistente. Chamando o binário
 * do Vite direto, o espaço não é problema de ninguém.
 */
function start(args, name) {
  const child = spawn(process.execPath, args, {
    cwd: ROOT,
    stdio: ['ignore', 'inherit', 'inherit'],
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

start([resolve(ROOT, 'server', 'index.js'), '--dev'], 'servidor')
start([resolve(ROOT, 'node_modules', 'vite', 'bin', 'vite.js'), '--host', '--port', '3000'], 'vite')

// O Vite imprime os endereços dele, mas sem contexto de qual usar na mesa.
setTimeout(() => printStartupBanner(3000, { dev: true }), 1200).unref()
