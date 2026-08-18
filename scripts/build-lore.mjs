// Gera o corpus de verbetes da ficha: feats, features de classe, heranças,
// traços de ancestralidade, ações, magias e condições, mais os sentidos que só
// existem no arquivo de localização.
//
// Uso:
//   npm run build:lore
//
// Quatro artefatos, e a razão de cada divisão:
//
//   src/data/index.spells.json   índice de magias SEM descrição, ~2.000 entradas.
//                                Vai no bundle porque o compêndio navega tudo,
//                                offline, e navegar precisa ser instantâneo.
//   src/data/conditions.json     as 43 condições INTEIRAS. São pequenas e
//                                aparecem em toda rolagem: pedir ao servidor
//                                seria ida à rede no meio do combate.
//   src/data/unarmed.json        o Punho básico (ver mais abaixo).
//   server/data/entries.bin      todo verbete sanitizado, concatenado.
//   server/data/entries.idx.json slug -> [offset, tamanho], mais o índice de
//                                nomes usado para resolver o que o Pathbuilder
//                                manda.
//
// O corpus somado passa de 30 MB, e é isso que a decisão D10 mantém fora do
// bundle. O motivo mudou e ficou mais forte: com os jogadores entrando por
// Cloudflare, o bundle atravessa a internet a cada celular que abre o app, e
// não mais a rede local. O servidor, esse roda no PC do mestre e pode ser
// generoso — lê por offset e guarda em memória o que já leu.

import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  readdirSync,
  writeFileSync,
  writeSync,
} from 'node:fs'
import path from 'node:path'

import { sanitizeDescription, toPlainText, readSource } from '../src/lib/foundryImport.js'
import { normalizeName } from '../src/lib/loreResolve.js'
import {
  DEFAULT_VENDOR,
  ROOT,
  resolveLangFile,
  resolveRuleLangFile,
  resolvePack,
  resolveSystemDir,
  resolveSystemFile,
} from './vendor-pf2e.mjs'

const vendor = process.argv[2] ?? DEFAULT_VENDOR

/**
 * Ordem de prioridade no empate de nome, e ela é obrigatória (§5.4 da espec).
 *
 * Medido no fixture do Rurik: "Rage" existe em `actions` E em `class-features`;
 * "Dromaar" existe em `feats` E em `heritages`. Sem uma ordem fixa, o mesmo
 * personagem importado duas vezes mostraria descrições diferentes.
 *
 * A ordem vai do mais específico ao mais genérico: o que a classe te deu ganha
 * do feat homônimo, que ganha da ação genérica.
 */
const PACKS = [
  { pack: 'class-features', kind: 'class-feature' },
  { pack: 'heritages', kind: 'heritage' },
  { pack: 'ancestry-features', kind: 'ancestry-feature' },
  { pack: 'feats', kind: 'feat' },
  { pack: 'actions', kind: 'action' },
  { pack: 'spells', kind: 'spell' },
  { pack: 'conditions', kind: 'condition' },
]

/*
 * Prioridade de NOME. Os cinco primeiros são a ordem obrigatória da espec; os
 * três últimos são a consequência de medir.
 *
 * O glossário entra ACIMA de magias porque existe uma magia chamada Darkvision.
 * Quando o Pathbuilder põe "Darkvision" em `specials`, ele está falando do
 * sentido do anão, nunca da magia — e com a ordem ingênua o anão ganhava a
 * descrição da magia, calado. Magia e condição são alcançadas por id, a partir
 * do compêndio e da folha de condições, então não precisam ganhar nome nenhum.
 */
const PRIORIDADE_DE_NOME = [
  'class-feature',
  'heritage',
  'ancestry-feature',
  'feat',
  'action',
  'glossary',
  'spell',
  'condition',
]
const prioridade = (kind) => {
  const i = PRIORIDADE_DE_NOME.indexOf(kind)
  return i === -1 ? PRIORIDADE_DE_NOME.length : i
}

