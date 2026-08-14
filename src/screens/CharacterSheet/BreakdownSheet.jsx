import Sheet from '../../components/Sheet.jsx'
import { sgn } from '../../lib/sheet.js'

/*
 * O popup que explica um número.
 *
 * É o ponto da aba Resumo inteira, e ele não calcula nada: `stat()` já devolveu
 * as parcelas rotuladas, e aqui elas só são listadas. Se este arquivo
 * precisasse somar alguma coisa, seria sinal de que o motor devolveu número
 * solto — que é justamente o que a espec proíbe.
 */
export default function BreakdownSheet({ stat, onClose }) {
  if (!stat) return null

  return (
    <Sheet onClose={onClose} center>
      <div className="bd__head">
        <span className="bd__title">{stat.title}</span>
        <span className={`bd__total${stat.altered ? ' bd__total--altered' : ''}`}>
          {stat.kind === 'dc' ? stat.total : sgn(stat.total)}
        </span>
      </div>

      <div className="bd__parts">
        {stat.parts.map((part, index) => (
          <div className="bd__row" key={`${part.label}-${index}`}>
            <span className={`bd__label${part.cond ? ' bd__label--cond' : ''}`}>{part.label}</span>
            <span className={`bd__value${part.cond ? ' bd__value--cond' : ''}`}>
              {sgn(part.value)}
            </span>
          </div>
        ))}
      </div>

      {stat.altered ? (
        <div className="bd__note">Valor alterado por condições ativas.</div>
      ) : null}

      <button type="button" className="btn btn--neutral btn--block" onClick={onClose}>
        Fechar
      </button>
    </Sheet>
  )
}

/**
 * Um número tocável. Vermelho quando alguma condição mexeu nele — é a mesma
 * marca `altered` que o breakdown explica, para o aviso e a explicação nunca
 * discordarem.
 */
export function StatCell({ label, stat, sub = null, onOpen, className = '' }) {
  const valor = stat.kind === 'dc' ? String(stat.total) : sgn(stat.total)
  return (
    <button
      type="button"
      className={className ? `statcell ${className}` : 'statcell'}
      onClick={() => onOpen(stat)}
    >
      <span className="statcell__label">{label}</span>
      <span className={`statcell__value${stat.altered ? ' statcell__value--altered' : ''}`}>
        {valor}
      </span>
      {sub ? <span className="statcell__sub">{sub}</span> : null}
    </button>
  )
}

/** Número que não se explica porque não é cálculo: deslocamento, tamanho. */
export function FactCell({ label, value, unit = null, sub = null }) {
  return (
    <div className="statcell statcell--fact">
      <span className="statcell__label">{label}</span>
      <span className="statcell__value">
        {value}
        {unit ? <span className="statcell__unit"> {unit}</span> : null}
      </span>
      {sub ? <span className="statcell__sub">{sub}</span> : null}
    </div>
  )
}
