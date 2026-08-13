# Fase 3 — Migração `version 6`

**Modelo: Opus** · **Depende de:** fase 2 · **Ler antes:** espec §7, §13, §14

Fase de risco alto: mexe no arquivo que guarda a mesa de verdade. Migração que
perde campo não avisa.

## Arquivos

- `src/state/migrations.js`
- `src/state/initialState.js`
- `src/state/reducer.js`
- `src/state/history.js`
- `test/migrations.test.js` (novo)

## Contexto

A mesa está na `version: 5`. `migrate()` aplica em cadeia e **nunca descarta mesa
por causa de schema** — manter essa propriedade.

## Passos

1. **Migração 5 → 6:** para todo jogador, acrescentar
   - `sheet: null`
   - `vitals: { hp: null, tempHp: 0, conditions: {}, focusPoints: 0,
     shieldHp: null, shieldRaised: false, slotsUsed: {}, preparedSpells: [],
     extraSpells: [], favorites: {} }`
   - `gear: { wornArmorId: null, heldShieldId: null, equippedWeaponIds: [] }`
   - `itemMods: {}`

   `hp: null` porque sem ficha não existe HP máximo. Quem tem ficha recebe
   `hp = sheet.hpMax` no `IMPORT_SHEET`, não aqui.
2. **Atualizar `initialState.js`** com os mesmos campos nos três semeados
   (Valeros, Seelah, Ezren). Eles ficam sendo o caso de teste do estado "sem
   ficha" — **não** dar ficha a nenhum deles.
3. **Adicionar as ações do reducer** da §7 da espec. Nesta fase, implementar
   apenas as que não dependem do motor:
   `IMPORT_SHEET` `UPDATE_SHEET` `REMOVE_SHEET` `APPLY_DAMAGE` `APPLY_HEAL`
   `SET_TEMP_HP` `SET_CONDITION` `CLEAR_CONDITIONS` `SET_FOCUS`
   `TOGGLE_SHIELD_RAISED` `SET_SHIELD_HP` `TOGGLE_FAVORITE`.
   As de equipar ficam para a fase 7; as de magia, para a 11.
4. **Regras dessas ações:**
   - `IMPORT_SHEET` e `UPDATE_SHEET` substituem `player.sheet` **inteiro** e
     preservam `items`, `customItems`, `itemNotes`, carteira, `vitals`, `gear`,
     `itemMods`. `hp` vira `min(hp atual ?? hpMax, hpMax novo)`.
   - `REMOVE_SHEET` zera só `sheet`. Nunca apaga item, moeda ou nota.
   - `APPLY_DAMAGE` consome `tempHp` antes de `hp`; `hp` nunca abaixo de 0.
   - `APPLY_HEAL` nunca passa de `sheet.hpMax`.
   - `SET_TEMP_HP` **não acumula**: vale o maior entre atual e novo.
   - `SET_CONDITION` com valor 0 ou `false` remove a chave, não guarda zero.
5. **Histórico:** `IMPORT_SHEET`, `UPDATE_SHEET` e `REMOVE_SHEET` entram.
   **`APPLY_DAMAGE`, `APPLY_HEAL`, `SET_TEMP_HP`, `SET_CONDITION`, `SET_FOCUS`,
   `TOGGLE_SHIELD_RAISED`, `SET_SHIELD_HP`, `TOGGLE_FAVORITE` não entram** —
   mudam dezenas de vezes por combate e afogariam o log que existe para o mestre
   reverter.
6. **Testes:** migrar uma mesa `version 5` real e provar que nenhum campo antigo
   sumiu; migrar duas vezes e provar idempotência; dano com `tempHp`; cura no
   teto; `REMOVE_SHEET` preservando inventário.

## Não fazer nesta fase

Nenhuma tela. Nenhum cálculo. Nenhuma ação de equipar.

## Pronto quando

- [ ] Mesa `version 5` migra sem perder campo
- [ ] Migrar duas vezes dá o mesmo resultado
- [ ] As doze ações implementadas, com testes
- [ ] Histórico recebe as três de ficha e nenhuma das de combate
- [ ] `npm test`, `npm run build` e `npm run lint:visual` passam
- [ ] `npm run smoke` continua passando
- [ ] Commit e push
