import { networkInterfaces } from 'node:os'
import qrcode from 'qrcode-terminal'

/**
 * Descobre o endereço do PC na rede local. É a informação que a mesa inteira
 * depende: é isso que os jogadores digitam no Chrome do celular.
 */

/** Faixas privadas, na ordem em que um roteador doméstico costuma entregar. */
const PRIVATE_RANGES = [/^192\.168\./, /^10\./, /^172\.(1[6-9]|2\d|3[01])\./]

export function lanAddresses() {
  const found = []
  for (const [name, entries] of Object.entries(networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family !== 'IPv4' || entry.internal) continue
      const rank = PRIVATE_RANGES.findIndex((range) => range.test(entry.address))
      // Fora das faixas privadas quase sempre é adaptador virtual (VPN, WSL,
      // Docker): entra na lista, mas por último.
      found.push({ name, address: entry.address, rank: rank === -1 ? PRIVATE_RANGES.length : rank })
    }
  }
  return found.sort((a, b) => a.rank - b.rank)
}

export function printStartupBanner(port, { dev = false } = {}) {
  const addresses = lanAddresses()
  const main = addresses[0]

  console.log('')
  console.log('  PF2e — Party Treasure')
  console.log(`  Mesa no ar${dev ? ' (modo desenvolvimento)' : ''}.`)
  console.log('')
  console.log(`  Neste PC:      http://localhost:${port}`)

  if (!main) {
    console.log('')
    console.log('  Nao encontrei um endereco de rede local. Os celulares so vao')
    console.log('  conseguir entrar se o PC estiver conectado ao Wi-Fi.')
    console.log('')
    return
  }

  const url = `http://${main.address}:${port}`
  console.log(`  Nos celulares: ${url}`)
  for (const extra of addresses.slice(1)) {
    console.log(`                 http://${extra.address}:${port}   (${extra.name})`)
  }
  console.log('')
  console.log('  Aponte a camera do celular para o codigo abaixo:')
  console.log('')
  qrcode.generate(url, { small: true })
  console.log('  Se o celular nao abrir, confira se ele esta no mesmo Wi-Fi e')
  console.log('  se o Windows liberou o Node.js nas "redes privadas".')
  console.log('')
  console.log('  Ctrl+C encerra a mesa. O que foi jogado fica salvo.')
  console.log('')
}
