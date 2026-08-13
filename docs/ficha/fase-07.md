# Fase 7 — Equipar itens + invariantes

**Modelo: Opus** · **Depende de:** fase 6 · **Ler antes:** espec §8, §13

Fase de risco alto: é onde a ficha encosta no inventário que já existe e é usado.
O bug clássico daqui — slot apontando para item vendido — dá bônus de CA fantasma
e ninguém descobre na hora.

## Arquivos

- `src/state/reducer.js` — `EQUIP_ITEM`, `UNEQUIP_ITEM`, `SET_ITEM_MODS`, e os
  invariantes nas ações já existentes
- `src/components/ItemRow.jsx` — controles
- `src/components/ItemForm.jsx` — ficha técnica (D13)
- `src/screens/InventoryScreen.jsx`
- `test/gear.test.js` (novo)

## Slots

```js
gear = { wornArmorId, heldShieldId, equippedWeaponIds: [] }
```

Slots nomeados, **não** flag `equipped` por item: com slot, o estado inválido
(duas armaduras vestidas) não é representável.

- Uma armadura vestida; vestir outra desveste a anterior.
- Um escudo empunhado.
- Armas: várias equipadas. **Não validar número de mãos** — exigiria rastrear a
  mão a cada turno, que é contabilidade de combate, fora do escopo.
- Controle na linha do item, junto de vender/enviar/excluir. Rótulo por tipo:
  **Vestir** (armadura), **Empunhar** (escudo), **Equipar** (arma). `--accent`,
  não `--danger`.
- **Só aparece quando `player.sheet` existe.**

## Invariantes — o coração da fase

1. `SELL_ITEM`, `TRANSFER_ITEM`, `DROP_ITEM` e `CHANGE_ITEM_QTY` para zero
   **desequipam** o item e limpam `favorites` e `itemMods`.
2. `TRANSFER_ITEM`: desequipa na origem, chega desequipado no destino, e
   `itemMods` **não viaja** — o modificador é do dono, não do item.
3. `REMOVE_SHEET` preserva `gear` e `itemMods` (o jogador pode reimportar em
   seguida), mas os controles somem da tela.
4. Item que sai do catálogo ou do `campaignItems` não pode deixar slot pendurado.
5. Nenhum `gear` pode apontar para id que não está em `player.items`. Escrever um
   **invariante checável** e testá-lo depois de cada ação.

## `ItemForm` ganha ficha técnica (D13)

Bloco extra, condicional ao tipo, gravando nos sub-objetos que `normalizeItem` já
preserva. Todos os campos opcionais — item sem eles continua válido e só não
aparece na ficha.

| Tipo | Campos |
|---|---|
| `weapon` | categoria (simple/martial/advanced/unarmed), grupo, mãos, nº de dados, dado (d4–d12), tipo de dano, à distância (alcance, recarga) |
| `armor` | categoria (light/medium/heavy/unarmored), `acBonus`, `dexCap`, `checkPenalty`, `speedPenalty`, `strength` |
| `shield` | `acBonus`, `hardness`, `hpMax`; **`bt = floor(hpMax/2)` calculado, não digitado** |

O mesmo formulário serve item custom e item de campanha — melhora as duas telas.

## Modificadores manuais (D6)

`itemMods[itemId] = [{ label, atk, dmg, extraDice }]`. Editados no mesmo lugar da
edição de item que já existe. O rótulo é livre e aparece no breakdown como
parcela nomeada. É o que cobre Rage, Giant Instinct, weapon specialization e runa,
enquanto runas não existem.

**Limitação aceita:** `player.items` é `{ itemId: qty }`, não instâncias. O
modificador vale para a pilha inteira. Não tentar consertar aqui.

## Não fazer nesta fase

Nenhuma aba da ficha. Nada de bulk. Nada de runa. Não reescrever o inventário
para instâncias.

## Pronto quando

- [ ] Vestir, empunhar e equipar funcionam, e vestir outra armadura desveste a anterior
- [ ] Vender armadura vestida deixa a CA correta — teste explícito
- [ ] Transferir item equipado desequipa e não leva `itemMods`
- [ ] Invariante "todo id em `gear` está em `items`" testado após cada ação
- [ ] `ItemForm` grava `weapon`/`armor`/`shield`; escudo calcula `bt`
- [ ] Personagem sem ficha não vê controle de equipar
- [ ] Comprar, vender, transferir e a Loja seguem funcionando como antes
- [ ] `npm test`, `npm run build`, `npm run lint:visual`, `npm run smoke` passam
- [ ] Testado em Android real na LAN
- [ ] Commit e push
