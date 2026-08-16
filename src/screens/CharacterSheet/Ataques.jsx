import { useState } from 'react'
import Stepper from '../../components/Stepper.jsx'
import TraitList from '../../components/TraitList.jsx'
import { ChevronRight, StarIcon, SwordIcon } from '../../components/Icons.jsx'
import SectionHead, { ExpandCollapseAll } from '../../components/SectionHead.jsx'
import { useStore } from '../../state/store.jsx'
import { sgn } from '../../lib/sheet.js'
import { titleCase } from '../../lib/text.js'
import BreakdownSheet from './BreakdownSheet.jsx'
import ItemModsSheet from './ItemModsSheet.jsx'
import { ActionCost } from './Feats.jsx'
import { ehMagiaDeAtaque, ehMagiaDeSalvamento, spellDoIndice } from '../../lib/spells.js'
import { spellAttackKey } from './Magias.jsx'
import { SpellBody } from './SpellPicker.jsx'

/* Quais grupos ficam abertos — mora fora do componente pelo mesmo motivo do
   Mestre (GmScreen.jsx): a aba desmonta ao trocar de sub-aba na ficha, e
   guardar só em useState faria a seção reabrir sozinha a cada volta. */
let gruposAbertos = { fav: true, melee: true, ranged: true, magias: true }

/*
 * A aba Ataques.
 *
 * A lista sai do INVENTÁRIO, nunca do `weapons` do Pathbuilder (D2, D5). É o que
 * faz a ficha ficar viva: vendeu a espada na Loja, ela some daqui na hora, sem
 * reimportar nada. E é por isso que a ficha recém-importada nasce com só o
 * Punho — nenhum item veio junto.
 *
 * O Punho está sempre presente, mesmo com a mochila vazia: ele não é item, e o
 * motor o injeta a partir do `unarmed.json` extraído do código do Foundry.
 */

const ABREV_DANO = { bludgeoning: 'B', piercing: 'P', slashing: 'S' }

const dano = (attack) => {
  const abrev = ABREV_DANO[attack.damage.damageType] ?? titleCase(attack.damage.damageType ?? '')
  return `${attack.damage.formula}${abrev ? ` ${abrev}` : ''}`
}

