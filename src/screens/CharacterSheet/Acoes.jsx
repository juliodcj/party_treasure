import { useEffect, useMemo, useState } from 'react'
import TraitList from '../../components/TraitList.jsx'
import { ChevronRight } from '../../components/Icons.jsx'
import SectionHead, { ExpandCollapseAll } from '../../components/SectionHead.jsx'
import ACTION_INDEX from '../../data/index.actions.json' with { type: 'json' }
import { traitLabel } from '../../data/traits.js'
import { slugify } from '../../lib/loreResolve.js'
import { titleCase } from '../../lib/text.js'
import { useStore } from '../../state/store.jsx'
import { ActionCost } from './Feats.jsx'

/* Quais grupos ficam abertos — sobrevive à troca de sub-aba. */
let gruposAbertos = { class: true, skill: true, basic: true }

/*
 * A aba Ações.
 *
 * Três grupos, e eles não vêm de uma lista escrita por nós: vêm das pastas do
 * próprio pack `actions` do Foundry — `basic/`, `skill/` e `class/`. A Paizo já
 * organizou isso, e reorganizar por conta seria inventar.
 *
 * As 280 viajam no bundle (59 KB) e a aba abre instantânea, offline. A descrição
 * é que é pesada, e ela chega do servidor quando a linha é aberta — uma consulta
 * por verbete, e só do que a pessoa abriu.
 *
 * As de classe entraram no bundle depois. A aposta original era que elas
 * chegariam pela importação, porque o personagem tem a feature que as concede;
 * medido na mesa, não chegam — o Pathbuilder manda "Rage" e o desempate de nome
 * resolve para a FEATURE de classe, nunca para a ação homônima. A aba ficava
 * vazia para todo mundo. Agora a lista é a da classe da ficha, e o que a
 * importação resolveu continua entrando por cima, com a descrição que já trouxe.
 */

const GRUPOS = [
  { id: 'class', titulo: 'Classe' },
  { id: 'skill', titulo: 'Perícia' },
  { id: 'basic', titulo: 'Básicas' },
]

/* As abas do topo. "Favoritas" não é um grupo do pack: é o que a pessoa marcou
   com a estrela, e por isso vem primeiro — é a lista que ela abre no meio do
   turno. As outras três são as pastas da Paizo, uma de cada vez. */
const ABAS = [
  { id: 'fav', titulo: 'Favoritas' },
  { id: 'class', titulo: 'Classe' },
  { id: 'skill', titulo: 'Perícia' },
  { id: 'basic', titulo: 'Básicas' },
]

/* Aba escolhida — sobrevive à troca de sub-aba, como os grupos abertos. */
let abaAtual = 'fav'

