import { useState } from 'react'
import TraitList from '../../components/TraitList.jsx'
import { ChevronRight } from '../../components/Icons.jsx'
import SectionHead, { ExpandCollapseAll } from '../../components/SectionHead.jsx'
import { useStore } from '../../state/store.jsx'

/*
 * A aba Feats.
 *
 * Apresentação pura: o Pathbuilder disse o que o personagem tem, a fase 4
 * resolveu cada nome contra os packs, e aqui a lista é só desenhada. Nenhuma
 * descrição escrita à mão — o protótipo trazia texto de regra em português, e
 * era exatamente isso que não podia ser aproveitado (D11).
 *
 * O que não resolveu **não some**. Aparece com o nome que veio, sem descrição e
 * marcado. Sumir seria o único desfecho proibido: a pessoa escolheu aquele feat
 * e precisa ver que ele está na ficha, mesmo que os packs não o conheçam.
 */

/* O agrupamento sai da categoria que o Pathbuilder mandou e do pack onde o nome
   resolveu — não de uma lista de nomes nossa. */
const GRUPOS = [
  {
    id: 'class-feature',
    titulo: 'Features de classe',
    cabe: (feat) => feat.kind === 'class-feature',
  },
  {
    id: 'class',
    titulo: 'Feats de classe',
    cabe: (feat) => /class/i.test(feat.category ?? ''),
  },
  {
    id: 'ancestry',
    titulo: 'Ancestralidade e herança',
    cabe: (feat) =>
      feat.kind === 'heritage' ||
      feat.kind === 'ancestry-feature' ||
      feat.kind === 'glossary' ||
      /ancestry|heritage/i.test(feat.category ?? ''),
  },
  { id: 'outros', titulo: 'Outros', cabe: () => true },
]

/* Quais grupos ficam abertos — sobrevive à troca de sub-aba (mesmo motivo de
   Ataques.jsx e GmScreen.jsx). "fav" entra junto mesmo não sendo um id de
   GRUPOS: chave própria, sem conflito. */
let gruposAbertos = { fav: true, 'class-feature': true, class: true, ancestry: true, outros: true }

export default function Feats({ player }) {
  const [aberto, setAberto] = useState(null)
  const [grupos, setGrupos] = useState(gruposAbertos)
  const feats = player.sheet?.feats ?? []
  const favoritos = player.vitals?.favorites ?? {}

  const setGrupo = (id, value) => {
    setGrupos((atual) => {
      gruposAbertos = { ...atual, [id]: value }
      return gruposAbertos
    })
  }

  /* Cada feat cai no PRIMEIRO grupo que o aceita, então "Outros" recolhe o que
     sobrou em vez de duplicar. */
  const idsVisiveis = GRUPOS.map((g) => g.id)
  const gruposComItens = GRUPOS.map((grupo) => ({
    ...grupo,
    itens: feats.filter((feat) => grupo.cabe(feat) && !jaCaiu(feat, grupo, feats)),
  })).filter((grupo) => grupo.itens.length)

  const favoritas = feats.filter((feat) => favoritos[chave(feat)])

  return (
    <>
      <ExpandCollapseAll
        onExpand={() =>
          setGrupos((gruposAbertos = Object.fromEntries(['fav', ...idsVisiveis].map((id) => [id, true]))))
        }
        onCollapse={() =>
          setGrupos((gruposAbertos = Object.fromEntries(['fav', ...idsVisiveis].map((id) => [id, false]))))
        }
      />

      {favoritas.length ? (
        <Grupo
          titulo="Favoritos"
          itens={favoritas}
          prefixo="fav"
          player={player}
          aberto={aberto}
          setAberto={setAberto}
          open={grupos.fav}
          onToggle={() => setGrupo('fav', !grupos.fav)}
        />
      ) : null}

      {gruposComItens.map((grupo) => (
        <Grupo
          key={grupo.id}
          titulo={grupo.titulo}
          itens={grupo.itens}
          prefixo={grupo.id}
          player={player}
          aberto={aberto}
          setAberto={setAberto}
          open={grupos[grupo.id] ?? true}
          onToggle={() => setGrupo(grupo.id, !(grupos[grupo.id] ?? true))}
        />
      ))}

      {feats.length === 0 ? (
        <div className="empty">Nenhum feat veio na ficha importada.</div>
      ) : null}
    </>
  )
}

/* Um feat só entra num grupo. Como a regra de cada grupo é independente, a
   checagem é "algum grupo anterior já o aceitaria?". */
