import { useState } from 'react'
import Sheet, { SheetActions } from '../../components/Sheet.jsx'
import { parsePathbuilder } from '../../lib/pathbuilder.js'
import {
  applyResolution,
  fetchEntriesByName,
  fetchSpellCostsByName,
  namesToResolve,
  spellNamesToResolve,
} from '../../lib/loreResolve.js'
import { useStore } from '../../state/store.jsx'

/*
 * Vincular ficha ao personagem. Único caminho de entrada de ficha no app (D14):
 * um lugar só de substituição, para não existir a pergunta "importei por qual
 * tela mesmo?".
 *
 * O fluxo tem dois passos de propósito. Colar e já aplicar esconderia
 * justamente o que a pessoa precisa ver antes de confirmar: o que o app não
 * conseguiu resolver. A tela de conferência mostra isso com os nomes.
 */

const PASSO = { COLAR: 'colar', CONFERIR: 'conferir' }

export default function ImportSheet({ player, onClose }) {
  const { dispatch } = useStore()
  const jaTem = Boolean(player.sheet)

  const [passo, setPasso] = useState(PASSO.COLAR)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [previa, setPrevia] = useState(null)
  const [semServidor, setSemServidor] = useState(false)

  async function conferir() {
    setErro(null)
    const ficha = parsePathbuilder(texto)

    if (!ficha.ok) {
      /* O parser nunca lança, e devolve o motivo em português. Mostrar o motivo
         dele é melhor que uma mensagem genérica nossa: ele sabe se o problema
         foi JSON quebrado ou JSON de outra coisa. */
      setErro(ficha.warnings[0] ?? 'Não consegui ler esse JSON.')
      return
    }

    setCarregando(true)
    const resolucao = await fetchEntriesByName(namesToResolve(ficha))
    const custosDeMagia = await fetchSpellCostsByName(spellNamesToResolve(ficha))
    setCarregando(false)

    const resolvida = applyResolution(ficha, resolucao)
    /* Custo de ação de cada magia do grimório/foco, para a aba Magias mostrar
       o pip sem precisar abrir cada linha — mesma ideia de `actionCost` em
       feats/ações, só que a magia resolve pelo slug (comentário acima). */
    if (resolvida.spellcasting) {
      resolvida.spellcasting = { ...resolvida.spellcasting, spellCosts: custosDeMagia }
    }
    /* Servidor fora do ar ou sem a ingestão: a ficha entra assim mesmo, sem
       descrição. Ficha sem descrição é pior que ficha com — e muito melhor que
       importação recusada no meio da sessão. */
    setSemServidor(resolucao.unresolved.length === namesToResolve(ficha).length && namesToResolve(ficha).length > 0)
    setPrevia(resolvida)
    setPasso(PASSO.CONFERIR)
  }

  function confirmar() {
    dispatch({
      type: jaTem ? 'UPDATE_SHEET' : 'IMPORT_SHEET',
      playerId: player.id,
      sheet: previa,
    })
    onClose()
  }

  if (passo === PASSO.CONFERIR && previa) {
    return (
      <Sheet title={`Conferir a ficha de ${previa.name}`} onClose={onClose}>
        <div className="sheet__body">
          <dl className="charsheet__preview">
            <Linha rotulo="Personagem" valor={previa.name} />
            <Linha rotulo="Nível" valor={String(previa.level)} />
            <Linha rotulo="Classe" valor={previa.class} />
            <Linha rotulo="Ancestralidade" valor={linhaAncestralidade(previa)} />
            <Linha rotulo="Antecedente" valor={previa.background} />
            <Linha rotulo="PV máximos" valor={String(previa.hpMax)} />
            <Linha rotulo="Feats e features" valor={String(previa.feats.length + previa.actions.length)} />
          </dl>

          {semServidor ? (
            <div className="charsheet__warn">Servidor fora do ar: a ficha entra sem as descrições.</div>
          ) : null}

          {/* Nome que não resolveu aparece com o nome que veio — some da tela é
              o único desfecho proibido. */}
          {previa.unresolved.length > 0 && !semServidor ? (
            <div className="charsheet__warn">
              <div className="label">Sem verbete nos packs</div>
              <p className="charsheet__warn-text">{previa.unresolved.join(' · ')}</p>
            </div>
          ) : null}

          {previa.warnings.length > 0 ? (
            <details className="charsheet__details">
              <summary>O que o JSON trouxe e eu não usei ({previa.warnings.length})</summary>
              <ul className="charsheet__warn-list">
                {previa.warnings.map((aviso) => (
                  <li key={aviso}>{aviso}</li>
                ))}
              </ul>
            </details>
          ) : null}
        </div>

        <SheetActions
          onConfirm={confirmar}
          onCancel={() => setPasso(PASSO.COLAR)}
          confirmLabel={jaTem ? 'Substituir a ficha' : 'Vincular ficha'}
          cancelLabel="Voltar"
        />
      </Sheet>
    )
  }

  return (
    <Sheet title={jaTem ? `Atualizar a ficha de ${player.name}` : `Vincular ficha a ${player.name}`} onClose={onClose}>
      <div className="sheet__body">
        <p className="charsheet__note">
          No Pathbuilder: <strong>Export Character → Export to Foundry VTT (JSON)</strong>.
          Copie o texto todo e cole aqui.
        </p>
        {jaTem ? (
          <p className="charsheet__note">A ficha atual será substituída inteira.</p>
        ) : null}

        <textarea
          className="textarea import__field"
          value={texto}
          onChange={(event) => setTexto(event.target.value)}
          placeholder='{"success":true,"build":{ … }}'
          aria-label="JSON do Pathbuilder"
        />

        {erro ? <div className="charsheet__error">{erro}</div> : null}
      </div>

      <SheetActions
        onConfirm={conferir}
        onCancel={onClose}
        confirmLabel={carregando ? 'Lendo…' : 'Ler a ficha'}
        disabled={!texto.trim() || carregando}
      />
    </Sheet>
  )
}

function Linha({ rotulo, valor }) {
  if (!valor) return null
  return (
    <div className="charsheet__preview-row">
      <dt className="field-label">{rotulo}</dt>
      <dd className="charsheet__preview-value">{valor}</dd>
    </div>
  )
}

/* "Dwarf (Dromaar)" — a herança entre parênteses, como o protótipo mostra. */
export function linhaAncestralidade(sheet) {
  if (!sheet?.ancestry) return sheet?.heritage ?? null
  return sheet.heritage ? `${sheet.ancestry} (${sheet.heritage})` : sheet.ancestry
}
