/* A resolução de nomes contra o corpus do Foundry, com os dez nomes do Rurik.
 *
 * Metade destes testes existe por causa de uma frase da espec: "errar em
 * silêncio é o único erro inaceitável". Nome que o Pathbuilder mandou e o
 * corpus não conhece precisa aparecer na tela do jeito que veio — não pode
 * sumir, e não pode virar outro parecido.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { parsePathbuilder } from '../src/lib/pathbuilder.js'
import { applyResolution, fetchEntriesByName, namesToResolve } from '../src/lib/loreResolve.js'
import { createEntries } from '../server/entries.js'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const RURIK = parsePathbuilder(readFileSync(path.join(ROOT, 'docs/fixtures/rurik.json'), 'utf8'))

/* O corpus é gerado por `npm run build:lore` e não vai para o Git (15 MB). Sem
   ele, os testes que dependem do corpus são pulados em vez de falharem: quem
   clonou o repositório e não rodou a ingestão não fez nada de errado. */
const TEM_CORPUS = existsSync(path.join(ROOT, 'server/data/entries.bin'))
const seComCorpus = { skip: TEM_CORPUS ? false : 'rode `npm run build:lore` primeiro' }

/** Um `fetch` de mentira que fala direto com o corpus, sem subir servidor. */
function fetcherLocal() {
  const entries = createEntries()
  return async (url) => {
    const names = decodeURIComponent(new URL(url, 'http://x').searchParams.get('names') ?? '')
      .split(',')
      .filter(Boolean)
    const achados = []
    const resolved = {}
    const unresolved = []
    for (const name of names) {
      const id = entries.resolveName(name)
      const entry = id ? entries.get(id) : null
      if (entry) {
        resolved[name] = entry.id
        achados.push(entry)
      } else {
        unresolved.push(name)
      }
    }
    return {
      ok: true,
      json: async () => ({
        entries: Object.fromEntries(achados.map((e) => [e.id, e])),
        resolved,
        unresolved,
      }),
    }
  }
}

test('a ficha pede nove nomes: quatro feats e cinco specials, sem repetir', () => {
  const nomes = namesToResolve(RURIK)

  // A espec fala em "10 nomes", contando o `Sailing Lore` como sonda — mas ele
  // é perícia e nunca chega aqui. Os que a ficha realmente pergunta são nove:
  // "Dromaar" está em `feats` E em `specials`, e pedir duas vezes é desperdício.
  assert.equal(nomes.filter((n) => n === 'Dromaar').length, 1)
  assert.deepEqual([...nomes].sort(), [
    'Darkvision',
    'Dromaar',
    'Giant Instinct',
    'Low-Light Vision',
    'Orc Ferocity',
    'Quick-Tempered',
    'Rage',
    'Sudden Charge',
    'Underwater Marauder',
  ])
})

test('todos os nove resolvem: sete nos packs, dois no glossário', seComCorpus, async () => {
  const resultado = await fetchEntriesByName(namesToResolve(RURIK), fetcherLocal())

  assert.equal(Object.keys(resultado.resolved).length, 9)
  assert.deepEqual(resultado.unresolved, [])

  const kinds = Object.values(resultado.resolved).map((id) => resultado.entries[id].kind)
  assert.equal(kinds.filter((k) => k === 'glossary').length, 2)
})

test('o desempate obrigatório manda: Rage é feature de classe, Dromaar é herança', seComCorpus, async () => {
  const { entries, resolved } = await fetchEntriesByName(['Rage', 'Dromaar', 'Quick-Tempered'], fetcherLocal())

  // "Rage" existe em `actions` E em `class-features`; sem ordem fixa, o mesmo
  // personagem importado duas vezes mostraria descrições diferentes
  assert.equal(entries[resolved.Rage].kind, 'class-feature')
  assert.equal(entries[resolved.Dromaar].kind, 'heritage')
  assert.equal(entries[resolved['Quick-Tempered']].kind, 'class-feature')
})

