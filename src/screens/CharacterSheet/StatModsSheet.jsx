import { useState } from 'react'
import Sheet, { SheetActions } from '../../components/Sheet.jsx'
import { TrashIcon } from '../../components/Icons.jsx'
import { useStore } from '../../state/store.jsx'
import { PRIMEIRO_ALVO, statModTargets } from '../../lib/statMods.js'

/*
 * Modificadores manuais da ficha.
 *
 * O irmão do `ItemModsSheet`, para o resto dos números: o de item responde
 * "esta arma bate mais forte", este responde "este personagem tem +1 de CA que
 * o app não tem como saber". A regra dos dois é a da casa (D6): o app não
 * chuta, o jogador declara — com rótulo, que é o que faz o número aparecer
 * explicado no breakdown em vez de brotar do nada.
 *
 * Uma linha é três perguntas, na ordem em que se pensa nelas: de onde vem
 * (rótulo), onde entra (alvo) e quanto (sinal e valor). O sinal é botão e não
 * tecla: no teclado numérico do celular o menos é um passeio, e metade dos
 * modificadores de mesa é penalidade.
 */
export default function StatModsSheet({ player, onClose }) {
  const { dispatch } = useStore()
  const [mods, setMods] = useState(() => player.statMods ?? [])
  const grupos = statModTargets(player.sheet)

  const alterar = (indice, campo, valor) =>
    setMods((atual) => atual.map((mod, i) => (i === indice ? { ...mod, [campo]: valor } : mod)))

  const salvar = () => {
    dispatch({ type: 'SET_STAT_MODS', playerId: player.id, mods })
    onClose()
  }

  return (
    /* `fill`: a folha para de rolar e quem rola é a lista, para o par
       Salvar/Cancelar ficar parado no rodapé por mais modificador que entre. */
    <Sheet title="Modificadores manuais" onClose={onClose} fill>
      <div className="mods__list mods__list--scroll">
        {mods.map((mod, indice) => (
          // A ordem é a identidade aqui: dois modificadores podem ter o mesmo
          // rótulo enquanto a pessoa digita, então o índice é o que temos.
          <div className="mods__row" key={indice}>
            <input
              className="input"
              placeholder="Escudo de Ferro"
              value={mod.label}
              onChange={(event) => alterar(indice, 'label', event.target.value)}
              aria-label="Nome do modificador"
            />
            <div className="mods__numbers">
              <label className="form__field">
                <span className="field-label">Onde</span>
                <select
                  className="select"
                  value={mod.target}
                  onChange={(event) => alterar(indice, 'target', event.target.value)}
                >
                  {/* Alvo gravado que saiu da lista — a perícia de Lore que uma
                      reimportação levou embora — continua selecionado com a
                      chave que veio, em vez de o campo pular sozinho para outro
                      número sem ninguém pedir. */}
                  {grupos.some((g) => g.opcoes.some((o) => o.target === mod.target)) ? null : (
                    <option value={mod.target}>{mod.target}</option>
                  )}
                  {grupos.map((grupo) => (
                    <optgroup label={grupo.grupo} key={grupo.grupo}>
                      {grupo.opcoes.map((opcao) => (
                        <option value={opcao.target} key={opcao.target}>
                          {opcao.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>

              <label className="form__field mods__valor">
                <span className="field-label">Quanto</span>
                <div className="mods__amount">
                  <button
                    type="button"
                    className="chip chip--sm mods__sign"
                    aria-label={
                      mod.value < 0 ? 'Penalidade; tocar para bônus' : 'Bônus; tocar para penalidade'
                    }
                    onClick={() => alterar(indice, 'value', -(Number(mod.value) || 0))}
                  >
                    {mod.value < 0 ? '−' : '+'}
                  </button>
                  <input
                    className="input input--sm"
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={Math.abs(Number(mod.value) || 0)}
                    onChange={(event) => {
                      const bruto = Math.abs(Math.trunc(Number(event.target.value) || 0))
                      alterar(indice, 'value', mod.value < 0 ? -bruto : bruto)
                    }}
                    aria-label="Valor do modificador"
                  />
                </div>
              </label>

              {/* Lixeira no --accent dos botões-ícone de linha: o vermelho fica
                  para o que não se desfaz, e aqui o Cancelar da folha ainda
                  desfaz tudo. */}
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
          <div className="empty empty--inline">Nenhum modificador manual.</div>
        ) : null}

        <button
          type="button"
          className="btn btn--tint btn--block"
          onClick={() =>
            setMods((atual) => [...atual, { label: '', target: PRIMEIRO_ALVO, value: 1 }])
          }
        >
          Acrescentar modificador
        </button>
      </div>

      <SheetActions onConfirm={salvar} onCancel={onClose} confirmLabel="Salvar" />
    </Sheet>
  )
}
