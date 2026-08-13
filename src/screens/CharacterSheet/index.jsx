import { useMemo, useState } from 'react'
import { buildSheet } from '../../lib/sheet.js'
import { playerInventory } from '../../lib/items.js'
import { useStore } from '../../state/store.jsx'
import { linhaAncestralidade } from './ImportSheet.jsx'
import Resumo from './Resumo.jsx'

/*
 * A aba Ficha.
 *
 * Duas telas moram aqui, e a de baixo é tão importante quanto a de cima:
 * personagem SEM ficha é caso de primeira classe, não estado de transição. Ele
 * tem carteira e mochila, compra e vende como sempre, e a aba diz isso em vez
 * de mostrar zeros.
 *
 * As cinco sub-abas chegam nas fases 8 a 11. Até lá elas aparecem desabilitadas,
 * para a moldura já ser a definitiva e o conteúdo entrar por dentro.
 */

const SUBABAS = [
  { id: 'resumo', label: 'Resumo' },
  { id: 'ataques', label: 'Ataques' },
  { id: 'magias', label: 'Magias' },
  { id: 'feats', label: 'Feats' },
  { id: 'acoes', label: 'Ações' },
]

export default function CharacterSheetScreen({ player, onGoToGm }) {
  const { state } = useStore()
  const [sub, setSub] = useState('resumo')

  const items = useMemo(
    () => playerInventory(state, player).map(({ item, qty }) => ({ ...item, qty })),
    [state, player],
  )

  const view = useMemo(
    () =>
      buildSheet({
        sheet: player.sheet,
        items,
        gear: player.gear,
        vitals: player.vitals,
        itemMods: player.itemMods,
      }),
    [player.sheet, player.gear, player.vitals, player.itemMods, items],
  )

  if (!view) return <EmptySheet />

  const sheet = player.sheet
  /* Conjurador não tem aba de magia à toa, e quem não conjura não vê a aba
     (§12.3). O bárbaro do fixture cai justamente nesse caso. */
  const abas = SUBABAS.filter((aba) => aba.id !== 'magias' || sheet.spellcasting)

  return (
    <div className="charsheet">
      <div className="charsheet__ident">
        <div className="charsheet__ident-line">{identidade(sheet)}</div>
      </div>

      <div className="seg charsheet__seg" role="tablist" aria-label="Seções da ficha">
        {abas.map((aba) => (
          <button
            key={aba.id}
            type="button"
            role="tab"
            aria-selected={sub === aba.id}
            className={`seg__tab${sub === aba.id ? ' seg__tab--on' : ''}`}
            onClick={() => setSub(aba.id)}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {semNadaEquipado(player) ? (
        <div className="charsheet__warn">
          Ficha importada. Agora monte a mochila no Inventário e vista a
          armadura.
          {'\n'}
          Nenhum item vem do Pathbuilder, então a CA aqui é a de quem está
          desarmado, e Ataques nasce vazia.
        </div>
      ) : null}

      {sub === 'resumo' ? <Resumo player={player} view={view} onGoToGm={onGoToGm} /> : null}

      {sub !== 'resumo' ? (
        <div className="empty">
          Esta seção ainda está sendo construída.{'\n'}
          Por enquanto a ficha guarda os dados, e o Inventário e a Loja funcionam
          normalmente.
        </div>
      ) : null}
    </div>
  )
}

/*
 * Nada vestido nem empunhado.
 *
 * É o estado logo depois de importar, porque item nenhum vem do Pathbuilder
 * (D2): a CA do Rurik mostra 15 e não 18, e a aba Ataques nasce vazia. Sem o
 * aviso, a pessoa acha que a importação falhou. Ele some sozinho quando ela
 * veste alguma coisa — não é um alerta para dispensar, é um estado da ficha.
 */
function semNadaEquipado(player) {
  const gear = player.gear ?? {}
  return !gear.wornArmorId && !gear.heldShieldId && !(gear.equippedWeaponIds ?? []).length
}

/** `Rurik · Dwarf (Dromaar) · Barbarian · Sailor`, pulando o que não veio. */
function identidade(sheet) {
  return [sheet.name, linhaAncestralidade(sheet), sheet.class, sheet.background]
    .filter(Boolean)
    .join(' · ')
}

function EmptySheet() {
  return (
    <div className="empty">
      <strong>Personagem sem ficha importada</strong>
      {'\n\n'}
      Este personagem tem inventário e carteira, mas não tem ficha. Para
      importar, vá em Mestre → escolha o personagem → Vincular ficha.
    </div>
  )
}