/*
 * ------------------------------------------------------------------ apelidos
 *
 * O Pathbuilder nomeia a escolha de classe pela categoria; o Foundry nomeia só o
 * miolo:
 *
 *   "Thief Racket"                          -> "Thief"
 *   "Justice Cause"                         -> "Justice"
 *   "Arcane Thesis: Experimental Spellshaping" -> "Experimental Spellshaping"
 *
 * A ponte entre os dois está dentro do próprio pack, em `system.traits.otherTags`:
 *
 *   class-features/thief.json                    ["rogue-racket"]
 *   class-features/justice.json                  ["champion-cause"]
 *   class-features/experimental-spellshaping.json ["wizard-arcane-thesis"]
 *
 * Tira-se o nome da classe do começo da tag e sobra a categoria — "racket",
 * "cause", "arcane thesis". Daí saem os dois formatos que o Pathbuilder usa:
 * "<Nome> <Categoria>" e "<Categoria>: <Nome>".
 *
 * O ponto é que isto é **gerado, não escrito**: nenhum nome de jogo entra no
 * nosso código (D-zero-placeholder), e a categoria que a Paizo criar amanhã
 * entra sozinha na próxima ingestão, em vez de apodrecer numa lista à mão. É a
 * vantagem que o Pathmuncher não tem — ele roda dentro do Foundry e só enxerga
 * o índice dos compêndios (nome, tipo, slug), por isso precisa de 161 pares
 * escritos à mão.
 *
 * Duas travas, porque apelido que erra é pior que apelido que falta:
 *
 *   1. Apelido nunca cobre nome de verbete de verdade. Se "Cause" existir como
 *      nome, o nome ganha.
 *   2. Apelido disputado por dois verbetes é descartado, não desempatado. A
 *      prioridade de pack responde "qual dos Rage?", que é outra pergunta; aqui
 *      a resposta certa para a dúvida é não responder.
 *
 * Medido no pack de hoje: 51 categorias, ~1.550 apelidos, zero ambíguos e zero
 * colidindo com nome existente.
 */

/* Os slugs de classe, para saber onde a tag para de falar de classe e começa a
   falar de categoria. Vem do pack `classes`, não de uma lista nossa. */
const CLASS_SLUGS = new Set(
  readdirSync(resolvePack('classes', vendor))
    .filter((f) => f.endsWith('.json') && f !== '_folders.json')
    .map((f) => f.replace(/\.json$/, '')),
)

/* chave normalizada -> Set de ids que a reivindicam. Vira índice no fim, quando
   já se sabe quais nomes de verdade existem e quais chaves ficaram disputadas. */
const apelidosCrus = new Map()

function apelidar(nome, id) {
  const chave = normalizeName(nome)
  if (!chave) return
  if (!apelidosCrus.has(chave)) apelidosCrus.set(chave, new Set())
  apelidosCrus.get(chave).add(id)
}

/** Os apelidos de um verbete, a partir das tags de categoria que ele carrega. */
function apelidarPorTags(entry, otherTags) {
  for (const tag of otherTags) {
    const partes = String(tag).split('-')
    /* "rogue-racket" -> ["racket"];  "wizard-arcane-thesis" -> ["arcane","thesis"].
       Tag que não começa com classe ("melee", "blessing-of-the-devoted") entra
       inteira: se não for categoria de escolha, ninguém vai perguntar por ela. */
    const semClasse = CLASS_SLUGS.has(partes[0]) ? partes.slice(1) : partes
    if (!semClasse.length) continue

    const categoria = semClasse.join(' ')
    /* A última palavra sozinha porque o Pathbuilder às vezes encurta:
       `witch-elementalist-patron` vira "Mosquito Witch Patron", não
       "Mosquito Witch Elementalist Patron". */
    const curta = semClasse[semClasse.length - 1]

    for (const forma of new Set([categoria, curta])) {
      apelidar(`${entry.name} ${forma}`, entry.id)
      apelidar(`${forma}: ${entry.name}`, entry.id)
    }
  }
}

/*
 * --------------------------------------------------- a perícia de cada ação
 *
 * "Qual perícia rola o Climb?" já era uma pergunta que o pack respondia sozinho:
 * ele guardava `actions/skill/athletics/climb.json`. Hoje `actions/skill/` é uma
 * pasta plana, e o segundo nível não existe mais — foi por isso que TODA ação de
 * perícia caiu no balde "Outras".
 *
 * Quem ainda guarda a divisão é o registro de ações do próprio sistema, em
 * `src/module/system/action-macros/<perícia>/<slug>.ts`. Lemos só os NOMES das
 * pastas e dos arquivos; nenhum TypeScript é interpretado. É o mesmo caminho que
 * o Punho básico já usava: quando o dado não está em pack, vai-se ao código do
 * Foundry, e nunca à memória de quem escreve.
 *
 * Cobre 45 das 54. A segunda fonte é a marcação da própria descrição, que também
 * é estrutura e não prosa:
 *
 *   @Check[survival|...]                      -> Cover Tracks
 *   [[/act disable-device]]{Thievery}         -> Disable a Device
 *
 * E são uma LISTA, não uma escolha. Decipher Writing rola com Society, Arcana,
 * Occultism ou Religion, e o pack diz as quatro; Recall Knowledge idem. A ação
 * aparece embaixo de cada perícia que a rola, porque a pergunta que a aba
 * responde é "estou com Society na mão, o que dá para fazer?".
 *
 * Sobram 7 (Treat Wounds, Earn Income, Craft…) para as quais nenhuma das duas
 * fontes diz a perícia. Ficam sem perícia e caem num balde na tela, com o nome
 * que têm — chutar "Medicine" para Treat Wounds seria escrever regra de jogo no
 * nosso código, que é exatamente o que não se faz aqui.
 */
