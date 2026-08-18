import { useState } from 'react'
import Sheet, { SheetActions } from '../../components/Sheet.jsx'
import { TrashIcon } from '../../components/Icons.jsx'
import { useStore } from '../../state/store.jsx'

/*
 * Modificadores manuais de um item (D6).
 *
 * É a saída honesta para tudo que o motor não sabe calcular: Rage, Giant
 * Instinct, weapon specialization, runa. O princípio da espec é "onde o app não
 * sabe, ele admite" — em vez de chutar um bônus, ele deixa o jogador declarar
 * um, com o rótulo dele, e mostra a declaração no breakdown junto das parcelas
 * que o app calculou.
 *
 * Rótulo obrigatório de propósito: um número que aparece sem dizer de onde veio
 * é exatamente o que esta ficha existe para não fazer.
 */
export default function ItemModsSheet({ player, item, onClose }) {
  const { dispatch } = useStore()
  const [mods, setMods] = useState(() => player.itemMods?.[item.id] ?? [])

  const alterar = (indice, campo, valor) =>
    setMods((atual) => atual.map((mod, i) => (i === indice ? { ...mod, [campo]: valor } : mod)))

  const salvar = () => {
    dispatch({ type: 'SET_ITEM_MODS', playerId: player.id, itemId: item.id, mods })
    onClose()
  }

  return (
    <Sheet title={`Modificadores de ${item.name}`} onClose={onClose}>
      <div className="mods__list">
        {mods.map((mod, indice) => (
          // A ordem é a identidade aqui: dois modificadores podem ter o mesmo
          // rótulo enquanto a pessoa digita, então o índice é o que temos.
          <div className="mods__row" key={indice}>
            <input
              className="input"
              placeholder="Rage"
              value={mod.label}
              onChange={(event) => alterar(indice, 'label', event.target.value)}
              aria-label="Nome do modificador"
            />
            <div className="mods__numbers">
              <Campo rotulo="Ataque" valor={mod.atk} onChange={(v) => alterar(indice, 'atk', v)} />
              <Campo rotulo="Dano" valor={mod.dmg} onChange={(v) => alterar(indice, 'dmg', v)} />
              <Campo
                rotulo="Dados"
                valor={mod.extraDice}
                onChange={(v) => alterar(indice, 'extraDice', v)}
              />
              {/* Lixeira, e no --accent do resto dos botões-ícone de linha: o
                  vermelho fica para o que não se desfaz, e aqui o Cancelar da
                  folha ainda desfaz tudo. */}
              <button
                type="button"
                className="icon-btn icon-btn--accent mods__tirar"
                aria-label={`Tirar o modificador ${mod.label || indice + 1}`}
                onClick={() => setMods((atual) => atual.filter((_, i) => i !== indice))}
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        ))}

        {mods.length === 0 ? (
          <div className="empty empty--inline">Nenhum modificador neste item.</div>
        ) : null}
      </div>

      <button
        type="button"
        className="btn btn--tint btn--block"
        onClick={() => setMods((atual) => [...atual, { label: '', atk: 0, dmg: 0, extraDice: 0 }])}
      >
        Acrescentar modificador
      </button>

      <SheetActions onConfirm={salvar} onCancel={onClose} confirmLabel="Salvar" />
    </Sheet>
  )
}

function Campo({ rotulo, valor, onChange }) {
  return (
    <label className="form__field">
      <span className="field-label">{rotulo}</span>
      <input
        className="input input--sm"
        type="number"
        inputMode="numeric"
        value={valor}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  )
}
