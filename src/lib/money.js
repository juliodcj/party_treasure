// Toda quantia circula normalizada em cobre (cp).
// 1 po = 10 pp = 100 pc

export const CP_PER_SP = 10
export const CP_PER_GP = 100

/** Converte um trio de moedas em cobre. */
export function toCopper({ gold = 0, silver = 0, copper = 0 } = {}) {
  return Math.round(gold) * CP_PER_GP + Math.round(silver) * CP_PER_SP + Math.round(copper)
}

/** Quebra um total em cobre nas tres denominacoes (forma simplificada). */
export function fromCopper(totalCp) {
  const cp = Math.max(0, Math.round(totalCp || 0))
  return {
    gold: Math.floor(cp / CP_PER_GP),
    silver: Math.floor((cp % CP_PER_GP) / CP_PER_SP),
    copper: cp % CP_PER_SP,
  }
}

/** "12 po 3 pp" — omite denominacoes zeradas, mas nunca devolve string vazia. */
export function formatCopper(totalCp) {
  const { gold, silver, copper } = fromCopper(totalCp)
  const parts = []
  if (gold) parts.push(`${gold} po`)
  if (silver) parts.push(`${silver} pp`)
  if (copper) parts.push(`${copper} pc`)
  return parts.length ? parts.join(' ') : '0 pc'
}

/**
 * Le um preco digitado a mao aceitando os formatos que aparecem na mesa:
 * "12", "12 po", "1 po 5 pp", "3pp", "15 gp", "—".
 * Numero solto sem unidade e interpretado como PEÇAS DE OURO.
 * Devolve o total em cobre, ou null se nao entender nada.
 */
export function parsePriceInput(input) {
  if (input == null) return null
  const text = String(input).trim().toLowerCase()
  if (!text || text === '—' || text === '-') return 0

  const unitToCp = { po: CP_PER_GP, gp: CP_PER_GP, pp: CP_PER_SP, sp: CP_PER_SP, pc: 1, cp: 1 }
  const matches = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*(po|gp|pp|sp|pc|cp)?/g)]

  let total = 0
  let matched = false
  for (const [, rawValue, unit] of matches) {
    const value = Number.parseFloat(rawValue.replace(',', '.'))
    if (!Number.isFinite(value)) continue
    matched = true
    // Sem unidade explicita assumimos ouro, que e como se fala preco no jogo.
    total += value * (unitToCp[unit] ?? CP_PER_GP)
  }
  return matched ? Math.round(total) : null
}

/** Formato editavel de volta ("1 po 5 pp"), usado para preencher formularios. */
export function toPriceInput(totalCp) {
  return formatCopper(totalCp)
}

/** Soma moedas denominacao a denominacao — a carteira NAO e simplificada sozinha. */
export function addCoins(wallet, { gold = 0, silver = 0, copper = 0 } = {}) {
  return {
    gold: Math.max(0, wallet.gold + Math.round(gold)),
    silver: Math.max(0, wallet.silver + Math.round(silver)),
    copper: Math.max(0, wallet.copper + Math.round(copper)),
  }
}

/**
 * Reescreve a carteira a partir de um total em cobre. Toda transação passa por
 * aqui, então o troco sai sempre já convertido — é o que o protótipo faz.
 */
export function withWalletCopper(wallet, totalCp) {
  return { ...wallet, ...fromCopper(totalCp) }
}

/**
 * Paga `amountCp`. Devolve a carteira nova, ou `null` se o saldo não cobrir.
 * A tela sempre valida antes; isto é a última linha de defesa.
 */
export function spendCopper(wallet, amountCp) {
  const owed = Math.max(0, Math.round(amountCp || 0))
  const total = toCopper(wallet)
  if (owed > total) return null
  return withWalletCopper(wallet, total - owed)
}

/** Junta tudo e redistribui na menor quantidade de moedas. */
export function simplifyWallet(wallet) {
  return fromCopper(toCopper(wallet))
}

/**
 * Simplificar só muda alguma coisa se houver 10 ou mais de prata ou de cobre —
 * é o que decide se o atalho aparece no cabeçalho.
 */
export function canSimplify({ silver = 0, copper = 0 } = {}) {
  return silver >= CP_PER_SP || copper >= CP_PER_SP
}
