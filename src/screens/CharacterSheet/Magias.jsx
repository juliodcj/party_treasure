import { useEffect, useState } from 'react'
import Sheet from '../../components/Sheet.jsx'
import Stepper from '../../components/Stepper.jsx'
import TraitList from '../../components/TraitList.jsx'
import { ChevronRight } from '../../components/Icons.jsx'
import SectionHead, { ExpandCollapseAll } from '../../components/SectionHead.jsx'
import { useStore } from '../../state/store.jsx'
import { refocus, sgn } from '../../lib/sheet.js'
import { spellRef } from '../../lib/loreResolve.js'
import BreakdownSheet from './BreakdownSheet.jsx'
import Compendio from './Compendio.jsx'
import { ActionCost } from './Feats.jsx'
import { DescansoSheet } from './Resumo.jsx'

/* Quais seções ficam abertas — sobrevive à troca de sub-aba. Chave dinâmica
   (círculo varia por personagem): id desconhecido nasce aberto. */
let secoesAbertas = {}

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
  const [descansando, setDescansando] = useState(false)
  const [secoes, setSecoes] = useState(secoesAbertas)

  const aberta = (id) => secoes[id] ?? true
  const setSecao = (id, value) => {
    setSecoes((atual) => {
      secoesAbertas = { ...atual, [id]: value }
      return secoesAbertas
    })
  }

  const sheet = player.sheet
  const conj = sheet?.spellcasting
  const vitals = player.vitals ?? {}
  const preparadas = vitals.preparedSpells ?? []
  const extras = vitals.extraSpells ?? []

  if (!conj) return null // a aba nem aparece sem conjuração (§12.3); é defesa a mais

  const custos = conj.spellCosts ?? {}

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
     porque a ficha não controla o que já foi lançado hoje (§17b).

     Começa no círculo 1: os truques têm o próprio chip logo acima, e repeti-los
     na tabela gastaria uma coluna com o número que já está do lado. */
  const tabelaSlots = espontanea
    ? []
    : (conj.perDay ?? [])
        .map((total, rank) => ({ total, rank }))
        .filter(({ rank }) => rank > 0)
        .map(({ total, rank }) => {
          if (!total) return { rank, vazio: true }
          const prontas = preparadas.filter((p) => p.rank === rank && !p.used).length
          return { rank, vazio: false, prontas, total }
        })

  /* Toda seção que existe nesta ficha, para o par Expandir/Recolher mexer só
     no que está de fato na tela. */
  const idsDeSecoes = [
    maxFoco > 0 ? 'foco' : null,
    espontanea ? 'conhecidas' : null,
    !espontanea ? 'truques' : null,
    ...(!espontanea ? circulos.map(({ rank }) => `circulo-${rank}`) : []),
    !espontanea ? 'grimorio' : null,
    'especial',
  ].filter(Boolean)

  return (
    <>
      <section className="list-group">
        <h3 className="label list-group__title">
          <span>Conjuração</span>
        </h3>
        <div className="list-rows magias__conjuracao">
          <div className="magias__conj-linha">
            <span className="magias__conj-nome">
              {rotuloTradicao(conj.tradition)} · {rotuloPreparo(conj.preparation)}
            </span>
            {/* DC e Ataque como par rótulo-valor na mesma linha, e não como
                caixa: aqui eles são a legenda da conjuração, não uma célula da
                grade. Continuam tocáveis, que é o ponto da aba. */}
            {view.spellDc ? (
              <button type="button" className="magias__conj-stat" onClick={() => setBreakdown(view.spellDc)}>
                <span className="magias__conj-stat-label">DC</span>
                <span className="magias__conj-stat-value">{view.spellDc.total}</span>
              </button>
            ) : null}
            {view.spellAttack ? (
              <button type="button" className="magias__conj-stat" onClick={() => setBreakdown(view.spellAttack)}>
                <span className="magias__conj-stat-label">Ataque</span>
                <span className="magias__conj-stat-value">{sgn(view.spellAttack.total)}</span>
              </button>
            ) : null}
          </div>
          <div className="magias__conj-chips">
            <span className="chip chip--sm">
              Truques {cantripsPreparados}/{capCantrips}
            </span>
            <span className="chip chip--sm">
              Foco {focoAtual}/{maxFoco}
            </span>
            {/* O descanso é o que devolve slot e foco: fica na faixa que os
                mostra, e não numa aba distante. */}
            <button
              type="button"
              className="btn btn--solid magias__conj-rest"
              onClick={() => setDescansando(true)}
            >
              Descansar
            </button>
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

      <ExpandCollapseAll
        onExpand={() =>
          setSecoes((secoesAbertas = Object.fromEntries(idsDeSecoes.map((id) => [id, true]))))
        }
        onCollapse={() =>
          setSecoes((secoesAbertas = Object.fromEntries(idsDeSecoes.map((id) => [id, false]))))
        }
      />

      {maxFoco > 0 ? (
        <section className="list-group">
          {/* As bolinhas ficam na faixa do título, como no protótipo: o quanto
              sobrou de foco se lê sem abrir a seção. */}
          <SectionHead
            title="Magias de foco"
            open={aberta('foco')}
            onToggle={() => setSecao('foco', !aberta('foco'))}
            action={
              <FocoDots
                atual={focoAtual}
                max={maxFoco}
                onSet={(value) => dispatch({ type: 'SET_FOCUS', playerId: player.id, value })}
              />
            }
          />
          {aberta('foco') ? (
            <>
              {(conj.focusCantrips.length || conj.focusSpells.length) > 0 ? (
                <div className="list-rows">
                  {conj.focusCantrips.map((nome) => (
                    <SpellRow
                      key={`fc-${nome}`}
                      nome={nome}
                      custo={custos[nome]}
                      aberto={aberto}
                      setAberto={setAberto}
                    />
                  ))}
                  {conj.focusSpells.map((nome) => (
                    <SpellRow
                      key={`fs-${nome}`}
                      nome={nome}
                      custo={custos[nome]}
                      aberto={aberto}
                      setAberto={setAberto}
                    />
                  ))}
                </div>
              ) : null}
              <div className="list-rows">
                <button
                  type="button"
                  className="magias__link-row"
                  disabled={!podeRefocus}
                  onClick={() => {
                    const patch = refocus(sheet, vitals)
                    if (patch) dispatch({ type: 'SET_FOCUS', playerId: player.id, value: patch.focusPoints })
                  }}
                >
                  Refocus (+1)
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {espontanea ? (
        <section className="list-group">
          <SectionHead
            title="Magias conhecidas"
            count={conj.book.length}
            open={aberta('conhecidas')}
            onToggle={() => setSecao('conhecidas', !aberta('conhecidas'))}
          />
          {aberta('conhecidas') ? (
            <>
              <div className="list-rows">
                {agruparPorRank(conj.book).map(([rank, itens]) => (
                  <div className="magias__rank-bucket" key={rank}>
                    <div className="field-label magias__rank-label">{rotuloRank(rank)}</div>
                    {itens.map((sp, i) => (
                      <SpellRow
                        key={`${rank}-${sp.name}-${i}`}
                        nome={sp.name}
                        custo={custos[sp.name]}
                        aberto={aberto}
                        setAberto={setAberto}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : (
        <>
          {/* ------------------------------------------------ truques preparados */}
          <RankBucket
            titulo="Preparadas · Truques"
            rank={0}
            total={capCantrips}
            preparadas={preparadas.filter((p) => p.rank === 0)}
            custos={custos}
            player={player}
            aberto={aberto}
            setAberto={setAberto}
            open={aberta('truques')}
            onToggle={() => setSecao('truques', !aberta('truques'))}
            onSlotVazio={() => setEscolhendo(0)}
            cantrip
          />

          {/* --------------------------------------------------- círculos com slot */}
          {circulos.map(({ rank, total }) => (
            <RankBucket
              key={rank}
              titulo={`Preparadas · Rank ${rank}`}
              rank={rank}
              total={total}
              preparadas={preparadas.filter((p) => p.rank === rank)}
              custos={custos}
              player={player}
              aberto={aberto}
              setAberto={setAberto}
              open={aberta(`circulo-${rank}`)}
              onToggle={() => setSecao(`circulo-${rank}`, !aberta(`circulo-${rank}`))}
              onSlotVazio={() => setEscolhendo(rank)}
            />
          ))}

          {/* -------------------------------------------------------- grimório */}
          <section className="list-group">
            <SectionHead
              title="Grimório"
              count={conj.book.length}
              open={aberta('grimorio')}
              onToggle={() => setSecao('grimorio', !aberta('grimorio'))}
            />
            {aberta('grimorio') ? (
              <div className="list-rows">
                {conj.book.map((sp, i) => (
                  <SpellRow
                    key={`book-${sp.rank}-${sp.name}-${i}`}
                    nome={sp.name}
                    rankTag={rotuloRank(sp.rank)}
                    custo={custos[sp.name]}
                    aberto={aberto}
                    setAberto={setAberto}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}

      {/* ------------------------------------------------------ lista especial */}
      <section className="list-group">
        <SectionHead
          title="Preparadas · Especial"
          count={extras.length ? `${extras.filter((e) => !e.used).length} / ${extras.length}` : 'vazio'}
          open={aberta('especial')}
          onToggle={() => setSecao('especial', !aberta('especial'))}
        />
        {aberta('especial') ? (
          <div className="list-rows">
            {extras.map((sp) => (
              <ExtraRow key={sp.uid} sp={sp} player={player} aberto={aberto} setAberto={setAberto} />
            ))}
            <AddExtraRow player={player} />
          </div>
        ) : null}
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
      {descansando ? (
        <DescansoSheet
          player={player}
          onClose={() => setDescansando(false)}
          onConfirm={() => {
            dispatch({ type: 'REST', playerId: player.id })
            setDescansando(false)
          }}
        />
      ) : null}
    </>
  )
}

/* ------------------------------------------------------------------ peças */

/*
 * Os pontos de foco como bolinhas, no cabeçalho da seção — como no protótipo.
 *
 * Cheia é ponto disponível, vazia é ponto gasto. Tocar numa bolinha leva o foco
 * até ela: gastar é tocar na última cheia, recuperar é tocar na primeira vazia.
 * Um stepper daria o mesmo, com o dobro de toques e sem dizer de relance quanto
 * sobrou — que é a pergunta que se faz no meio da mesa.
 */
function FocoDots({ atual, max, onSet }) {
  return (
    <span className="foco-dots" role="group" aria-label={`Pontos de foco: ${atual} de ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const cheia = i < atual
        /* Tocar na bolinha que já é a última cheia zera aquele ponto; qualquer
           outra leva o foco até ela. */
        const alvo = cheia && i + 1 === atual ? i : i + 1
        return (
          <button
            key={i}
            type="button"
            className={`foco-dot${cheia ? ' foco-dot--on' : ''}`}
            aria-label={`Foco ${i + 1} de ${max}`}
            aria-pressed={cheia}
            onClick={() => onSet(alvo)}
          />
        )
      })}
    </span>
  )
}

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
function RankBucket({
  titulo,
  rank,
  total,
  preparadas,
  custos,
  player,
  aberto,
  setAberto,
  open,
  onToggle,
  onSlotVazio,
  cantrip = false,
}) {
  const vazios = Math.max(0, total - preparadas.length)

  return (
    <section className="list-group">
      <SectionHead
        title={titulo}
        count={
          cantrip ? `${preparadas.length}/${total} preparados` : `${preparadas.filter((p) => !p.used).length}/${total} disponíveis`
        }
        open={open}
        onToggle={onToggle}
      />
      {open ? (
        <div className="list-rows">
          {preparadas.map((sp) => (
            <PreparadaRow
              key={sp.uid}
              sp={sp}
              cantrip={cantrip}
              custo={custos[sp.name]}
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
      ) : null}
    </section>
  )
}

function PreparadaRow({ sp, cantrip, custo, player, aberto, setAberto }) {
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
        custo={custo}
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
function SpellRow({ nome, rankTag = null, custo = null, aberto, setAberto, riscado = false, semBorda = false }) {
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
          <ActionCost cost={custo} />
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
