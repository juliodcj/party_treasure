import { useEffect, useState } from 'react'
import Sheet from '../../components/Sheet.jsx'
import Stepper from '../../components/Stepper.jsx'
import TraitList from '../../components/TraitList.jsx'
import { ChevronRight } from '../../components/Icons.jsx'
import { useStore } from '../../state/store.jsx'
import { refocus } from '../../lib/sheet.js'
import { spellRef } from '../../lib/loreResolve.js'
import BreakdownSheet, { StatCell } from './BreakdownSheet.jsx'
import Compendio from './Compendio.jsx'

/*
 * A aba Magias.
 *
 * A única das cinco sub-abas que **nunca tinha sido exercitada contra dado
 * real** até aqui (§18, risco 1): o Rurik é bárbaro, e todo o conteúdo de
 * magia do protótipo era um mago inventado. Fechado nesta fase com um export
 * de verdade — mago humano nível 1, `docs/fixtures/wizard.json`.
 *
 * Zero conteúdo escrito à mão: truque, magia de foco, e o grimório inteiro
 * vêm do que o Pathbuilder exportou. Descrição vem do servidor, sob demanda.
 */

export default function Magias({ player, view }) {
  const { dispatch } = useStore()
  const [breakdown, setBreakdown] = useState(null)
  const [aberto, setAberto] = useState(null)
  const [escolhendo, setEscolhendo] = useState(null) // rank do slot vazio tocado
  const [compendioAberto, setCompendioAberto] = useState(false)

  const sheet = player.sheet
  const conj = sheet?.spellcasting
  const vitals = player.vitals ?? {}
  const preparadas = vitals.preparedSpells ?? []
  const extras = vitals.extraSpells ?? []

  if (!conj) return null // a aba nem aparece sem conjuração (§12.3); é defesa a mais

  const espontanea = conj.preparation !== 'prepared'
  const maxFoco = Math.max(0, Number(sheet.focusPoints) || 0)
  const focoAtual = Math.max(0, Number(vitals.focusPoints) || 0)
  const podeRefocus = Boolean(refocus(sheet, vitals))

  const capCantrips = conj.perDay?.[0] ?? 0
  const cantripsPreparados = preparadas.filter((p) => p.rank === 0).length

  /* Um círculo por posição não-zero de `perDay`, a partir do 1 — o 0 (truques)
     tem tratamento próprio, junto do resto do cabeçalho. */
  const circulos = (conj.perDay ?? [])
    .map((total, rank) => ({ rank, total }))
    .filter(({ rank, total }) => rank > 0 && total > 0)

  /* Visão de conjunto de todos os círculos numa linha só, como no protótipo —
     um resumo rápido de quanto sobrou antes de abrir cada balde individual.
     Só para preparada: espontânea/inata não tem "pronto/total" por círculo,
     porque a ficha não controla o que já foi lançado hoje (§17b). */
  const tabelaSlots = espontanea
    ? []
    : (conj.perDay ?? []).map((total, rank) => {
        if (!total) return { rank, vazio: true }
        const prontas = preparadas.filter((p) => p.rank === rank && (rank === 0 || !p.used)).length
        return { rank, vazio: false, prontas, total }
      })

  return (
    <>
      <section className="list-group">
        <div className="list-rows magias__conjuracao">
          <div className="magias__conj-linha">
            <span className="magias__conj-nome">
              {rotuloTradicao(conj.tradition)} · {rotuloPreparo(conj.preparation)}
            </span>
            {view.spellDc ? <StatCell label="DC" stat={view.spellDc} onOpen={setBreakdown} /> : null}
            {view.spellAttack ? (
              <StatCell label="Ataque" stat={view.spellAttack} onOpen={setBreakdown} />
            ) : null}
          </div>
          <div className="magias__conj-chips">
            <span className="chip chip--sm">
              Truques {cantripsPreparados}/{capCantrips}
            </span>
            <span className="chip chip--sm">
              Foco {focoAtual}/{maxFoco}
            </span>
          </div>
          {tabelaSlots.length > 0 ? (
            <div
              className="magias__slot-table"
              style={{ gridTemplateColumns: `repeat(${tabelaSlots.length}, 1fr)` }}
            >
              {tabelaSlots.map((t) => (
                <div className="magias__slot-cell" key={t.rank}>
                  <div className="magias__slot-rank">{t.rank}</div>
                  <div className={`magias__slot-value${t.vazio ? ' magias__slot-value--vazio' : ''}`}>
                    {t.vazio ? '–' : `${t.prontas}/${t.total}`}
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {maxFoco > 0 ? (
        <section className="list-group">
          <h3 className="label list-group__title">
            <span>Foco</span>
          </h3>
          <div className="list-rows magias__foco">
            <Stepper
              value={focoAtual}
              label="pontos de foco"
              canDec={focoAtual > 0}
              canInc={focoAtual < maxFoco}
              onDec={() => dispatch({ type: 'SET_FOCUS', playerId: player.id, value: focoAtual - 1 })}
              onInc={() => dispatch({ type: 'SET_FOCUS', playerId: player.id, value: focoAtual + 1 })}
            />
            <button
              type="button"
              className="btn btn--tint"
              disabled={!podeRefocus}
              onClick={() => {
                const patch = refocus(sheet, vitals)
                if (patch) dispatch({ type: 'SET_FOCUS', playerId: player.id, value: patch.focusPoints })
              }}
            >
              Refocus (+1)
            </button>
          </div>
          {(conj.focusCantrips.length || conj.focusSpells.length) > 0 ? (
            <div className="list-rows">
              {conj.focusCantrips.map((nome) => (
                <SpellRow key={`fc-${nome}`} nome={nome} rankTag="Truque" aberto={aberto} setAberto={setAberto} />
              ))}
              {conj.focusSpells.map((nome) => (
                <SpellRow key={`fs-${nome}`} nome={nome} rankTag="Foco" aberto={aberto} setAberto={setAberto} />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {espontanea ? (
        <section className="list-group">
          <h3 className="label list-group__title">
            <span>Magias conhecidas</span>
            <span className="list-group__count">{conj.book.length}</span>
          </h3>
          <div className="list-rows">
            {agruparPorRank(conj.book).map(([rank, itens]) => (
              <div className="magias__rank-bucket" key={rank}>
                <div className="field-label magias__rank-label">{rotuloRank(rank)}</div>
                {itens.map((sp, i) => (
                  <SpellRow
                    key={`${rank}-${sp.name}-${i}`}
                    nome={sp.name}
                    aberto={aberto}
                    setAberto={setAberto}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="charsheet__note magias__note">
            Conjuração espontânea: esta ficha ainda não controla quantas magias
            você já lançou hoje. Marque na mesa mesmo — nenhum fixture real de
            conjurador espontâneo foi testado até agora.
          </p>
        </section>
      ) : (
        <>
          {/* ------------------------------------------------ truques preparados */}
          <RankBucket
            titulo="Truques"
            rank={0}
            total={capCantrips}
            preparadas={preparadas.filter((p) => p.rank === 0)}
            player={player}
            aberto={aberto}
            setAberto={setAberto}
            onSlotVazio={() => setEscolhendo(0)}
            cantrip
          />

          {/* --------------------------------------------------- círculos com slot */}
          {circulos.map(({ rank, total }) => (
            <RankBucket
              key={rank}
              titulo={`Círculo ${rank}`}
              rank={rank}
              total={total}
              preparadas={preparadas.filter((p) => p.rank === rank)}
              player={player}
              aberto={aberto}
              setAberto={setAberto}
              onSlotVazio={() => setEscolhendo(rank)}
            />
          ))}

          {/* -------------------------------------------------------- grimório */}
          <section className="list-group">
            <h3 className="label list-group__title">
              <span>Grimório</span>
              <span className="list-group__count">{conj.book.length}</span>
            </h3>
            <div className="list-rows">
              {conj.book.map((sp, i) => (
                <SpellRow
                  key={`book-${sp.rank}-${sp.name}-${i}`}
                  nome={sp.name}
                  rankTag={rotuloRank(sp.rank)}
                  aberto={aberto}
                  setAberto={setAberto}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* ------------------------------------------------------ lista especial */}
      <section className="list-group">
        <h3 className="label list-group__title">
          <span>Especial</span>
          <span className="list-group__count">
            {extras.length ? `${extras.filter((e) => !e.used).length} / ${extras.length}` : 'vazio'}
          </span>
        </h3>
        <div className="list-rows">
          {extras.map((sp) => (
            <ExtraRow key={sp.uid} sp={sp} player={player} aberto={aberto} setAberto={setAberto} />
          ))}
          <AddExtraRow player={player} />
        </div>
      </section>

      <button
        type="button"
        className="btn btn--tint btn--block charsheet__rest"
        onClick={() => setCompendioAberto(true)}
      >
        Compêndio {rotuloTradicao(conj.tradition)}
      </button>

      {breakdown ? <BreakdownSheet stat={breakdown} onClose={() => setBreakdown(null)} /> : null}
      {escolhendo != null ? (
        <PrepararSheet
          player={player}
          conj={conj}
          rank={escolhendo}
          onClose={() => setEscolhendo(null)}
        />
      ) : null}
      {compendioAberto ? (
        <Compendio player={player} conj={conj} onClose={() => setCompendioAberto(false)} />
      ) : null}
    </>
  )
}

/* ------------------------------------------------------------------ peças */

const rotuloTradicao = (tradition) => TRADICOES[tradition] ?? tradition ?? '—'
const TRADICOES = { arcane: 'Arcana', divine: 'Divina', occult: 'Oculta', primal: 'Primal' }

const rotuloPreparo = (preparation) => PREPAROS[preparation] ?? preparation ?? '—'
const PREPAROS = { prepared: 'preparada', spontaneous: 'espontânea', innate: 'inata' }

const rotuloRank = (rank) => (rank === 0 ? 'Truque' : `Círculo ${rank}`)

function agruparPorRank(lista) {
  const porRank = new Map()
  for (const item of lista) {
    if (!porRank.has(item.rank)) porRank.set(item.rank, [])
    porRank.get(item.rank).push(item)
  }
  return [...porRank.entries()].sort(([a], [b]) => a - b)
}

/** Um círculo de slots: as preparadas + os vazios que faltam até o total. */
function RankBucket({ titulo, rank, total, preparadas, player, aberto, setAberto, onSlotVazio, cantrip = false }) {
  const vazios = Math.max(0, total - preparadas.length)

  return (
    <section className="list-group">
      <h3 className="label list-group__title">
        <span>{titulo}</span>
        <span className="list-group__count">
          {cantrip ? `${preparadas.length}/${total} preparados` : `${preparadas.filter((p) => !p.used).length}/${total} disponíveis`}
        </span>
      </h3>
      <div className="list-rows">
        {preparadas.map((sp) => (
          <PreparadaRow
            key={sp.uid}
            sp={sp}
            cantrip={cantrip}
            player={player}
            aberto={aberto}
            setAberto={setAberto}
          />
        ))}
        {Array.from({ length: vazios }, (_, i) => (
          <button key={`vazio-${rank}-${i}`} type="button" className="magias__slot-vazio" onClick={onSlotVazio}>
            <span className="magias__slot-box" />
            <span className="magias__slot-label">Slot vazio</span>
            <span className="magias__slot-action">Preparar</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function PreparadaRow({ sp, cantrip, player, aberto, setAberto }) {
  const { dispatch } = useStore()
  return (
    <div className="magias__prep-row">
      {!cantrip ? (
        <button
          type="button"
          className={`magias__check${sp.used ? ' magias__check--on' : ''}`}
          aria-pressed={sp.used}
          aria-label={`${sp.used ? 'Marcar como disponível' : 'Marcar como usada'}: ${sp.name}`}
          onClick={() => dispatch({ type: 'USE_SPELL_SLOT', playerId: player.id, uid: sp.uid })}
        />
      ) : null}
      <SpellRow
        nome={sp.name}
        aberto={aberto}
        setAberto={setAberto}
        riscado={!cantrip && sp.used}
        semBorda
      />
      <button
        type="button"
        className="icon-btn icon-btn--ghost"
        aria-label={`Remover ${sp.name} do preparo`}
        onClick={() => dispatch({ type: 'REMOVE_SPELL', playerId: player.id, uid: sp.uid })}
      >
        ×
      </button>
    </div>
  )
}

function ExtraRow({ sp, player, aberto, setAberto }) {
  const { dispatch } = useStore()
  return (
    <div className="magias__prep-row">
      <button
        type="button"
        className={`magias__check${sp.used ? ' magias__check--on' : ''}`}
        aria-pressed={sp.used}
        aria-label={`${sp.used ? 'Marcar como disponível' : 'Marcar como usada'}: ${sp.name}`}
        onClick={() => dispatch({ type: 'USE_SPELL_SLOT', playerId: player.id, uid: sp.uid })}
      />
      <SpellRow
        nome={sp.name}
        rankTag={sp.rank != null ? rotuloRank(sp.rank) : null}
        aberto={aberto}
        setAberto={setAberto}
        riscado={sp.used}
        semBorda
      />
      <button
        type="button"
        className="icon-btn icon-btn--ghost"
        aria-label={`Remover ${sp.name} da lista especial`}
        onClick={() => dispatch({ type: 'REMOVE_SPELL', playerId: player.id, uid: sp.uid })}
      >
        ×
      </button>
    </div>
  )
}

function AddExtraRow({ player }) {
  const { dispatch } = useStore()
  const [nome, setNome] = useState('')

  const adicionar = () => {
    const limpo = nome.trim()
    if (!limpo) return
    dispatch({ type: 'ADD_SPELL', playerId: player.id, name: limpo, rank: null })
    setNome('')
  }

  return (
    <div className="magias__add-row">
      <input
        className="input"
        placeholder="Magia de item, ritual, concessão do mestre…"
        value={nome}
        onChange={(event) => setNome(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && adicionar()}
        aria-label="Nome da magia especial"
      />
      <button type="button" className="btn btn--tint" onClick={adicionar} disabled={!nome.trim()}>
        Adicionar
      </button>
    </div>
  )
}

/** Linha simples de magia: nome, custo/rank, abre para a descrição sob demanda. */
function SpellRow({ nome, rankTag = null, aberto, setAberto, riscado = false, semBorda = false }) {
  const id = `spell-${nome}`
  const open = aberto === id
  const descricao = useSpellDescription(nome, open)

  return (
    <div className={semBorda ? 'magias__spellrow-bare' : 'magias__spellrow'}>
      <button
        type="button"
        className="entry__main"
        onClick={() => setAberto(open ? null : id)}
        aria-expanded={open}
      >
        <span className="entry__title">
          <span className={`entry__name${riscado ? ' magias__name--used' : ''}`}>{nome}</span>
          {rankTag ? <span className="entry__sub">{rankTag}</span> : null}
        </span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn--ghost"
        onClick={() => setAberto(open ? null : id)}
        aria-label={open ? 'Fechar' : 'Abrir'}
      >
        <ChevronRight open={open} />
      </button>

      {open ? (
        <div className="entry__body magias__spellrow-body">
          {descricao.traits.length ? <TraitList traits={descricao.traits} /> : null}
          {descricao.html ? (
            <div className="item__desc" dangerouslySetInnerHTML={{ __html: descricao.html }} />
          ) : (
            <p className="item__desc item__desc--plain">{descricao.aviso}</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

/*
 * A descrição de uma magia do Pathbuilder, buscada pelo NOME — não há id do
 * corpus aqui, só o que o export trouxe. O slug é adivinhado (`spellRef`); no
 * raro caso de não bater com o do Foundry, a magia entra sem descrição, como
 * qualquer nome que os packs não conhecem — nunca inventada.
 */
const cache = new Map()

function useSpellDescription(nome, open) {
  const [estado, setEstado] = useState(() => {
    const guardado = cache.get(nome)
    return { html: guardado?.html ?? null, traits: guardado?.traits ?? [], aviso: 'Carregando a descrição…' }
  })

  useEffect(() => {
    if (!open || estado.html) return
    let vivo = true
    fetch(`/api/entry/${encodeURIComponent(spellRef(nome))}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((entry) => {
        const dado = { html: entry.descriptionHtml, traits: entry.traits ?? [] }
        cache.set(nome, dado)
        if (vivo) setEstado({ ...dado, aviso: '' })
      })
      .catch(() => {
        if (vivo) {
          setEstado({
            html: null,
            traits: [],
            aviso: 'Sem verbete nos packs com este nome — a descrição não veio.',
          })
        }
      })
    return () => {
      vivo = false
    }
  }, [open, nome, estado.html])

  return estado
}

/** Escolher o que preparar num slot vazio: as entradas do grimório daquele rank. */
function PrepararSheet({ player, conj, rank, onClose }) {
  const { dispatch } = useStore()
  const opcoes = conj.book.filter((sp) => sp.rank === rank)

  return (
    <Sheet title={`Preparar em ${rotuloRank(rank)}`} onClose={onClose}>
      <div className="mods__list">
        {opcoes.length === 0 ? (
          <div className="empty empty--inline">Nenhuma magia deste círculo no grimório.</div>
        ) : (
          opcoes.map((sp, i) => (
            <button
              key={`${sp.name}-${i}`}
              type="button"
              className="target-row"
              onClick={() => {
                dispatch({ type: 'PREPARE_SPELL', playerId: player.id, rank, name: sp.name })
                onClose()
              }}
            >
              {sp.name}
            </button>
          ))
        )}
      </div>
      <button type="button" className="btn btn--neutral btn--block" onClick={onClose}>
        Cancelar
      </button>
    </Sheet>
  )
}