const PERICIAS = new Set([
  'acrobatics',
  'arcana',
  'athletics',
  'crafting',
  'deception',
  'diplomacy',
  'intimidation',
  'medicine',
  'nature',
  'occultism',
  'performance',
  'religion',
  'society',
  'stealth',
  'survival',
  'thievery',
])

const ACTION_MACROS = 'src/module/system/action-macros'

/** slug da ação -> perícia, a partir das pastas do registro do sistema. */
function lerPericiasDoRegistro() {
  const raiz = resolveSystemDir(ACTION_MACROS, vendor)
  const mapa = new Map()
  for (const pasta of readdirSync(raiz, { withFileTypes: true })) {
    if (!pasta.isDirectory() || !PERICIAS.has(pasta.name)) continue
    for (const arquivo of readdirSync(path.join(raiz, pasta.name))) {
      if (!arquivo.endsWith('.ts') || arquivo === 'index.ts') continue
      mapa.set(arquivo.replace(/\.ts$/, ''), pasta.name)
    }
  }
  if (mapa.size < 30) {
    console.error(
      `\nO registro de ações em ${ACTION_MACROS} devolveu só ${mapa.size} ações.\n` +
        'Ele mudou de forma. Conserte o extrator — não escreva a perícia de cada ação à mão.\n',
    )
    process.exit(1)
  }
  return mapa
}

const PERICIA_DO_REGISTRO = lerPericiasDoRegistro()

/** Toda perícia nomeada pela marcação da descrição — `@Check[…]` e `[[/act …]]{…}`. */
function periciasDaMarcacao(html) {
  const achadas = new Set()
  for (const [, nome] of String(html).matchAll(/@Check\[([a-z]+)/g)) {
    if (PERICIAS.has(nome)) achadas.add(nome)
  }
  for (const [, rotulo] of String(html).matchAll(/\[\[\/act [^\]]*\]\]\{([^}]+)\}/g)) {
    const nome = rotulo.toLowerCase()
    if (PERICIAS.has(nome)) achadas.add(nome)
  }
  return achadas
}

/** As perícias que rolam uma ação, em ordem. Vazio quando nenhuma fonte diz. */
function periciasDaAcao(slug, html) {
  const achadas = periciasDaMarcacao(html)
  const doRegistro = PERICIA_DO_REGISTRO.get(slug)
  if (doRegistro) achadas.add(doRegistro)
  return [...achadas].sort()
}

/* --------------------------------------------------------------- utilidades */

/* Os packs têm subpastas (feats/ancestry/gnome/level-5/…), então a varredura é
   recursiva. `_folders.json` é metadado de organização do Foundry, não verbete. */
function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '_folders.json') continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (entry.name.endsWith('.json')) out.push(full)
  }
  return out
}

const slugFromFile = (file) => path.basename(file, '.json')

/**
 * Custo em ações, normalizado. O UI é quem desenha os losangos; aqui fica o
 * fato: quantas ações, ou que tipo de ação é.
 *
 * `null` = passivo, sem custo. `text` guarda o que não cabe em 1/2/3 —
 * "10 minutes", "1 hour" — em vez de arredondar para um número errado.
 */
function readActionCost(system, kind) {
  if (kind === 'spell') {
    const raw = String(system?.time?.value ?? '').trim()
    if (!raw) return null
    if (/^[123]$/.test(raw)) return { type: 'action', value: Number(raw) }
    if (/^reaction$/i.test(raw)) return { type: 'reaction', value: null }
    if (/^free$/i.test(raw)) return { type: 'free', value: null }
    return { type: 'text', value: null, text: raw }
  }

  const type = system?.actionType?.value ?? null
  if (!type || type === 'passive') return null
  const value = Number(system?.actions?.value)
  if (type === 'action') return { type: 'action', value: Number.isFinite(value) ? value : 1 }
  return { type, value: null }
}

/*
 * Alcance, alvo e defesa de uma magia.
 *
 * No Foundry esses três não estão na descrição — são campos do sistema que a
 * ficha dele desenha por cima. Ficaram de fora do extrator e, por isso, a magia
 * aberta aqui mostrava só o texto: "Fireball" sem os 500 pés, "Charm" sem o
 * "1 creature" nem o Will.
 *
 * Sai estruturado; quem escreve "basic Reflex" é a tela, pela mesma razão do
 * `actionCost` — o formato de exibição nunca vira o dado guardado.
 *
 * `defense` tem duas metades e as duas existem: `save` (772 magias) e, em 14
 * delas, `passive` junto — Reflex DC contra AC, por exemplo.
 */
