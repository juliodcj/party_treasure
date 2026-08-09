import { useMemo, useState } from 'react'
import Sheet, { SheetActions } from './Sheet.jsx'
import { CONTENT_CATEGORIES } from '../lib/sourceCategory.js'
import { readDeviceTable, useStore } from '../state/store.jsx'
import { plural } from '../lib/text.js'

/**
 * Configurações da mesa: o filtro de conteúdo, que vale pro app inteiro (Loja,
 * Inventário, Biblioteca, Mestre) e não por aba, e as duas ações que trocam a
 * mesa inteira de uma vez.
 */
export default function SettingsSheet({ onClose }) {
  const { state, dispatch } = useStore()
  const { ownedCategories = [], remasterFilter = 'all' } = state.settings ?? {}
  const [confirming, setConfirming] = useState(null) // 'import' | 'reset'
  // A mesa que este aparelho guardava antes de existir servidor (Fase 1).
  const deviceTable = useMemo(() => readDeviceTable(), [])

  const setSettings = (partial) => dispatch({ type: 'SET_SETTINGS', settings: partial })

  const toggleCategory = (id) => {
    setSettings({
      ownedCategories: ownedCategories.includes(id)
        ? ownedCategories.filter((current) => current !== id)
        : [...ownedCategories, id],
    })
  }

  return (
    <>
      <Sheet title="Configurações" onClose={onClose}>
        <div className="label">Filtrar conteúdo do catálogo</div>
        <div className="content-filter__chips">
          {CONTENT_CATEGORIES.map(({ id, label }) => (
            <button
              type="button"
              key={id}
              className={`chip${ownedCategories.includes(id) ? ' chip--on' : ''}`}
              onClick={() => toggleCategory(id)}
              aria-pressed={ownedCategories.includes(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="content-filter__hint">
          Nenhuma categoria marcada mostra tudo. Marcadas, só esse conteúdo aparece em Loja,
          Inventário, Biblioteca e Mestre.
        </div>

        <div className="label content-filter__rule">Regra</div>
        <div className="seg">
          {[
            ['all', 'Todas'],
            ['remaster', 'Remaster'],
            ['legacy', 'Legado'],
          ].map(([id, label]) => (
            <button
              type="button"
              key={id}
              className={`seg__tab${remasterFilter === id ? ' seg__tab--on' : ''}`}
              onClick={() => setSettings({ remasterFilter: id })}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Trocar a mesa inteira. Vermelho e com confirmação porque o que
            estava no servidor é substituído em todos os aparelhos e não volta. */}
        <div className="label content-filter__rule">Mesa</div>
        <div className="settings__table">
          {deviceTable ? (
            <button
              type="button"
              className="btn btn--danger btn--block"
              onClick={() => setConfirming('import')}
            >
              Importar a mesa deste aparelho
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => setConfirming('reset')}
          >
            Restaurar a mesa de exemplo
          </button>
          <div className="content-filter__hint">
            {deviceTable
              ? `Este celular ainda guarda uma mesa de antes do servidor, com ${plural(deviceTable.players.length, 'personagem', 'personagens')}. Importar sobe ela para o servidor e substitui a mesa de todo mundo.`
              : 'Restaurar volta aos personagens e lojas de exemplo, em todos os aparelhos.'}
          </div>
        </div>

        <div className="sheet__actions">
          <button type="button" className="btn btn--solid btn--block" onClick={onClose}>
            Pronto
          </button>
        </div>
      </Sheet>

      {/* Fora da folha de propósito: a folha é "position: absolute" e viraria
          a âncora do diálogo, que nasceria centrado nela em vez de na tela. */}
      {confirming ? (
        <Sheet center onClose={() => setConfirming(null)}>
          <div className="sheet__question">
            {confirming === 'import'
              ? 'Substituir a mesa do servidor pela que está salva neste aparelho? A mesa atual de todo mundo se perde.'
              : 'Voltar para a mesa de exemplo? Personagens, dinheiro, mochilas e lojas de todo mundo se perdem.'}
          </div>
          <SheetActions
            onCancel={() => setConfirming(null)}
            confirmLabel={confirming === 'import' ? 'Importar' : 'Restaurar'}
            confirmVariant="danger"
            onConfirm={() => {
              dispatch(
                confirming === 'import'
                  ? { type: 'RESET', state: deviceTable }
                  : { type: 'RESET' },
              )
              setConfirming(null)
              onClose()
            }}
          />
        </Sheet>
      ) : null}
    </>
  )
}
