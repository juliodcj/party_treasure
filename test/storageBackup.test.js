/*
 * O backup datado de cada mesa que se fecha.
 *
 * O `.bak` que já existia é sempre a versão de uma gravação atrás e some na
 * seguinte: serve para queda de energia no meio da escrita, e para mais nada.
 * A pasta `backups/` é a outra coisa — a mesa de ontem, para quando o problema
 * só aparece na semana que vem.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

import { createStorage } from '../server/storage.js'

const comPasta = (corpo) => {
  const dir = mkdtempSync(join(tmpdir(), 'mesa-'))
  try {
    corpo(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const mesa = (nome) => ({ version: 6, players: [{ id: 'p-1', name: nome }] })

test('fechar a mesa deixa uma cópia com data e hora no nome', () => {
  comPasta((dir) => {
    const storage = createStorage(join(dir, 'mesa.json'))
    storage.save(mesa('Valeros'))
    storage.flush()

    const destino = storage.backup('mesa fechada', new Date('2026-08-18T21:07:03Z'))
    assert.ok(destino?.endsWith('mesa-2026-08-18T21-07-03.json'), `nome inesperado: ${destino}`)

    const copia = JSON.parse(readFileSync(destino, 'utf8'))
    assert.equal(copia.players[0].name, 'Valeros')
  })
})

test('a cópia leva o que estava pendente, não a mesa de 300 ms atrás', () => {
  comPasta((dir) => {
    const storage = createStorage(join(dir, 'mesa.json'))
    storage.save(mesa('Antes'))
    storage.flush()
    // Esta segunda gravação cai na janela de agrupamento e fica pendente.
    storage.save(mesa('Depois'))

    const destino = storage.backup('mesa substituída')
    assert.equal(JSON.parse(readFileSync(destino, 'utf8')).players[0].name, 'Depois')
  })
})

test('dois fechamentos deixam dois arquivos — nada é sobrescrito nem apagado', () => {
  comPasta((dir) => {
    const storage = createStorage(join(dir, 'mesa.json'))
    storage.save(mesa('Valeros'))
    storage.flush()

    storage.backup('mesa fechada', new Date('2026-08-18T21:07:03Z'))
    storage.backup('mesa fechada', new Date('2026-08-19T20:15:44Z'))

    assert.deepEqual(readdirSync(join(dir, 'backups')).sort(), [
      'mesa-2026-08-18T21-07-03.json',
      'mesa-2026-08-19T20-15-44.json',
    ])
  })
})

test('mesa que ainda não existe em arquivo não gera backup vazio', () => {
  comPasta((dir) => {
    const storage = createStorage(join(dir, 'mesa.json'))
    assert.equal(storage.backup('mesa fechada'), null)
  })
})
