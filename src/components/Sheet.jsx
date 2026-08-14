import { useEffect } from 'react'

/**
 * Cartão flutuante sobre um véu escuro, como no protótipo.
 * `center` é o diálogo curto (traço, excluir, vender); o padrão fica ancorado
 * logo acima da barra de abas.
 *
 * `fill` tira a rolagem da folha e entrega a altura a um filho, que rola
 * sozinho — é o que mantém título e rodapé parados. Sem ele, uma lista que
 * também rola vira caixa dentro de caixa, com dois cortes na tela.
 */
export default function Sheet({ title, onClose, center = false, fill = false, children }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        className={`sheet${center ? ' sheet--center' : ' sheet--bottom'}${fill ? ' sheet--fill' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title ? <div className="sheet__title">{title}</div> : null}
        {children}
      </div>
    </>
  )
}

/**
 * Par de ações — o rodapé padrão de todo aceitar/cancelar do aplicativo.
 *
 * Confirmar fica à ESQUERDA e cancelar à direita. É a ordem de leitura: a ação
 * que a pessoa veio fazer vem primeiro, e a saída fica depois. Vale para
 * diálogo, painel do Mestre e rodapé de tela cheia — se em algum lugar aparecer
 * um par invertido, é bug.
 */
export function SheetActions({
  onCancel,
  onConfirm,
  cancelLabel = 'Cancelar',
  confirmLabel = 'Confirmar',
  confirmVariant = 'solid',
  disabled = false,
}) {
  return (
    <div className="sheet__actions">
      <button
        type="button"
        className={`btn btn--${confirmVariant} btn--wide`}
        onClick={onConfirm}
        disabled={disabled}
      >
        {confirmLabel}
      </button>
      <button type="button" className="btn btn--neutral btn--wide" onClick={onCancel}>
        {cancelLabel}
      </button>
    </div>
  )
}
