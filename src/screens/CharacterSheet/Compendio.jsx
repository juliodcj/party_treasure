import { useEffect, useMemo, useState } from 'react'
import Sheet from '../../components/Sheet.jsx'
import TraitList from '../../components/TraitList.jsx'
import SPELL_INDEX from '../../data/index.spells.json' with { type: 'json' }
import { useStore } from '../../state/store.jsx'
import { matchesContent } from '../../lib/items.js'

/*
 * O compêndio de magias. Navega `src/data/index.spells.json` — ~1.993
 * entradas, no bundle, sem descrição — filtrado pela tradição do conjurador
 * (não faz sentido oferecer magia que ele não pode aprender) e por círculo.
 *
 * Filtro de conteúdo igual ao do catálogo (resposta 1 da §17):
 * `settings.ownedCategories` e `remasterFilter`, com "mostrar tudo" para
 * ignorar pontualmente sem mexer na configuração da mesa.
 *
 * A descrição é sob demanda — offline funciona porque quem responde é o PC
 * do mestre, não a internet.
 *
 * `rank` no corpus do Foundry é o nível do verbete (truque sai como 1, com o
 * traço "cantrip"), não o círculo de slot do Pathbuilder (truque é 0 lá, e é
 * esse 0 que `vitals.preparedSpells`/`perDay` usam). `rankEfetivo` traduz um
 * pelo outro, senão truque cai junto do círculo 1 — inclusive gastando slot
 * de círculo 1 ao preparar.
 */

const rankEfetivo = (sp) => (sp.traits?.includes('cantrip') ? 0 : sp.rank)

export default function Compendio({ player, conj, onClose }) {
  const { state } = useStore()
  const [rank, setRank] = useState(null)
  const [mostrarTudo, setMostrarTudo] = useState(false)
  const [detalheId, setDetalheId] = useState(null)

  const daTradicao = useMemo(
    () => SPELL_INDEX.filter((sp) => (sp.traditions ?? []).includes(conj.tradition)),
    [conj.tradition],
  )

  const filtradas = useMemo(() => {
    const porConteudo = mostrarTudo
      ? daTradicao
      : daTradicao.filter((sp) => matchesContent(sp, state.settings))
    return rank == null ? porConteudo : porConteudo.filter((sp) => rankEfetivo(sp) === rank)
  }, [daTradicao, mostrarTudo, state.settings, rank])

  const ranksPresentes = useMemo(
    () => [...new Set(daTradicao.map(rankEfetivo))].sort((a, b) => a - b),
    [daTradicao],
  )

  return (
    <Sheet title={`Compêndio ${TRADICOES[conj.tradition] ?? conj.tradition}`} onClose={onClose}>
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
      </div>

      <button
        type="button"
        className={`chip chip--sm comp__mostrar-tudo${mostrarTudo ? ' chip--on' : ''}`}
        aria-pressed={mostrarTudo}
        onClick={() => setMostrarTudo((v) => !v)}
      >
        {mostrarTudo ? 'Mostrando tudo' : 'Mostrar tudo'}
      </button>

      <div className="comp__list">
        {filtradas.length === 0 ? (
          <div className="empty empty--inline">Nenhuma magia com esses filtros.</div>
        ) : (
          filtradas.map((sp) => (
            <button
              key={sp.id}
              type="button"
              className="comp__row"
              onClick={() => setDetalheId(sp.id)}
            >
              <span className="comp__rank">{rankEfetivo(sp) === 0 ? 'T' : `R${rankEfetivo(sp)}`}</span>
              <span className="comp__name">{sp.name}</span>
            </button>
          ))
        )}
      </div>

      {detalheId ? (
        <SpellDetailSheet
          id={detalheId}
          player={player}
          conj={conj}
          entryIndex={daTradicao}
          onClose={() => setDetalheId(null)}
        />
      ) : null}
    </Sheet>
  )
}

const TRADICOES = { arcane: 'Arcana', divine: 'Divina', occult: 'Oculta', primal: 'Primal' }

/**
 * Detalhe de uma magia do compêndio. Diferente das do grimório: aqui já se
 * tem o `id` real do índice, então a descrição vem por ele — sem adivinhar
 * slug.
 */
function SpellDetailSheet({ id, player, conj, entryIndex, onClose }) {
  const { dispatch } = useStore()
  const resumo = entryIndex.find((sp) => sp.id === id)
  const [entry, setEntry] = useState(null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    let vivo = true
    fetch(`/api/entry/${encodeURIComponent(id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => vivo && setEntry(data))
      .catch(() => vivo && setErro(true))
    return () => {
      vivo = false
    }
  }, [id])

  if (!resumo) return null

  const rank = rankEfetivo(resumo)
  const vagaLivre =
    conj.preparation === 'prepared' &&
    (player.vitals?.preparedSpells ?? []).filter((p) => p.rank === rank).length <
      (conj.perDay?.[rank] ?? 0)

  return (
    <Sheet title={resumo.name} onClose={onClose}>
      <div className="sheet__body">
        <div className="comp__detail-tag">{rank === 0 ? 'Truque' : `Círculo ${rank}`}</div>
        {entry ? (
          <>
            <TraitList traits={entry.traits} />
            <div
              className="item__desc"
              dangerouslySetInnerHTML={{ __html: entry.descriptionHtml }}
            />
          </>
        ) : erro ? (
          <p className="item__desc item__desc--plain">
            Não consegui buscar a descrição no servidor.
          </p>
        ) : (
          <p className="item__desc item__desc--plain">Carregando a descrição…</p>
        )}
      </div>

      <div className="comp__actions">
        {vagaLivre ? (
          <button
            type="button"
            className="btn btn--solid"
            onClick={() => {
              dispatch({ type: 'PREPARE_SPELL', playerId: player.id, rank, name: resumo.name })
              onClose()
            }}
          >
            Preparar
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn--tint"
          onClick={() => {
            dispatch({ type: 'ADD_SPELL', playerId: player.id, name: resumo.name, rank })
            onClose()
          }}
        >
          Lista especial
        </button>
      </div>
    </Sheet>
  )
}