function readSpellStats(system) {
  const texto = (valor) => {
    const s = String(valor ?? '').trim()
    return s || null
  }

  const save = system?.defense?.save
  const passive = system?.defense?.passive
  const defense =
    save || passive
      ? {
          save: save?.statistic
            ? { statistic: save.statistic, basic: Boolean(save.basic) }
            : null,
          passive: passive?.statistic ? { statistic: passive.statistic } : null,
        }
      : null

  return {
    range: texto(system?.range?.value),
    /* `area.details` é a prosa que a Paizo publicou ("20-foot-radius burst",
       "10-foot radius, 40-foot-tall cylinder") e ganha do par tipo+valor
       sempre que existe; as outras 434 se escrevem "5-foot burst". */
    area: lerArea(system?.area),
    targets: texto(system?.target?.value),
    defense,
  }
}

/** `{type:'burst', value:5}` -> "5-foot burst"; `null` quando a magia não tem. */
function lerArea(area) {
  if (!area) return null
  const detalhe = String(area.details ?? '').trim()
  if (detalhe) return detalhe
  const valor = Number(area.value)
  if (!area.type || !Number.isFinite(valor)) return null
  return `${valor}-foot ${area.type}`
}

/* ------------------------------------------------------------- @Localize

   Cinco verbetes dos packs não trazem a descrição no próprio JSON: escrevem
   `@Localize[PF2E.condition.sickened.rules]` e deixam o texto no arquivo de
   localização. Sickened é um deles, e sem resolver isto a condição chegava à
   tela com descrição vazia — placeholder às avessas, dado que existe na fonte
   e o app jogava fora.

   O `en.json` era lido só lá embaixo, para o glossário dos sentidos; subiu para
   cá porque agora o laço dos packs também depende dele. */

const en = JSON.parse(readFileSync(resolveLangFile(vendor), 'utf8'))

/* O sistema divide os textos em dois arquivos: o `en.json` da interface e o
   `re-en.json` das regras. Das 20 chaves que os packs invocam, 19 estão no
   segundo (as do repertório de magias de feiticeiro e invocador). */
const arquivoDeRegras = resolveRuleLangFile(vendor)
const enRegras = arquivoDeRegras ? JSON.parse(readFileSync(arquivoDeRegras, 'utf8')) : {}

const noCaminho = (raiz, caminho) =>
  String(caminho)
    .split('.')
    .reduce((atual, parte) => (atual == null ? undefined : atual[parte]), raiz)

const chaveDoEn = (caminho) => noCaminho(en, caminho) ?? noCaminho(enRegras, caminho)

let localizeSemChave = 0

function resolveLocalize(html) {
  return String(html ?? '').replace(/@Localize\[([^\]]*)\]/g, (macro, caminho) => {
    const valor = chaveDoEn(caminho.trim())
    if (typeof valor === 'string') return valor
    /* Errar em silêncio é o único erro inaceitável: a chave que não resolve
       aparece no log e o macro fica no texto, em vez de sumir. */
    localizeSemChave += 1
    console.warn(`  ! @Localize sem tradução: ${caminho}`)
    return macro
  })
}

/* --------------------------------------------------------- leitura dos packs */

/*
 * A chave de um verbete é `kind:slug`, não o slug pelo. Medido: 119 magias e 46
 * ações têm o mesmo slug de um feat — `fly` é ação E magia, `pack-attack` é feat
 * E magia. Guardar por slug puro fazia a magia Fly sumir do compêndio sem um
 * pio. A prioridade de PACKS resolve o empate de NOME, que é outra pergunta:
 * "o Pathbuilder disse Rage, qual dos Rage é?".
 */
const entries = new Map() // "spell:fly" -> verbete
const nameIndex = new Map() // nome normalizado -> { id, prio }
const slugIndex = new Map() // slug puro -> { id, prio }, para busca solta

/** Quem tem prioridade melhor fica com o nome. Empate: o primeiro que chegou. */
function reivindicar(mapa, chave, id, kind) {
  const prio = prioridade(kind)
  const atual = mapa.get(chave)
  if (!atual || prio < atual.prio) mapa.set(chave, { id, prio })
}
const spellIndex = []
const actionIndex = []
const conditions = []
const counts = {}
let semNome = 0
/* Fórmula que depende de quem lança (`@actor.level`, `sibling(...)`) não tem
   como ser resolvida sem personagem, então fica no texto como veio. Contada
   aqui para aparecer no relatório: some do log, some da conta, some da tela. */
