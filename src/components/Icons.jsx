// Ícones tirados um a um do protótipo do Claude Design, para o traço bater.

export function ChevronRight({ open = false }) {
  return (
    <svg
      width="7"
      height="12"
      viewBox="0 0 7 12"
      className="chevron"
      style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
      aria-hidden="true"
    >
      <path
        d="M1 1l5 5-5 5"
        stroke="rgba(60,60,67,0.3)"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ChevronDown({ open = false }) {
  return (
    <svg
      width="11"
      height="7"
      viewBox="0 0 14 9"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}
      aria-hidden="true"
    >
      <path
        d="M1 1l6 6 6-6"
        stroke="#1c1c1e"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function SearchIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 15 15" style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="rgba(60,60,67,0.45)" strokeWidth="1.6" />
      <line
        x1="10.3"
        y1="10.3"
        x2="14"
        y2="14"
        stroke="rgba(60,60,67,0.45)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14"
        fill="none"
        stroke="oklch(50% 0.16 25)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Etiqueta de preço — "Vender", para não se confundir com a seta de "Enviar". */
export function SellIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.6 13.4L13.4 20.6a2 2 0 01-2.8 0L3 13V3h10l7.6 7.6a2 2 0 010 2.8z"
        fill="none"
        stroke="oklch(50% 0.14 258)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="7.5" r="1.2" fill="oklch(50% 0.14 258)" />
    </svg>
  )
}

export function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 12h14M13 6l6 6-6 6"
        fill="none"
        stroke="oklch(50% 0.14 258)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Avião de papel — botão "Enviar dinheiro" do cabeçalho. */
export function PaperPlaneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M2 10l16-7-6 16-2.5-6.5L2 10z"
        fill="none"
        stroke="oklch(50% 0.14 258)"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
        fill="none"
        stroke="oklch(50% 0.14 258)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function PlusIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="9" width="2" height="20" rx="1" fill="#fff" />
      <rect y="9" width="20" height="2" rx="1" fill="#fff" />
    </svg>
  )
}

export function StepperPlus({ size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true">
      <rect x="5" width="2" height="12" rx="1" fill="#fff" />
      <rect y="5" width="12" height="2" rx="1" fill="#fff" />
    </svg>
  )
}

export function StepperMinus({ width }) {
  return (
    <svg width={width} height="2" viewBox="0 0 12 2" aria-hidden="true">
      <rect width="12" height="2" rx="1" fill="#1c1c1e" />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true">
      <path
        d="M1 4l3 3 5-6"
        stroke="#fff"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Carrinho de compras — "Comprar tudo", para não repetir o ícone da aba Loja. */
export function CartIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 3h2.4l1.1 3M6 6h15.5l-1.9 8.6a1.5 1.5 0 01-1.5 1.2H9a1.5 1.5 0 01-1.5-1.2L6 6z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="20.5" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="18" cy="20.5" r="1.3" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

/* ------------------------------------------------------------ barra de abas */

export function BagIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 8l2.5-4h13L21 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <rect x="3" y="8" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="3" y1="8" x2="21" y2="8" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function ShopIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 9l1.5-5h15L21 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M3 9v10a1 1 0 001 1h16a1 1 0 001-1V9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <line x1="9" y1="20" x2="9" y2="13" stroke="currentColor" strokeWidth="1.8" />
      <line x1="15" y1="20" x2="15" y2="13" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

export function BookIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 19.5A2.5 2.5 0 016.5 17H20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CrownIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 18h16M5 18l1-8 3 3 3-6 3 6 3-3 1 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
