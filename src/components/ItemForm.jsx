import { useState } from 'react'
import { SheetActions } from './Sheet.jsx'
import { CATEGORIES } from '../data/catalog.js'
import { fromCopper, toCopper } from '../lib/money.js'

/** Formulário de item manual: o item avulso da mochila e o item de campanha. */
export default function ItemForm({ item = null, onSubmit, onCancel, submitLabel = 'Salvar' }) {
  const seedPrice = fromCopper(item?.priceCp ?? 0)
  const [name, setName] = useState(item?.name ?? '')
  const [level, setLevel] = useState(item ? String(item.level ?? 0) : '')
  const [category, setCategory] = useState(item?.category ?? 'equipment')
  const [bulk, setBulk] = useState(item?.bulk != null ? String(item.bulk) : '')
  const [traits, setTraits] = useState((item?.traits ?? []).join(', '))
  const [description, setDescription] = useState(item?.description ?? '')
  const [gold, setGold] = useState(seedPrice.gold ? String(seedPrice.gold) : '')
  const [silver, setSilver] = useState(seedPrice.silver ? String(seedPrice.silver) : '')
  const [copper, setCopper] = useState(seedPrice.copper ? String(seedPrice.copper) : '')

  const submit = () => {
    if (!name.trim()) return
    onSubmit({
      ...(item?.id ? { id: item.id } : {}),
      name: name.trim(),
      level: Number.parseInt(level, 10) || 0,
      category,
      priceCp: toCopper({
        gold: Number.parseInt(gold, 10) || 0,
        silver: Number.parseInt(silver, 10) || 0,
        copper: Number.parseInt(copper, 10) || 0,
      }),
      bulk: bulk.trim(),
      traits: traits
        .split(',')
        .map((trait) => trait.trim().toLowerCase())
        .filter(Boolean),
      description: description.trim(),
    })
  }

  return (
    <>
      <input
        className="input"
        style={{ marginBottom: 8 }}
        placeholder="Nome do item"
        value={name}
        onChange={(event) => setName(event.target.value)}
        aria-label="Nome do item"
      />

      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <input
          className="input"
          type="number"
          inputMode="numeric"
          placeholder="Nível"
          value={level}
          onChange={(event) => setLevel(event.target.value)}
          style={{ flex: 1, minWidth: 0 }}
          aria-label="Nível"
        />
        <input
          className="input"
          placeholder="Bulk"
          value={bulk}
          onChange={(event) => setBulk(event.target.value)}
          style={{ flex: 1, minWidth: 0 }}
          aria-label="Bulk"
        />
      </div>

      <select
        className="input"
        style={{ marginBottom: 8 }}
        value={category}
        onChange={(event) => setCategory(event.target.value)}
        aria-label="Tipo"
      >
        {Object.entries(CATEGORIES).map(([id, meta]) => (
          <option key={id} value={id}>
            {meta.label}
          </option>
        ))}
      </select>

      <input
        className="input"
        style={{ marginBottom: 8 }}
        placeholder="Traços (separados por vírgula)"
        value={traits}
        onChange={(event) => setTraits(event.target.value)}
        aria-label="Traços"
      />

      <textarea
        className="textarea"
        style={{ marginBottom: 10 }}
        placeholder="Descrição"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        aria-label="Descrição"
      />

      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-faint)', marginBottom: 6 }}>
        Valor
      </div>
      <CoinInputs
        gold={gold}
        silver={silver}
        copper={copper}
        onGold={setGold}
        onSilver={setSilver}
        onCopper={setCopper}
      />

      <SheetActions
        onCancel={onCancel}
        onConfirm={submit}
        confirmLabel={submitLabel}
        disabled={!name.trim()}
      />
    </>
  )
}

/** Três campos numéricos, cada um com o pontinho da sua denominação. */
export function CoinInputs({ gold, silver, copper, onGold, onSilver, onCopper, small = false }) {
  const fields = [
    ['gold', 'Ouro', gold, onGold],
    ['silver', 'Prata', silver, onSilver],
    ['copper', 'Cobre', copper, onCopper],
  ]
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {fields.map(([coin, label, value, onChange]) => (
        <div className="coin-field" key={coin}>
          <input
            className={`input${small ? ' input--sm' : ''}`}
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={label}
          />
          <span className={`coin-dot coin-dot--lg coin-dot--${coin}`} />
        </div>
      ))}
    </div>
  )
}
