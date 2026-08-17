/* O efeito mecânico das condições.
 *
 * As 43 condições vêm do pack do Foundry, em inglês, com nome e descrição
 * (`src/data/conditions.json`). O que NÃO vem de lá é o efeito automático: o
 * Foundry codifica isso em `system.rules`, que é o motor de automação dele, com
 * seletores, predicados e sintaxe própria. Interpretar aquilo aqui seria
 * escrever meio Foundry.
 *
 * Então oito condições têm efeito, escrito como tabela, e as outras 35 são
 * marcação e referência — aparecem no chip, abrem a descrição, e o jogador
 * aplica na mesa. Essa é a fronteira honesta: o que o app sabe fazer, ele faz;
 * o resto ele mostra e não finge.
 */

/**
 * O que cada condição com efeito automático faz.
 *
 * `status`: penalidade de status, que **não empilha** — entre Frightened 2 e
 * Sickened 1 vale 2, nunca 3. É a regra do PF2e e a fonte de erro mais comum
 * depois da proficiência.
 *
 * `ability`: penalidade que só atinge o que depende daquele atributo. Clumsy
 * pesa na CA, nos Reflexos e nas perícias de Destreza, e não encosta em
 * Atletismo.
 */
export const MECHANICAL = {
  frightened: { kind: 'status', valued: true },
  sickened: { kind: 'status', valued: true },
  clumsy: { kind: 'ability', ability: 'dex', valued: true },
  enfeebled: { kind: 'ability', ability: 'str', valued: true },
  drained: { kind: 'ability', ability: 'con', valued: true },
  /* Slowed tira ações, não modifica número nenhum: entra aqui para a tela saber
     que ele é "dos oito", mas não vira parcela em cálculo algum. */
  slowed: { kind: 'actions', valued: true },
  prone: { kind: 'circumstance', target: 'attack', value: 2, valued: false },
  offGuard: { kind: 'circumstance', target: 'ac', value: 2, valued: false },
}

/* O pack grava o slug com hífen (`off-guard`); a mesa guarda a chave em camelo
   (`offGuard`), que é como o protótipo já escrevia. Uma tabela de dois nomes é
   mais barata que renomear a chave em estado que já está gravado no disco. */
export const SLUG_TO_KEY = {
  'off-guard': 'offGuard',
  flatfooted: 'offGuard',
}

export const conditionKey = (slug) => SLUG_TO_KEY[slug] ?? slug

/**
 * Lê o mapa de condições ativas do personagem e devolve os números que o motor
 * usa. Uma passada só, para o cálculo não reinterpretar a tabela a cada
 * estatística.
 *
 * Portado do `condMods` do protótipo, com os mesmos nomes.
 */
export function conditionMods(conditions = {}) {
  const valor = (key) => {
    const v = conditions[key]
    if (v === true) return 1
    const n = Number(v)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : 0
  }

  const frightened = valor('frightened')
  const sickened = valor('sickened')

  return {
    /* Não somam: vale o pior. Quem estiver Frightened 2 e Sickened 1 sofre 2. */
    status: Math.max(frightened, sickened),
    statusLabel: frightened >= sickened ? 'Frightened' : 'Sickened',
    dex: valor('clumsy'),
    str: valor('enfeebled'),
    con: valor('drained'),
    slowed: valor('slowed'),
    prone: conditions.prone ? MECHANICAL.prone.value : 0,
    offGuard: conditions.offGuard ? MECHANICAL.offGuard.value : 0,
  }
}

/* Rótulo da penalidade por atributo, para a parcela do breakdown dizer de onde
   veio o número. Nome da condição em inglês (D12); "(status)" é moldura nossa. */
export const ABILITY_CONDITION = { dex: 'Clumsy', str: 'Enfeebled', con: 'Drained' }
