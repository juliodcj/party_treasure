import { useMemo, useState } from 'react'
import SPELL_INDEX from '../../data/index.spells.json' with { type: 'json' }
import { ChevronRight, SwordIcon } from '../../components/Icons.jsx'
import SectionHead, { ExpandCollapseAll } from '../../components/SectionHead.jsx'
import { useStore } from '../../state/store.jsx'
import { focusList, focusPool, sgn } from '../../lib/sheet.js'
import { spellDoIndice } from '../../lib/spells.js'
import { spellKey } from '../../state/reducer.js'
import BreakdownSheet from './BreakdownSheet.jsx'
import Compendio, { paraPicker, rankEfetivo } from './Compendio.jsx'
import { ActionCost } from './Feats.jsx'
import SpellPicker, { SpellBody } from './SpellPicker.jsx'
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
  const [especialAberta, setEspecialAberta] = useState(false)
  const [focoAberto, setFocoAberto] = useState(null) // 'truque' | 'magia'
  const [descansando, setDescansando] = useState(false)
  const [secoes, setSecoes] = useState(secoesAbertas)

  /* Seção sem estado guardado nasce aberta, menos onde `padrao` diz outra
     coisa. Tocar no cabeçalho grava a escolha e ela passa a valer. */
  const aberta = (id, padrao = true) => secoes[id] ?? padrao
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

  /*
   * O custo em ações de uma magia, com duas fontes e nesta ordem.
   *
   * `spellCosts` é o que a IMPORTAÇÃO resolveu, pelo slug do verbete, e por isso
   * é a primeira: ela só tem nome que veio no export do Pathbuilder, mas resolveu
   * pelo caminho mais confiável.
   *
   * Magia copiada do Compêndio depois da importação não está lá — e era esse o
   * furo: o truque preparado a partir dela aparecia sem o losango, sozinho no
   * meio de uma lista em que todos os outros tinham. O índice do bundle tem o
   * custo das 1.993 magias, saído da mesma ingestão, e entra como segunda fonte.
   */
  const custoDe = (nome) => conj.spellCosts?.[nome] ?? spellDoIndice(nome)?.actionCost ?? null

  /* O grimório (ou a lista de conhecidas) é o que o Pathbuilder exportou, menos
     o que foi esquecido na mesa, mais o que foi copiado do Compêndio. Ordenado
     por círculo e, dentro dele, por nome — a lista é consultada procurando um
     nome. */
  const esquecidas = new Set(vitals.forgottenSpells ?? [])
  const grimorio = [
    ...conj.book.filter((sp) => !esquecidas.has(spellKey(sp.rank, sp.name))),
    ...(vitals.bookSpells ?? []),
  ].sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))

  /* Truques de foco e magias de foco, separados como a regra os separa: o
     truque não gasta ponto, a magia gasta. As que vieram da ficha são só nome;
     as de mesa têm uid. */
  const { cantrips: focoTruques, spells: focoMagias } = focusList(sheet, vitals)

  const espontanea = conj.preparation !== 'prepared'
  const maxFoco = focusPool(sheet, vitals)
  const focoAtual = Math.min(maxFoco, Math.max(0, Number(vitals.focusPoints) || 0))

  const capCantrips = conj.perDay?.[0] ?? 0
  /* O chip de truques conta coisas diferentes conforme o tipo de conjuração, e
     `perDay[0]` é o teto dos dois: o preparado enche uma cota de truques todo
     dia (conta o que está preparado), o espontâneo não prepara nada — os
     truques dele são os que ele SABE, e é essa a lista que tem teto. */
  const cantripsPreparados = espontanea
    ? grimorio.filter((sp) => sp.rank === 0).length
    : preparadas.filter((p) => p.rank === 0).length

  /* Um círculo por posição não-zero de `perDay`, a partir do 1 — o 0 (truques)
     tem tratamento próprio, junto do resto do cabeçalho. */
  const circulos = (conj.perDay ?? [])
    .map((total, rank) => ({ rank, total }))
    .filter(({ rank, total }) => rank > 0 && total > 0)

  /* Quantos slots de cada rank o espontâneo já gastou hoje. O preparado marca
     cada magia preparada como usada; o espontâneo não prepara nada, então o que
     ele risca é o slot — e é este o número que as bolinhas de cada rank mexem. */
  const slotsUsados = vitals.slotsUsed ?? {}
  const usadosNoRank = (rank) =>
    Math.min(conj.perDay?.[rank] ?? 0, Math.max(0, Number(slotsUsados[rank]) || 0))

  /* Visão de conjunto de todos os círculos numa linha só, como no protótipo —
     um resumo rápido de quanto sobrou antes de abrir cada balde individual.

     Vale para os dois tipos de conjuração. No preparado o que sobrou sai das
     magias preparadas ainda não usadas; no espontâneo, dos slots gastos, que
     agora a ficha guarda (`vitals.slotsUsed`).

     Começa no círculo 1: os truques têm o próprio chip logo acima, e repeti-los
     na tabela gastaria uma coluna com o número que já está do lado. */
  const tabelaSlots = (conj.perDay ?? [])
    .map((total, rank) => ({ total, rank }))
    .filter(({ rank }) => rank > 0)
    .map(({ total, rank }) => {
      if (!total) return { rank, vazio: true }
      const prontas = espontanea
        ? total - usadosNoRank(rank)
        : preparadas.filter((p) => p.rank === rank && !p.used).length
      return { rank, vazio: false, prontas, total }
    })

  /* Toda seção que existe nesta ficha, para o par Expandir/Recolher mexer só
     no que está de fato na tela. */
  const idsDeSecoes = [
    'foco-truques',
    'foco',
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

      {/* ---------------------------------------------------- truques de foco

          Vêm antes das magias de foco de propósito: o truque de foco não gasta
          ponto nenhum — lança-se à vontade —, então é o que se lê primeiro no
          meio do turno. A reserva de pontos não aparece aqui porque não é dele:
          as bolinhas ficam na seção que de fato as gasta, logo abaixo. */}
      <FocoSecao
        titulo="Truques de foco"
        lista={focoTruques}
        aberta={aberta('foco-truques')}
        onToggle={() => setSecao('foco-truques', !aberta('foco-truques'))}
        rotuloAdicionar="Adicionar truque de foco"
        onAdicionar={() => setFocoAberto('truque')}
        custoDe={custoDe}
        player={player}
        abertoId={aberto}
        setAberto={setAberto}
      />

      {/* A seção aparece para todo conjurador, mesmo sem nenhuma magia de foco:
          era ela que gastava a reserva, e escondê-la quando a reserva é zero
          tirava justamente o botão de ganhar a primeira. */}
      <FocoSecao
        titulo="Magias de foco"
        lista={focoMagias}
        aberta={aberta('foco')}
        onToggle={() => setSecao('foco', !aberta('foco'))}
        rotuloAdicionar="Adicionar magia de foco"
        onAdicionar={() => setFocoAberto('magia')}
        custoDe={custoDe}
        player={player}
        abertoId={aberto}
        setAberto={setAberto}
        /* As bolinhas ficam na faixa do título, como no protótipo: o quanto
           sobrou de foco se lê sem abrir a seção. E só aqui: a reserva é um
           ponto por MAGIA de foco, e truque de foco não entra na conta. */
        acao={
          <Dots
            atual={focoAtual}
            max={maxFoco}
            rotulo="Pontos de foco"
            onSet={(value) => dispatch({ type: 'SET_FOCUS', playerId: player.id, value })}
          />
        }
      />

      {/* ------------------------------------------------------ lista especial

          Fica logo abaixo do foco: as duas são listas curtas que não gastam
          slot de círculo, e antes ela estava no fim, depois do grimório
          inteiro. Nasce recolhida quando está vazia — é o caso comum, e uma
          seção vazia aberta só empurra o resto da aba para baixo. */}
      <section className="list-group">
        <SectionHead
          title="Preparadas · Especial"
          count={extras.length ? `${extras.filter((e) => !e.used).length} / ${extras.length}` : 'vazio'}
          open={aberta('especial', extras.length > 0)}
          onToggle={() => setSecao('especial', !aberta('especial', extras.length > 0))}
        />
        {aberta('especial', extras.length > 0) ? (
          <div className="list-rows">
            {extras.map((sp) => (
              <ExtraRow key={sp.uid} sp={sp} player={player} aberto={aberto} setAberto={setAberto} />
            ))}
            <button type="button" className="magias__link-row" onClick={() => setEspecialAberta(true)}>
              Adicionar magia
            </button>
          </div>
        ) : null}
      </section>

      {espontanea ? (
        <section className="list-group">
          <SectionHead
            title="Magias conhecidas"
            count={grimorio.length}
            open={aberta('conhecidas')}
            onToggle={() => setSecao('conhecidas', !aberta('conhecidas'))}
          />
          {aberta('conhecidas') ? (
            <>
              <div className="list-rows">
                {agruparPorRank(grimorio).map(([rank, itens]) => {
                  /* Um marcador de slot por rank, do mesmo desenho das bolinhas
                     de foco: cheia é slot disponível, vazia é slot gasto. Truque
                     (rank 0) não tem slot — lança-se à vontade —, e rank que a
                     ficha não dá slot nenhum também fica sem a fileira. */
                  const total = conj.perDay?.[rank] ?? 0
                  return (
                    <div className="magias__rank-bucket" key={rank}>
                      <div className="magias__rank-head">
                        <span className="field-label magias__rank-label">{rotuloRank(rank)}</span>
                        {rank > 0 && total > 0 ? (
                          <Dots
                            atual={total - usadosNoRank(rank)}
                            max={total}
                            rotulo={`Slots de ${rotuloRank(rank)}`}
                            onSet={(value) =>
                              dispatch({
                                type: 'SET_SLOTS_USED',
                                playerId: player.id,
                                rank,
                                value: total - value,
                              })
                            }
                          />
                        ) : null}
                      </div>
                      {itens.map((sp, i) => (
                        <SpellRow
                          key={`${rank}-${sp.name}-${i}`}
                          nome={sp.name}
                          custo={custoDe(sp.name)}
                          aberto={aberto}
                          setAberto={setAberto}
                          depois={
                            <>
                              {/* Conjurador espontâneo lança direto da lista de
                                  conhecidas: é aqui que a espada tem de estar,
                                  senão ele não tem como mandar magia nenhuma
                                  para a aba Ataques. */}
                              <EspadaBtn sp={sp} player={player} />
                              <RemoverDoLivro sp={sp} player={player} />
                            </>
                          }
                        />
                      ))}
                    </div>
                  )
                })}
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
            custoDe={custoDe}
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
              custoDe={custoDe}
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
              count={grimorio.length}
              open={aberta('grimorio')}
              onToggle={() => setSecao('grimorio', !aberta('grimorio'))}
            />
            {aberta('grimorio') ? (
              <div className="list-rows">
                {grimorio.map((sp, i) => (
                  <SpellRow
                    key={`book-${sp.rank}-${sp.name}-${i}`}
                    nome={sp.name}
                    rankTag={rotuloRank(sp.rank)}
                    custo={custoDe(sp.name)}
                    aberto={aberto}
                    setAberto={setAberto}
                    depois={<RemoverDoLivro sp={sp} player={player} />}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </>
      )}

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
          grimorio={grimorio}
          custoDe={custoDe}
          preparadas={preparadas.filter((p) => p.rank === escolhendo).length}
          rank={escolhendo}
          onClose={() => setEscolhendo(null)}
        />
      ) : null}
      {compendioAberto ? (
        <Compendio
          player={player}
          conj={conj}
          grimorio={grimorio}
          onClose={() => setCompendioAberto(false)}
        />
      ) : null}
      {especialAberta ? (
        <EspecialSheet
          player={player}
          conj={conj}
          extras={extras}
          onClose={() => setEspecialAberta(false)}
        />
      ) : null}
      {focoAberto ? (
        <FocoSheet
          player={player}
          sheet={sheet}
          truque={focoAberto === 'truque'}
          foco={[...focoTruques, ...focoMagias]}
          onClose={() => setFocoAberto(null)}
        />
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
 * Bolinhas de reserva, no cabeçalho de uma seção — como no protótipo.
 *
 * Cheia é disponível, vazia é gasta. Tocar numa bolinha leva a conta até ela:
 * gastar é tocar na última cheia, recuperar é tocar na primeira vazia. Um
 * stepper daria o mesmo, com o dobro de toques e sem dizer de relance quanto
 * sobrou — que é a pergunta que se faz no meio da mesa.
 *
 * São dois usos, e é o mesmo objeto: os pontos de foco e os slots de um rank do
 * conjurador espontâneo. Um segundo desenho para "quanto sobrou" faria a mesma
 * pergunta parecer duas coisas dentro da mesma aba.
 */
function Dots({ atual, max, rotulo, onSet }) {
  return (
    <span className="foco-dots" role="group" aria-label={`${rotulo}: ${atual} de ${max}`}>
      {Array.from({ length: max }, (_, i) => {
        const cheia = i < atual
        /* Tocar na bolinha que já é a última cheia zera aquela unidade;
           qualquer outra leva a conta até ela. */
        const alvo = cheia && i + 1 === atual ? i : i + 1
        return (
          <button
            key={i}
            type="button"
            className={`foco-dot${cheia ? ' foco-dot--on' : ''}`}
            aria-label={`${rotulo} ${i + 1} de ${max}`}
            aria-pressed={cheia}
            onClick={() => onSet(alvo)}
          />
        )
      })}
    </span>
  )
}

/*
 * Uma das duas seções de foco. As duas têm a mesma linha e o mesmo botão de
 * acrescentar; o que muda é o título, a lista e — só na de magias — as bolinhas
 * da reserva na faixa do título.
 */
function FocoSecao({
  titulo,
  lista,
  aberta,
  onToggle,
  rotuloAdicionar = null,
  onAdicionar = null,
  custoDe,
  player,
  abertoId,
  setAberto,
  acao = null,
}) {
  const { dispatch } = useStore()

  return (
    <section className="list-group">
      <SectionHead title={titulo} count={lista.length} open={aberta} onToggle={onToggle} action={acao} />
      {aberta ? (
        <>
          {lista.length > 0 ? (
            <div className="list-rows">
              {lista.map((sp) => (
                <SpellRow
                  key={sp.uid ?? `foco-${sp.name}`}
                  chave={sp.uid ?? `foco-${sp.name}`}
                  nome={sp.name}
                  custo={custoDe(sp.name)}
                  aberto={abertoId}
                  setAberto={setAberto}
                  depois={
                    <>
                      {/* Magia de foco também ataca — Hand of the Apprentice e
                          Divine Lance rolam contra a CA como qualquer outra. */}
                      <EspadaBtn sp={sp} player={player} />
                      <RemoverBtn
                        rotulo={`Esquecer ${sp.name}`}
                        onClick={() =>
                          dispatch({
                            type: 'REMOVE_FOCUS_SPELL',
                            playerId: player.id,
                            uid: sp.uid ?? null,
                            name: sp.name,
                          })
                        }
                      />
                    </>
                  }
                />
              ))}
            </div>
          ) : null}
          {onAdicionar ? (
            <div className="list-rows">
              <button type="button" className="magias__link-row" onClick={onAdicionar}>
                {rotuloAdicionar}
              </button>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  )
}

const rotuloTradicao = (tradition) => TRADICOES[tradition] ?? tradition ?? '—'
const TRADICOES = { arcane: 'Arcana', divine: 'Divina', occult: 'Oculta', primal: 'Primal' }

const rotuloPreparo = (preparation) => PREPAROS[preparation] ?? preparation ?? '—'
const PREPAROS = { prepared: 'preparada', spontaneous: 'espontânea', innate: 'inata' }

/* "Rank", e não "Círculo": é o termo do PF2e remaster, o mesmo que o
   Pathbuilder e os packs usam. Vale em toda a interface de magia. */
const rotuloRank = (rank) => (rank === 0 ? 'Truque' : `Rank ${rank}`)

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
  custoDe,
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
              custo={custoDe(sp.name)}
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

/*
 * A espada: manda a magia para a aba Ataques, e tira de lá no segundo toque.
 *
 * A marca é por NOME, não pela instância: preparar Fireball em dois slots não
 * põe dois Fireball na aba Ataques, e trocar o slot de lugar não perde a marca.
 *
 * Mora em `vitals.favorites`, que já é um mapa de chave livre — o mesmo que a
 * estrela de Ataques e a favorita de Ações usam. O prefixo `spell:` separa o
 * espaço de nomes do id de item.
 */
export const spellAttackKey = (name) => `spell:${name}`

function EspadaBtn({ sp, player }) {
  const { dispatch } = useStore()
  const key = spellAttackKey(sp.name)
  const ligada = Boolean(player.vitals?.favorites?.[key])

  return (
    <button
      type="button"
      className={`icon-btn magias__espada${ligada ? ' magias__espada--on' : ''}`}
      aria-pressed={ligada}
      aria-label={`${ligada ? 'Tirar' : 'Mandar'} ${sp.name} ${ligada ? 'da' : 'para a'} aba Ataques`}
      onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', playerId: player.id, key })}
    >
      <SwordIcon />
    </button>
  )
}

/** Caixa "já usei hoje" de uma magia com uid — preparada ou da lista especial. */
function UsadaCheck({ sp, player }) {
  const { dispatch } = useStore()
  return (
    <button
      type="button"
      className={`magias__check${sp.used ? ' magias__check--on' : ''}`}
      aria-pressed={sp.used}
      aria-label={`${sp.used ? 'Marcar como disponível' : 'Marcar como usada'}: ${sp.name}`}
      onClick={() => dispatch({ type: 'USE_SPELL_SLOT', playerId: player.id, uid: sp.uid })}
    />
  )
}

/*
 * Esquecer uma magia do grimório. Vale para as duas origens: a copiada na mesa
 * tem `uid` e some de vez; a que veio do export entra na lista de esquecidas
 * (o reducer decide qual caminho) — reimportar a ficha não a traz de volta.
 * Ela continua no Compêndio, com o + para reaprender.
 */
function RemoverDoLivro({ sp, player }) {
  const { dispatch } = useStore()
  return (
    <RemoverBtn
      rotulo={`Esquecer ${sp.name}`}
      onClick={() =>
        dispatch({
          type: 'REMOVE_BOOK_SPELL',
          playerId: player.id,
          uid: sp.uid ?? null,
          name: sp.name,
          rank: sp.rank,
        })
      }
    />
  )
}

/** O × que tira uma magia da lista em que ela está. */
function RemoverBtn({ rotulo, onClick }) {
  return (
    <button type="button" className="icon-btn icon-btn--ghost" aria-label={rotulo} onClick={onClick}>
      ×
    </button>
  )
}

function PreparadaRow({ sp, cantrip, custo, player, aberto, setAberto }) {
  const { dispatch } = useStore()
  return (
    <SpellRow
      chave={sp.uid}
      nome={sp.name}
      custo={custo}
      aberto={aberto}
      setAberto={setAberto}
      riscado={!cantrip && sp.used}
      antes={cantrip ? null : <UsadaCheck sp={sp} player={player} />}
      depois={
        <>
          <EspadaBtn sp={sp} player={player} />
          <RemoverBtn
            rotulo={`Remover ${sp.name} do preparo`}
            onClick={() => dispatch({ type: 'REMOVE_SPELL', playerId: player.id, uid: sp.uid })}
          />
        </>
      }
    />
  )
}

function ExtraRow({ sp, player, aberto, setAberto }) {
  const { dispatch } = useStore()
  return (
    <SpellRow
      chave={sp.uid}
      nome={sp.name}
      rankTag={sp.rank != null ? rotuloRank(sp.rank) : null}
      aberto={aberto}
      setAberto={setAberto}
      riscado={sp.used}
      antes={<UsadaCheck sp={sp} player={player} />}
      depois={
        <>
          <EspadaBtn sp={sp} player={player} />
          <RemoverBtn
            rotulo={`Remover ${sp.name} da lista especial`}
            onClick={() => dispatch({ type: 'REMOVE_SPELL', playerId: player.id, uid: sp.uid })}
          />
        </>
      }
    />
  )
}

/*
 * Linha de magia: nome, custo/rank, abre para a descrição sob demanda.
 *
 * A linha é uma coluna — cabeçalho em cima, descrição embaixo — e o cabeçalho é
 * a única faixa em `row`. Enquanto o corpo era irmão do nome no mesmo
 * `flex-direction: row`, a descrição aberta entrava como terceira coluna e
 * espremia o nome até zero: a magia aberta ficava sem título.
 *
 * `antes`/`depois` são as bordas do cabeçalho (a caixa de "já usei", o × de
 * remover). Elas ficam aqui, e não numa linha por fora, porque uma linha por
 * fora voltaria a centralizar os dois controles no meio da descrição aberta.
 *
 * `chave` identifica a INSTÂNCIA aberta, não a magia. Enquanto era o nome, dois
 * Bullhorn preparados abriam e fechavam juntos — e a mesma magia no grimório e
 * no preparo abria nos dois lugares ao mesmo tempo.
 */
function SpellRow({
  chave = null,
  nome,
  rankTag = null,
  custo = null,
  aberto,
  setAberto,
  riscado = false,
  antes = null,
  depois = null,
}) {
  const id = chave ?? `spell-${nome}`
  const open = aberto === id

  return (
    <div className="magias__spellrow">
      <div className="magias__spellrow-head">
        {antes}
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
        {depois}
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
        <div className="entry__body magias__spellrow-body">
          <SpellBody nome={nome} />
        </div>
      ) : null}
    </div>
  )
}

/*
 * Escolher o que preparar num slot vazio: as entradas do grimório daquele
 * círculo, na mesma lista do Compêndio — dá para ler a magia antes de gastar o
 * slot com ela. Antes era só uma pilha de nomes, sem descrição nenhuma.
 *
 * A folha não fecha ao preparar: o círculo costuma ter mais de um slot vazio, e
 * fechar obrigaria a reabrir a lista para cada um.
 */
function PrepararSheet({ player, grimorio, custoDe, preparadas, rank, onClose }) {
  const { dispatch } = useStore()
  const opcoes = grimorio
    .filter((sp) => sp.rank === rank)
    .map((sp) => ({ name: sp.name, rank: sp.rank, actionCost: custoDe(sp.name) }))

  /* Preparar a mesma magia em dois slots é legítimo (é o que o mago faz com
     Magic Missile), então o + nunca desliga — `jaTem` fica falso de propósito,
     e o que informa é a contagem no cabeçalho da seção. */
  return (
    <SpellPicker
      title={`Preparar em ${rotuloRank(rank)}`}
      hint={`${preparadas} preparada(s) neste círculo. A mesma magia pode ocupar mais de um slot.`}
      spells={opcoes}
      onAdd={(sp) => dispatch({ type: 'PREPARE_SPELL', playerId: player.id, rank, name: sp.name })}
      vazio="Nenhuma magia deste círculo no grimório."
      onClose={onClose}
    />
  )
}

/*
 * A lista especial: magia que não gasta slot — de item, ritual, concessão do
 * mestre.
 *
 * Oferece a tradição inteira, sem filtro de círculo e sem o filtro de conteúdo
 * da mesa (por isso ela é mais longa que o Compêndio). É de propósito: o
 * pergaminho que caiu na mochila e a dádiva do mestre não pedem permissão nem
 * ao que o personagem sabe nem ao que a mesa comprou.
 */
function EspecialSheet({ player, conj, extras, onClose }) {
  const { dispatch } = useStore()
  const opcoes = useMemo(
    () =>
      SPELL_INDEX.filter((sp) => (sp.traditions ?? []).includes(conj.tradition))
        .map(paraPicker)
        .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name)),
    [conj.tradition],
  )

  const jaNaLista = new Set(extras.map((sp) => spellKey(sp.rank, sp.name)))

  return (
    <SpellPicker
      title="Adicionar à lista especial"
      hint="Lista livre, sem limite de slots. Use para magias de item, ritual ou concessão do mestre."
      spells={opcoes}
      jaTem={(sp) => jaNaLista.has(spellKey(sp.rank, sp.name))}
      onAdd={(sp) =>
        dispatch({ type: 'ADD_SPELL', playerId: player.id, name: sp.name, rank: sp.rank })
      }
      onClose={onClose}
    />
  )
}

/*
 * Magias de foco da classe do personagem.
 *
 * No corpus, magia de foco não tem tradição — ela é marcada pelo traço da
 * classe que a concede (`cleric`, `wizard`, `druid`). É por isso que ela nunca
 * apareceu no Compêndio, que filtra por tradição: as duas listas são disjuntas
 * de propósito, e esta precisa do próprio filtro.
 *
 * Sem `sheet.class` no export, a lista sai vazia e diz por quê — não se mostra
 * as 545 magias de foco do jogo na esperança de acertar.
 *
 * As duas seções saem daqui: `truque` diz qual delas está pedindo a lista. É por
 * este caminho que se ganha magia e truque de foco DEPOIS da importação, sem
 * voltar ao Pathbuilder — que é como a mesa usa o app.
 */
function FocoSheet({ player, sheet, foco, truque, onClose }) {
  const { dispatch } = useStore()
  const classe = String(sheet.class ?? '').toLowerCase()
  const rotulo = truque ? 'truque de foco' : 'magia de foco'

  /*
   * O que é magia de foco vem do campo `focus` do índice, que a ingestão tira da
   * PASTA `spells/focus/` do pack — não do traço `focus`.
   *
   * A diferença não é detalhe: das 545 magias daquela pasta, 52 não carregam o
   * traço, e 49 dessas são justamente os TRUQUES de foco (Courageous Anthem,
   * Imaginary Weapon, Buzzing Bites, Boost Eidolon). Filtrando pelo traço, esta
   * lista dizia que truque de foco não existe mais — e o jogador ficava sem
   * poder acrescentar um sem reimportar a ficha.
   *
   * Dentro da pasta, quem separa as duas seções é o rank: `rankEfetivo` sabe que
   * truque é rank 0, porque o pack guarda cantrip com o nível em que ele sobe.
   */
  const opcoes = useMemo(() => {
    if (!classe) return []
    return SPELL_INDEX.filter(
      (sp) =>
        sp.focus &&
        (sp.traits ?? []).includes(classe) &&
        (truque ? rankEfetivo(sp) === 0 : rankEfetivo(sp) > 0),
    )
      .map(paraPicker)
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
  }, [classe, truque])

  const jaTem = new Set(foco.map((sp) => sp.name))

  return (
    <SpellPicker
      title={`Adicionar ${rotulo}`}
      hint={
        classe
          ? truque
            ? `Truques de foco de ${sheet.class}. Truque de foco não gasta ponto da reserva — a lista dele não mexe nas bolinhas.`
            : `Magias de foco de ${sheet.class}. Gastar e recuperar foco continua nas bolinhas do cabeçalho.`
          : null
      }
      spells={opcoes}
      jaTem={(sp) => jaTem.has(sp.name)}
      onAdd={(sp) =>
        dispatch({ type: 'ADD_FOCUS_SPELL', playerId: player.id, name: sp.name, rank: sp.rank })
      }
      vazio={
        classe
          ? `Nenhum ${rotulo} de ${sheet.class} nos packs.`
          : 'A ficha importada não trouxe a classe — sem ela não dá para saber quais magias de foco oferecer.'
      }
      onClose={onClose}
    />
  )
}
