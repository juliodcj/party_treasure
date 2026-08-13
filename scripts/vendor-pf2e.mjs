// Onde estao os packs do Foundry, e o que fazer quando nao estao.
//
// Os scripts de ingestao (build-catalog, build-traits e, na fase 4, build-lore)
// leem todos do mesmo clone. Este arquivo centraliza o caminho para que uma
// mudanca de layout la em cima seja um conserto so, e para que a falta do clone
// vire uma mensagem que ensina o que fazer — em vez de um catalogo vazio
// gravado por cima do bom.
//
// Layout esperado do clone:
//
//   vendor/pf2e/
//     packs/pf2e/equipment/…    <- o que este app usa
//     packs/sf2e/…              <- Starfinder, ignorado
//     static/lang/en.json       <- nomes e descricoes de traco

import { existsSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const ROOT = path.join(__dirname, '..')
export const DEFAULT_VENDOR = path.join(ROOT, 'vendor', 'pf2e')

const COMO_CLONAR = `
Clone os packs primeiro (sparse checkout, em vez dos 384 MB do repositorio):

  git clone --depth 1 --filter=blob:none --sparse \\
    https://github.com/foundryvtt/pf2e.git vendor/pf2e
  cd vendor/pf2e && git sparse-checkout set packs/pf2e static/lang src/module/actor

A pasta vendor/ nao vai para o Git — e so materia-prima da ingestao.

src/module/actor entra porque o Punho basico (Unarmed Strike) nao esta em pack
nenhum: no Foundry ele e montado em codigo. O build-lore.mjs extrai o bloco de
la em vez de alguem escrever "1d4 bludgeoning" a mao.`

function fail(mensagem) {
  console.error(`\n${mensagem}\n${COMO_CLONAR}\n`)
  process.exit(1)
}

const isDir = (p) => existsSync(p) && statSync(p).isDirectory()

/**
 * Aceita a raiz do clone, a pasta `packs/pf2e` ou o proprio pack, e devolve o
 * caminho do pack pedido. Sem argumento, procura em vendor/pf2e.
 *
 * `packs/sf2e` nunca e alcancado por aqui: o caminho e sempre montado sobre
 * `packs/pf2e`.
 */
export function resolvePack(nome, argumento = DEFAULT_VENDOR) {
  const base = path.resolve(argumento)

  const candidatos = [
    path.join(base, 'packs', 'pf2e', nome), // raiz do clone
    path.join(base, nome), // ja e packs/pf2e
    base, // ja e o pack
  ]
  const achado = candidatos.find(isDir)

  if (!achado) {
    fail(
      `Nao encontrei o pack "${nome}" a partir de ${base}.\n` +
        `Procurei em:\n${candidatos.map((c) => `  ${c}`).join('\n')}`,
    )
  }
  if (path.basename(achado) !== nome) {
    fail(`O caminho ${achado} nao e o pack "${nome}".`)
  }
  return achado
}

/**
 * Um arquivo do codigo-fonte do sistema Foundry, por caminho relativo a raiz do
 * clone. Serve para o que nao esta em pack — hoje, so o Punho basico.
 */
export function resolveSystemFile(relativo, argumento = DEFAULT_VENDOR) {
  const base = path.resolve(argumento)
  const alvo = path.join(base, relativo)
  if (!existsSync(alvo)) {
    fail(
      `Nao encontrei ${relativo} em ${base}.\n` +
        'Falta "src/module/actor" no sparse-checkout — veja o comando abaixo.',
    )
  }
  return alvo
}

/** O arquivo de localizacao oficial, de onde saem nome e descricao de traco. */
export function resolveLangFile(argumento = DEFAULT_VENDOR) {
  const base = path.resolve(argumento)

  const candidatos = [
    path.join(base, 'static', 'lang', 'en.json'), // raiz do clone
    path.join(base, 'lang', 'en.json'),
    path.join(base, 'en.json'),
    base, // ja e o arquivo
  ]
  const achado = candidatos.find((c) => existsSync(c) && statSync(c).isFile())

  if (!achado) {
    fail(
      `Nao encontrei static/lang/en.json a partir de ${base}.\n` +
        `Procurei em:\n${candidatos.map((c) => `  ${c}`).join('\n')}`,
    )
  }
  return achado
}