let comRefDeAtor = 0
const TEM_REF_DE_ATOR = /@(actor|self)\.|@item\.(?!rank|level)|sibling\(/

for (const { pack, kind } of PACKS) {
  const dir = resolvePack(pack, vendor)
  const files = walk(dir)
  counts[pack] = 0

  for (const file of files) {
    let raw
    try {
      raw = JSON.parse(readFileSync(file, 'utf8'))
    } catch (error) {
      console.warn(`  ! ${path.relative(dir, file)}: JSON ilegível (${error.message})`)
      continue
    }
    if (!raw?.name) {
      semNome += 1
      continue
    }

    const system = raw.system ?? {}
    const slug = slugFromFile(file)
    /* A primeira pasta dentro do pack. No `actions` ela é o agrupamento que a
       ficha mostra — `basic/`, `skill/`, `class/` —, e vem da organização da
       própria Paizo em vez de uma lista nossa. */
    const partes = path.relative(dir, file).split(path.sep)
    const grupo = partes[0].replace(/\.json$/, '') || null
    const bruto = resolveLocalize(system?.description?.value ?? '')
    /* O nível do próprio verbete resolve `@item.rank`/`@item.level` dentro das
       fórmulas do pack — é o que faz o Caustic Blast dizer "1 persistent acid"
       em vez de "(1+floor((@item.rank -1)/2)) persistent,acid". */
    const nivel = Number.isFinite(Number(system?.level?.value)) ? Number(system.level.value) : null
    const html = sanitizeDescription(bruto, { level: nivel })

    /* Perícia e classe de uma ação: os dois agrupamentos da aba Ações, os dois
       vindos da organização da Paizo e não de uma lista nossa.

       Classe ainda é a pasta (`class/barbarian/rage.json`) — o traço da ação não
       serve, porque 83 das 196 não carregam o traço da própria classe. Perícia
       já foi pasta e não é mais; ver o bloco no topo. Ambas em inglês, como o
       resto do pack (D12). */
    const pericias = kind === 'action' && grupo === 'skill' ? periciasDaAcao(slug, bruto) : []
    const classeDaAcao = kind === 'action' && grupo === 'class' && partes.length > 2 ? partes[1] : null
    const traitBlock = system?.traits ?? {}

    const entry = {
      id: `${kind}:${slug}`,
      slug,
      name: String(raw.name).trim(),
      kind,
      pack,
      level: nivel,
      category: system?.category ?? null,
      group: grupo,
      rarity: traitBlock.rarity ?? null,
      traits: Array.isArray(traitBlock.value) ? traitBlock.value : [],
      traditions: Array.isArray(traitBlock.traditions) ? traitBlock.traditions : [],
      actionCost: readActionCost(system, kind),
      /* Só magia tem alcance/alvo/defesa; num feat os três seriam três nulos
         em cada verbete, e o `entries.bin` já tem 2.000 magias dentro. */
      ...(kind === 'spell' ? readSpellStats(system) : {}),
      descriptionHtml: html,
      descriptionText: toPlainText(html),
      // Requisito de licença, não zelo: ORC e OGL exigem a atribuição.
      source: readSource(system),
    }

    if (entries.has(entry.id)) {
      // Mesmo pack, mesmo slug: aí sim é duplicata de verdade.
      console.warn(`  ! verbete repetido: ${entry.id}`)
      continue
    }
    if (TEM_REF_DE_ATOR.test(entry.descriptionText)) comRefDeAtor += 1
    entries.set(entry.id, entry)
    counts[pack] += 1

    /* Aqui, sim, vale a prioridade: é o que faz "Rage" resolver sempre para a
       feature de classe, e nunca ora para ela, ora para a ação. */
    reivindicar(nameIndex, normalizeName(entry.name), entry.id, kind)
    reivindicar(slugIndex, slug, entry.id, kind)
    /* "Thief" também atende por "Thief Racket", porque o pack diz que ele é um
       `rogue-racket` e é assim que o Pathbuilder o chama. */
    apelidarPorTags(entry, Array.isArray(traitBlock.otherTags) ? traitBlock.otherTags : [])

    if (kind === 'spell') {
      /* O índice do bundle NÃO leva descrição: são ~2.000 magias, e a descrição
         é 90% do peso. Quem abre uma magia pede o verbete ao servidor. */
      spellIndex.push({
        id: entry.id,
        slug,
        name: entry.name,
        rank: entry.level ?? 0,
        traditions: entry.traditions,
        traits: entry.traits,
        rarity: entry.rarity,
        actionCost: entry.actionCost,
        /* Contra o quê a magia joga. Vem no bundle (+54 KB em 606) porque a aba
           Ataques precisa dele para escolher entre mostrar a DC ou o bônus de
           ataque, e essa escolha é síncrona — buscar no servidor faria a linha
           piscar com os dois números antes de acertar. */
        defense: entry.defense,
        // Precisa vir junto para o compêndio aplicar o mesmo filtro de
        // conteúdo do catálogo (resposta 1 da §17): ownedCategories olha
        // source.title, remasterFilter olha source.remaster. Sem isso o
        // compêndio não teria como saber o que filtrar.
        source: entry.source,
      })
    }
    /* `basic`, `skill` e `class` vão no bundle. As de classe entraram depois: a
       aposta original era que elas chegariam resolvidas pela importação, porque
       o personagem tem a feature que as concede. Medido na mesa: não chegam. O
       Pathbuilder manda "Rage" e o desempate de nome resolve para a FEATURE de
       classe (é a ordem certa, e a espec a exige) — a ação homônima nunca é
       alcançada, e a aba Classe ficava vazia para todo mundo.

       No Foundry quem faz a ponte é a regra `GrantItem` da feature, que aponta
       para a ação. Seguir essa corrente é o certo e continua na mesa (ver o
       estudo do Pathmuncher); enquanto isso, a pasta da Paizo já diz de que
       classe é cada ação, e a tela filtra pela classe da ficha.

       Custo: 196 verbetes a mais no índice, sem descrição — de 14 KB para ~46. */
    if (kind === 'action' && ['basic', 'skill', 'class'].includes(grupo)) {
      actionIndex.push({
        id: entry.id,
        slug,
        name: entry.name,
        group: grupo,
        skills: pericias,
        // `shared` é pasta de verdade da Paizo: ação que várias classes ganham
        // (hoje só a Reactive Strike). A tela dá a ela uma faixa própria em vez
        // de fingir que é da classe de quem está olhando.
        class: classeDaAcao,
        actionCost: entry.actionCost,
        traits: entry.traits,
        rarity: entry.rarity,
      })
    }
    if (kind === 'condition') {
      conditions.push({
        id: entry.id,
        slug,
        name: entry.name,
        // `system.value.isValued` marca as que têm número (Frightened 2)
        valued: Boolean(system?.value?.isValued),
        group: system?.group ?? null,
        descriptionHtml: entry.descriptionHtml,
        descriptionText: entry.descriptionText,
        source: entry.source,
      })
    }
  }
}

/* ------------------------------------------------- sentidos: só no en.json */

/*
 * Darkvision e Low-Light Vision não estão em pack nenhum — o Pathbuilder os
 * manda em `specials`, e sem isto 2 dos 10 nomes do Rurik ficariam sem
 * descrição. Eles vivem no arquivo de localização, sob
 * PF2E.NPC.Abilities.Glossary, com a chave em PascalCase sem hífen.
 */
const glossary = en?.PF2E?.NPC?.Abilities?.Glossary ?? {}
let glossarioAdicionado = 0

for (const [chave, valor] of Object.entries(glossary)) {
  if (typeof valor !== 'string') continue
  // "LowLightVision" -> "Low Light Vision" -> slug "low-light-vision"
  const nome = chave.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/\s+/g, ' ').trim()
  const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const id = `glossary:${slug}`
  if (entries.has(id)) continue

  const html = sanitizeDescription(valor)
  entries.set(id, {
    id,
    slug,
    name: nome,
    kind: 'glossary',
    pack: 'en.json',
    level: null,
    category: null,
    rarity: null,
    traits: [],
    traditions: [],
    actionCost: null,
    descriptionHtml: html,
    descriptionText: toPlainText(html),
    source: null,
  })
  glossarioAdicionado += 1

  reivindicar(nameIndex, normalizeName(nome), id, 'glossary')
  reivindicar(slugIndex, slug, id, 'glossary')
}