test('os sentidos vêm do arquivo de localização, não de pack', seComCorpus, async () => {
  const { entries, resolved } = await fetchEntriesByName(['Darkvision', 'Low-Light Vision'], fetcherLocal())

  for (const nome of ['Darkvision', 'Low-Light Vision']) {
    const entry = entries[resolved[nome]]
    assert.ok(entry, `${nome} tinha que resolver`)
    assert.equal(entry.kind, 'glossary')
    assert.ok(entry.descriptionText.length > 40, 'sentido sem descrição não serve de nada')
  }
})

test('"Sailing Lore" não resolver está certo — é perícia, não feat', seComCorpus, async () => {
  const { resolved, unresolved } = await fetchEntriesByName(['Sailing Lore'], fetcherLocal())
  assert.deepEqual(resolved, {})
  assert.deepEqual(unresolved, ['Sailing Lore'])
})

test('nada de casamento aproximado: nome quase certo não resolve', seComCorpus, async () => {
  const { resolved, unresolved } = await fetchEntriesByName(
    ['Ragee', 'Sudden Charg', 'Giant Instincts'],
    fetcherLocal(),
  )
  assert.deepEqual(resolved, {})
  assert.equal(unresolved.length, 3)
})

test('caixa e espaço a mais não atrapalham; o nome ainda é exato', seComCorpus, async () => {
  const { resolved } = await fetchEntriesByName(['  giant   instinct ', 'RAGE'], fetcherLocal())
  assert.equal(Object.keys(resolved).length, 2)
})

test('a ficha resolvida separa feature de ação e guarda a descrição', seComCorpus, async () => {
  const resultado = await fetchEntriesByName(namesToResolve(RURIK), fetcherLocal())
  const sheet = applyResolution(RURIK, resultado)

  const byName = Object.fromEntries(sheet.feats.map((f) => [f.name, f]))

  assert.equal(byName['Sudden Charge'].kind, 'feat')
  assert.ok(byName['Sudden Charge'].descriptionHtml.includes('<p>'))
  assert.deepEqual(byName['Sudden Charge'].actionCost, { type: 'action', value: 2 })
  assert.ok(byName['Sudden Charge'].entrySource.title, 'a atribuição da licença viaja com o verbete')

  assert.equal(byName['Giant Instinct'].kind, 'class-feature')
  assert.equal(byName['Giant Instinct'].actionCost, null, 'feature passiva não tem custo')
  assert.equal(byName.Darkvision.kind, 'glossary')

  // "Dromaar" veio das duas listas e aparece uma vez só
  assert.equal(sheet.feats.filter((f) => f.name === 'Dromaar').length, 1)
})

test('o que não resolve continua na lista, com o nome que veio', seComCorpus, async () => {
  const comInventado = {
    ...RURIK,
    specials: [...RURIK.specials, 'Fúria do Julio'],
  }
  const resultado = await fetchEntriesByName(namesToResolve(comInventado), fetcherLocal())
  const sheet = applyResolution(comInventado, resultado)

  const orfao = sheet.feats.find((f) => f.name === 'Fúria do Julio')
  assert.ok(orfao, 'nome que não resolve não pode sumir da tela')
  assert.equal(orfao.resolved, false)
  assert.equal(orfao.descriptionHtml, null, 'sem descrição é melhor que descrição errada')
  assert.ok(sheet.unresolved.includes('Fúria do Julio'))
})

test('servidor fora do ar: a ficha entra assim mesmo, sem descrição', async () => {
  const caindo = async () => ({ ok: false, status: 503, json: async () => ({}) })
  const resultado = await fetchEntriesByName(namesToResolve(RURIK), caindo)
  const sheet = applyResolution(RURIK, resultado)

  assert.equal(resultado.unresolved.length, 9)
  assert.equal(sheet.feats.length + sheet.actions.length, 9, 'ninguém some')
  assert.equal(sheet.unresolved.length, 9)
})

