import { useState } from 'react'
import { SheetActions } from './Sheet.jsx'
import { CATEGORIES } from '../data/catalog.js'
import { fromCopper, toCopper } from '../lib/money.js'

/** Formulário de item manual: o item avulso da mochila e o item de campanha. */
export default function ItemForm({ item = null, onSubmit, onCancel, submitLabel = 'Salvar' }) {
  const seedPrice = fromCopper(item?.priceCp ?? 0)
  const [name, setName] = useState(item?.name ?? '')
  const [level, setLevel] = useState(item ? String(item.level ?? 0) : '')
  const [category, setCategory] = useState(item?.category ?? 'equipment')
  const [bulk, setBulk] = useState(item?.bulk != null ? String(item.bulk) : '')
  const [traits, setTraits] = useState((item?.traits ?? []).join(', '))
  const [description, setDescription] = useState(item?.description ?? '')
  const [gold, setGold] = useState(seedPrice.gold ? String(seedPrice.gold) : '')
  const [silver, setSilver] = useState(seedPrice.silver ? String(seedPrice.silver) : '')
  const [copper, setCopper] = useState(seedPrice.copper ? String(seedPrice.copper) : '')

  /* Ficha técnica (D13). Item feito à mão é justamente o que o catálogo não
     cobre — homebrew, item de campanha —, e sem estes campos ele nunca entra
     na CA nem vira ataque na ficha. Todos opcionais: item sem eles continua
     válido e só não aparece nos cálculos. */
  const [tec, setTec] = useState(() => ({
    // arma
    weaponCategory: item?.weapon?.category ?? 'simple',
    group: item?.weapon?.group ?? '',
    hands: item?.weapon?.hands != null ? String(item.weapon.hands) : '',
    dice: item?.weapon?.damage?.dice != null ? String(item.weapon.damage.dice) : '1',
    die: item?.weapon?.damage?.die ?? 'd6',
    damageType: item?.weapon?.damage?.damageType ?? 'bludgeoning',
    ranged: Boolean(item?.weapon?.ranged),
    range: item?.weapon?.range != null ? String(item.weapon.range) : '',
    reload: item?.weapon?.reload ?? '',
    // armadura
    armorCategory: item?.armor?.category ?? 'light',
    acBonus: item?.armor?.acBonus != null ? String(item.armor.acBonus) : '',
    dexCap: item?.armor?.dexCap != null ? String(item.armor.dexCap) : '',
    checkPenalty: item?.armor?.checkPenalty != null ? String(item.armor.checkPenalty) : '',
    speedPenalty: item?.armor?.speedPenalty != null ? String(item.armor.speedPenalty) : '',
    strength: item?.armor?.strength != null ? String(item.armor.strength) : '',
    // escudo
    shieldAc: item?.shield?.acBonus != null ? String(item.shield.acBonus) : '',
    hardness: item?.shield?.hardness != null ? String(item.shield.hardness) : '',
    hpMax: item?.shield?.hpMax != null ? String(item.shield.hpMax) : '',
  }))
  const set = (campo) => (valor) => setTec((atual) => ({ ...atual, [campo]: valor }))
  const numero = (valor) => (String(valor).trim() === '' ? null : Number(valor) || 0)

  const submit = () => {
    if (!name.trim()) return
    onSubmit({
      ...(item?.id ? { id: item.id } : {}),
      name: name.trim(),
      level: Number.parseInt(level, 10) || 0,
      category,
      priceCp: toCopper({
        gold: Number.parseInt(gold, 10) || 0,
        silver: Number.parseInt(silver, 10) || 0,
        copper: Number.parseInt(copper, 10) || 0,
      }),
      bulk: bulk.trim(),
      traits: traits
        .split(',')
        .map((trait) => trait.trim().toLowerCase())
        .filter(Boolean),
      description: description.trim(),
      ...fichaTecnica(category, tec, numero),
    })
  }

  return (
    <>
      <div className="form">
        <input
          className="input"
          placeholder="Nome do item"
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label="Nome do item"
        />

        <div className="form__row">
          <input
            className="input"
            type="number"
            inputMode="numeric"
            placeholder="Nível"
            value={level}
            onChange={(event) => setLevel(event.target.value)}
            aria-label="Nível"
          />
          <input
            className="input"
            placeholder="Bulk"
            value={bulk}
            onChange={(event) => setBulk(event.target.value)}
            aria-label="Bulk"
          />
        </div>

        <select
          className="input"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          aria-label="Tipo"
        >
          {Object.entries(CATEGORIES).map(([id, meta]) => (
            <option key={id} value={id}>
              {meta.label}
            </option>
          ))}
        </select>

        <input
          className="input"
          placeholder="Traços (separados por vírgula)"
          value={traits}
          onChange={(event) => setTraits(event.target.value)}
          aria-label="Traços"
        />

        <textarea
          className="textarea"
          placeholder="Descrição"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-label="Descrição"
        />

        <TechFields category={category} tec={tec} set={set} />

        <div>
          <div className="field-label">Valor</div>
          <CoinInputs
            gold={gold}
            silver={silver}
            copper={copper}
            onGold={setGold}
            onSilver={setSilver}
            onCopper={setCopper}
          />
        </div>
      </div>

      <SheetActions
        onCancel={onCancel}
        onConfirm={submit}
        confirmLabel={submitLabel}
        disabled={!name.trim()}
      />
    </>
  )
}

