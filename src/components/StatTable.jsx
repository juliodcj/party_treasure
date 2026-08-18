/**
 * Grade de dois campos por linha sobre fundo afundado, rótulo pequeno em cima
 * e valor em destaque embaixo. É a ficha técnica de qualquer coisa que o pack
 * descreve por campos: arma, armadura e escudo no Inventário, alcance/área/
 * alvo/defesa numa magia.
 *
 * Campo nulo ou vazio nem entra na grade — dado que a fonte não traz não vira
 * traço na tela.
 */
export default function StatTable({ fields }) {
  const rows = (fields ?? []).filter(([, value]) => value != null && value !== '')
  if (!rows.length) return null
  return (
    <dl className="stat-table">
      {rows.map(([label, value]) => (
        <div className="stat-table__cell" key={label}>
          <dt className="field-label stat-table__label">{label}</dt>
          <dd className="stat-table__value">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
