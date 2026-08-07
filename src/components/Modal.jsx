import { useEffect } from 'react'

/** Folha que sobe de baixo no celular e vira caixa centrada em tela larga. */
export default function Modal({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    // Trava a rolagem do fundo enquanto a folha está aberta.
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [onClose])

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="modal">
        <div className="modal__head">
          <div className="modal__title">{title}</div>
          <div className="spacer" />
          <button type="button" className="modal__close" onClick={onClose} aria-label="Fechar">
            ×
          </button>
        </div>
        <div className="modal__body">{children}</div>
        {footer ? <div className="modal__head" style={{ borderTop: '1px solid var(--line)', borderBottom: 0 }}>{footer}</div> : null}
      </div>
    </div>
  )
}
