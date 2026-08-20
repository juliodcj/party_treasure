/*
 * Modificador manual em qualquer número da ficha.
 *
 * É o mesmo princípio do modificador de item (D6), estendido ao resto da
 * ficha: onde o app não sabe, ele admite. Feat que dá +1 de circunstância na
 * CA, item que soma +10 de deslocamento, bênção que o mestre concedeu para a
 * sessão inteira — nada disso o motor calcula, e chutar seria pior do que não
 * fazer. Então o jogador declara, com o rótulo dele, e a declaração aparece no
 * breakdown junto das parcelas que o app calculou.
 *
 * Cada modificador é `{ label, target, value, enabled }`, e mora em
 * `player.statMods` — uma lista só, não um mapa por alvo: dois modificadores
 * podem apontar para a mesma perícia, e a tela mostra os dois.
 *
 * `enabled: false` é o modificador DESLIGADO: continua na lista, continua na
 * tela, e não entra em conta nenhuma. É o que a Fúria pede — ela liga e desliga
 * várias vezes por combate, e apagar para reescrever depois seria perder o
 * rótulo e o número toda vez.
 *
 * O ALVO é uma chave com prefixo, e o prefixo é o que separa homônimos:
 *
 *     abil:str          o modificador do atributo
 *     ac                a Classe de Armadura
 *     save:will         um salvamento
 *     perception · speed · hpMax · classDc · spellDc · spellAttack
 *     skill:athletics   uma perícia — inclusive `skill:lore:sailing`
 *
 * Modificador em ATRIBUTO entra em tudo que depende dele: um `abil:str` de +1
 * sobe Atletismo, o ataque corpo a corpo e o dano junto, porque é isso que um
 * atributo faz. Os outros alvos valem só onde apontam.
 */

import { skillList } from './pathbuilder.js'

const ATRIBUTOS = [
  ['abil:str', 'Str'],
  ['abil:dex', 'Dex'],
  ['abil:con', 'Con'],
  ['abil:int', 'Int'],
  ['abil:wis', 'Wis'],
  ['abil:cha', 'Cha'],
]

const DEFESAS = [
  ['ac', 'CA'],
  ['save:fortitude', 'Fortitude'],
  ['save:reflex', 'Reflex'],
  ['save:will', 'Will'],
]

/* Os números da faixa "Outras estatísticas", na ordem em que a tela os mostra.
   `hpMax` entra aqui e não com as defesas porque ele não é teste nem CD: é o
   teto da barra de vida, e mexer nele mexe no que a cura pode encher. */
const OUTRAS = [
  ['perception', 'Percepção'],
  ['speed', 'Velocidade'],
  ['hpMax', 'PV máximo'],
  ['classDc', 'DC Classe'],
]

/* DC e Ataque de magia só existem para quem conjura. Oferecer os dois a um
   bárbaro seria oferecer um modificador que não muda número nenhum — e número
   declarado que não aparece em lugar algum é errar em silêncio. */
const CONJURACAO = [
  ['spellDc', 'DC Magia'],
  ['spellAttack', 'Atq Magia'],
]

const opcoes = (pares) => pares.map(([target, label]) => ({ target, label }))

/**
 * Os alvos que ESTA ficha oferece, agrupados como a aba Resumo os agrupa — a
 * lista do seletor é a mesma tela, na mesma ordem, para escolher o alvo ser
 * procurar na tela onde o número está.
 */
export function statModTargets(sheet) {
  const grupos = [
    { grupo: 'Atributos', opcoes: opcoes(ATRIBUTOS) },
    { grupo: 'Defesas', opcoes: opcoes(DEFESAS) },
    {
      grupo: 'Outras estatísticas',
      opcoes: opcoes(sheet?.spellcasting ? [...OUTRAS, ...CONJURACAO] : OUTRAS),
    },
    {
      grupo: 'Perícias',
      opcoes: skillList(sheet).map((skill) => ({
        target: `skill:${skill.key}`,
        label: skill.name,
      })),
    },
  ]
  return grupos.filter((g) => g.opcoes.length)
}

/** O primeiro alvo da lista, que é o que um modificador novo já vem apontando. */
export const PRIMEIRO_ALVO = ATRIBUTOS[0][0]

/**
 * O nome do alvo, para a tela.
 *
 * Alvo que não está mais na lista — a perícia de Lore saiu numa reimportação,
 * a ficha deixou de conjurar — devolve a própria chave. O modificador continua
 * visível com o nome que veio, em vez de sumir sem um pio.
 */
export function statModLabel(sheet, target) {
  for (const { opcoes: lista } of statModTargets(sheet)) {
    const achou = lista.find((opcao) => opcao.target === target)
    if (achou) return achou.label
  }
  return target
}

const num = (value) => {
  const n = Number(value)
  return Number.isFinite(n) ? Math.round(n) : 0
}

/** Um modificador desligado continua guardado e não entra em conta nenhuma. */
export const statModAtivo = (mod) => Boolean(mod) && mod.enabled !== false

/** Os modificadores LIGADOS que apontam para um alvo, na ordem de criação. */
export const statModsOf = (statMods, target) =>
  (statMods ?? []).filter((mod) => statModAtivo(mod) && mod.target === target)

/** O que eles somam. Para o número que não tem breakdown (deslocamento, PV). */
export const statModTotal = (statMods, target) =>
  statModsOf(statMods, target).reduce((n, mod) => n + num(mod.value), 0)

/**
 * Eles como parcelas de `stat()`. O sufixo `(manual)` é o mesmo do modificador
 * de item: no breakdown, o jogador vê de longe o que o app calculou e o que
 * ele próprio declarou.
 */
export const statModParts = (statMods, target) =>
  statModsOf(statMods, target).map((mod) => ({
    label: `${mod.label} (manual)`,
    value: num(mod.value),
    manual: true,
  }))

/**
 * Sanea a lista que chega do cliente. Rótulo é obrigatório, como no
 * modificador de item: um número que aparece sem dizer de onde veio é
 * exatamente o que esta ficha existe para não fazer.
 */
export function normalizeStatMods(mods) {
  return (Array.isArray(mods) ? mods : [])
    .map((mod) => ({
      label: String(mod?.label ?? '').trim(),
      target: String(mod?.target ?? '').trim(),
      value: num(mod?.value),
      /* Ligado é o padrão: modificador gravado antes de a caixa existir, ou
         criado agora, nasce valendo. Só o `false` explícito desliga. */
      enabled: mod?.enabled !== false,
    }))
    .filter((mod) => mod.label && mod.target)
}