/* --------------------------------------------- o Punho, que não está em pack */

/*
 * `Unarmed Strike` precisa existir sempre (§10.3), mas não é equipamento: no
 * Foundry ele é montado em código, na criação do personagem. Em vez de copiar
 * 1d4 bludgeoning para dentro do nosso código e esquecer, extraímos o bloco do
 * arquivo original — e falhamos alto se ele mudar de forma. No dia em que a
 * Paizo mexer no Punho, isto quebra o build em vez de passar calado.
 */
const FONTE_PUNHO = 'src/module/actor/character/document.ts'
const codigo = readFileSync(resolveSystemFile(FONTE_PUNHO, vendor), 'utf8')
const bloco = codigo.match(/slug:\s*"basic-unarmed"[\s\S]{0,1200}?traits:\s*\{\s*value:\s*\[([^\]]*)\]/)
const dano = bloco && codigo.slice(bloco.index).match(/damage:\s*\{\s*dice:\s*(\d+),\s*die:\s*"(d\d+)",\s*damageType:\s*"(\w+)"/)
const categoria = bloco && codigo.slice(bloco.index).match(/category:\s*"(\w+)"/)
const grupo = bloco && codigo.slice(bloco.index).match(/group:\s*"([\w-]+)"/)

if (!bloco || !dano || !categoria || !grupo) {
  console.error(
    `\nNão achei o Punho básico em ${FONTE_PUNHO}.\n` +
      'Ele é montado em código no Foundry, e este script extrai o bloco `slug: "basic-unarmed"`.\n' +
      'Se o arquivo mudou de forma, conserte o extrator — não escreva os números à mão.\n',
  )
  process.exit(1)
}

const punho = {
  id: 'unarmed-strike',
  // Vem do arquivo de localização, como todo nome de tela do Foundry
  name: en?.PF2E?.WeaponTypeUnarmed ?? 'Unarmed Strike',
  category: 'weapon',
  level: 0,
  priceCp: 0,
  bulk: 0,
  traits: [...bloco[1].matchAll(/"([\w-]+)"/g)].map((m) => m[1]),
  weapon: {
    category: categoria[1],
    group: grupo[1],
    hands: 0,
    ranged: false,
    range: null,
    reload: null,
    damage: { dice: Number(dano[1]), die: dano[2], damageType: dano[3] },
  },
  origem: `foundryvtt/pf2e ${FONTE_PUNHO}`,
}

/* ----------------------------------------------- apelidos: as duas travas */

/* Só agora dá para filtrar: o nome de verbete que cobre um apelido pode ter sido
   lido depois dele. */
const aliasIndex = new Map()
let apelidosCobertos = 0
let apelidosAmbiguos = 0

for (const [chave, ids] of apelidosCrus) {
  if (nameIndex.has(chave)) {
    apelidosCobertos += 1
    continue
  }
  if (ids.size > 1) {
    apelidosAmbiguos += 1
    console.warn(`  ! apelido ambíguo, descartado: "${chave}" -> ${[...ids].join(' | ')}`)
    continue
  }
  aliasIndex.set(chave, [...ids][0])
}

/* ------------------------------------------ sentidos, que também são código

   A ficha mostrava como "Sentidos" tudo que resolveu no glossário — e o
   glossário do Foundry tem 55 verbetes, dos quais a maioria não é sentido
   nenhum: Grab, Trample, Shield Block, Ferocity. Somava ainda a lista inteira de
   nomes não resolvidos, e assim "Holy Aura" e "Deity Skill" viravam sentidos do
   Seelah.

   A lista de verdade está no código do sistema, em `SENSE_TYPES` — 17 nomes.
   Extraímos o bloco de lá, como já se faz com o Punho básico, e falhamos alto se
   ele mudar de forma. Dentro dela, os de VISÃO são os que a própria Paizo nomeia
   assim: `darkvision`, `low-light-vision`, `truesight`, `see-invisibility`. Não é
   heurística sobre prosa — é o identificador do sistema, e a lista fechada de 17
   fica impressa no relatório do build para conferência. */

const FONTE_SENTIDOS = 'src/module/actor/creature/values.ts'
const codigoSentidos = readFileSync(resolveSystemFile(FONTE_SENTIDOS, vendor), 'utf8')
const blocoSentidos = codigoSentidos.match(/const SENSE_TYPES = new Set\(\[([\s\S]*?)\]/)
const sentidos = blocoSentidos ? [...blocoSentidos[1].matchAll(/"([\w-]+)"/g)].map((m) => m[1]) : []

if (sentidos.length < 10) {
  console.error(
    `\nNão achei SENSE_TYPES em ${FONTE_SENTIDOS} (vieram ${sentidos.length} sentidos).\n` +
      'Conserte o extrator — não escreva a lista de sentidos à mão.\n',
  )
  process.exit(1)
}

const sentidosDeVisao = sentidos.filter((s) => /vision|sight|^see-/.test(s))

/* --------------------------------------------------------------- gravação */

const dataDir = path.join(ROOT, 'src', 'data')
const serverDataDir = path.join(ROOT, 'server', 'data')
mkdirSync(serverDataDir, { recursive: true })

spellIndex.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name))
conditions.sort((a, b) => a.name.localeCompare(b.name))

