/* Ícones do protótipo do Claude Design.

   REGRA: nenhum ícone tem cor própria. Todos desenham com `currentColor` e
   herdam a cor de quem os contém — o botão, a linha, a aba. Era o contrário
   antes: seis ícones traziam o azul cravado em oklch, então trocar o azul do
   aplicativo em tokens.css mudava tudo menos os ícones. */

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
        stroke="currentColor"
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
      className="chevron"
      style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
      aria-hidden="true"
    >
      <path
        d="M1 1l6 6 6-6"
        stroke="currentColor"
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
    <svg width={size} height={size} viewBox="0 0 15 15" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <line
        x1="10.3"
        y1="10.3"
        x2="14"
        y2="14"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function TrashIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 6h16M9 6V4h6v2M6 6l1 14h10l1-14"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Avião de papel — botão "Enviar dinheiro" do cabeçalho. */
export function PaperPlaneIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M2 10l16-7-6 16-2.5-6.5L2 10z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function EditIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 20h4l10-10-4-4L4 16v4zM14 6l4 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Três pontinhos verticais — botão "mais ações" do item aberto. */
export function MoreIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="5" r="1.9" fill="currentColor" />
      <circle cx="12" cy="12" r="1.9" fill="currentColor" />
      <circle cx="12" cy="19" r="1.9" fill="currentColor" />
    </svg>
  )
}

export function PlusIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect x="9" width="2" height="20" rx="1" fill="currentColor" />
      <rect y="9" width="20" height="2" rx="1" fill="currentColor" />
    </svg>
  )
}

/*
 * Estrela de favorito, na aba Ataques. Cheia quando ligada, contorno quando
 * não — o mesmo desenho nos dois estados, só o miolo muda. Herda a cor de quem
 * a contém, como todo ícone daqui.
 */
export function StarIcon({ filled = false, size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M8 1.6l1.9 4 4.4.6-3.2 3.1.8 4.4L8 11.6l-3.9 2.1.8-4.4L1.7 6.2l4.4-.6z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/*
 * Espada — "esta magia também é um ataque, mostre na aba Ataques".
 * Lâmina, guarda e punho em traço, para ler a 15px sem virar borrão.
 */
export function SwordIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <path
        d="M17 3 8.5 11.5M17 3v3.5M17 3h-3.5M5 15l3-3M5 15l-2 2M5 15H2.8M5 15v2.2M8 12l1.6 1.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Par do `PlusIcon`: "tirar daqui" onde o mais é "trazer para cá". */
export function MinusIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
      <rect y="9" width="20" height="2" rx="1" fill="currentColor" />
    </svg>
  )
}

/* Os dois glifos do stepper não recebem tamanho: quem dimensiona é o CSS
   (.step svg { width: 42% }), para o desenho acompanhar o botão em proporção
   em vez de depender de uma conta no JavaScript. */

export function StepperPlus() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <rect x="5" width="2" height="12" rx="1" fill="currentColor" />
      <rect y="5" width="12" height="2" rx="1" fill="currentColor" />
    </svg>
  )
}

export function StepperMinus() {
  return (
    <svg viewBox="0 0 12 2" aria-hidden="true">
      <rect width="12" height="2" rx="1" fill="currentColor" />
    </svg>
  )
}

/** Engrenagem — botão "Configurações", na aba Mestre. */
export function GearIcon({ size = 19 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function CheckIcon() {
  return (
    <svg width="10" height="8" viewBox="0 0 10 8" aria-hidden="true">
      <path
        d="M1 4l3 3 5-6"
        stroke="currentColor"
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Carrinho de compras — o flutuante da Loja, para não repetir o ícone da aba. */
export function CartIcon({ size = 22 }) {
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

/** Funil — botão "Filtros", que revela tipo/nível ao alternar. */
export function FilterIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      <line x1="2" y1="4.5" x2="14" y2="4.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <line x1="2" y1="11.5" x2="14" y2="11.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      <circle cx="10" cy="4.5" r="2.4" fill="var(--surface)" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="5.5" cy="11.5" r="2.4" fill="var(--surface)" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  )
}

/** Seta "carteira agora → depois da compra", no resumo do carrinho. */
export function ArrowRightIcon() {
  return (
    <svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true">
      <path
        d="M1 6h12M9 2l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

/* Descanso noturno: uma cama de perfil — travesseiro, colchão e os dois pés. */
export function BedIcon({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 6v12M3 12h18v6M21 18v-6a3 3 0 00-3-3h-6v3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="10.5" r="1.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

/* Aba Ficha: uma folha pautada. Como todo ícone daqui, desenha em currentColor
   — quem decide a cor é o botão em volta, nunca o ícone. */
export function SheetIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="4.5" y="3" width="15" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <line x1="8" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <line x1="8" y1="16" x2="13" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