export default function Acoes({ player }) {
  const [aberto, setAberto] = useState(null)
  const [traco, setTraco] = useState('')
  const [aba, setAbaState] = useState(abaAtual)
  const [grupos, setGrupos] = useState(gruposAbertos)

  const setAba = (id) => setAbaState((abaAtual = id))

  const setGrupo = (id, value) => {
    setGrupos((atual) => {
      gruposAbertos = { ...atual, [id]: value }
      return gruposAbertos
    })
  }

  const todas = useMemo(() => acoesDoPersonagem(player.sheet), [player.sheet])

  /* O filtro só oferece traço que existe na lista — um menu com 200 traços em
     que 190 não filtram nada é pior que não ter filtro. */
  const tracos = useMemo(() => {
    const vistos = new Set()
    for (const acao of todas) for (const t of acao.traits ?? []) vistos.add(t)
    return [...vistos].sort((a, b) => traitLabel(a).localeCompare(traitLabel(b)))
  }, [todas])

  const filtradas = traco ? todas.filter((acao) => (acao.traits ?? []).includes(traco)) : todas

  const favoritas = player.vitals?.favorites ?? {}
  const daAba =
    aba === 'fav'
      ? filtradas.filter((acao) => favoritas[acao.id])
      : filtradas.filter((acao) => acao.group === aba)

  /*
   * As seções da aba escolhida, como `[chave, título, itens]`.
   *
   * Perícia se divide pela perícia, que vem do pack (o segundo nível de pasta
   * em `actions/skill/`); quando ela não veio — ingestão não refeita — a ação
   * cai num balde só, com o nome que tem, em vez de sumir da tela.
   *
   * Favoritas se divide pela categoria de origem, na ordem das abas: a lista é
   * curta e misturada, e sem a faixa não dá para saber se "Escapar" veio de
   * perícia ou da classe.
   *
   * Classe e Básicas já são uma categoria só — não ganham faixa nenhuma.
   */
  const secoes = useMemo(() => {
    if (aba === 'skill') {
      /* Uma ação cabe em mais de uma perícia, e o pack diz quais: Decipher
         Writing rola com Society, Arcana, Occultism ou Religion, e aparece
         embaixo das quatro. A pergunta que a aba responde é "estou com Society
         na mão, o que dá para fazer?". */
      return agrupar(daAba, (acao) => (acao.skills?.length ? acao.skills : [SEM_PERICIA]))
        .sort(([a], [b]) => (a === SEM_PERICIA) - (b === SEM_PERICIA) || a.localeCompare(b))
        /* O pack grava a perícia em minúscula (`athletics`); o que a ficha
           mostra é o nome publicado, como no resto do app. */
        .map(([pericia, itens]) => [
          `skill-${pericia}`,
          pericia === SEM_PERICIA ? pericia : titleCase(pericia),
          itens,
        ])
    }
    if (aba === 'class') {
      return agrupar(daAba, (acao) => [tituloDeClasse(acao, player.sheet)])
        .sort(([a], [b]) => ORDEM_CLASSE(a) - ORDEM_CLASSE(b) || a.localeCompare(b))
        .map(([titulo, itens]) => [`class-${titulo}`, titulo, itens])
    }
    if (aba === 'fav') {
      return GRUPOS.map(({ id, titulo }) => [
        `fav-${id}`,
        titulo,
        daAba.filter((acao) => acao.group === id),
      ]).filter(([, , itens]) => itens.length > 0)
    }
    return []
  }, [aba, daAba, player.sheet])

  return (
    <>
      <div className="seg acoes__abas" role="tablist" aria-label="Grupos de ação">
        {ABAS.map(({ id, titulo }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={aba === id}
            className={`seg__tab${aba === id ? ' seg__tab--on' : ''}`}
            onClick={() => setAba(id)}
          >
            {titulo}
          </button>
        ))}
      </div>

      <label className="acoes__filtro">
        <span className="field-label">Traço</span>
        <select
          className="input"
          value={traco}
          onChange={(event) => setTraco(event.target.value)}
          aria-label="Filtrar ações por traço"
        >
          <option value="">Todos os traços</option>
          {tracos.map((t) => (
            <option key={t} value={t}>
              {traitLabel(t)}
            </option>
          ))}
        </select>
      </label>

      {/* Só faz sentido onde há faixa para abrir e fechar. */}
      {secoes.length > 0 ? (
        <ExpandCollapseAll
          onExpand={() => setGrupos((gruposAbertos = abrirTodas(secoes, true)))}
          onCollapse={() => setGrupos((gruposAbertos = abrirTodas(secoes, false)))}
        />
      ) : null}

      {daAba.length === 0 ? <div className="empty">{VAZIO[aba]}</div> : null}

      {secoes.length > 0
        ? secoes.map(([chave, titulo, itens]) => {
            const open = grupos[chave] ?? true
            return (
              <section className="list-group" key={chave}>
                <SectionHead
                  title={titulo}
                  count={itens.length}
                  open={open}
                  onToggle={() => setGrupo(chave, !open)}
                />
                {open ? (
                  <div className="list-rows entries">
                    {itens.map((acao) => (
                      <Linha key={acao.id} acao={acao} player={player} aberto={aberto} setAberto={setAberto} />
                    ))}
                  </div>
                ) : null}
              </section>
            )
          })
        : daAba.length > 0 && (
            <section className="list-group">
              <div className="list-rows entries">
                {daAba.map((acao) => (
                  <Linha key={acao.id} acao={acao} player={player} aberto={aberto} setAberto={setAberto} />
                ))}
              </div>
            </section>
          )}
    </>
  )
}

/*
 * O balde das dez ações de perícia que fonte nenhuma do Foundry classifica —
 * Treat Wounds, Earn Income, Recall Knowledge, Learn a Spell e companhia. Não é
 * defeito da ingestão: o pack não diz, e a ingestão se recusa a chutar. Elas
 * continuam na tela, com o nome que têm, e o rótulo não promete o que não sabe.
 */
const SEM_PERICIA = 'Sem perícia no pack'

/* A faixa das que várias classes ganham (`actions/class/shared/` da Paizo, hoje
   só a Reactive Strike): entram na aba de todo mundo, mas debaixo de um título
   que não finge que são da classe de quem está olhando. */
const COMUNS = 'Comuns a várias classes'
/* E a das que a importação trouxe e o pack não põe na pasta da classe — ação
   concedida por arquétipo, por exemplo. */
const DA_FICHA = 'Da sua ficha'

/* A classe da pessoa primeiro; os dois baldes genéricos por último. */
const ORDEM_CLASSE = (titulo) => ([COMUNS, DA_FICHA].indexOf(titulo) + 1 || -1)

const tituloDeClasse = (acao, sheet) => {
  if (!acao.class) return DA_FICHA
  if (acao.class === 'shared') return COMUNS
  return nomeDaClasse(acao.class, sheet)
}

/** "fighter" -> "Fighter", preferindo como a ficha escreve ("Barbarian"). */
function nomeDaClasse(slug, sheet) {
  for (const nome of [sheet?.class, sheet?.dualClass]) {
    if (nome && slugify(nome) === slug) return nome
  }
  return titleCase(slug)
}