function jaCaiu(feat, grupo, todos) {
  const indice = GRUPOS.findIndex((g) => g.id === grupo.id)
  return GRUPOS.slice(0, indice).some((anterior) => anterior.cabe(feat, todos))
}

const chave = (feat) => `feat:${feat.id ?? feat.name}`

function Grupo({ titulo, itens, prefixo, player, aberto, setAberto, open, onToggle }) {
  return (
    <section className="list-group">
      <SectionHead title={titulo} count={itens.length} open={open} onToggle={onToggle} />
      {open ? (
        <div className="list-rows entries">
          {itens.map((feat, indice) => (
            <Linha
              key={`${prefixo}-${feat.id ?? feat.name}-${indice}`}
              feat={feat}
              id={`${prefixo}-${feat.id ?? feat.name}`}
              player={player}
              aberto={aberto}
              setAberto={setAberto}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function Linha({ feat, id, player, aberto, setAberto }) {
  const { dispatch } = useStore()
  const open = aberto === id
  const favorito = Boolean(player.vitals?.favorites?.[chave(feat)])

  return (
    <div className="entry">
      <div className="entry__head">
        <button
          type="button"
          className="entry__main"
          onClick={() => setAberto(open ? null : id)}
          aria-expanded={open}
        >
          <span className="entry__title">
            <span className="entry__name">{feat.name}</span>
            <ActionCost cost={feat.actionCost} />
          </span>
          <span className="entry__sub">
            {feat.source ?? '—'}
            {feat.level != null ? ` · Nv ${feat.level}` : ''}
            {/* Marcação discreta, não alarme: não achar verbete costuma ser
                conteúdo de livro que os packs ainda não cobrem. */}
            {feat.resolved === false ? ' · sem verbete nos packs' : ''}
          </span>
        </button>

        <button
          type="button"
          className={`atk__star${favorito ? ' atk__star--on' : ''}`}
          aria-pressed={favorito}
          aria-label={`${favorito ? 'Tirar' : 'Marcar'} ${feat.name} dos favoritos`}
          onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', playerId: player.id, key: chave(feat) })}
        >
          ★
        </button>

        <button
          type="button"
          className="icon-btn icon-btn--ghost"
          onClick={() => setAberto(open ? null : id)}
          aria-label={open ? 'Fechar' : 'Abrir'}
        >
          <ChevronRight open={open} />
        </button>
      </div>

      {open ? (
        <div className="entry__body">
          <TraitList traits={feat.traits} />
          {feat.descriptionHtml ? (
            <div
              className="item__desc"
              // Vem sanitizado da ingestão: sem script nem handler inline.
              dangerouslySetInnerHTML={{ __html: feat.descriptionHtml }}
            />
          ) : (
            <p className="item__desc item__desc--plain">
              Os packs do Foundry não têm verbete com este nome, então a
              descrição não aparece. O nome é o que o Pathbuilder mandou.
            </p>
          )}
          {feat.entrySource ? <div className="item__source">{feat.entrySource.title}</div> : null}
        </div>
      ) : null}
    </div>
  )
}

/*
 * O custo em ações. O dado é estruturado (`{ type, value }`) e quem desenha
 * é aqui — assim o glifo nunca vira o dado guardado.
 */
/* Glifo da fonte oficial Pathfinder2eActions (base.css), a mesma que já
   desenha "Ativar" dentro da descrição importada (.action-glyph) — aqui é só
   o mesmo caractere, fora do HTML do pack. */
const GLYPH_ACAO = { 1: '1', 2: '2', 3: '3' }

export function ActionCost({ cost }) {
  if (!cost) return null
  if (cost.type === 'action') {
    const valor = Math.max(1, Math.min(3, cost.value ?? 1))
    return (
      <span className="entry__cost" aria-label={`${valor} ${valor === 1 ? 'ação' : 'ações'}`}>
        <span className="action-glyph">{GLYPH_ACAO[valor]}</span>
      </span>
    )
  }
  if (cost.type === 'reaction') {
    return (
      <span className="entry__cost" aria-label="reação">
        <span className="action-glyph">r</span>
      </span>
    )
  }
  if (cost.type === 'free') {
    return (
      <span className="entry__cost" aria-label="ação livre">
        <span className="action-glyph">f</span>
      </span>
    )
  }
  /* "10 minutes", "1 hour": não cabe em losango, e arredondar seria mentir. */
  return <span className="entry__cost entry__cost--text">{cost.text}</span>
}
