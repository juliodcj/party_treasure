import { useMemo, useRef, useState } from 'react'
import Sheet, { SheetActions } from './Sheet.jsx'
import { CONTENT_CATEGORIES } from '../lib/sourceCategory.js'
import { readDeviceTable, useStore } from '../state/store.jsx'
import { downloadTable, tableFromFile } from '../lib/tableFile.js'
import { plural } from '../lib/text.js'

/**
 * Configurações da mesa: o nome dela, o filtro de conteúdo (que vale pro app
 * inteiro — Loja, Inventário, Biblioteca, Mestre — e não por aba) e as ações
 * que trocam a mesa inteira de uma vez.
 *
 * A "mesa de exemplo" saiu daqui: ela é o que o servidor cria sozinho na
 * primeira execução, e um botão para voltar a ela era só uma maneira rápida de
 * perder a campanha. O lugar dela foi ocupado pelo par que faltava — exportar a
 * mesa para um arquivo e trazer um arquivo de volta.
 */
export default function SettingsSheet({ onClose }) {
  const { state, dispatch } = useStore()
  const { tableName = '', ownedCategories = [], remasterFilter = 'all' } = state.settings ?? {}
  const [confirming, setConfirming] = useState(null) // 'device' | 'file'
  const [aImportar, setAImportar] = useState(null) // a mesa lida do arquivo
  const [erro, setErro] = useState('')
  const fileRef = useRef(null)
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

  /* Ler o arquivo é inofensivo — o que não se desfaz é substituir a mesa, e é
     por isso que a confirmação vem depois da leitura: aí ela já sabe dizer
     quantos personagens estão entrando. */
  const escolherArquivo = async (event) => {
    const file = event.target.files?.[0]
    // Escolher o mesmo arquivo duas vezes seguidas precisa disparar de novo.
    event.target.value = ''
    if (!file) return
    setErro('')
    const lida = tableFromFile(await file.text())
    if (!lida.ok) {
      setErro(lida.erro)
      return
    }
    setAImportar(lida.table)
    setConfirming('file')
  }

  const mesaEscolhida = confirming === 'device' ? deviceTable : aImportar

  return (
    <>
      <Sheet title="Configurações" onClose={onClose}>
        <label className="field-label settings__name-label" htmlFor="settings-table-name">
          Nome da mesa
        </label>
        <input
          id="settings-table-name"
          className="input"
          type="text"
          value={tableName}
          placeholder="Sem nome"
          onChange={(event) => setSettings({ tableName: event.target.value })}
        />

        <div className="label content-filter__rule">Filtrar conteúdo do catálogo</div>
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

        {/* Exportar é azul: dá para desfazer apagando o arquivo. Importar é
            vermelho e com confirmação, porque o que estava no servidor é
            substituído em todos os aparelhos e não volta. */}
        <div className="label content-filter__rule">Mesa</div>
        <div className="settings__table">
          <button
            type="button"
            className="btn btn--solid btn--block"
            onClick={() => downloadTable(state)}
          >
            Exportar mesa (JSON)
          </button>
          <button
            type="button"
            className="btn btn--danger btn--block"
            onClick={() => fileRef.current?.click()}
          >
            Importar mesa (JSON)
          </button>
          <input
            ref={fileRef}
            className="settings__file"
            type="file"
            accept="application/json,.json"
            onChange={escolherArquivo}
            aria-label="Arquivo de mesa para importar"
          />
          {deviceTable ? (
            <button
              type="button"
              className="btn btn--danger btn--block"
              onClick={() => setConfirming('device')}
            >
              Importar a mesa deste aparelho
            </button>
          ) : null}
          <div className="content-filter__hint">
            {erro ? (
              <span className="settings__erro">{erro}</span>
            ) : deviceTable ? (
              `Exportar grava a mesa inteira num arquivo. Importar substitui a mesa de todo mundo pela do arquivo. Este celular ainda guarda uma mesa de antes do servidor, com ${plural(deviceTable.players.length, 'personagem', 'personagens')}.`
            ) : (
              'Exportar grava a mesa inteira num arquivo — personagens, fichas, mochilas, lojas e histórico. Importar substitui a mesa de todo mundo pela do arquivo.'
            )}
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
      {confirming && mesaEscolhida ? (
        <Sheet center onClose={() => setConfirming(null)}>
          <div className="sheet__question">
            {confirming === 'device'
              ? 'Substituir a mesa do servidor pela que está salva neste aparelho? A mesa atual de todo mundo se perde.'
              : `Substituir a mesa de todo mundo pela do arquivo (${plural(mesaEscolhida.players.length, 'personagem', 'personagens')})? A mesa atual se perde.`}
          </div>
          <SheetActions
            onCancel={() => setConfirming(null)}
            confirmLabel="Importar"
            confirmVariant="danger"
            onConfirm={() => {
              dispatch({ type: 'RESET', state: mesaEscolhida })
              setConfirming(null)
              setAImportar(null)
              onClose()
            }}
          />
        </Sheet>
      ) : null}
    </>
  )
}
