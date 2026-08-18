import { addCoins, simplifyWallet, spendCopper, toCopper, withWalletCopper } from '../lib/money.js'
import { makeId, normalizeItem, resolveItem } from '../lib/items.js'
import { resolveStartingItems } from '../lib/startingGear.js'
import { SELL_RATE } from '../config.js'
import { emptySheetFields } from './migrations.js'
import { focusPool, nightRest } from '../lib/sheet.js'

/*
 * As regras da mesa. Desde a Fase 3 quem roda este arquivo é o SERVIDOR, não o
 * navegador: ele é o dono único do estado, aplica a ação e devolve o resultado
 * para todos os aparelhos. Por isso duas coisas valem aqui:
 *
 * 1. Nada de ponto de vista. `activePlayerId`, `activeShopId` e `cart` são de
 *    cada aparelho e vivem em `session.js`. Toda ação diz explicitamente em
 *    quem ela mexe.
 * 2. Nada de confiar em preço vindo do cliente. Vender e comprar consultam o
 *    catálogo aqui dentro, com `resolveItem`.
 */

/** Garante que um item novo não vai colidir com um id que já existe na mesa. */
function freshItemId(state, playerId, wanted, prefix) {
  if (wanted && !resolveItem(state, wanted, playerId)) return wanted
  return makeId(prefix)
}

/** Aplica `fn` a um jogador e devolve a lista nova, sem tocar nos outros. */
function mapPlayer(players, playerId, fn) {
  return players.map((player) => (player.id === playerId ? fn(player) : player))
}

/** Soma quantidade de um item na mochila, removendo a chave quando zera. */
function withItemDelta(items, itemId, delta) {
  const next = { ...items }
  const qty = (next[itemId] ?? 0) + delta
  if (qty > 0) next[itemId] = qty
  else delete next[itemId]
  return next
}

/* ------------------------------------------------------ bagagem que chega

   O que o Pathbuilder trazia na mochila e na carteira, entrando UMA vez, na
   primeira vinculação da ficha. Duas funções porque são duas perguntas: o que
   chega (resolvido contra o catálogo, sem olhar para o jogador) e como isso
   entra na mochila de quem recebeu. */

/** Resolve a bagagem da ficha contra o catálogo. `null` se não veio nada. */
function arrivingGear(sheet) {
  const { matched, unmatched } = resolveStartingItems(sheet.startingItems)
  const coins = sheet.startingCoins ?? {}
  const temMoeda = (coins.gold ?? 0) + (coins.silver ?? 0) + (coins.copper ?? 0) > 0
  if (!matched.length && !unmatched.length && !temMoeda) return null

  /* Nome que o catálogo não conhece vira item avulso com o nome que veio, sem
     preço e sem nível: o que a fonte não deu não se inventa. Some da tela seria
     o único desfecho proibido. */
  const custom = unmatched.map((entry) => ({
    item: normalizeItem({
      id: makeId('custom'),
      name: entry.name,
      category: entry.category,
    }),
    qty: entry.qty,
  }))

  return { matched, custom, coins }
}

/** Soma a bagagem à mochila e à carteira. Nunca substitui: só acrescenta. */
function withArrivingGear(player, arrival) {
  if (!arrival) return player

  let items = player.items ?? {}
  for (const { itemId, qty } of arrival.matched) items = withItemDelta(items, itemId, qty)
  for (const { item, qty } of arrival.custom) items = withItemDelta(items, item.id, qty)

  return {
    ...player,
    ...addCoins(player, arrival.coins),
    items,
    customItems: [...(player.customItems ?? []), ...arrival.custom.map((entrada) => entrada.item)],
  }
}

/* --------------------------------------------------------- item que sai

   O bug mais provável desta entrega inteira, e o que menos avisa: um slot
   apontando para um item que já foi vendido continua somando o bônus de CA
   dele. Ninguém descobre na hora — descobre três semanas depois, num combate,
   quando a conta não fecha.

   Por isso a limpeza é UMA função, chamada por toda ação que tira item do
   inventário: vender, excluir, transferir, e o +/- que chega a zero. */

/** O item saiu: sai do slot, do favorito e dos modificadores. */
function withoutItem(player, itemId) {
  const gear = player.gear ?? {}
  const favorites = player.vitals?.favorites ?? {}
  const itemMods = player.itemMods ?? {}

  const equipped = gear.equippedWeaponIds ?? []
  const temFavorito = Object.hasOwn(favorites, itemId)
  const temMod = Object.hasOwn(itemMods, itemId)
  const estavaEquipado =
    gear.wornArmorId === itemId || gear.heldShieldId === itemId || equipped.includes(itemId)

  /* Nada a limpar: devolver o mesmo objeto evita patch e gravação à toa. */
  if (!estavaEquipado && !temFavorito && !temMod) return player

  const novosFavoritos = { ...favorites }
  delete novosFavoritos[itemId]
  const novosMods = { ...itemMods }
  delete novosMods[itemId]

  return {
    ...player,
    gear: {
      ...gear,
      wornArmorId: gear.wornArmorId === itemId ? null : gear.wornArmorId,
      heldShieldId: gear.heldShieldId === itemId ? null : gear.heldShieldId,
      equippedWeaponIds: equipped.filter((id) => id !== itemId),
    },
    vitals: { ...player.vitals, favorites: novosFavoritos },
    itemMods: novosMods,
  }
}

