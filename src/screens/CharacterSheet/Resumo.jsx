import { useState } from 'react'
import Sheet, { SheetActions } from '../../components/Sheet.jsx'
import Stepper from '../../components/Stepper.jsx'
import SENSES from '../../data/senses.json' with { type: 'json' }
import { useStore } from '../../state/store.jsx'
import { nightRest, sgn } from '../../lib/sheet.js'
import { statModAtivo, statModLabel } from '../../lib/statMods.js'
import { slugify } from '../../lib/loreResolve.js'
import { RANK_NAMES } from '../../lib/pathbuilder.js'
import { BedIcon } from '../../components/Icons.jsx'
import BreakdownSheet, { FactCell, StatCell } from './BreakdownSheet.jsx'
import ConditionsSheet, { ConditionChips } from './ConditionsSheet.jsx'
import HpSheet from './HpSheet.jsx'
import StatModsSheet from './StatModsSheet.jsx'

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

/* O grau como legenda de célula: `Untrained`, `Trained`, `Expert`… Continua em
   inglês (D12) — o que muda é a maiúscula, que é o que separa a legenda de uma
   palavra solta no meio do painel. `RANK_NAMES` fica minúsculo porque lá ele é
   texto corrido, dentro de "Proficiência (expert)" no breakdown. */