/** Três campos numéricos, cada um com o pontinho da sua denominação. */
export function CoinInputs({ gold, silver, copper, onGold, onSilver, onCopper, small = false }) {
  const fields = [
    ['gold', 'Ouro', gold, onGold],
    ['silver', 'Prata', silver, onSilver],
    ['copper', 'Cobre', copper, onCopper],
  ]
  return (
    <div className="coin-fields">
      {fields.map(([coin, label, value, onChange]) => (
        <div className="coin-field" key={coin}>
          <input
            className={`input${small ? ' input--sm' : ''}`}
            type="number"
            inputMode="numeric"
            min="0"
            placeholder="0"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            aria-label={label}
          />
          <span className={`coin-dot coin-dot--${coin}`} />
        </div>
      ))}
    </div>
  )
}

/* ------------------------------------------------------ ficha técnica (D13) */

/**
 * Monta os sub-objetos `weapon`, `armor` e `shield` que `normalizeItem` já
 * preserva e que o motor lê. Só o do tipo escolhido é gravado — trocar de Arma
 * para Armadura não deixa a arma antiga pendurada no item.
 */
function fichaTecnica(category, tec, numero) {
  if (category === 'weapon') {
    return {
      weapon: {
        category: tec.weaponCategory,
        group: tec.group.trim() || null,
        hands: numero(tec.hands),
        ranged: tec.ranged,
        range: tec.ranged ? numero(tec.range) : null,
        reload: tec.ranged ? tec.reload.trim() || null : null,
        damage: {
          dice: Math.max(1, numero(tec.dice) ?? 1),
          die: tec.die,
          damageType: tec.damageType,
        },
      },
    }
  }
  if (category === 'armor') {
    return {
      armor: {
        category: tec.armorCategory,
        group: null,
        acBonus: numero(tec.acBonus),
        dexCap: numero(tec.dexCap),
        checkPenalty: numero(tec.checkPenalty),
        speedPenalty: numero(tec.speedPenalty),
        strength: numero(tec.strength),
      },
    }
  }
  if (category === 'shield') {
    const hpMax = numero(tec.hpMax) ?? 0
    return {
      shield: {
        acBonus: numero(tec.shieldAc),
        hardness: numero(tec.hardness) ?? 0,
        hpMax,
        /* O Limiar de Avaria não se digita: é metade dos PV, arredondando para
           baixo. Deixar campo para ele seria abrir espaço para uma conta errada
           que ninguém confere. */
        bt: Math.floor(hpMax / 2),
      },
    }
  }
  return {}
}

/* Os valores ficam em inglês porque são os mesmos do pack do Foundry — só a
   moldura em volta é traduzida. */
const CATEGORIAS_ARMA = ['simple', 'martial', 'advanced', 'unarmed']
const CATEGORIAS_ARMADURA = ['unarmored', 'light', 'medium', 'heavy']
const DADOS = ['d4', 'd6', 'd8', 'd10', 'd12']
const TIPOS_DE_DANO = ['bludgeoning', 'piercing', 'slashing']

function Campo({ rotulo, children }) {
  return (
    <label className="form__field">
      <span className="field-label">{rotulo}</span>
      {children}
    </label>
  )
}

const Texto = ({ valor, onChange, ...resto }) => (
  <input className="input" value={valor} onChange={(e) => onChange(e.target.value)} {...resto} />
)