/** A mesma coisa, mas o item mudou de id (renomear cria uma cópia avulsa). */
function renameItemRefs(player, fromId, toId) {
  const gear = player.gear ?? {}
  const favorites = player.vitals?.favorites ?? {}
  const itemMods = player.itemMods ?? {}
  const troca = (id) => (id === fromId ? toId : id)

  const novosFavoritos = { ...favorites }
  if (Object.hasOwn(novosFavoritos, fromId)) {
    delete novosFavoritos[fromId]
    novosFavoritos[toId] = true
  }
  const novosMods = { ...itemMods }
  if (Object.hasOwn(novosMods, fromId)) {
    novosMods[toId] = novosMods[fromId]
    delete novosMods[fromId]
  }

  return {
    ...player,
    gear: {
      ...gear,
      wornArmorId: troca(gear.wornArmorId),
      heldShieldId: troca(gear.heldShieldId),
      equippedWeaponIds: (gear.equippedWeaponIds ?? []).map(troca),
    },
    vitals: { ...player.vitals, favorites: novosFavoritos },
    itemMods: novosMods,
  }
}

/**
 * O invariante que amarra tudo: **nenhum id em `gear` pode estar fora de
 * `player.items`**. Exportado para o teste poder conferir depois de cada ação,
 * em vez de o teste repetir a regra por conta própria.
 */
export function gearIsConsistent(player) {
  const gear = player.gear ?? {}
  const tem = (id) => id == null || Object.hasOwn(player.items ?? {}, id)
  return (
    tem(gear.wornArmorId) &&
    tem(gear.heldShieldId) &&
    (gear.equippedWeaponIds ?? []).every((id) => tem(id))
  )
}

/** Tira a observação de um item — usado sempre que ele sai todo da mochila. */
function withoutNote(itemNotes, itemId) {
  if (!itemNotes[itemId]) return itemNotes
  const next = { ...itemNotes }
  delete next[itemId]
  return next
}

/* ---------------------------------------------------------------- a ficha */

const positive = (value) => {
  const n = Math.round(Number(value))
  return Number.isFinite(n) && n > 0 ? n : 0
}

/** String limpa, ou `null` — nunca guarda um nome de magia em branco. */
const toTrimmed = (value) => {
  const s = String(value ?? '').trim()
  return s || null
}

/* A identidade de uma entrada do grimório. O export do Pathbuilder traz nome e
   círculo, e nada mais — não há id do corpus aqui, então é o par que responde
   "é a mesma magia?". O `\t` não aparece em nome de magia; um `-` apareceria. */
export const spellKey = (rank, name) => `${rank}\t${name}`

const hpMaxOf = (player) => Math.max(1, Math.round(Number(player.sheet?.hpMax) || 1))

/** Sem HP gravado, o personagem está inteiro — nunca em zero. */
const hpNow = (player) => {
  const hp = player.vitals?.hp
  return Number.isFinite(hp) ? hp : hpMaxOf(player)
}

/*
 * O que fica preparado no primeiro import.
 *
 * `vitals.preparedSpells` é fato de mesa (D7): sobrevive à reimportação, e
 * reimportar não pode apagar o que o jogador já escolheu preparar hoje. Só
 * semeia quando ainda está vazio — no vínculo inicial, ou se a ficha ganhou
 * conjuração que não tinha antes. Sem `spellcasting`, ou já com algo
 * preparado, devolve o que já estava lá.
 */
function preparedSpellsFor(sheet, vitals) {
  const atual = vitals.preparedSpells ?? []
  if (atual.length > 0 || !sheet.spellcasting) return atual
  return (sheet.spellcasting.initialPrepared ?? []).map(({ rank, name }) => ({
    uid: makeId('spell'),
    rank,
    name,
    used: false,
  }))
}

/**
 * Mexe só em `vitals`. `fn` devolve os campos que mudaram, ou `null` quando a
 * ação não se aplica — devolver o mesmo estado (e não um clone) é o que faz o
 * servidor não transmitir patch à toa nem gravar arquivo por nada.
 */
function withVitals(state, playerId, fn) {
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return state
  const vitals = player.vitals ?? {}
  const patch = fn(vitals, player)
  if (!patch) return state
  return {
    ...state,
    players: mapPlayer(state.players, playerId, (current) => ({
      ...current,
      vitals: { ...current.vitals, ...patch },
    })),
  }
}

