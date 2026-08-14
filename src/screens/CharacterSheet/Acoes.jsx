import { useEffect, useMemo, useState } from 'react'
import TraitList from '../../components/TraitList.jsx'
import { ChevronRight } from '../../components/Icons.jsx'
import SectionHead, { ExpandCollapseAll } from '../../components/SectionHead.jsx'
import ACTION_INDEX from '../../data/index.actions.json' with { type: 'json' }
import { traitLabel } from '../../data/traits.js'
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
 * Básicas e de perícia valem para TODO personagem, então viajam no bundle (84
 * verbetes, 13 KB) e a aba abre instantânea, offline. A descrição é que é
 * pesada, e ela chega do servidor quando a linha é aberta — uma consulta por
 * verbete, e só do que a pessoa abriu.
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

  /* As de classe são as que a importação resolveu como ação; as outras duas
     saem do índice do bundle. */
  const daClasse = player.sheet?.actions ?? []

  const todas = useMemo(
    () => [
      ...daClasse.map((acao) => ({ ...acao, group: 'class' })),
      ...ACTION_INDEX,
    ],
    [daClasse],
  )

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
      return agrupar(daAba, (acao) => acao.skill ?? SEM_PERICIA)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([pericia, itens]) => [`skill-${pericia}`, pericia, itens])
    }
    if (aba === 'fav') {
      return GRUPOS.map(({ id, titulo }) => [
        `fav-${id}`,
        titulo,
        daAba.filter((acao) => acao.group === id),
      ]).filter(([, , itens]) => itens.length > 0)
    }
    return []
  }, [aba, daAba])

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

/* Rótulo do balde de quem não trouxe perícia do pack. Some sozinho quando a
   ingestão é refeita — e enquanto não for, a ação continua na tela. */
const SEM_PERICIA = 'Outras'

const VAZIO = {
  fav: 'Nenhuma ação favoritada. Toque na estrela de uma ação para trazê-la para cá.',
  class: 'Nenhuma ação de classe nesta ficha.',
  skill: 'Nada aqui com esse filtro.',
  basic: 'Nada aqui com esse filtro.',
}

/** Agrupa mantendo a ordem de chegada dentro de cada balde. */
function agrupar(lista, chaveDe) {
  const mapa = new Map()
  for (const item of lista) {
    const chave = chaveDe(item)
    if (!mapa.has(chave)) mapa.set(chave, [])
    mapa.get(chave).push(item)
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
