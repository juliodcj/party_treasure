import { useMemo, useState } from 'react'
import SPELL_INDEX from '../../data/index.spells.json' with { type: 'json' }
import { SearchBox } from '../../components/ItemFilters.jsx'
import { useStore } from '../../state/store.jsx'
import { matchesContent } from '../../lib/items.js'
import { normalizeName } from '../../lib/loreResolve.js'
import { spellKey } from '../../state/reducer.js'
import SpellPicker from './SpellPicker.jsx'

/*
 * O compêndio de magias. Navega `src/data/index.spells.json` — ~1.993
 * entradas, no bundle, sem descrição — filtrado pela tradição do conjurador
 * (não faz sentido oferecer magia que ele não pode aprender) e por círculo.
 *
 * Filtro de conteúdo igual ao do catálogo (resposta 1 da §17):
 * `settings.ownedCategories` e `remasterFilter`, com "mostrar tudo" para
 * ignorar pontualmente sem mexer na configuração da mesa.
 *
 * O que ele faz é uma coisa só: pôr magia no grimório e tirar de lá. Preparar
 * é do slot vazio, e a lista especial tem a própria lista — as três eram três
 * telas diferentes para o mesmo gesto.
 *
 * `rank` no corpus do Foundry é o nível do verbete (truque sai como 1, com o
 * traço "cantrip"), não o círculo de slot do Pathbuilder (truque é 0 lá, e é
 * esse 0 que `vitals.preparedSpells`/`perDay` usam). `rankEfetivo` traduz um
 * pelo outro, senão truque cai junto do círculo 1 — inclusive gastando slot
 * de círculo 1 ao preparar.
 */

export const rankEfetivo = (sp) => (sp.traits?.includes('cantrip') ? 0 : sp.rank)

/** Uma entrada do índice no formato que o `SpellPicker` lê. */
export const paraPicker = (sp) => ({
  id: sp.id,
  name: sp.name,
  rank: rankEfetivo(sp),
  actionCost: sp.actionCost,
})

export default function Compendio({ player, conj, grimorio, onClose }) {
  const { state, dispatch } = useStore()
  const [rank, setRank] = useState(null)
  const [mostrarTudo, setMostrarTudo] = useState(false)
  const [busca, setBusca] = useState('')

  const daTradicao = useMemo(
    () => SPELL_INDEX.filter((sp) => (sp.traditions ?? []).includes(conj.tradition)),
    [conj.tradition],
  )

  /* Truque primeiro, depois círculo 1, 2, 3…; dentro do círculo, ordem
     alfabética. `localeCompare` e não `<`: o corpus tem nome acentuado, e a
     ordem do código-fonte jogaria todos eles para depois do Z. */
  const filtradas = useMemo(() => {
    const porConteudo = mostrarTudo
      ? daTradicao
      : daTradicao.filter((sp) => matchesContent(sp, state.settings))
    const porRank = rank == null ? porConteudo : porConteudo.filter((sp) => rankEfetivo(sp) === rank)
    /* Busca por pedaço do nome, com a mesma normalização que resolve nome contra
       o corpus — quem digita "sure str" acha "Sure Strike", e o acento e o hífen
       do nome publicado não atrapalham. */
    const alvo = normalizeName(busca)
    const porNome = alvo ? porRank.filter((sp) => normalizeName(sp.name).includes(alvo)) : porRank
    return porNome
      .map(paraPicker)
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
  }, [daTradicao, mostrarTudo, state.settings, rank, busca])

  const ranksPresentes = useMemo(
    () => [...new Set(daTradicao.map(rankEfetivo))].sort((a, b) => a - b),
    [daTradicao],
  )

  /* Por nome e círculo, que é o que o grimório guarda — o índice do Foundry
     tem id, o export do Pathbuilder não. */
  const noLivro = useMemo(
    () => new Map(grimorio.map((sp) => [spellKey(sp.rank, sp.name), sp])),
    [grimorio],
  )

  return (
    <SpellPicker
      title={`Compêndio ${TRADICOES[conj.tradition] ?? conj.tradition}`}
      spells={filtradas}
      jaTem={(sp) => noLivro.has(spellKey(sp.rank, sp.name))}
      onAdd={(sp) =>
        dispatch({ type: 'ADD_BOOK_SPELL', playerId: player.id, name: sp.name, rank: sp.rank })
      }
      onRemove={(sp) => {
        const doLivro = noLivro.get(spellKey(sp.rank, sp.name))
        dispatch({
          type: 'REMOVE_BOOK_SPELL',
          playerId: player.id,
          uid: doLivro?.uid ?? null,
          name: sp.name,
          rank: sp.rank,
        })
      }}
      vazio="Nenhuma magia com esses filtros."
      onClose={onClose}
    >
      {/* Antes dos chips: com ~1.993 magias na tradição, rolar até "Wall of
          Stone" era a operação mais cara da tela. */}
      <SearchBox value={busca} onChange={setBusca} placeholder="Buscar magia..." sunken />

      {/* Uma faixa só, que rola de lado. Em duas linhas que quebravam, os
          treze filtros comiam 95px do alto da folha — mais do que duas magias
          da lista que eles filtram. */}
      <div className="comp__chips">
        <button
          type="button"
          className={`chip chip--sm${rank == null ? ' chip--on' : ''}`}
          onClick={() => setRank(null)}
        >
          Todos
        </button>
        {ranksPresentes.map((r) => (
          <button
            key={r}
            type="button"
            className={`chip chip--sm${rank === r ? ' chip--on' : ''}`}
            onClick={() => setRank(r)}
          >
            {r === 0 ? 'Truque' : `R${r}`}
          </button>
        ))}
        {/* Filtra outra coisa (conteúdo da mesa, não círculo), e por isso fecha
            a faixa depois de um vão maior, em vez de virar mais um círculo. */}
        <button
          type="button"
          className={`chip chip--sm comp__mostrar-tudo${mostrarTudo ? ' chip--on' : ''}`}
          aria-pressed={mostrarTudo}
          onClick={() => setMostrarTudo((v) => !v)}
        >
          {mostrarTudo ? 'Mostrando tudo' : 'Mostrar tudo'}
        </button>
      </div>
    </SpellPicker>
  )
}

const TRADICOES = { arcane: 'Arcana', divine: 'Divina', occult: 'Oculta', primal: 'Primal' }
