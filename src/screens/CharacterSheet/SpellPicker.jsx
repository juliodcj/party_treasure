import { useEffect, useState } from 'react'
import Sheet from '../../components/Sheet.jsx'
import TraitList from '../../components/TraitList.jsx'
import { ChevronRight, MinusIcon, PlusIcon } from '../../components/Icons.jsx'
import { spellRef } from '../../lib/loreResolve.js'
import { defesaDaMagia } from '../../lib/spells.js'
import { ActionCost } from './Feats.jsx'

/*
 * A lista de escolher magia — uma só, para os quatro lugares que escolhem
 * magia: o Compêndio, o slot vazio ("Preparar"), a lista especial e as magias
 * de foco.
 *
 * Eram quatro telas com quatro comportamentos: uma abria a descrição numa
 * folha flutuante, outra era só o nome sem descrição nenhuma, outra era um
 * campo de texto para digitar o nome à mão. Quem aprende a lista num lugar
 * agora a conhece nos quatro: toca no nome para ler, toca no + para trazer.
 *
 * `+` traz para a lista de destino, `−` vermelho tira (vermelho porque tirar
 * não se desfaz sozinho — regra da casa). Quem decide se a magia já está lá é
 * quem chama, com `jaTem`.
 */
export default function SpellPicker({
  title,
  hint = null,
  spells,
  jaTem = () => false,
  onAdd,
  onRemove = null,
  vazio = 'Nenhuma magia aqui.',
  onClose,
  children = null,
}) {
  const [aberta, setAberta] = useState(null)

  /* `fill`: a folha para de rolar e quem rola é a lista. É o que mantém o
     título, os filtros e o "Fechar" parados enquanto se percorre setecentas
     magias — sem isso, o botão de sair fica no fim da rolagem. */
  return (
    <Sheet title={title} onClose={onClose} fill>
      {hint ? <p className="picker__hint">{hint}</p> : null}
      {children}

      <div className="picker__list">
        {spells.length === 0 ? (
          <div className="empty empty--inline">{vazio}</div>
        ) : (
          spells.map((sp) => {
            const chave = sp.id ?? `${sp.rank}\t${sp.name}`
            return (
              <SpellPickerRow
                key={chave}
                sp={sp}
                dentro={jaTem(sp)}
                onAdd={() => onAdd(sp)}
                onRemove={onRemove ? () => onRemove(sp) : null}
                open={aberta === chave}
                onToggle={() => setAberta(aberta === chave ? null : chave)}
              />
            )
          })
        )}
      </div>

      <button type="button" className="btn btn--neutral btn--block" onClick={onClose}>
        Fechar
      </button>
    </Sheet>
  )
}

function SpellPickerRow({ sp, dentro, onAdd, onRemove, open, onToggle }) {
  /* Sem `onRemove`, estar dentro é só um estado — o + desliga e diz por quê no
     rótulo. Com `onRemove`, o mesmo botão vira o − que desfaz. */
  const podeTirar = dentro && onRemove

  return (
    <div className="picker__entry">
      <div className="picker__head">
        <button type="button" className="picker__main" onClick={onToggle} aria-expanded={open}>
          <span className="picker__rank">{sp.rank === 0 ? 'Truque' : `R${sp.rank}`}</span>
          <span className="picker__name">{sp.name}</span>
          <ActionCost cost={sp.actionCost} />
        </button>
        <button
          type="button"
          className={`icon-btn ${podeTirar ? 'icon-btn--danger' : 'icon-btn--accent'}`}
          disabled={dentro && !onRemove}
          aria-label={
            podeTirar ? `Tirar ${sp.name}` : dentro ? `${sp.name} já está na lista` : `Adicionar ${sp.name}`
          }
          onClick={podeTirar ? onRemove : onAdd}
        >
          {dentro ? <MinusIcon size={14} /> : <PlusIcon size={14} />}
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--ghost"
          onClick={onToggle}
          aria-label={open ? 'Fechar' : 'Abrir'}
        >
          <ChevronRight open={open} />
        </button>
      </div>

      {open ? (
        <div className="entry__body picker__body">
          <SpellBody id={sp.id} nome={sp.name} />
        </div>
      ) : null}
    </div>
  )
}

/*
 * Traços e descrição de uma magia, sob demanda.
 *
 * Com `id` (veio do índice do compêndio) a busca é direta. Sem ele — o export
 * do Pathbuilder traz só o nome — o slug é adivinhado por `spellRef`, e quando
 * não bate, a magia aparece sem descrição, com o nome que veio: nunca some, e
 * nunca é inventada.
 */
const cache = new Map()

export function SpellBody({ id = null, nome }) {
  const ref = id ?? spellRef(nome)
  const [entry, setEntry] = useState(() => cache.get(ref) ?? null)
  const [erro, setErro] = useState(false)

  useEffect(() => {
    if (entry) return
    let vivo = true
    fetch(`/api/entry/${encodeURIComponent(ref)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((data) => {
        cache.set(ref, data)
        if (vivo) setEntry(data)
      })
      .catch(() => vivo && setErro(true))
    return () => {
      vivo = false
    }
  }, [ref, entry])

  if (erro) {
    return (
      <p className="item__desc item__desc--plain">
        Sem verbete nos packs com este nome — a descrição não veio.
      </p>
    )
  }
  if (!entry) return <p className="item__desc item__desc--plain">Carregando a descrição…</p>

  return (
    <>
      {entry.traits?.length ? <TraitList traits={entry.traits} /> : null}
      <SpellStats entry={entry} />
      <div className="item__desc" dangerouslySetInnerHTML={{ __html: entry.descriptionHtml }} />
      {/* O livro de origem fecha a descrição, no mesmo cinza e no mesmo lugar
          em que o item do Inventário mostra o dele. Só aparece quando o pack
          traz — nome de livro não se adivinha. */}
      {entry.source?.title ? <div className="item__source">{entry.source.title}</div> : null}
    </>
  )
}

/*
 * Range, Targets e Defense, acima da descrição.
 *
 * No Foundry esses três não estão no texto: são campos do sistema que a ficha
 * dele desenha por cima, e por isso a magia aberta aqui vinha sem eles.
 *
 * Rótulo em inglês porque é ficha técnica do PF2e, como `Damage` e `AC Bonus`
 * no Inventário. Linha que o pack não traz não aparece: 636 magias não têm
 * alcance e 991 não têm alvo — pôr "—" nelas seria encher a tela de nada.
 */
function SpellStats({ entry }) {
  const linhas = [
    ['Range', entry.range],
    ['Targets', entry.targets],
    ['Defense', defesaDaMagia(entry)],
  ].filter(([, valor]) => valor)

  if (!linhas.length) return null

  return (
    <dl className="spell-stats">
      {linhas.map(([rotulo, valor]) => (
        <div className="spell-stats__row" key={rotulo}>
          <dt className="field-label spell-stats__label">{rotulo}</dt>
          <dd className="spell-stats__value">{valor}</dd>
        </div>
      ))}
    </dl>
  )
}

