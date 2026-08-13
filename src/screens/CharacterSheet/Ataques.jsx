import { useState } from 'react'
import Stepper from '../../components/Stepper.jsx'
import TraitList from '../../components/TraitList.jsx'
import { ChevronRight } from '../../components/Icons.jsx'
import { useStore } from '../../state/store.jsx'
import { sgn } from '../../lib/sheet.js'
import { titleCase } from '../../lib/text.js'
import BreakdownSheet from './BreakdownSheet.jsx'
import ItemModsSheet from './ItemModsSheet.jsx'

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

  const favoritos = player.vitals?.favorites ?? {}
  const ehFavorito = (attack) => Boolean(favoritos[attack.id])

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
    <div className="charsheet__body">
      {/*
        A fase sugeria oferecer o modificador de Rage já preenchido na
        importação. Não foi feito, e de propósito: o número da Fúria muda com o
        instinto, com o nível e com a arma, então preenchê-lo seria o app
        chutando — justamente o que D6 e o princípio "onde o app não sabe, ele
        admite" existem para evitar. O que dá para fazer sem mentir é contar que
        o campo existe, que é o problema real: ninguém acha um botão que não
        sabe que procura.
      */}
      <p className="charsheet__note">
        O app soma atributo, proficiência e a arma. O que vem da sua classe —
        fúria, instinto, especialização — e o que vem de runa entram pelo
        <strong> Acrescentar modificador</strong>, com o rótulo que você escrever.
      </p>

      {favoritas.length > 0 ? (
        <Grupo titulo="Favoritos" ataques={favoritas} chave="fav" {...props} />
      ) : null}

      <Grupo titulo="Corpo a corpo" ataques={corpoACorpo} chave="melee" {...props} />

      {aDistancia.length > 0 ? (
        <Grupo titulo="À distância" ataques={aDistancia} chave="ranged" {...props} />
      ) : null}

      {breakdown ? <BreakdownSheet stat={breakdown} onClose={() => setBreakdown(null)} /> : null}
      {editando ? (
        <ItemModsSheet player={player} item={editando} onClose={() => setEditando(null)} />
      ) : null}
    </div>
  )
}

function Grupo({ titulo, ataques, chave, ...props }) {
  return (
    <section className="panel">
      <h3 className="label panel__title">
        <span>{titulo}</span>
        <span className="panel__count">{ataques.length}</span>
      </h3>
      <div className="atk">
        {ataques.map((attack) => (
          <Linha key={`${chave}-${attack.id}`} attack={attack} grupo={chave} {...props} />
        ))}
      </div>
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

  return (
    <div className="atk__row">
      {/*
        Duas linhas à esquerda, e não uma. Numa linha só, o nome da arma era a
        primeira coisa a ser espremida quando entrava o stepper de arremesso —
        "Javelin" virava reticências e sobrava o dano, que é o dado menos útil
        para achar a arma na lista.
      */}
      <div className="atk__head">
        <div className="atk__left">
          <button
            type="button"
            className="atk__name-btn"
            onClick={() => setAberto(open ? null : id)}
            aria-expanded={open}
          >
            <span className="atk__name">{attack.name}</span>
          </button>
          <div className="atk__under">
            <span className="atk__dmg">{dano(attack)}</span>
            {/* Arma de arremesso gasta munição: o stepper mexe no inventário de
                verdade, não num contador à parte que sairia do lugar. */}
            {attack.thrown && noInventario ? (
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
          </div>
        </div>

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
          ) : (
            <p className="charsheet__note">
              O Punho não está na mochila, então não tem modificador por item.
            </p>
          )}
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