/**
 * As ações que esta ficha mostra: as básicas e de perícia (que valem para todo
 * personagem), as da classe dela, e o que a importação resolveu como ação.
 *
 * O que a importação trouxe ganha do verbete do pack quando é a mesma ação —
 * ele já vem com a descrição dentro, e uma consulta a menos ao servidor é uma
 * linha que abre na hora. Mas a classe continua sendo a do pack: a importação
 * não sabe de que pasta a ação veio.
 */
export function acoesDoPersonagem(sheet) {
  const minhas = new Set([sheet?.class, sheet?.dualClass].filter(Boolean).map(slugify))

  const doPack = ACTION_INDEX.filter(
    (acao) => acao.group !== 'class' || minhas.has(acao.class) || acao.class === 'shared',
  )

  /* Sem ficha não há classe para filtrar, e a aba Classe fica vazia — é o mesmo
     que já acontecia, e é honesto: sem ficha o app não sabe a classe. */
  const porId = new Map(doPack.map((acao) => [acao.id, acao]))
  for (const acao of sheet?.actions ?? []) {
    const doPacote = porId.get(acao.id)
    porId.set(acao.id, { ...doPacote, ...acao, group: 'class', class: doPacote?.class ?? null })
  }
  return [...porId.values()]
}

const VAZIO = {
  fav: 'Nenhuma ação favoritada. Toque na estrela de uma ação para trazê-la para cá.',
  class: 'Nenhuma ação de classe nesta ficha.',
  skill: 'Nada aqui com esse filtro.',
  basic: 'Nada aqui com esse filtro.',
}

/**
 * Agrupa mantendo a ordem de chegada dentro de cada balde. `chaveDe` devolve uma
 * LISTA: uma ação que rola com quatro perícias aparece embaixo das quatro.
 */
function agrupar(lista, chavesDe) {
  const mapa = new Map()
  for (const item of lista) {
    for (const chave of chavesDe(item)) {
      if (!mapa.has(chave)) mapa.set(chave, [])
      mapa.get(chave).push(item)
    }
  }
  return [...mapa]
}

const abrirTodas = (secoes, valor) =>
  Object.fromEntries(secoes.map(([chave]) => [chave, valor]))

function Linha({ acao, player, aberto, setAberto }) {
  const { dispatch } = useStore()
  const open = aberto === acao.id
  const favorito = Boolean(player.vitals?.favorites?.[acao.id])
  const descricao = useDescricao(acao, open)

  return (
    <div className="entry">
      <div className="entry__head">
        <button
          type="button"
          className="entry__main"
          onClick={() => setAberto(open ? null : acao.id)}
          aria-expanded={open}
        >
          <span className="entry__title">
            <span className="entry__name">{acao.name}</span>
            <ActionCost cost={acao.actionCost} />
          </span>
          <span className="entry__sub">
            {(acao.traits ?? []).slice(0, 3).map(traitLabel).join(' · ') || '—'}
          </span>
        </button>

        <button
          type="button"
          className={`atk__star${favorito ? ' atk__star--on' : ''}`}
          aria-pressed={favorito}
          aria-label={`${favorito ? 'Tirar' : 'Marcar'} ${acao.name} dos favoritos`}
          onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', playerId: player.id, key: acao.id })}
        >
          ★
        </button>

        <button
          type="button"
          className="icon-btn icon-btn--ghost"
          onClick={() => setAberto(open ? null : acao.id)}
          aria-label={open ? 'Fechar' : 'Abrir'}
        >
          <ChevronRight open={open} />
        </button>
      </div>

      {open ? (
        <div className="entry__body">
          <TraitList traits={acao.traits} />
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

/**
 * A descrição de uma ação.
 *
 * Se ela veio junto (as de classe chegam resolvidas na importação), usa a que
 * tem. Se não, pede ao servidor quando a linha abre — e uma vez só, porque o
 * resultado fica guardado no módulo enquanto o app estiver aberto.
 */
const cache = new Map()

function useDescricao(acao, open) {
  const [estado, setEstado] = useState(() => ({
    html: acao.descriptionHtml ?? cache.get(acao.id) ?? null,
    aviso: 'Carregando a descrição…',
  }))

  useEffect(() => {
    if (!open || estado.html) return
    let vivo = true
    fetch(`/api/entry/${encodeURIComponent(acao.id)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((entry) => {
        cache.set(acao.id, entry.descriptionHtml)
        if (vivo) setEstado({ html: entry.descriptionHtml, aviso: '' })
      })
      .catch(() => {
        /* Servidor fora do ar ou sem a ingestão: a linha continua na lista com
           o nome e os traços, e diz por que o texto não veio. */
        if (vivo) {
          setEstado({
            html: null,
            aviso: 'Não consegui buscar a descrição no servidor. O nome e os traços continuam valendo.',
          })
        }
      })
    return () => {
      vivo = false
    }
  }, [open, acao.id, estado.html])

  return estado
}