export function reducer(state, action) {
  switch (action.type) {
    case 'SET_SETTINGS':
      // Config da mesa (livros possuídos, remaster/legado): mescla, não substitui.
      return { ...state, settings: { ...state.settings, ...action.settings } }

    // ---------------------------------------------------------------- jogadores

    case 'ADD_PLAYER':
      return {
        ...state,
        players: [
          ...state.players,
          {
            id: makeId('p'),
            name: action.name?.trim() || 'Novo jogador',
            gold: 0,
            silver: 0,
            copper: 0,
            items: {},
            customItems: [],
            itemNotes: {},
            // Nasce sem ficha, e funciona assim: carteira e mochila, como sempre.
            ...emptySheetFields(),
          },
        ],
      }

    case 'RENAME_PLAYER':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          name: action.name,
        })),
      }

    case 'REMOVE_PLAYER': {
      // Sempre precisa sobrar pelo menos um personagem na mesa. Quem estava
      // olhando o excluído cai no primeiro da lista sozinho — é ponto de vista
      // de cada aparelho, resolvido em `reconcileSession`.
      if (state.players.length <= 1) return state
      return { ...state, players: state.players.filter((player) => player.id !== action.playerId) }
    }

    // ----------------------------------------------------------------- dinheiro

    // Troca as moedas miúdas pelas graúdas sem mexer no total: 23 pc viram
    // 2 pp 3 pc. É só apresentação, o saldo em cobre não muda.
    case 'SIMPLIFY_COINS':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          ...simplifyWallet(player),
        })),
      }

    case 'TRANSFER_COINS': {
      const from = state.players.find((player) => player.id === action.fromId)
      if (!from) return state
      const remaining = spendCopper(from, action.amountCp)
      if (!remaining) return state // saldo insuficiente: a tela já avisa antes
      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === action.fromId) return { ...player, ...remaining }
          if (player.id === action.toId) {
            return { ...player, ...withWalletCopper(player, toCopper(player) + action.amountCp) }
          }
          return player
        }),
      }
    }

    case 'ADJUST_COINS':
      // Botão "±" do jogador: soma/subtrai um total em cobre (não por
      // denominação), como no croqui. Nunca deixa o saldo ficar negativo.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) =>
          withWalletCopper(player, Math.max(0, toCopper(player) + action.deltaCp)),
        ),
      }

    case 'SET_COINS':
      // Clicar no dinheiro e definir o valor exato — diferente do "±", que soma/subtrai.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          gold: Math.max(0, Math.round(action.coins.gold ?? 0)),
          silver: Math.max(0, Math.round(action.coins.silver ?? 0)),
          copper: Math.max(0, Math.round(action.coins.copper ?? 0)),
        })),
      }

    case 'GIVE_COINS':
      // Mestre criando dinheiro do nada, para um jogador específico.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          ...addCoins(player, action.coins),
        })),
      }

    case 'SPLIT_COINS': {
      // "Distribuir": a quantia é dividida igualmente, cada um leva sua parte.
      const count = state.players.length
      if (!count) return state
      const share = {
        gold: Math.floor((action.coins.gold ?? 0) / count),
        silver: Math.floor((action.coins.silver ?? 0) / count),
        copper: Math.floor((action.coins.copper ?? 0) / count),
      }
      if (!share.gold && !share.silver && !share.copper) return state
      return {
        ...state,
        players: state.players.map((player) => ({ ...player, ...addCoins(player, share) })),
      }
    }

    // -------------------------------------------------------------- inventário

    case 'GIVE_ITEM':
      // Mestre entregando: entra na mochila sem custo.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          items: withItemDelta(player.items, action.itemId, action.qty ?? 1),
        })),
      }

    case 'CHANGE_ITEM_QTY':
      // A quantidade no inventário é livre: só ajusta a mochila, nunca mexe
      // na carteira. Comprar é na Loja; vender é o botão "Vender".
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const items = withItemDelta(player.items, action.itemId, action.delta)
          const base = { ...player, items }
          // Chegou a zero: o item saiu da mochila e não pode continuar vestido.
          return items[action.itemId] ? base : withoutItem(base, action.itemId)
        }),
      }

    case 'SET_ITEM_NOTE': {
      const note = action.note.trim()
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          itemNotes: note
            ? { ...player.itemNotes, [action.itemId]: note }
            : withoutNote(player.itemNotes, action.itemId),
        })),
      }
    }

    /*
     * A descrição que o jogador escreve para um feat que os packs não conhecem.
     *
     * Mora no PLAYER e não na ficha, de propósito: `sheet` é substituída inteira
     * a cada importação, e o texto que a pessoa digitou não pode morrer porque
     * ela subiu de nível no Pathbuilder. Mesma casa e mesma razão do
     * `itemNotes`. A chave é a de `favorites` (`feat:<id ou nome>`), então
     * reimportar reencontra o texto pelo nome.
     */
    case 'SET_FEAT_NOTE': {
      const text = action.text.trim()
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const featNotes = { ...player.featNotes }
          if (text) featNotes[action.key] = text
          else delete featNotes[action.key]
          return { ...player, featNotes }
        }),
      }
    }

    case 'DROP_ITEM':
      // Excluir tira o item da mochila inteiro. Não devolve dinheiro.
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const items = { ...player.items }
          delete items[action.itemId]
          return withoutItem(
            {
              ...player,
              items,
              customItems: player.customItems.filter((custom) => custom.id !== action.itemId),
              itemNotes: withoutNote(player.itemNotes, action.itemId),
            },
            action.itemId,
          )
        }),
      }

    case 'SELL_ITEM': {
      const item = resolveItem(state, action.itemId, action.playerId)
      if (!item) return state
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const owned = player.items[action.itemId] ?? 0
          const sold = Math.min(owned, action.qty ?? 1)
          if (sold <= 0) return player
          const earnedCp = Math.floor(item.priceCp * SELL_RATE) * sold
          const vendido = {
            ...player,
            ...withWalletCopper(player, toCopper(player) + earnedCp),
            items: withItemDelta(player.items, action.itemId, -sold),
            customItems:
              sold >= owned
                ? player.customItems.filter((custom) => custom.id !== action.itemId)
                : player.customItems,
            itemNotes: sold >= owned ? withoutNote(player.itemNotes, action.itemId) : player.itemNotes,
          }
          // Vendeu a armadura que estava vestindo: a CA precisa cair junto.
          return sold >= owned ? withoutItem(vendido, action.itemId) : vendido
        }),
      }
    }

    case 'TRANSFER_ITEM': {
      const item = resolveItem(state, action.itemId, action.fromId)
      if (!item) return state
      const source = state.players.find((player) => player.id === action.fromId)
      const moved = Math.min(source?.items[action.itemId] ?? 0, action.qty ?? 1)
      if (moved <= 0) return state

      // Item avulso viaja junto com a ficha: ele só existe no inventário de alguém.
      const isCustom = source.customItems.some((custom) => custom.id === action.itemId)
      const leftBehind = (source.items[action.itemId] ?? 0) - moved

      return {
        ...state,
        players: state.players.map((player) => {
          if (player.id === action.fromId) {
            const origem = {
              ...player,
              items: withItemDelta(player.items, action.itemId, -moved),
              customItems:
                isCustom && leftBehind <= 0
                  ? player.customItems.filter((custom) => custom.id !== action.itemId)
                  : player.customItems,
              // A observação é anotação de quem escreveu, não viaja com o item.
              itemNotes: leftBehind <= 0 ? withoutNote(player.itemNotes, action.itemId) : player.itemNotes,
            }
            // Enviou a última: desequipa na origem e o modificador manual morre
            // aqui — ele é do dono, não do item, e não viaja junto.
            return leftBehind <= 0 ? withoutItem(origem, action.itemId) : origem
          }
          if (player.id === action.toId) {
            // Chega guardado, nunca equipado: quem recebe decide o que vestir.
            return {
              ...player,
              items: withItemDelta(player.items, action.itemId, moved),
              customItems:
                isCustom && !player.customItems.some((custom) => custom.id === action.itemId)
                  ? [...player.customItems, item]
                  : player.customItems,
            }
          }
          return player
        }),
      }
    }

    case 'ADD_CUSTOM_ITEM': {
      // Item avulso: vive no inventário de um jogador e não entra no catálogo.
      const item = normalizeItem({
        ...action.item,
        id: freshItemId(state, action.playerId, action.item.id, 'custom'),
      })
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          customItems: [...player.customItems, item],
          items: withItemDelta(player.items, item.id, action.qty ?? 1),
        })),
      }
    }

    case 'UPDATE_CUSTOM_ITEM':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({
          ...player,
          customItems: player.customItems.map((custom) =>
            custom.id === action.item.id ? normalizeItem({ ...custom, ...action.item }) : custom,
          ),
        })),
      }

    case 'RENAME_ITEM': {
      // O item da biblioteca é imutável: renomear cria uma cópia avulsa, que
      // passa a existir só na mochila deste jogador, com os dados todos.
      const current = resolveItem(state, action.itemId, action.playerId)
      if (!current) return state
      const name = action.name?.trim()
      if (!name || name === current.name) return state
      const renamed = normalizeItem({ ...current, id: makeId('custom'), name })

      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const owned = player.items[action.itemId] ?? 0
          if (owned <= 0) return player
          const items = { ...player.items }
          delete items[action.itemId]
          items[renamed.id] = owned
          const note = player.itemNotes?.[action.itemId]
          // Renomear cria uma cópia com id novo. É o MESMO objeto para quem
          // está jogando, então o slot, o favorito e o modificador acompanham —
          // senão a armadura se desveste sozinha ao ganhar um apelido.
          return renameItemRefs({
            ...player,
            items,
            // Renomear de novo troca o avulso antigo, não empilha.
            customItems: [
              ...player.customItems.filter((custom) => custom.id !== action.itemId),
              renamed,
            ],
            itemNotes: note
              ? { ...withoutNote(player.itemNotes, action.itemId), [renamed.id]: note }
              : player.itemNotes,
          }, action.itemId, renamed.id)
        }),
      }
    }

    // ------------------------------------------------------------------- lojas

    case 'BUY_CART': {
      // O carrinho é de cada aparelho, então vem na ação. O preço, não: é lido
      // do catálogo aqui, senão um celular poderia comprar por 1 pc.
      const player = state.players.find((current) => current.id === action.playerId)
      if (!player) return state

      const lines = (action.lines ?? [])
        .map(({ itemId, qty }) => ({ itemId, qty: Math.floor(qty), item: resolveItem(state, itemId) }))
        .filter((line) => line.item && line.qty > 0)
      if (!lines.length) return state

      const totalCp = lines.reduce((sum, line) => sum + line.item.priceCp * line.qty, 0)
      const wallet = spendCopper(player, totalCp)
      if (!wallet) return state // a tela apaga o botão antes de chegar aqui

      let items = player.items
      for (const line of lines) items = withItemDelta(items, line.itemId, line.qty)

      return {
        ...state,
        players: mapPlayer(state.players, player.id, (current) => ({
          ...current,
          ...wallet,
          items,
        })),
      }
    }

    case 'ADD_SHOP': {
      const shop = {
        id: makeId('shop'),
        name: action.name?.trim() || 'Nova loja',
        itemIds: action.itemIds ?? [],
      }
      return { ...state, shops: [...state.shops, shop] }
    }

    case 'UPDATE_SHOP':
      // Salva de uma vez o nome e a composição inteira, vindos da tela de edição.
      return {
        ...state,
        shops: state.shops.map((shop) =>
          shop.id === action.shopId
            ? { ...shop, name: action.name?.trim() || shop.name, itemIds: action.itemIds }
            : shop,
        ),
      }

    case 'REMOVE_SHOP':
      return { ...state, shops: state.shops.filter((shop) => shop.id !== action.shopId) }

    case 'TOGGLE_SHOP_ITEM':
      return {
        ...state,
        shops: state.shops.map((shop) => {
          if (shop.id !== action.shopId) return shop
          const has = shop.itemIds.includes(action.itemId)
          return {
            ...shop,
            itemIds: has
              ? shop.itemIds.filter((id) => id !== action.itemId)
              : [...shop.itemIds, action.itemId],
          }
        }),
      }

    // ------------------------------------------------------------- biblioteca

    case 'ADD_CAMPAIGN_ITEMS': {
      // Dois aparelhos podem importar o mesmo JSON ao mesmo tempo: o id vem
      // pronto do importador, e aqui é o único lugar que enxerga a mesa
      // inteira para saber se ele já está tomado.
      const added = action.items.map((item) =>
        normalizeItem({ ...item, id: freshItemId(state, null, item.id, 'camp') }),
      )
      return { ...state, campaignItems: [...state.campaignItems, ...added] }
    }

    case 'UPDATE_CAMPAIGN_ITEM':
      return {
        ...state,
        campaignItems: state.campaignItems.map((item) =>
          item.id === action.item.id ? normalizeItem({ ...item, ...action.item }) : item,
        ),
      }

    case 'REMOVE_CAMPAIGN_ITEM':
      return {
        ...state,
        campaignItems: state.campaignItems.filter((item) => item.id !== action.itemId),
        // Sai também das prateleiras, senão a loja fica com um item fantasma.
        shops: state.shops.map((shop) => ({
          ...shop,
          itemIds: shop.itemIds.filter((id) => id !== action.itemId),
        })),
        /* E sai do corpo de quem estava usando. O item continua na mochila de
           quem tem (a mesa não confisca nada), mas o slot não pode apontar para
           uma armadura que a biblioteca não conhece mais. */
        players: state.players.map((player) => withoutItem(player, action.itemId)),
      }

    // ---------------------------------------------------------------- a ficha

    /*
     * Importar e atualizar são a mesma coisa e por isso dividem o caso: os dois
     * substituem `player.sheet` INTEIRA (D4). Não existe política de merge —
     * subir de nível é reimportar, e mesclar duas fichas seria inventar qual
     * metade vale.
     *
     * O que sobrevive: carteira, mochila, itens avulsos, observações, `vitals`,
     * `gear` e `itemMods`. A ficha diz quem o personagem é; o resto é o que
     * aconteceu na mesa, e isso não se perde numa reimportação.
     *
     * A ÚNICA diferença entre os dois é a bagagem: `IMPORT_SHEET` — vincular
     * ficha a quem não tinha — despeja na mochila e na carteira o que estava no
     * Pathbuilder; `UPDATE_SHEET` não encosta em item nem em moeda. Depois da
     * primeira vez, quem manda no inventário é a mesa: reimportar para subir de
     * nível não pode ressuscitar a poção que o grupo bebeu nem devolver o ouro
     * que já foi gasto. Por isso a bagagem entra somando, nunca substituindo.
     */
    case 'IMPORT_SHEET':
    case 'UPDATE_SHEET': {
      const sheet = action.sheet
      if (!sheet || typeof sheet !== 'object') return state
      const hpMax = Math.max(1, Math.round(Number(sheet.hpMax) || 1))
      /* A bagagem não depende de quem recebe: resolve aqui fora, e o callback
         abaixo fica só com o que é do jogador. */
      const bagagem = action.type === 'IMPORT_SHEET' ? arrivingGear(sheet) : null

      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const vitals = player.vitals ?? {}
          /* Quem estava ferido continua ferido: o HP atual atravessa a
             reimportação. Se o novo máximo for menor (perdeu Con, por exemplo),
             o atual desce junto — mas nunca sobe sozinho para o teto novo. */
          const hp = Math.min(vitals.hp ?? hpMax, hpMax)
          const comFicha = {
            ...player,
            sheet,
            vitals: { ...vitals, hp, preparedSpells: preparedSpellsFor(sheet, vitals) },
          }
          return withArrivingGear(comFicha, bagagem)
        }),
      }
    }

    /* Remover a ficha nunca apaga item, moeda nem observação — e nem `vitals`,
       `gear` ou `itemMods`. Só some o "quem o personagem é". */
    case 'REMOVE_SHEET':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => ({ ...player, sheet: null })),
      }

    // ------------------------------------------------------------- equipar

    /*
     * Slots nomeados, não uma marca `equipped` em cada item. Com slot, o estado
     * inválido — duas armaduras vestidas ao mesmo tempo — não é representável:
     * `wornArmorId` é um campo só, e vestir a segunda simplesmente sobrescreve.
     *
     * Armas são várias, e **não validamos número de mãos**. Validar exigiria
     * rastrear qual mão está com o quê a cada turno, que é contabilidade de
     * combate — fora do escopo, e o tipo de regra que atrapalha mais do que
     * ajuda em pé, no meio da mesa.
     */
    case 'EQUIP_ITEM': {
      const item = resolveItem(state, action.itemId, action.playerId)
      if (!item) return state

      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          // Só equipa o que está na mochila — é o invariante que impede slot
          // apontando para item que o jogador não tem.
          if (!player.items?.[action.itemId]) return player
          const gear = player.gear ?? {}

          if (item.category === 'armor') {
            return { ...player, gear: { ...gear, wornArmorId: action.itemId } }
          }
          if (item.category === 'shield') {
            return {
              ...player,
              gear: { ...gear, heldShieldId: action.itemId },
              // Escudo novo entra inteiro e baixado.
              vitals: {
                ...player.vitals,
                shieldHp: Number(item.shield?.hpMax) || 0,
                shieldRaised: false,
              },
            }
          }
          if (item.category === 'weapon') {
            const atuais = gear.equippedWeaponIds ?? []
            if (atuais.includes(action.itemId)) return player
            return { ...player, gear: { ...gear, equippedWeaponIds: [...atuais, action.itemId] } }
          }
          // Corda e sabão não se vestem.
          return player
        }),
      }
    }

    case 'UNEQUIP_ITEM':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const gear = player.gear ?? {}
          const eraEscudo = gear.heldShieldId === action.itemId
          return {
            ...player,
            gear: {
              ...gear,
              wornArmorId: gear.wornArmorId === action.itemId ? null : gear.wornArmorId,
              heldShieldId: eraEscudo ? null : gear.heldShieldId,
              equippedWeaponIds: (gear.equippedWeaponIds ?? []).filter((id) => id !== action.itemId),
            },
            // Guardar o escudo baixa a guarda junto: escudo na mochila não
            // pode continuar "erguido" dando bônus de CA.
            vitals: eraEscudo ? { ...player.vitals, shieldRaised: false } : player.vitals,
          }
        }),
      }

    /*
     * Modificadores manuais (D6). É a saída honesta para tudo que o motor não
     * sabe calcular: Rage, Giant Instinct, weapon specialization, runa. O
     * rótulo é livre e aparece no breakdown como parcela nomeada — o app não
     * chuta, o jogador declara.
     *
     * Limitação aceita: `player.items` é `{ id: quantidade }`, não instâncias,
     * então o modificador vale para a pilha inteira. Não dá para ter uma adaga
     * com runa e outra sem. Mudar isso reescreveria compra, venda,
     * transferência e a Loja.
     */
    case 'SET_ITEM_MODS':
      return {
        ...state,
        players: mapPlayer(state.players, action.playerId, (player) => {
          const mods = { ...(player.itemMods ?? {}) }
          const lista = (action.mods ?? [])
            .map((mod) => ({
              label: String(mod.label ?? '').trim(),
              atk: Math.round(Number(mod.atk) || 0),
              dmg: Math.round(Number(mod.dmg) || 0),
              extraDice: Math.round(Number(mod.extraDice) || 0),
            }))
            // Modificador sem rótulo não explica nada no breakdown, e é
            // exatamente o que a espec proíbe: número que aparece sem dizer
            // de onde veio.
            .filter((mod) => mod.label)

          if (lista.length) mods[action.itemId] = lista
          else delete mods[action.itemId]
          return { ...player, itemMods: mods }
        }),
      }

    // ------------------------------------------------------- HP e condições

    /* Dano come o HP temporário antes do real (§10.8), e o HP não passa de
       zero para baixo: morrendo é a condição Dying, não HP negativo. */
    case 'APPLY_DAMAGE':
      return withVitals(state, action.playerId, (vitals, player) => {
        const amount = positive(action.amount)
        if (!amount || !player.sheet) return null
        const fromTemp = Math.min(vitals.tempHp ?? 0, amount)
        const hp = hpNow(player)
        return {
          tempHp: (vitals.tempHp ?? 0) - fromTemp,
          hp: Math.max(0, hp - (amount - fromTemp)),
        }
      })

    case 'APPLY_HEAL':
      return withVitals(state, action.playerId, (vitals, player) => {
        const amount = positive(action.amount)
        if (!amount || !player.sheet) return null
        return { hp: Math.min(hpMaxOf(player), hpNow(player) + amount) }
      })

    /* HP temporário não empilha: vale o maior entre o que já tinha e o novo
       (§10.8). Definir 0 zera, que é como se tira o que sobrou. */
    case 'SET_TEMP_HP':
      return withVitals(state, action.playerId, (vitals) => {
        const value = Math.max(0, Math.round(Number(action.value) || 0))
        return { tempHp: value === 0 ? 0 : Math.max(vitals.tempHp ?? 0, value) }
      })

    /* Condição em zero (ou desmarcada) some do objeto em vez de virar `0`:
       "Frightened 0" não é uma condição ativa, é a ausência dela. */
    case 'SET_CONDITION':
      return withVitals(state, action.playerId, (vitals) => {
        const conditions = { ...(vitals.conditions ?? {}) }
        const value = action.value
        if (value === true) conditions[action.key] = true
        else if (typeof value === 'number' && value > 0) conditions[action.key] = Math.round(value)
        else delete conditions[action.key]
        return { conditions }
      })

    /* O mapa inteiro de uma vez. É o que o "Cancelar" da folha de condições
       despacha: ele desfaz tudo o que foi mexido enquanto a folha esteve
       aberta, e desfazer em vinte despachos separados deixaria o personagem
       meio revertido se o Wi-Fi cair no meio. Normaliza igual ao SET_CONDITION
       — valor zero ou lixo não entra. */
    case 'SET_CONDITIONS':
      return withVitals(state, action.playerId, () => {
        const conditions = {}
        for (const [key, bruto] of Object.entries(action.conditions ?? {})) {
          if (bruto === true) conditions[key] = true
          else if (Number(bruto) > 0) conditions[key] = Math.round(Number(bruto))
        }
        return { conditions }
      })

    case 'CLEAR_CONDITIONS':
      return withVitals(state, action.playerId, () => ({ conditions: {} }))

    /*
     * Descanso noturno (§10.7). Uma ação só, e não quatro despachos da tela:
     * cura, HP temporário, foco, slots e Doomed mudam juntos ou não mudam. Em
     * quatro idas ao servidor, um Wi-Fi que oscila no meio deixaria o
     * personagem curado e ainda Doomed.
     *
     * Por personagem, aplicando só a ele (resposta 2 da §17). Um "descanso do
     * grupo" na aba Mestre fica anotado como sugestão futura.
     */
    case 'REST':
      return withVitals(state, action.playerId, (vitals, player) => {
        if (!player.sheet) return null
        const { curado, ...patch } = nightRest(player.sheet, vitals)
        return {
          ...patch,
          /* "Repõe os slots preparados" (§10.7): a magia continua preparada,
             só o gasto do dia zera. Truque (rank 0) nunca fica marcado usado —
             não tem gasto para zerar — mas passar por aqui não faz mal. A
             lista especial (item, ritual) não é tocada: o app não sabe a
             regra de recarga dela, e chutar seria pior que deixar como está. */
          preparedSpells: (vitals.preparedSpells ?? []).map((p) => ({ ...p, used: false })),
        }
      })

    // ------------------------------------------------------- foco e escudo

    /* A reserva é um ponto por magia de foco, até três (`focusPool`). Sem magia
       de foco não há o que gastar nem o que repor. */
    case 'SET_FOCUS':
      return withVitals(state, action.playerId, (vitals, player) => {
        const pool = focusPool(player.sheet, vitals)
        if (!pool) return null
        return { focusPoints: Math.min(pool, Math.max(0, Math.round(Number(action.value) || 0))) }
      })

    case 'TOGGLE_SHIELD_RAISED':
      return withVitals(state, action.playerId, (vitals, player) => {
        // Erguer escudo que não está empunhado seria bônus fantasma na CA.
        if (!player.gear?.heldShieldId) return null
        return { shieldRaised: !vitals.shieldRaised }
      })

    case 'SET_SHIELD_HP':
      return withVitals(state, action.playerId, (vitals, player) => {
        const shield = resolveItem(state, player.gear?.heldShieldId, player.id)
        const max = Math.max(0, Math.round(Number(shield?.shield?.hpMax) || 0))
        if (!max) return null
        return { shieldHp: Math.min(max, Math.max(0, Math.round(Number(action.value) || 0))) }
      })

    /* Favorito é do personagem, não de quem está olhando (§14) — por isso mora
       na mesa e não na sessão do aparelho. A chave é livre: id de item, slug de
       feat, id de ação. */
    case 'TOGGLE_FAVORITE':
      return withVitals(state, action.playerId, (vitals) => {
        if (!action.key) return null
        const favorites = { ...(vitals.favorites ?? {}) }
        if (favorites[action.key]) delete favorites[action.key]
        else favorites[action.key] = true
        return { favorites }
      })

    // -------------------------------------------------------------- magias

    /*
     * Preparar gasta um slot do círculo; a lista especial (D6 do lado das
     * magias: item, ritual, concessão do mestre) não gasta nada. As duas
     * moram em `vitals` porque são fato de mesa — sobrevivem à reimportação —
     * e nenhuma das duas entra no histórico: mudam demais por sessão.
     */
    case 'PREPARE_SPELL':
      return withVitals(state, action.playerId, (vitals, player) => {
        const spellcasting = player.sheet?.spellcasting
        const name = toTrimmed(action.name)
        if (!spellcasting || !name) return null

        const rank = Math.max(0, Math.round(Number(action.rank) || 0))
        const vagas = Math.max(0, Math.round(Number(spellcasting.perDay?.[rank]) || 0))
        const preparadas = vitals.preparedSpells ?? []
        const ocupadas = preparadas.filter((p) => p.rank === rank).length
        if (ocupadas >= vagas) return null // sem slot livre neste círculo

        return {
          preparedSpells: [...preparadas, { uid: makeId('spell'), rank, name, used: false }],
        }
      })

    /* Livre, sem limite de slot — a "Lista especial" (magia de item, ritual,
       concessão do mestre). `rank` é só rótulo aqui: nada consome vaga. */
    case 'ADD_SPELL':
      return withVitals(state, action.playerId, (vitals, player) => {
        const name = toTrimmed(action.name)
        if (!player.sheet?.spellcasting || !name) return null
        const rank = action.rank == null ? null : Math.max(0, Math.round(Number(action.rank) || 0))
        return {
          extraSpells: [...(vitals.extraSpells ?? []), { uid: makeId('spell'), rank, name, used: false }],
        }
      })

    /*
     * Magia copiada para o grimório na mesa (o mago achou um pergaminho, o
     * mestre concedeu). Mora em `vitals`, e não em `sheet.spellcasting.book`,
     * pela mesma razão das preparadas: é fato de mesa, e a `sheet` inteira é
     * substituída na próxima importação do Pathbuilder. Guardar ali apagaria
     * a magia no dia em que a pessoa reimportasse a ficha.
     *
     * Não repete o que o export já trouxe nem o que já foi acrescentado — o
     * mesmo nome no mesmo círculo é a mesma entrada do grimório.
     */
    case 'ADD_BOOK_SPELL':
      return withVitals(state, action.playerId, (vitals, player) => {
        const spellcasting = player.sheet?.spellcasting
        const name = toTrimmed(action.name)
        if (!spellcasting || !name) return null

        const rank = Math.max(0, Math.round(Number(action.rank) || 0))
        const chave = spellKey(rank, name)

        /* Aprender de novo o que tinha sido esquecido desfaz o esquecimento;
           não vira uma segunda cópia da mesma magia no mesmo círculo. */
        const esquecidas = vitals.forgottenSpells ?? []
        if (esquecidas.includes(chave)) {
          return { forgottenSpells: esquecidas.filter((k) => k !== chave) }
        }

        const jaTem = (lista) => lista.some((sp) => spellKey(sp.rank, sp.name) === chave)
        if (jaTem(spellcasting.book ?? [])) return null
        const acrescentadas = vitals.bookSpells ?? []
        if (jaTem(acrescentadas)) return null

        return { bookSpells: [...acrescentadas, { uid: makeId('spell'), rank, name }] }
      })

    /*
     * Esquecer uma magia do grimório. As duas origens saem pelo mesmo botão,
     * por caminhos diferentes: a copiada na mesa tem `uid` e é apagada; a que
     * veio do export do Pathbuilder não pode ser apagada (a `sheet` é
     * substituída inteira na reimportação), então entra numa lista de
     * esquecidas que a tela subtrai. É o que faz o esquecimento sobreviver a
     * reimportar a ficha, em vez de a magia reaparecer sozinha.
     */
    case 'REMOVE_BOOK_SPELL':
      return withVitals(state, action.playerId, (vitals, player) => {
        const acrescentadas = vitals.bookSpells ?? []
        if (action.uid && acrescentadas.some((sp) => sp.uid === action.uid)) {
          return { bookSpells: acrescentadas.filter((sp) => sp.uid !== action.uid) }
        }

        const name = toTrimmed(action.name)
        if (!name) return null
        const chave = spellKey(Math.max(0, Math.round(Number(action.rank) || 0)), name)
        const esquecidas = vitals.forgottenSpells ?? []
        if (esquecidas.includes(chave)) return null
        return { forgottenSpells: [...esquecidas, chave] }
      })

    /*
     * Magia de foco ganha na mesa (feat de classe, dádiva do mestre). Mesma
     * razão do grimório para morar em `vitals`: a `sheet` é substituída na
     * próxima importação.
     */
    case 'ADD_FOCUS_SPELL':
      return withVitals(state, action.playerId, (vitals, player) => {
        const spellcasting = player.sheet?.spellcasting
        const name = toTrimmed(action.name)
        if (!spellcasting || !name) return null

        /* Retomar o que tinha sido esquecido desfaz o esquecimento, em vez de
           criar uma segunda cópia — mesmo caminho do grimório. */
        const esquecidas = vitals.forgottenFocusSpells ?? []
        if (esquecidas.includes(name)) {
          return { forgottenFocusSpells: esquecidas.filter((n) => n !== name) }
        }

        const doExport = [...(spellcasting.focusCantrips ?? []), ...(spellcasting.focusSpells ?? [])]
        if (doExport.includes(name)) return null
        const acrescentadas = vitals.extraFocusSpells ?? []
        if (acrescentadas.some((sp) => sp.name === name)) return null

        return { extraFocusSpells: [...acrescentadas, { uid: makeId('spell'), name }] }
      })

    /* Simétrico ao grimório: a de mesa tem `uid` e some; a que veio da ficha
       entra na lista de esquecidas, porque a `sheet` é substituída inteira na
       próxima importação e apagar lá não duraria. */
    case 'REMOVE_FOCUS_SPELL':
      return withVitals(state, action.playerId, (vitals) => {
        const acrescentadas = vitals.extraFocusSpells ?? []
        if (action.uid && acrescentadas.some((sp) => sp.uid === action.uid)) {
          return { extraFocusSpells: acrescentadas.filter((sp) => sp.uid !== action.uid) }
        }

        const name = toTrimmed(action.name)
        if (!name) return null
        const esquecidas = vitals.forgottenFocusSpells ?? []
        if (esquecidas.includes(name)) return null
        return { forgottenFocusSpells: [...esquecidas, name] }
      })

    /* Uma instância só, identificada por uid — pode estar preparada ou na
       lista especial, então procura nas duas em vez de pedir à tela para
       dizer qual. */
    case 'REMOVE_SPELL':
      return withVitals(state, action.playerId, (vitals) => {
        const preparedSpells = (vitals.preparedSpells ?? []).filter((p) => p.uid !== action.uid)
        const extraSpells = (vitals.extraSpells ?? []).filter((p) => p.uid !== action.uid)
        const mudouPreparada = preparedSpells.length !== (vitals.preparedSpells ?? []).length
        const mudouExtra = extraSpells.length !== (vitals.extraSpells ?? []).length
        if (!mudouPreparada && !mudouExtra) return null
        return { preparedSpells, extraSpells }
      })

    /* Marca "já usei hoje" numa magia preparada ou da lista especial. Truque
       não tem gasto — a tela não oferece a caixa para ele, e mesmo que
       chegasse aqui, marcar e desmarcar não muda nada visível. */
    case 'USE_SPELL_SLOT':
      return withVitals(state, action.playerId, (vitals) => {
        const alternar = (lista) =>
          lista.map((p) => (p.uid === action.uid ? { ...p, used: !p.used } : p))
        const preparadas = vitals.preparedSpells ?? []
        const extras = vitals.extraSpells ?? []
        if (preparadas.some((p) => p.uid === action.uid)) {
          return { preparedSpells: alternar(preparadas) }
        }
        if (extras.some((p) => p.uid === action.uid)) {
          return { extraSpells: alternar(extras) }
        }
        return null
      })

    case 'RESET':
      return action.state

    default:
      return state
  }
}
