# Fase 5 — `src/lib/sheet.js`, o motor

**Modelo: Opus** · **Depende de:** fases 2 e 3 · **Ler antes:** espec §9, §10, §11, §16

A fase mais herdada de todas: as abas 8 a 11 são só apresentação disto. Erro aqui
não quebra o build nem aparece na tela.

## Arquivos

- `src/lib/sheet.js` (novo) — puro, sem React, sem I/O
- `src/lib/conditions.js` (novo) — efeitos mecânicos
- `test/sheet.test.js` — **já existe e falha desde a fase 2.** Fazer passar.

## A forma, não negociável

```js
stat(title, parts, opts) → { title, parts, total, altered, kind }
```

**Nenhuma função devolve número solto.** Devolve parcelas rotuladas que somam,
mais `altered` quando alguma parcela veio de condição. É isso que alimenta o
breakdown da interface, os modificadores manuais e o número em vermelho — sem
cálculo paralelo. Portar a forma do protótipo `Ficha PF2e.dc.html` (funções
`stat`, `cell`, `condMods`), não reinventar.

## Regra de proficiência

```js
profBonus = rank === 0 ? 0 : level + rank    // untrained NÃO soma o nível
```

Vale para perícia, salvamento, arma e armadura. É a fonte de erro mais comum.

## O que calcular

Assinaturas recebem `(sheet, vitals, gear, items, itemMods, catalog)` — tudo
explícito, nada de estado global.

- **CA** = `10 + min(dexMod, dexCap) + profBonus(categoria da armadura vestida)
  + acBonus da armadura + acBonus do escudo se erguido`. Sem armadura: grau
  `unarmored`, sem `dexCap`.
- **Salvamentos, Percepção, DC de classe, perícias** — §10.4. `checkPenalty` da
  armadura entra nas perícias de Str e Dex.
- **Ataque e dano** — §10.3. Atributo pelos traços do catálogo: `finesse` permite
  Dex no ataque; à distância usa Dex no ataque e não soma atributo no dano, salvo
  `propulsive`; arremesso usa Dex no ataque e **Str no dano**.
  `specificProficiencies` sobrepõe a categoria da arma.
- **MAP** −5/−10, ou −4/−8 com `agile`.
- **Unarmed Strike** injetado sempre, grau `unarmed`, mesmo sem item nenhum.
- **Modificadores manuais** de `itemMods` entram como parcela com o rótulo escrito
  pelo jogador.
- **Descanso** (§10.7): `refocus()` e `nightRest()`. O noturno repõe foco e slots,
  cura `conMod × level` (mínimo 1 por nível) e **reduz Doomed em 1** — Doomed
  não zera. Wounded some quando o HP volta ao máximo, não pelo descanso.

## Condições

Oito com efeito automático: frightened, sickened, clumsy, enfeebled, drained,
slowed, prone, off-guard. As outras 35 são marcação.

- Frightened e Sickened são penalidade de status e **não somam**: vale o maior.
- Clumsy → o que depende de Dex. Enfeebled → Str. Drained → Fortitude e Con.
- Off-Guard: −2 de circunstância na CA. Prone: −2 de circunstância em ataques.
- Encumbered **sem efeito** — bulk está adiado (D8).

Codificar como tabela em `conditions.js`, não interpretar `system.rules` do
Foundry.

## O teste manda

`test/sheet.test.js` foi escrito na fase 2 com o gabarito do próprio Pathbuilder:
HP 24 · CA 15 sem armadura e 18 com Hide Armor · Greatpick +7 dano `1d10+4` ·
Javelin +5 dano `1d6+4` · Athletics +7 · Arcana +0 · Perception +6 · Fort +7 ·
Ref +5 · Will +6. **Divergiu, o motor está errado, não o Pathbuilder.**

Acrescentar testes de condição: Frightened 2 derruba CA e todos os testes em 2;
Frightened 2 + Sickened 1 derruba 2, não 3; Clumsy 1 derruba CA e Reflexos mas
não Fortitude; Off-Guard derruba só CA.

## Não fazer nesta fase

Nenhuma tela, nenhum componente, nenhum import de React. Nada de bulk. Nada de
runa.

## Pronto quando

- [ ] `test/sheet.test.js` passa inteiro
- [ ] Testes de condição passam
- [ ] `sheet.js` não importa React nem toca em I/O
- [ ] Toda estatística devolve `parts` com rótulo, nunca só um número
- [ ] `npm run build` e `npm run lint:visual` passam
- [ ] Commit e push
