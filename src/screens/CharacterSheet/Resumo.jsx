import { useState } from 'react'
import Sheet, { SheetActions } from '../../components/Sheet.jsx'
import Stepper from '../../components/Stepper.jsx'
import { useStore } from '../../state/store.jsx'
import { nightRest, sgn } from '../../lib/sheet.js'
import { RANK_NAMES } from '../../lib/pathbuilder.js'
import BreakdownSheet, { FactCell, StatCell } from './BreakdownSheet.jsx'
import ConditionsSheet, { ConditionChips } from './ConditionsSheet.jsx'
import HpSheet from './HpSheet.jsx'

/*
 * A aba Resumo.
 *
 * Esta tela não calcula nada: tudo já veio pronto de `buildSheet`. O que ela
 * faz é escolher o que mostrar e deixar cada número tocável — porque o ponto da
 * aba não é o número, é poder perguntar de onde ele veio no meio da mesa, sem
 * abrir o livro.
 */

/* Letra do grau, como o rodapé da lista explica: U T E M L. */
const LETRA = { 0: 'U', 2: 'T', 4: 'E', 6: 'M', 8: 'L' }

const ATRIBUTOS = [
  ['str', 'Str'],
  ['dex', 'Dex'],
  ['con', 'Con'],
  ['int', 'Int'],
  ['wis', 'Wis'],
  ['cha', 'Cha'],
]

