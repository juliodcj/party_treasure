# Fase 2 — Parser do Pathbuilder + teste do Rurik

**Modelo: Opus** · **Depende de:** fase 0 · **Ler antes:** espec §4, §7, §16

Fase de risco alto. Erro aqui não aparece na tela — aparece três semanas depois,
na mesa, como um número que ninguém explica.

## Arquivos

- `src/lib/pathbuilder.js` (novo) — parser puro, sem React, sem I/O
- `docs/fixtures/rurik.json` (novo) — o export real
- `test/pathbuilder.test.js` (novo)
- `test/sheet.test.js` (novo — **escrito agora, falhando**, ver passo 5)
- `package.json` — script `test`

## Passos

1. **Salvar o fixture** em `docs/fixtures/rurik.json`. É o export real de um
   bárbaro dwarf nível 1.
2. **Escrever `parsePathbuilder(json) → sheet`**, produzindo o objeto `sheet` da
   §7 da espec, sem os campos que dependem de resolução nos packs (`feats[].slug`,
   `descriptionHtml`) — esses ficam `null` e são preenchidos na fase 4.
3. **Regras de conversão que não podem ser inventadas:**
   - Grau de proficiência é número: `0`=untrained `2`=trained `4`=expert
     `6`=master `8`=legendary. Guardar o grau cru, não o bônus.
   - `hpMax = ancestryhp + (classhp + conMod) × level + bonushp + bonushpPerLevel × level`
   - `lores: [["Sailing", 2]]` vira perícia `Sailing Lore` com grau 2.
   - `languages: ["None selected"]` vira `[]`.
   - Chave de proficiência desconhecida (`piloting`, `computers` — são de
     Starfinder) é ignorada **e logada**. Nunca quebrar.
   - `feats` é array posicional: `[nome, ?, categoria, nível, rótulo, ...]`. O
     tamanho varia entre entradas — não indexar às cegas.
   - `specials` (`Rage`, `Darkvision`, `Giant Instinct`) entra separado de
     `feats`; a resolução decide para onde vai cada um (fase 4).
4. **Ignorar explicitamente**, com comentário dizendo por quê (D2, D3):
   `equipment` `equipmentContainers` `weapons` `armor` `money` `acTotal`
   `formula` `pets` `familiars` `inventorMods` `mods`.
5. **Escrever `test/sheet.test.js` agora, e deixar falhando.** É o oráculo das
   fases 5, 7, 8 e 9. Usar `node --test` (nativo, sem dependência nova —
   `npm test` = `node --test`). Casos, do fixture do Rurik:

   | Verificação | Esperado |
   |---|---|
   | `hpMax` | 24 |
   | CA sem armadura vestida | 15 |
   | CA com Hide Armor vestida | 18 |
   | Greatpick | ataque +7, dano `1d10+4` |
   | Javelin | ataque +5, dano `1d6+4` |
   | Athletics | +7 |
   | Arcana | +0 |
   | Perception | +6 |
   | Fortitude | +7 |
   | Reflex | +5 |
   | Will | +6 |

   Os valores de CA e ataque batem com `acTotal.acTotal` e `weapons[].attack` do
   próprio export — **o Pathbuilder é o gabarito**. Não ler esses campos em
   produção; usá-los no teste é o ponto.
6. **Teste do parser:** JSON truncado, chave faltando, `abilities` ausente,
   proficiência desconhecida — nenhum caso pode lançar exceção não tratada; todos
   devem produzir `sheet` parcial + log.

## Não fazer nesta fase

Nada de React, nada de reducer, nada de tela, nada de resolução nos packs do
Foundry. O parser não sabe o que é `player`.

## Pronto quando

- [ ] `parsePathbuilder` converte o fixture sem erro
- [ ] `npm test` roda; os testes do parser passam
- [ ] `test/sheet.test.js` existe e **falha**, porque o motor ainda não existe
- [ ] Entrada malformada nunca lança; sempre loga
- [ ] `npm run build` e `npm run lint:visual` passam
- [ ] Commit e push
