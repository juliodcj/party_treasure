import { useState } from 'react'
import TraitList from '../../components/TraitList.jsx'
import { ChevronRight } from '../../components/Icons.jsx'
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

export default function Feats({ player }) {
  const [aberto, setAberto] = useState(null)
  const feats = player.sheet?.feats ?? []
  const favoritos = player.vitals?.favorites ?? {}

  /* Cada feat cai no PRIMEIRO grupo que o aceita, então "Outros" recolhe o que
     sobrou em vez de duplicar. */
  const grupos = GRUPOS.map((grupo) => ({
    ...grupo,
    itens: feats.filter((feat) => grupo.cabe(feat) && !jaCaiu(feat, grupo, feats)),
  })).filter((grupo) => grupo.itens.length)

  const favoritas = feats.filter((feat) => favoritos[chave(feat)])

  return (
    <>
      {favoritas.length ? (
        <Grupo
          titulo="Favoritos"
          itens={favoritas}
          prefixo="fav"
          player={player}
          aberto={aberto}
          setAberto={setAberto}
        />
      ) : null}

      {grupos.map((grupo) => (
        <Grupo
          key={grupo.id}
          titulo={grupo.titulo}
          itens={grupo.itens}
          prefixo={grupo.id}
          player={player}
          aberto={aberto}
          setAberto={setAberto}
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

function Grupo({ titulo, itens, prefixo, player, aberto, setAberto }) {
  return (
    <section className="list-group">
      <h3 className="label list-group__title">
        <span>{titulo}</span>
        <span className="list-group__count">{itens.length}</span>
      </h3>
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
 * O custo em ações, como o PF2e o desenha: losangos para ações, seta curva para
 * reação. O dado é estruturado (`{ type, value }`) e quem desenha é aqui —
 * assim o glifo nunca vira o dado guardado.
 */
export function ActionCost({ cost }) {
  if (!cost) return null
  if (cost.type === 'action') {
    return (
      <span className="entry__cost" aria-label={`${cost.value} ${cost.value === 1 ? 'ação' : 'ações'}`}>
        {'◆'.repeat(Math.max(1, Math.min(3, cost.value ?? 1)))}
      </span>
    )
  }
  if (cost.type === 'reaction') {
    return (
      <span className="entry__cost entry__cost--reaction" aria-label="reação">
        ↻
      </span>
    )
  }
  if (cost.type === 'free') {
    return (
      <span className="entry__cost entry__cost--free" aria-label="ação livre">
        ◇
      </span>
    )
  }
  /* "10 minutes", "1 hour": não cabe em losango, e arredondar seria mentir. */
  return <span className="entry__cost entry__cost--text">{cost.text}</span>
}