export default function Resumo({ player, view, onGoToGm }) {
  const { dispatch } = useStore()
  const [breakdown, setBreakdown] = useState(null)
  const [hpAberto, setHpAberto] = useState(false)
  const [condAberto, setCondAberto] = useState(false)
  const [descansando, setDescansando] = useState(false)

  const sheet = player.sheet
  const abrir = (stat) => setBreakdown(stat)
  const pct = Math.max(0, Math.min(100, Math.round((view.hp / view.hpMax) * 100)))

  return (
    <div className="charsheet__body">
      {/* ------------------------------------------------------ HP e condições */}
      <section className="panel">
        <div className="vitals">
          <div className="vitals__hp">
            <button type="button" className="vitals__hp-btn" onClick={() => setHpAberto(true)}>
              <span className="label">Pontos de vida</span>
              <span className="vitals__hp-line">
                <span className="vitals__hp-now">{view.hp}</span>
                <span className="vitals__hp-max">/ {view.hpMax}</span>
                {view.tempHp > 0 ? <span className="vitals__temp">+{view.tempHp}</span> : null}
              </span>
            </button>
            {/* Largura é valor calculado em tempo de execução — o único caso em
                que `style` inline é aceitável. Cor e altura saem do CSS. */}
            <div className="vitals__bar">
              <div
                className={`vitals__bar-fill${pct <= 25 ? ' vitals__bar-fill--low' : ''}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <button type="button" className="chip chip--sm" onClick={() => setHpAberto(true)}>
              Dano / Cura
            </button>
          </div>

          <button type="button" className="vitals__cond" onClick={() => setCondAberto(true)}>
            <span className="label">Condições</span>
            <ConditionChips conditions={view.conditions} />
            <span className="vitals__manage">Gerenciar</span>
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------- atributos */}
      <Bloco titulo="Atributos">
        <div className="grid grid--6">
          {ATRIBUTOS.map(([key, rotulo]) => (
            <FactCell key={key} label={rotulo} value={sgn(view.abilityMods[key] ?? 0)} />
          ))}
        </div>
      </Bloco>

      {/* ------------------------------------------------------------ defesas */}
      <Bloco titulo="Defesas">
        <div className="grid grid--4">
          <StatCell label="CA" stat={view.ac} onOpen={abrir} />
          <StatCell
            label="Fortitude"
            stat={view.saves.fortitude}
            sub={RANK_NAMES[sheet.proficiencies?.fortitude ?? 0]}
            onOpen={abrir}
          />
          <StatCell
            label="Reflex"
            stat={view.saves.reflex}
            sub={RANK_NAMES[sheet.proficiencies?.reflex ?? 0]}
            onOpen={abrir}
          />
          <StatCell
            label="Will"
            stat={view.saves.will}
            sub={RANK_NAMES[sheet.proficiencies?.will ?? 0]}
            onOpen={abrir}
          />
        </div>
        {/* Só com escudo empunhado: sem isso o bloco prometeria um Erguer que
            não existe (§10.6). */}
        {view.shield ? <Escudo player={player} shield={view.shield} /> : null}
      </Bloco>

      {/* -------------------------------------------------- outras estatísticas */}
      <Bloco titulo="Outras estatísticas">
        <div className="grid grid--3">
          <StatCell
            label="Percepção"
            stat={view.perception}
            sub={RANK_NAMES[sheet.proficiencies?.perception ?? 0]}
            onOpen={abrir}
          />
          <FactCell label="Deslocamento" value={view.speed} unit="ft" />
          <FactCell label="Tamanho" value={sheet.sizeName ?? '—'} />
          <StatCell
            label="DC de classe"
            stat={view.classDc}
            sub={RANK_NAMES[sheet.proficiencies?.classDC ?? 0]}
            onOpen={abrir}
          />
          {/* Sem conjuração, o campo mostra o travessão em vez de um zero que
              pareceria um número de verdade. */}
          {view.spellDc ? (
            <StatCell label="DC de magia" stat={view.spellDc} onOpen={abrir} />
          ) : (
            <FactCell label="DC de magia" value="—" />
          )}
          {view.spellAttack ? (
            <StatCell label="Atq. de magia" stat={view.spellAttack} onOpen={abrir} />
          ) : (
            <FactCell label="Atq. de magia" value="—" />
          )}
        </div>
      </Bloco>

      {/* ------------------------------------------------------------ perícias */}
      <Bloco titulo="Perícias" contagem={view.skills.length}>
        <div className="skills">
          {view.skills.map((skill) => (
            <button
              type="button"
              className="skills__row"
              key={skill.key}
              onClick={() => abrir(skill.stat)}
            >
              <span className={`skills__name${skill.rank ? '' : ' skills__name--untrained'}`}>
                {skill.name}
              </span>
              <span className={`skills__rank${skill.rank ? ' skills__rank--trained' : ''}`}>
                {LETRA[skill.rank] ?? 'U'}
              </span>
              <span className={`skills__bonus${skill.stat.altered ? ' skills__bonus--altered' : ''}`}>
                {sgn(skill.stat.total)}
              </span>
            </button>
          ))}
        </div>
        <p className="skills__legend">U destreinado · T treinado · E expert · M mestre · L lendário</p>
      </Bloco>

      {/* ------------------------------------------------------ proficiências */}
      <Bloco titulo="Proficiências">
        <div className="grid grid--2">
          <ListaDeGraus titulo="Armas" chaves={[['unarmed', 'Unarmed'], ['simple', 'Simple'], ['martial', 'Martial'], ['advanced', 'Advanced']]} sheet={sheet} />
          <ListaDeGraus titulo="Armaduras" chaves={[['unarmored', 'Unarmored'], ['light', 'Light'], ['medium', 'Medium'], ['heavy', 'Heavy']]} sheet={sheet} />
        </div>
      </Bloco>

      {/* --------------------------------------------------------------- outros */}
      <Bloco titulo="Outros">
        <Linha rotulo="Resistências" valor={sheet.resistances?.join(' · ')} />
        <Linha rotulo="Sentidos" valor={sentidos(sheet)} />
        <Linha rotulo="Idiomas" valor={sheet.languages?.join(' · ')} />
      </Bloco>

      {/* ------------------------------------------------------------ descanso */}
      <button type="button" className="btn btn--tint btn--block" onClick={() => setDescansando(true)}>
        Descanso noturno
      </button>

      <div className="charsheet__foot">
        <span>
          Importada em {dataCurta(sheet.importedAt)} · Nv {sheet.level}
        </span>
        {/* Atualizar não acontece aqui (D14): leva para o único lugar que
            substitui ficha, que é a linha do personagem no Mestre. */}
        <button type="button" className="link link--muted" onClick={onGoToGm}>
          Atualizar no Mestre
        </button>
      </div>

      {breakdown ? <BreakdownSheet stat={breakdown} onClose={() => setBreakdown(null)} /> : null}
      {hpAberto ? <HpSheet player={player} view={view} onClose={() => setHpAberto(false)} /> : null}
      {condAberto ? <ConditionsSheet player={player} onClose={() => setCondAberto(false)} /> : null}
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
    </div>
  )
}

/* ------------------------------------------------------------------ peças */

function Bloco({ titulo, contagem = null, children }) {
  return (
    <section className="panel">
      <h3 className="label panel__title">
        <span>{titulo}</span>
        {contagem != null ? <span className="panel__count">{contagem}</span> : null}
      </h3>
      {children}
    </section>
  )
}

function Linha({ rotulo, valor }) {
  return (
    <div className="charsheet__line">
      <span className="charsheet__line-label">{rotulo}</span>
      <span className={valor ? 'charsheet__line-value' : 'charsheet__none'}>{valor || 'Nenhum'}</span>
    </div>
  )
}

function ListaDeGraus({ titulo, chaves, sheet }) {
  return (
    <div className="profs">
      <div className="field-label">{titulo}</div>
      {chaves.map(([key, rotulo]) => {
        const rank = sheet.proficiencies?.[key] ?? 0
        return (
          <div className="profs__row" key={key}>
            <span className={`profs__name${rank ? '' : ' profs__name--untrained'}`}>{rotulo}</span>
            <span className={`profs__rank${rank ? ' profs__rank--trained' : ''}`}>
              {LETRA[rank] ?? 'U'}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function Escudo({ player, shield }) {
  const { dispatch } = useStore()
  return (
    <div className={`shield${shield.broken ? ' shield--broken' : ''}`}>
      <div className="shield__head">
        <span className="field-label">Escudo</span>
        <span className="shield__name">{shield.name}</span>
        <button
          type="button"
          className={`chip chip--sm${shield.raised ? ' chip--on' : ''}`}
          aria-pressed={shield.raised}
          disabled={shield.broken}
          onClick={() => dispatch({ type: 'TOGGLE_SHIELD_RAISED', playerId: player.id })}
        >
          {shield.raised ? 'Erguido' : 'Erguer'}
        </button>
      </div>
      <div className="grid grid--4">
        <FactCell label="+CA" value={sgn(shield.acBonus)} />
        <FactCell label="Dureza" value={shield.hardness} />
        <div className="statcell statcell--fact">
          <span className="statcell__label">PV</span>
          <Stepper
            value={shield.hp}
            label="PV do escudo"
            canDec={shield.hp > 0}
            canInc={shield.hp < shield.hpMax}
            onDec={() => dispatch({ type: 'SET_SHIELD_HP', playerId: player.id, value: shield.hp - 1 })}
            onInc={() => dispatch({ type: 'SET_SHIELD_HP', playerId: player.id, value: shield.hp + 1 })}
          />
        </div>
        <FactCell label="VT" value={shield.bt} />
      </div>
      {shield.broken ? (
        <div className="shield__warn">
          Quebrado: o PV chegou ao Limiar de Avaria, e o escudo parou de dar bônus.
        </div>
      ) : null}
    </div>
  )
}

function DescansoSheet({ player, onClose, onConfirm }) {
  const patch = nightRest(player.sheet, player.vitals)
  return (
    <Sheet center onClose={onClose}>
      <div className="sheet__question">
        Descanso noturno de {player.sheet.name}?
        {'\n\n'}
        Cura {patch.curado} PV, zera o HP temporário, repõe os pontos de foco e os
        slots preparados, e reduz Doomed em 1.
        {'\n\n'}
        Vale só para este personagem.
      </div>
      <SheetActions onConfirm={onConfirm} onCancel={onClose} confirmLabel="Descansar" />
    </Sheet>
  )
}

/* Os sentidos vêm dos `specials` resolvidos no glossário. O que não resolveu
   aparece assim mesmo, com o nome que veio — sumir é o único desfecho proibido. */
function sentidos(sheet) {
  const doGlossario = (sheet.feats ?? [])
    .filter((feat) => feat.kind === 'glossary')
    .map((feat) => feat.name)
  const orfaos = (sheet.unresolved ?? []).filter((nome) => !doGlossario.includes(nome))
  return [...doGlossario, ...orfaos].join(' · ')
}

const dataCurta = (iso) => {
  const data = new Date(iso)
  return Number.isNaN(data.getTime())
    ? '—'
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