writeFileSync(path.join(dataDir, 'index.spells.json'), JSON.stringify(spellIndex))
actionIndex.sort((a, b) => a.name.localeCompare(b.name))
writeFileSync(path.join(dataDir, 'index.actions.json'), JSON.stringify(actionIndex))
writeFileSync(path.join(dataDir, 'conditions.json'), JSON.stringify(conditions))
writeFileSync(
  path.join(dataDir, 'senses.json'),
  `${JSON.stringify({ todos: sentidos, visao: sentidosDeVisao, origem: `foundryvtt/pf2e ${FONTE_SENTIDOS}` }, null, 2)}\n`,
)
writeFileSync(path.join(dataDir, 'unarmed.json'), `${JSON.stringify(punho, null, 2)}\n`)

/* Um arquivo só, concatenado, com um índice de offsets ao lado. Nove mil
   arquivinhos soltos seriam nove mil inodes e um `readdir` lento em Android;
   um JSON gigante seria 30 MB em memória no servidor. */
const binPath = path.join(serverDataDir, 'entries.bin')
const fd = openSync(binPath, 'w')
const offsets = {}
let offset = 0

for (const [id, entry] of entries) {
  const buffer = Buffer.from(JSON.stringify(entry), 'utf8')
  writeSync(fd, buffer, 0, buffer.length, offset)
  offsets[id] = [offset, buffer.length]
  offset += buffer.length
}
closeSync(fd)

