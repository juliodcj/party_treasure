/**
 * Proporção do preço que o jogador recebe ao vender um item.
 *
 * O protótipo devolvia o valor cheio (1) e mantivemos assim para não mexer na
 * economia da mesa sem combinar. As regras do PF2e vendem por metade do preço:
 * quando isso for decidido (Fase 5 do roteiro), basta trocar para 0.5 aqui.
 */
export const SELL_RATE = 1

/** Chave do armazenamento local. Subir a versão descarta estados antigos. */
export const STORAGE_KEY = 'party-treasure/state/v1'
