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

/** Saldo total da carteira de um jogador, em cobre. */
export function walletCopper(wallet) {
  return toCopper(wallet)
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
 * Paga `amountCp` quebrando o mínimo de moedas grandes possível, como se fosse
 * na mesa. Devolve a carteira nova, ou `null` se o saldo não cobrir o valor.
 * De propósito não simplifica o resto: isso é papel do botão "Simplificar".
 */
export function spendCopper(wallet, amountCp) {
  const owedInput = Math.max(0, Math.round(amountCp || 0))
  if (owedInput === 0) return { ...wallet }
  if (owedInput > toCopper(wallet)) return null

  let { gold, silver, copper } = wallet
  let owed = owedInput

  // Paga com o que já está trocado, da menor denominação para a maior.
  const payCopper = Math.min(copper, owed)
  copper -= payCopper
  owed -= payCopper

  const paySilver = Math.min(silver, Math.floor(owed / CP_PER_SP))
  silver -= paySilver
  owed -= paySilver * CP_PER_SP

  const payGold = Math.min(gold, Math.floor(owed / CP_PER_GP))
  gold -= payGold
  owed -= payGold * CP_PER_GP

  if (owed === 0) return { gold, silver, copper }

  // Sobrou troco a fazer: quebra uma única moeda maior e tenta de novo.
  if (silver > 0) {
    silver -= 1
    copper += CP_PER_SP
  } else {
    gold -= 1
    silver += 9
    copper += CP_PER_SP
  }
  return spendCopper({ gold, silver, copper }, owed)
}

/** Junta tudo e redistribui na menor quantidade de moedas. */
export function simplifyWallet(wallet) {
  return fromCopper(toCopper(wallet))
}
