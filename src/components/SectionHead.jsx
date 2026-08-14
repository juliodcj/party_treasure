import { ChevronRight } from './Icons.jsx'

/**
 * Faixa de título de uma seção que abre e fecha. A ação da direita (quando
 * existe — "+ Novo jogador", "Limpar") fica fora do botão de propósito: o
 * alvo de toque do botão é só o título+seta, para não abrir/fechar a seção
 * sem querer ao tocar num link vizinho.
 *
 * Dono único: usada pela ficha inteira (Resumo, Ataques, Feats, Ações,
 * Magias) e pelo Mestre (Jogadores, Lojas, Histórico) — nasceu no Mestre,
 * mudou de casa quando o resto da ficha passou a precisar do mesmo toggle.
 */
export default function SectionHead({ title, count = null, open, onToggle, action = null }) {
  return (
    <h3 className="label list-group__title">
      <button
        type="button"
        className="list-group__toggle"
        onClick={onToggle}
        aria-expanded={open}
        aria-label={`${open ? 'Fechar' : 'Abrir'} ${title}`}
      >
        <ChevronRight open={open} />
        <span>{title}</span>
        {count != null ? <span className="list-group__count">{count}</span> : null}
      </button>
      {action}
    </h3>
  )
}

/** Par "Expandir / Recolher" que abre/fecha todas as seções de uma aba de
    uma vez — como no protótipo da ficha. */
export function ExpandCollapseAll({ onExpand, onCollapse }) {
  return (
    <div className="section-toggle-all">
      <button type="button" className="link" onClick={onExpand}>
        Expandir
      </button>
      <button type="button" className="link" onClick={onCollapse}>
        Recolher
      </button>
    </div>
  )
}