export default function Ataques({ player, view }) {
  const [aberto, setAberto] = useState(null)
  const [breakdown, setBreakdown] = useState(null)
  const [editando, setEditando] = useState(null)
  const [grupos, setGrupos] = useState(gruposAbertos)

  const setGrupo = (id, value) => {
    setGrupos((atual) => {
      gruposAbertos = { ...atual, [id]: value }
      return gruposAbertos
    })
  }

  const favoritos = player.vitals?.favorites ?? {}
  const ehFavorito = (attack) => Boolean(favoritos[attack.id])

  /*
   * As magias que o jogador marcou com a espada na aba Magias. Uma entrada por
   * NOME, e não por slot: Fireball preparado em dois slots é um ataque só aqui.
   *
   * O que a ficha sabe de uma magia é o bônus de ataque e a DC da conjuração —
   * dano de magia varia com a descrição e o rank de lançamento, e o motor não
   * lê isso. Então a linha mostra o que dá para garantir e a descrição, em vez
   * de inventar uma fórmula de dano (§"onde o app não sabe, ele admite").
   */
  const custos = player.sheet?.spellcasting?.spellCosts ?? {}
  const magias = [...(player.vitals?.preparedSpells ?? []), ...(player.vitals?.extraSpells ?? [])]
    .filter((sp) => favoritos[spellAttackKey(sp.name)])
    .filter((sp, i, todas) => todas.findIndex((outra) => outra.name === sp.name) === i)
    .sort((a, b) => a.name.localeCompare(b.name))

  /* Três listas, e um ataque pode estar em duas: o favorito continua no grupo
     dele, para a pessoa não perder a referência de onde ele mora. */
  const favoritas = view.attacks.filter(ehFavorito)
  const corpoACorpo = view.attacks.filter((a) => !a.ranged)
  const aDistancia = view.attacks.filter((a) => a.ranged)

  const props = {
    player,
    aberto,
    setAberto,
    onBreakdown: setBreakdown,
    onEditarMods: setEditando,
    ehFavorito,
  }

  return (
    <>
      <ExpandCollapseAll
        onExpand={() => setGrupos((gruposAbertos = { fav: true, melee: true, ranged: true }))}
        onCollapse={() => setGrupos((gruposAbertos = { fav: false, melee: false, ranged: false }))}
      />

      {favoritas.length > 0 ? (
        <Grupo
          titulo="Favoritos"
          ataques={favoritas}
          chave="fav"
          open={grupos.fav}
          onToggle={() => setGrupo('fav', !grupos.fav)}
          {...props}
        />
      ) : null}

      <Grupo
        titulo="Corpo a corpo"
        ataques={corpoACorpo}
        chave="melee"
        open={grupos.melee}
        onToggle={() => setGrupo('melee', !grupos.melee)}
        {...props}
      />

      {aDistancia.length > 0 ? (
        <Grupo
          titulo="À distância"
          ataques={aDistancia}
          chave="ranged"
          open={grupos.ranged}
          onToggle={() => setGrupo('ranged', !grupos.ranged)}
          {...props}
        />
      ) : null}

      {magias.length > 0 ? (
        <section className="list-group">
          <SectionHead
            title="Magias"
            count={magias.length}
            open={grupos.magias}
            onToggle={() => setGrupo('magias', !grupos.magias)}
          />
          {grupos.magias ? (
            <div className="list-rows">
              {magias.map((sp) => (
                <MagiaLinha
                  key={sp.uid}
                  sp={sp}
                  custo={custos[sp.name]}
                  player={player}
                  view={view}
                  aberto={aberto}
                  setAberto={setAberto}
                  onBreakdown={setBreakdown}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}

      {breakdown ? <BreakdownSheet stat={breakdown} onClose={() => setBreakdown(null)} /> : null}
      {editando ? (
        <ItemModsSheet player={player} item={editando} onClose={() => setEditando(null)} />
      ) : null}
    </>
  )
}

function Grupo({ titulo, ataques, chave, open, onToggle, ...props }) {
  return (
    <section className="list-group">
      <SectionHead title={titulo} count={ataques.length} open={open} onToggle={onToggle} />
      {open ? (
        <div className="list-rows atk">
          {ataques.map((attack) => (
            <Linha key={`${chave}-${attack.id}`} attack={attack} grupo={chave} {...props} />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function Linha({ attack, grupo, player, aberto, setAberto, onBreakdown, onEditarMods, ehFavorito }) {
  const { dispatch } = useStore()
  const id = `${grupo}-${attack.id}`
  const open = aberto === id
  const favorito = ehFavorito(attack)

  /* O Punho não está na mochila, então não tem favorito nem modificador ligado
     a um item de verdade — mas tem id próprio, e isso basta para as duas coisas
     funcionarem igual. */
  const noInventario = attack.id !== 'unarmed-strike'
  const comStepper = Boolean(attack.thrown && noInventario)

  return (
    <div className="atk__row">
      {/*
        Uma linha só: nome e dano na mesma base, como no protótipo. Quem cede
        espaço muda conforme a linha — com o stepper de arremesso no meio, o
        nome fica inteiro e o DANO é que corta, porque "Javelin" é o que se
        procura na lista e "1d6+4 P" ainda se adivinha pela metade.
      */}
      <div className="atk__head">
        <button
          type="button"
          className={`atk__main${comStepper ? ' atk__main--aperta-dano' : ''}`}
          onClick={() => setAberto(open ? null : id)}
          aria-expanded={open}
        >
          <span className="atk__name">{attack.name}</span>
          <span className="atk__dmg">{dano(attack)}</span>
        </button>

        {/* Arma de arremesso gasta munição: o stepper mexe no inventário de
            verdade, não num contador à parte que sairia do lugar. */}
        {comStepper ? (
          <Stepper
            value={attack.qty}
            label={attack.name}
            canDec={attack.qty > 0}
            onDec={() =>
              dispatch({ type: 'CHANGE_ITEM_QTY', playerId: player.id, itemId: attack.id, delta: -1 })
            }
            onInc={() =>
              dispatch({ type: 'CHANGE_ITEM_QTY', playerId: player.id, itemId: attack.id, delta: 1 })
            }
          />
        ) : null}

        {/* Os três números do MAP, juntos: é o que se lê no meio do turno. */}
        <button
          type="button"
          className={`atk__mods${attack.attack.altered ? ' atk__mods--altered' : ''}`}
          onClick={() => onBreakdown(attack.attack)}
          aria-label={`Ataque de ${attack.name}`}
        >
          {sgn(attack.attack.total)}
          <span className="atk__sep"> / </span>
          {sgn(attack.map.second)}
          <span className="atk__sep"> / </span>
          {sgn(attack.map.third)}
        </button>

        <button
          type="button"
          className={`atk__star${favorito ? ' atk__star--on' : ''}`}
          aria-pressed={favorito}
          aria-label={`${favorito ? 'Tirar' : 'Marcar'} ${attack.name} dos favoritos`}
          onClick={() => dispatch({ type: 'TOGGLE_FAVORITE', playerId: player.id, key: attack.id })}
        >
          <StarIcon filled={favorito} />
        </button>
      </div>

      {open ? (
        <div className="atk__body">
          <TraitList traits={attack.traits} />

          <dl className="stat-table">
            <Celula rotulo="Attack" valor={sgn(attack.attack.total)} onClick={() => onBreakdown(attack.attack)} />
            <Celula rotulo="Damage" valor={dano(attack)} onClick={() => onBreakdown(attack.damage.bonus)} />
            <Celula rotulo="Category" valor={titleCase(attack.weapon.category ?? '')} />
            <Celula rotulo="Hands" valor={attack.weapon.hands} />
            <Celula rotulo="Type" valor={attack.ranged ? 'Ranged' : 'Melee'} />
            {attack.ranged && attack.weapon.range ? (
              <Celula rotulo="Range" valor={`${attack.weapon.range} ft`} />
            ) : null}
            <Celula rotulo="2º / 3º ataque" valor={`${sgn(attack.map.second)} / ${sgn(attack.map.third)}`} />
            {noInventario ? <Celula rotulo="Quantidade" valor={attack.qty} /> : null}
          </dl>

          {/* Sem o item na mochila não há o que modificar (é o caso do Punho):
              o botão simplesmente não existe. */}
          {noInventario ? (
            <button
              type="button"
              className="btn btn--tint btn--block"
              onClick={() => onEditarMods({ id: attack.id, name: attack.name })}
            >
              {(player.itemMods?.[attack.id] ?? []).length
                ? `Modificadores (${player.itemMods[attack.id].length})`
                : 'Acrescentar modificador'}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/*
 * Qual número a magia mostra na aba Ataques: a DC ou o bônus de ataque.
 *
 * Quem joga contra salvamento não faz rolagem de ataque — mostrar "+7" ao lado
 * de Fireball é oferecer um número que ninguém vai rolar. E o contrário vale
 * para a magia de ataque, que não tem DC para o alvo resistir.
 *
 * Sem os dois sinais (Shield, buff, utilidade) o app não sabe, e mostra os dois
 * em vez de escolher errado. Magia que o índice não conhece — nome de mesa,
 * homebrew — cai no mesmo "não sei".
 */
function numerosDaMagia(nome) {
  const doIndice = spellDoIndice(nome)
  if (!doIndice) return { ataque: true, dc: true }
  if (ehMagiaDeAtaque(doIndice)) return { ataque: true, dc: false }
  if (ehMagiaDeSalvamento(doIndice)) return { ataque: false, dc: true }
  return { ataque: true, dc: true }
}

/*
 * Uma magia marcada com a espada, aqui na aba Ataques.
 *
 * Reaproveita a linha de magia da aba Magias — mesma altura, mesmo jeito de
 * abrir a descrição —, com os dois números da conjuração ao lado do nome e a
 * espada que a tira daqui. É a mesma espada da outra aba: desligar aqui
 * desliga lá, porque é a mesma marca.
 */
function MagiaLinha({ sp, custo, player, view, aberto, setAberto, onBreakdown }) {
  const { dispatch } = useStore()
  const id = `magia-${sp.uid}`
  const open = aberto === id
  const mostra = numerosDaMagia(sp.name)

  return (
    <div className="magias__spellrow">
      <div className="magias__spellrow-head">
        <button
          type="button"
          className="entry__main"
          onClick={() => setAberto(open ? null : id)}
          aria-expanded={open}
        >
          <span className="entry__title">
            <span className="entry__name">{sp.name}</span>
            <ActionCost cost={custo} />
          </span>
        </button>

        {mostra.ataque && view.spellAttack ? (
          <button
            type="button"
            className="atk__mods"
            onClick={() => onBreakdown(view.spellAttack)}
            aria-label={`Ataque de magia de ${sp.name}`}
          >
            {sgn(view.spellAttack.total)}
          </button>
        ) : null}
        {mostra.dc && view.spellDc ? (
          <button
            type="button"
            className="atk__mods"
            onClick={() => onBreakdown(view.spellDc)}
            aria-label={`DC de magia de ${sp.name}`}
          >
            DC {view.spellDc.total}
          </button>
        ) : null}

        <button
          type="button"
          className="icon-btn magias__espada magias__espada--on"
          aria-pressed
          aria-label={`Tirar ${sp.name} da aba Ataques`}
          onClick={() =>
            dispatch({ type: 'TOGGLE_FAVORITE', playerId: player.id, key: spellAttackKey(sp.name) })
          }
        >
          <SwordIcon />
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
        <div className="entry__body magias__spellrow-body">
          <SpellBody nome={sp.name} />
        </div>
      ) : null}
    </div>
  )
}

function Celula({ rotulo, valor, onClick = null }) {
  if (valor == null || valor === '') return null
  return (
    <div className="stat-table__cell">
      <dt className="field-label stat-table__label">{rotulo}</dt>
      <dd className="stat-table__value">
        {onClick ? (
          <button type="button" className="link" onClick={onClick}>
            {valor}
          </button>
        ) : (
          valor
        )}
      </dd>
    </div>
  )
}
