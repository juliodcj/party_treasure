import SPELL_INDEX from '../data/index.spells.json' with { type: 'json' }
import { spellRef } from './loreResolve.js'

/*
 * Perguntas sobre uma magia que mais de uma tela faz.
 *
 * Mora aqui, e não numa das telas, porque quem pergunta é a aba Ataques (que
 * número mostrar) e a descrição (que defesa escrever) — pôr no Compêndio faria
 * o `SpellPicker` importar de quem já o importa.
 */

/* O índice do bundle por id (`spell:fireball`), para quem só tem o nome: o
   export do Pathbuilder não traz id, e `spellRef` adivinha o slug. Montado uma
   vez, na primeira pergunta. */
let porId = null

/** A entrada do índice para um nome de magia, ou `null` se o slug não bate. */
export function spellDoIndice(nome) {
  if (!porId) porId = new Map(SPELL_INDEX.map((sp) => [sp.id, sp]))
  return porId.get(spellRef(nome)) ?? null
}

/*
 * A magia pede rolagem de ataque?
 *
 * Quem marca isso no corpus é o traço `attack` — 94 magias (Telekinetic
 * Projectile, Ray of Frost), todas com `defense: null`. O `defense.passive` com
 * `ac` diz a mesma coisa por outro caminho, e existe em 7; as duas formas
 * valem, e é por isso que perguntar "a defesa é AC?" sozinho não bastava.
 *
 * Serve tanto para uma entrada do índice quanto para um verbete inteiro do
 * servidor: as duas trazem `traits` e `defense`.
 */
export const ehMagiaDeAtaque = (sp) =>
  Boolean((sp?.traits ?? []).includes('attack') || sp?.defense?.passive?.statistic === 'ac')

/** A magia joga contra um salvamento? Basic ou não — as duas usam a DC. */
export const ehMagiaDeSalvamento = (sp) => Boolean(sp?.defense?.save?.statistic)

const DEFESA_PASSIVA = { ac: 'AC', 'reflex-dc': 'Reflex DC', 'fortitude-dc': 'Fortitude DC' }

const capitalizar = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * A defesa da magia escrita como o livro escreve: "basic Reflex", "Will", "AC".
 * `null` quando não há o que dizer — magia de buff, de utilidade.
 */
export function defesaDaMagia(sp) {
  const partes = []

  const save = sp?.defense?.save
  if (save?.statistic) partes.push(`${save.basic ? 'basic ' : ''}${capitalizar(save.statistic)}`)

  const passiva = sp?.defense?.passive?.statistic
  /* Chave desconhecida aparece com o nome que veio, em vez de sumir. */
  if (passiva) partes.push(DEFESA_PASSIVA[passiva] ?? capitalizar(passiva))

  /* O traço `attack` não preenche `defense` no corpus, mas é a mesma
     informação: a magia rola ataque contra a AC do alvo. Sem isso, as 94
     magias de ataque abriam sem linha de Defense nenhuma — o dado existia, só
     não estava no campo onde a tela procurava. */
  if (!partes.length && ehMagiaDeAtaque(sp)) partes.push('AC')

  return partes.join(' · ') || null
}