const GRAU = (rank) => {
  const nome = RANK_NAMES[rank ?? 0] ?? RANK_NAMES[0]
  return nome.charAt(0).toUpperCase() + nome.slice(1)
}

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
  const [modsAberto, setModsAberto] = useState(false)

  const sheet = player.sheet
  const statMods = player.statMods ?? []
  const abrir = (stat) => setBreakdown(stat)
  const pct = Math.max(0, Math.min(100, Math.round((view.hp / view.hpMax) * 100)))

  return (
    <>
      {/* ------------------------------------------------------ HP e condições

          Sem faixa de título, como no protótipo: é o único bloco que abre a
          tela direto, sem sobrancelha em cima. */}
      <section className="list-group">
        <div className="list-rows vitals">
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
            <div className="vitals__hp-actions">
              <button type="button" className="chip chip--sm" onClick={() => setHpAberto(true)}>
                Dano / Cura
              </button>
              {/* O descanso mora junto do HP porque é o que ele faz: encher a
                  barra que está logo acima. Ícone, e não botão de texto — é uma
                  vez por sessão, e o alvo é o `.icon-btn` inteiro. */}
              <button
                type="button"
                className="icon-btn icon-btn--accent"
                title="Descanso noturno"
                aria-label="Descanso noturno"
                onClick={() => setDescansando(true)}
              >
                <BedIcon />
              </button>
            </div>
          </div>

          <button type="button" className="vitals__cond" onClick={() => setCondAberto(true)}>
            <span className="label">Condições</span>
            <ConditionChips conditions={view.conditions} />
            <span className="vitals__manage">Gerenciar</span>
          </button>
        </div>
      </section>

      {/* ---------------------------------------------------------- atributos */}
      {/* O atributo abre o breakdown como qualquer outro número: sem
          modificador manual ele mostra só a linha da ficha, e com um mostra de
          onde vieram os pontos a mais. */}
      <Bloco titulo="Atributos">
        <div className="grid grid--6">
          {ATRIBUTOS.map(([key, rotulo]) => (
            <StatCell key={key} label={rotulo} stat={view.abilityStats[key]} onOpen={abrir} />
          ))}
        </div>
      </Bloco>

      {/* ------------------------------------------------------------ defesas

          CA e Escudo lado a lado, como no protótipo: são a mesma pergunta
          ("o que me protege agora"), então dividem a primeira linha do
          painel. Fortitude/Reflex/Will vêm depois, numa linha própria. */}
      <Bloco titulo="Defesas">
        <div className="defenses__top">
          <StatCell className="statcell--ac" label="CA" stat={view.ac} onOpen={abrir} />
          <Escudo player={player} shield={view.shield} />
        </div>
        <div className="grid grid--3">
          <StatCell
            label="Fortitude"
            stat={view.saves.fortitude}
            sub={GRAU(sheet.proficiencies?.fortitude)}
            onOpen={abrir}
          />
          <StatCell
            label="Reflex"
            stat={view.saves.reflex}
            sub={GRAU(sheet.proficiencies?.reflex)}
            onOpen={abrir}
          />
          <StatCell
            label="Will"
            stat={view.saves.will}
            sub={GRAU(sheet.proficiencies?.will)}
            onOpen={abrir}
          />
        </div>
      </Bloco>

      {/* -------------------------------------------------- outras estatísticas */}
      <Bloco titulo="Outras estatísticas">
        <div className="grid grid--3">
          <StatCell
            label="Percepção"
            stat={view.perception}
            sub={GRAU(sheet.proficiencies?.perception)}
            onOpen={abrir}
          />
          <FactCell label="Velocidade" value={view.speed} unit="ft" />
          <FactCell label="Tamanho" value={sheet.sizeName ?? '—'} />
          <StatCell
            label="DC Classe"
            stat={view.classDc}
            sub={GRAU(sheet.proficiencies?.classDC)}
            onOpen={abrir}
          />
          {/* Sem conjuração o número não existe, e o traço diz isso; o grau
              embaixo continua aparecendo, porque "Untrained" é a resposta à
              pergunta que a célula faz — não uma célula pela metade. */}
          {view.spellDc ? (
            <StatCell
              label="DC Magia"
              stat={view.spellDc}
              sub={GRAU(view.spellRank)}
              onOpen={abrir}
            />
          ) : (
            <FactCell label="DC Magia" value="—" sub={GRAU(view.spellRank)} />
          )}
          {view.spellAttack ? (
            <StatCell
              label="Atq Magia"
              stat={view.spellAttack}
              sub={GRAU(view.spellRank)}
              onOpen={abrir}
            />
          ) : (
            <FactCell label="Atq Magia" value="—" sub={GRAU(view.spellRank)} />
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
        {/* Grau de proficiência é vocabulário publicado do PF2e, como
            `Damage` e `AC Bonus`: a letra já vem de lá, e a legenda que a
            explica fala a mesma língua. */}
        <p className="skills__legend">U untrained · T trained · E expert · M master · L legendary</p>
      </Bloco>

      {/* ------------------------------------------------------ proficiências */}
      <Bloco titulo="Proficiências">
        <div className="grid grid--2">
          <ListaDeGraus titulo="Armas" chaves={[['unarmed', 'Sem arma'], ['simple', 'Simples'], ['martial', 'Marciais'], ['advanced', 'Avançadas']]} sheet={sheet} />
          <ListaDeGraus titulo="Armaduras" chaves={[['unarmored', 'Sem armadura'], ['light', 'Leve'], ['medium', 'Média'], ['heavy', 'Pesada']]} sheet={sheet} />
        </div>
      </Bloco>

      {/* --------------------------------------------------------------- outros */}
      <Bloco titulo="Outros">
        <Linha rotulo="Resistências" valor={sheet.resistances?.join(' · ')} />
        <Linha rotulo="Sentidos" valor={sentidos(sheet)} />
        <Linha rotulo="Idiomas" valor={sheet.languages?.join(' · ')} />
      </Bloco>

      {/* ------------------------------------------------- modificadores manuais

          O que o jogador declarou, junto, no fim da aba: cada linha diz o
          rótulo, em que número ela entra e quanto vale. É a única tela onde
          eles aparecem todos — no resto da ficha cada um vive dentro do
          breakdown do número em que foi posto. */}
      {statMods.length ? (
        <Bloco titulo="Modificadores manuais" contagem={statMods.length}>
          <div className="statmods">
            {statMods.map((mod, indice) => {
              const ligado = statModAtivo(mod)
              return (
                /* A linha inteira é o interruptor — desligar e ligar é o que
                   acontece no meio do combate (a Fúria começa e acaba), e
                   editar mora no botão logo abaixo do bloco. A caixa é a mesma
                   da magia preparada: vazia é uma coisa, cheia é a outra. */
                <button
                  type="button"
                  className={`statmod${ligado ? '' : ' statmod--off'}`}
                  key={`${mod.target}-${mod.label}-${indice}`}
                  aria-pressed={ligado}
                  onClick={() =>
                    dispatch({
                      type: 'SET_STAT_MODS',
                      playerId: player.id,
                      mods: statMods.map((m, i) => (i === indice ? { ...m, enabled: !ligado } : m)),
                    })
                  }
                >
                  <span className={`checkbox${ligado ? ' checkbox--on' : ''}`} />
                  <span className="statmod__name">{mod.label}</span>
                  <span className="statmod__target">{statModLabel(sheet, mod.target)}</span>
                  <span className="statmod__value">{sgn(mod.value)}</span>
                </button>
              )
            })}
          </div>
        </Bloco>
      ) : null}

      <button
        type="button"
        className="btn btn--tint btn--block"
        onClick={() => setModsAberto(true)}
      >
        Adicionar modificador
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
      {modsAberto ? <StatModsSheet player={player} onClose={() => setModsAberto(false)} /> : null}
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
    </>
  )
}

/* ------------------------------------------------------------------ peças */

/* Faixa de título + conteúdo full-bleed: a mesma `.list-group` que a
   Biblioteca e o Inventário usam, para a ficha ser a mesma casa e não uma
   tela grande com liberdade visual própria (D15). */
function Bloco({ titulo, contagem = null, children }) {
  return (
    <section className="list-group">
      <h3 className="label list-group__title">
        <span>{titulo}</span>
        {contagem != null ? <span className="list-group__count">{contagem}</span> : null}
      </h3>
      <div className="list-rows">{children}</div>
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

/*
 * O painel do escudo, que aparece com ou sem escudo empunhado.
 *
 * Sem escudo, a moldura fica no lugar com os campos vazios: a linha das defesas
 * não muda de forma quando a pessoa empunha ou larga o escudo, e o traço diz
 * "não tem" sem fingir um zero, que na CA pareceria bônus de verdade.
 */
function Escudo({ player, shield }) {
  const { dispatch } = useStore()
  const vazio = !shield

  return (
    <div className={`shield${shield?.broken ? ' shield--broken' : ''}${vazio ? ' shield--empty' : ''}`}>
      <div className="shield__head">
        <span className="field-label">Escudo</span>
        <span className={vazio ? 'shield__name shield__name--none' : 'shield__name'}>
          {vazio ? 'Nenhum' : shield.name}
        </span>
        <button
          type="button"
          className={`chip chip--sm${shield?.raised ? ' chip--on' : ''}`}
          aria-pressed={Boolean(shield?.raised)}
          disabled={vazio || shield.broken}
          onClick={() => dispatch({ type: 'TOGGLE_SHIELD_RAISED', playerId: player.id })}
        >
          {shield?.raised ? 'Erguido' : 'Erguer'}
        </button>
      </div>
      <div className="grid grid--4">
        <FactCell label="+CA" value={vazio ? '—' : sgn(shield.acBonus)} />
        <FactCell label="Dureza" value={vazio ? '—' : shield.hardness} />
        {vazio ? (
          <FactCell label="PV" value="—" />
        ) : (
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
        )}
        <FactCell label="VT" value={vazio ? '—' : shield.bt} />
      </div>
      {shield?.broken ? (
        <div className="shield__warn">
          Quebrado: o PV chegou ao Limiar de Avaria, e o escudo parou de dar bônus.
        </div>
      ) : null}
    </div>
  )
}

/* Exportado porque a aba Magias também descansa: o botão "Descansar" da faixa
   de conjuração abre esta mesma confirmação, não uma cópia dela. */
export function DescansoSheet({ player, onClose, onConfirm }) {
  const patch = nightRest(player.sheet, player.vitals, player.statMods)
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

/*
 * Sentidos de visão: Darkvision, Low-Light Vision, Truesight e companhia.
 *
 * A regra era "tudo que resolveu no glossário, mais tudo que não resolveu". Só
 * que o glossário do Foundry tem 55 verbetes e a maioria não é sentido nenhum —
 * o Rurik anunciava "Shield Block" como sentido — e a lista de não resolvidos
 * punha "Holy Aura" e "Deity Skill" ali junto, que não são nem sentido nem
 * visão.
 *
 * Agora o critério é o identificador do próprio sistema (`SENSE_TYPES`,
 * extraído na ingestão para `senses.json`): o nome vira slug e tem de estar na
 * lista de visão. Nada some da ficha por causa disto — o que não é sentido
 * continua listado como feature na aba Feats, que é onde ele sempre esteve.
 */
const VISAO = new Set(SENSES.visao)

function sentidos(sheet) {
  const nomes = [...(sheet.feats ?? []).map((f) => f.name), ...(sheet.specials ?? [])]
  const vistos = new Set()
  for (const nome of nomes) {
    if (VISAO.has(slugify(nome))) vistos.add(nome)
  }
  return [...vistos].join(' · ')
}

const dataCurta = (iso) => {
  const data = new Date(iso)
  return Number.isNaN(data.getTime())
    ? '—'
    : data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}
