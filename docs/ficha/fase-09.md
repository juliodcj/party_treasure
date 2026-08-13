# Fase 9 — Aba Ataques + modificadores manuais

**Modelo:** Sonnet · **Depende de:** fase 8 · **Ler antes:** espec §8, §10.3, §12.3

É aqui que a ficha fica "viva": a lista sai do inventário, não do JSON.

## Arquivos

- `src/screens/CharacterSheet/Ataques.jsx` (novo)
- `src/screens/CharacterSheet/ItemModsSheet.jsx` (novo)
- `src/styles/screens.css`

## Regras da lista

1. **Montada do inventário do jogador**, nunca do `weapons` do Pathbuilder (D2,
   D5). Vendeu a arma, ela some da ficha.
2. **Todas as armas do inventário aparecem; as equipadas primeiro.**
3. **Unarmed Strike sempre presente**, mesmo com inventário vazio. Não é item.
4. Favoritos no topo. Corpo a corpo e À distância em grupos separados.
5. Linha expansível: traços clicáveis (`TraitList.jsx`), ficha técnica (Attack,
   Damage, Category, Hands, Range), quantidade e MAP.
6. **MAP:** −5/−10, ou −4/−8 com `agile`. O protótipo mostra `±0 / −5` no Javelin
   — é dado inventado do mock. Implementar a regra.
7. Arma de arremesso tem stepper de quantidade, ligado ao inventário de verdade.

## Modificadores manuais (D6)

Folha de edição por item: lista de `{ label, atk, dmg, extraDice }`, com o rótulo
livre. Aparece no breakdown do ataque como parcela nomeada — é o mecanismo que
cobre Rage, Giant Instinct, weapon specialization e runa.

Vale a mesma folha no Inventário. Modificador vale para a pilha inteira (§8 da
espec) — não prometer o contrário na interface.

## Cuidado com o Rurik

O fixture é justamente um caso em que o app vai divergir do Pathbuilder: Giant
Instinct com arma Large e bônus de Rage. O motor mostra `1d10+4`; o Pathbuilder
mostra mais. **Está correto** — a diferença é o que o modificador manual existe
para cobrir. Não "consertar" o motor para bater.

Sugestão a implementar: quando a importação encontrar `specials` conhecidos como
`Rage`, oferecer o modificador já preenchido, em vez de esperar o jogador
descobrir o campo.

## Não fazer nesta fase

Nenhuma regra nova em `sheet.js`. Nenhuma rolagem de dado. Nada de runa.

## Pronto quando

- [ ] Lista sai do inventário; equipadas primeiro
- [ ] Vender a arma tira ela da ficha na hora
- [ ] Unarmed Strike presente com inventário vazio
- [ ] MAP correto, inclusive `agile`
- [ ] Ataque e dano batem com o teste do Rurik: Greatpick +7 `1d10+4`, Javelin +5 `1d6+4`
- [ ] Modificador manual aparece no breakdown com o rótulo escrito
- [ ] Stepper de arremesso mexe no inventário de verdade
- [ ] `npm test`, `npm run build`, `npm run lint:visual`, `npm run smoke` passam
- [ ] Testado em Android real na LAN
- [ ] Commit e push