test('fetch que lança não derruba a importação', async () => {
  const explode = async () => {
    throw new Error('rede caiu')
  }
  const resultado = await fetchEntriesByName(['Rage'], explode)
  assert.deepEqual(resultado.unresolved, ['Rage'])
})

test('lista vazia não vai à rede', async () => {
  let chamou = false
  await fetchEntriesByName([], async () => {
    chamou = true
    return { ok: true, json: async () => ({}) }
  })
  assert.equal(chamou, false)
})

/* --------------------------------------------------------- o corpus em si */

test('o corpus tem os packs todos, e as colisões de slug não comeram magias', seComCorpus, () => {
  const entries = createEntries()
  assert.equal(entries.ok, true)

  // `fly` é ação E magia; `pack-attack` é feat E magia. Guardar por slug puro
  // fazia a magia sumir do compêndio sem um pio.
  assert.ok(entries.get('spell:fly'), 'a magia Fly precisa existir')
  assert.ok(entries.get('action:fly'), 'a ação Fly também')
  assert.notEqual(entries.get('spell:fly').name, entries.get('action:fly').name === null)

  const spells = JSON.parse(readFileSync(path.join(ROOT, 'src/data/index.spells.json'), 'utf8'))
  assert.ok(spells.length > 1900, `esperava ~1.993 magias, veio ${spells.length}`)
  entries.close()
})

test('o índice de magias do bundle não carrega descrição', seComCorpus, () => {
  const spells = JSON.parse(readFileSync(path.join(ROOT, 'src/data/index.spells.json'), 'utf8'))
  for (const spell of spells) {
    assert.equal('descriptionHtml' in spell, false)
    assert.equal('descriptionText' in spell, false)
  }
  const tamanho = readFileSync(path.join(ROOT, 'src/data/index.spells.json')).length
  // Subiu de ~445 KB para ~605 KB na fase 11: o compêndio ganhou `source`
  // (título e remaster do livro), sem o qual não dá para aplicar o mesmo
  // filtro de conteúdo do catálogo (resposta 1 da §17).
  assert.ok(tamanho < 700 * 1024, `índice de magias em ${(tamanho / 1024).toFixed(0)} KB, acima do teto`)
})

test('as 43 condições vêm inteiras, em inglês, e sabem quais têm valor', seComCorpus, () => {
  const conditions = JSON.parse(readFileSync(path.join(ROOT, 'src/data/conditions.json'), 'utf8'))
  assert.equal(conditions.length, 43)

  const byName = Object.fromEntries(conditions.map((c) => [c.name, c]))
  assert.ok(byName.Frightened, 'em inglês, como o pack publica')
  assert.equal(byName.Frightened.valued, true)
  assert.equal(byName.Prone.valued, false)
  assert.ok(byName.Frightened.descriptionText.length > 60)
})

test('o Punho foi extraído do código do Foundry, não escrito à mão', seComCorpus, () => {
  const punho = JSON.parse(readFileSync(path.join(ROOT, 'src/data/unarmed.json'), 'utf8'))

  assert.deepEqual(punho.weapon.damage, { dice: 1, die: 'd4', damageType: 'bludgeoning' })
  assert.equal(punho.weapon.category, 'unarmed')
  assert.ok(punho.traits.includes('agile'))
  assert.ok(punho.traits.includes('finesse'))
  assert.match(punho.origem, /foundryvtt\/pf2e/)
})

test('verbete inexistente devolve null em vez de lançar', seComCorpus, () => {
  const entries = createEntries()
  assert.equal(entries.get('feat:nao-existe-isso'), null)
  assert.equal(entries.get(''), null)
  assert.equal(entries.get(null), null)
  entries.close()
})

test('sem o corpus gerado, o leitor diz o que fazer em vez de quebrar', () => {
  // Só a forma do contrato: com corpus presente ele responde ok
  const entries = createEntries()
  if (entries.ok) {
    assert.ok(entries.size > 10_000)
    entries.close()
  } else {
    assert.match(entries.motivo, /build:lore/)
    assert.equal(entries.get('qualquer'), null)
  }
})
