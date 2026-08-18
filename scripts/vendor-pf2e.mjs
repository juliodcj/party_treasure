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
  cd vendor/pf2e && git sparse-checkout set packs/pf2e static/lang \\
    src/module/actor src/module/system/action-macros

A pasta vendor/ nao vai para o Git — e so materia-prima da ingestao.

src/module/actor entra porque o Punho basico (Unarmed Strike) nao esta em pack
nenhum: no Foundry ele e montado em codigo. O build-lore.mjs extrai o bloco de
la em vez de alguem escrever "1d4 bludgeoning" a mao.

src/module/system/action-macros entra pela mesma razao: qual pericia rola cada
acao de pericia nao esta no pack. Ja esteve — o pack tinha actions/skill/athletics/ —
e hoje actions/skill/ e uma pasta so, sem nivel de pericia. Quem ainda guarda a
divisao e o registro de acoes do sistema, uma pasta por pericia. So os NOMES das
pastas sao lidos; nenhum TypeScript e parseado.`

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

/**
 * Uma pasta do codigo-fonte do sistema, por caminho relativo a raiz do clone.
 * Falha alto, como o resto: pasta que sumiu vira mensagem que ensina o comando,
 * nunca um indice pela metade gravado por cima do bom.
 */
export function resolveSystemDir(relativo, argumento = DEFAULT_VENDOR) {
  const base = path.resolve(argumento)
  const alvo = path.join(base, relativo)
  if (!isDir(alvo)) {
    fail(`Nao encontrei a pasta ${relativo} em ${base}.\nFalta ela no sparse-checkout.`)
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

/**
 * O SEGUNDO arquivo de localizacao. O sistema divide os textos em dois: o
 * `en.json` tem interface, tracos e glossario; o `re-en.json` tem o que as
 * regras (rule elements) citam por chave — e e la que moram os
 * `PF2E.SpecificRule.*` que 20 verbetes dos packs invocam com @Localize.
 *
 * Opcional de proposito: devolve null se nao existir, e quem chama segue com
 * o `en.json` sozinho, avisando no log a chave que nao resolveu.
 */
export function resolveRuleLangFile(argumento = DEFAULT_VENDOR) {
  const base = path.resolve(argumento)

  const candidatos = [
    path.join(base, 'static', 'lang', 're-en.json'),
    path.join(base, 'lang', 're-en.json'),
    path.join(base, 're-en.json'),
  ]
  return candidatos.find((c) => existsSync(c) && statSync(c).isFile()) ?? null
}
