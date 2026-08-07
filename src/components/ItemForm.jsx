import { useState } from 'react'
import { CATEGORIES } from '../data/catalog.js'
import { parsePriceInput, toPriceInput } from '../lib/money.js'

/** Formulário de item manual, usado pelo item avulso e pelo item de campanha. */
export default function ItemForm({ item = null, onSubmit, submitLabel = 'Salvar' }) {
  const [name, setName] = useState(item?.name ?? '')
  const [level, setLevel] = useState(String(item?.level ?? 0))
  const [category, setCategory] = useState(item?.category ?? 'equipment')
  const [price, setPrice] = useState(item ? toPriceInput(item.priceCp) : '')
  const [bulk, setBulk] = useState(item?.bulk != null ? String(item.bulk) : '')
  const [traits, setTraits] = useState((item?.traits ?? []).join(', '))
  const [description, setDescription] = useState(item?.description ?? '')
  const [error, setError] = useState('')

  const submit = (event) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('Dê um nome ao item.')
      return
    }
    const priceCp = parsePriceInput(price)
    if (priceCp == null) {
      setError('Preço não entendido. Use algo como "5 po" ou "1 po 5 pp".')
      return
    }
    setError('')
    onSubmit({
      ...(item?.id ? { id: item.id } : {}),
      name: name.trim(),
      level: Number.parseInt(level, 10) || 0,
      category,
      priceCp,
      bulk: bulk.trim(),
      traits: traits
        .split(',')
        .map((trait) => trait.trim().toLowerCase())
        .filter(Boolean),
      description: description.trim(),
    })
  }

  return (
    <form className="stack" onSubmit={submit}>
      <label className="field">
        <span className="field__label">Nome</span>
        <input className="input" value={name} onChange={(event) => setName(event.target.value)} />
      </label>

      <div className="field-row">
        <label className="field">
          <span className="field__label">Nível</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            min="0"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
          />
        </label>
        <label className="field" style={{ gridColumn: 'span 2' }}>
          <span className="field__label">Tipo</span>
          <select
            className="select"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {Object.entries(CATEGORIES).map(([id, meta]) => (
              <option key={id} value={id}>
                {meta.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-row">
        <label className="field" style={{ gridColumn: 'span 2' }}>
          <span className="field__label">Preço</span>
          <input
            className="input"
            placeholder="ex.: 5 po ou 1 po 5 pp"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </label>
        <label className="field">
          <span className="field__label">Bulk</span>
          <input
            className="input"
            placeholder="1, L ou —"
            value={bulk}
            onChange={(event) => setBulk(event.target.value)}
          />
        </label>
      </div>

      <label className="field">
        <span className="field__label">Traços (separados por vírgula)</span>
        <input
          className="input"
          placeholder="magical, consumable"
          value={traits}
          onChange={(event) => setTraits(event.target.value)}
        />
      </label>

      <label className="field">
        <span className="field__label">Descrição</span>
        <textarea
          className="textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>

      {error ? <div className="notice notice--error">{error}</div> : null}

      <button type="submit" className="btn btn--primary btn--block">
        {submitLabel}
      </button>
    </form>
  )
}