const Numero = (props) => <Texto type="number" inputMode="numeric" {...props} />

const Escolha = ({ valor, onChange, opcoes }) => (
  <select className="input" value={valor} onChange={(e) => onChange(e.target.value)}>
    {opcoes.map((opcao) => (
      <option key={opcao} value={opcao}>
        {opcao}
      </option>
    ))}
  </select>
)

function TechFields({ category, tec, set }) {
  if (category === 'weapon') {
    return (
      <fieldset className="form__tech">
        <legend className="label">Ficha técnica da arma</legend>
        <div className="form__row">
          <Campo rotulo="Categoria">
            <Escolha valor={tec.weaponCategory} onChange={set('weaponCategory')} opcoes={CATEGORIAS_ARMA} />
          </Campo>
          <Campo rotulo="Grupo">
            <Texto valor={tec.group} onChange={set('group')} placeholder="sword" />
          </Campo>
        </div>
        <div className="form__row">
          <Campo rotulo="Dados">
            <Numero valor={tec.dice} onChange={set('dice')} min="1" />
          </Campo>
          <Campo rotulo="Dado">
            <Escolha valor={tec.die} onChange={set('die')} opcoes={DADOS} />
          </Campo>
          <Campo rotulo="Mãos">
            <Numero valor={tec.hands} onChange={set('hands')} placeholder="1" />
          </Campo>
        </div>
        <Campo rotulo="Tipo de dano">
          <Escolha valor={tec.damageType} onChange={set('damageType')} opcoes={TIPOS_DE_DANO} />
        </Campo>
        <label className="form__check">
          <input type="checkbox" checked={tec.ranged} onChange={(e) => set('ranged')(e.target.checked)} />
          <span>Arma à distância</span>
        </label>
        {tec.ranged ? (
          <div className="form__row">
            <Campo rotulo="Alcance (ft)">
              <Numero valor={tec.range} onChange={set('range')} placeholder="30" />
            </Campo>
            <Campo rotulo="Recarga">
              <Texto valor={tec.reload} onChange={set('reload')} placeholder="0" />
            </Campo>
          </div>
        ) : null}
      </fieldset>
    )
  }

  if (category === 'armor') {
    return (
      <fieldset className="form__tech">
        <legend className="label">Ficha técnica da armadura</legend>
        <Campo rotulo="Categoria">
          <Escolha valor={tec.armorCategory} onChange={set('armorCategory')} opcoes={CATEGORIAS_ARMADURA} />
        </Campo>
        <div className="form__row">
          <Campo rotulo="Bônus de CA">
            <Numero valor={tec.acBonus} onChange={set('acBonus')} placeholder="1" />
          </Campo>
          <Campo rotulo="Limite de Dex">
            <Numero valor={tec.dexCap} onChange={set('dexCap')} placeholder="5" />
          </Campo>
        </div>
        <div className="form__row">
          <Campo rotulo="Penalidade de teste">
            <Numero valor={tec.checkPenalty} onChange={set('checkPenalty')} placeholder="-1" />
          </Campo>
          <Campo rotulo="Penalidade de desloc.">
            <Numero valor={tec.speedPenalty} onChange={set('speedPenalty')} placeholder="-5" />
          </Campo>
          <Campo rotulo="Força exigida">
            <Numero valor={tec.strength} onChange={set('strength')} placeholder="1" />
          </Campo>
        </div>
      </fieldset>
    )
  }

  if (category === 'shield') {
    const hpMax = Number(tec.hpMax) || 0
    return (
      <fieldset className="form__tech">
        <legend className="label">Ficha técnica do escudo</legend>
        <div className="form__row">
          <Campo rotulo="Bônus de CA">
            <Numero valor={tec.shieldAc} onChange={set('shieldAc')} placeholder="2" />
          </Campo>
          <Campo rotulo="Dureza">
            <Numero valor={tec.hardness} onChange={set('hardness')} placeholder="5" />
          </Campo>
          <Campo rotulo="PV">
            <Numero valor={tec.hpMax} onChange={set('hpMax')} placeholder="20" />
          </Campo>
        </div>
        {/* Calculado, não digitado: é metade dos PV, e ver a conta acontecendo
            evita a pergunta "por que o VT está errado?". */}
        <div className="form__hint">Limiar de Avaria: {Math.floor(hpMax / 2)} (metade dos PV)</div>
      </fieldset>
    )
  }

  return null
}