writeFileSync(
  path.join(serverDataDir, 'entries.idx.json'),
  JSON.stringify({
    geradoEm: new Date().toISOString().slice(0, 10),
    byteLength: offset,
    /* O desempate de nome, gravado junto: quem for depurar por que "Rage" virou
       feature de classe lê o critério aqui, sem abrir o script. */
    prioridade: PRIORIDADE_DE_NOME,
    entries: offsets,
    names: Object.fromEntries([...nameIndex].map(([k, v]) => [k, v.id])),
    slugs: Object.fromEntries([...slugIndex].map(([k, v]) => [k, v.id])),
    /* Separado de `names` de propósito: nome de verbete e apelido derivado não
       têm o mesmo peso, e quem lê o índice precisa poder saber por qual dos dois
       um nome resolveu. */
    aliases: Object.fromEntries(aliasIndex),
  }),
)

/* ---------------------------------------------------------------- relatório */

const kb = (n) => `${(n / 1024).toFixed(0)} KB`
const bytes = (p) => readFileSync(p).length

console.log(`\nVerbetes por pack:`)
for (const { pack } of PACKS) console.log(`  ${pack.padEnd(18)} ${String(counts[pack]).padStart(5)}`)
console.log(`  ${'en.json (sentidos)'.padEnd(18)} ${String(glossarioAdicionado).padStart(5)}`)
if (semNome) console.log(`  ${String(semNome)} arquivo(s) sem nome, ignorados`)
if (comRefDeAtor)
  console.log(
    `  ${String(comRefDeAtor)} verbete(s) com fórmula que depende do personagem` +
      ` (@actor/@self), mantida como veio`,
  )
if (localizeSemChave)
  console.log(`  ${String(localizeSemChave)} @Localize sem tradução no en.json, macro mantido no texto`)

console.log(`\nGerado:`)
console.log(`  src/data/index.spells.json     ${spellIndex.length} magias, ${kb(bytes(path.join(dataDir, 'index.spells.json')))}`)
const semPericia = actionIndex.filter((a) => a.group === 'skill' && !a.skills.length)
console.log(
  `  src/data/index.actions.json    ${actionIndex.length} ações básicas, de perícia e de classe,` +
    ` ${kb(bytes(path.join(dataDir, 'index.actions.json')))}`,
)
console.log(
  `  ${''.padEnd(28)} ${semPericia.length} sem perícia em fonte nenhuma` +
    (semPericia.length ? `: ${semPericia.map((a) => a.name).join(', ')}` : ''),
)
console.log(`  src/data/conditions.json       ${conditions.length} condições, ${kb(bytes(path.join(dataDir, 'conditions.json')))}`)
console.log(`  src/data/unarmed.json          ${punho.name} ${punho.weapon.damage.dice}${punho.weapon.damage.die} ${punho.weapon.damage.damageType} [${punho.traits.join(' ')}]`)
console.log(`  src/data/senses.json           ${sentidos.length} sentidos, ${sentidosDeVisao.length} de visão: ${sentidosDeVisao.join(', ')}`)
console.log(`  server/data/entries.bin        ${entries.size} verbetes, ${kb(offset)}`)
console.log(`  server/data/entries.idx.json   ${nameIndex.size} nomes indexados, ${kb(bytes(path.join(serverDataDir, 'entries.idx.json')))}`)
console.log(
  `  ${''.padEnd(28)} ${aliasIndex.size} apelidos de categoria` +
    ` (${apelidosCobertos} já eram nome, ${apelidosAmbiguos} descartados por ambiguidade)`,
)
