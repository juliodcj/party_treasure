# Fase 12 — Revisão, PR e merge na `main`

**Modelo: Opus** · **Depende de:** fases 0 a 11 · **Ler antes:** espec §13, §16

## Revisar por fase, não de uma vez

Um diff de vários milhares de linhas produz comentário genérico, porque não dá
para reconstruir por que cada escolha foi feita. Passar **fase a fase**, com a
espec no contexto, na ordem em que foram feitas.

Em cada fase, checar contra a §2 da espec: alguma decisão D1–D15 foi contrariada
em silêncio? Contrariar de propósito é aceitável se estiver escrito; contrariar
sem registro, não.

## Checagem de integração (§13)

- [ ] `SELL_ITEM`, `TRANSFER_ITEM`, `DROP_ITEM` e `CHANGE_ITEM_QTY` para zero
      desequipam e limpam `favorites` e `itemMods`
- [ ] Nenhum id em `gear` sem correspondente em `player.items`
- [ ] `itemMods` não viaja em transferência
- [ ] Histórico recebe as três ações de ficha e **nenhuma** das de combate
- [ ] Todo caminho que lê `player.sheet` trata `null`
- [ ] Migração `5 → 6` não perde campo; migrar duas vezes é idempotente
- [ ] `npm run smoke` cobre um caso de ficha

## Checagem de conteúdo (D11, D12)

- [ ] Grep no diff: nenhum texto de regra, nome de magia, feat, ação ou condição
      escrito à mão
- [ ] Nenhuma descrição em português vinda do protótipo sobreviveu
- [ ] `sheet.unresolved` aparece na interface, nunca some

## Checagem visual (D15)

- [ ] `npm run lint:visual` passa em todo o diff
- [ ] Nenhum tamanho de fonte fora dos seis degraus; nenhuma quinta tinta
- [ ] Todo `+`/`−` é `<Stepper>`; toda moeda é `<Coins>`/`<Price>`
- [ ] Todo par aceitar/cancelar com confirmar à esquerda
- [ ] Todo ícone novo em `Icons.jsx`, com `currentColor`
- [ ] Alvo de toque nunca é o chevron

## Aceite funcional (§16)

- [ ] `npm test` passa, incluindo o teste do Rurik inteiro
- [ ] Personagem sem ficha compra, vende e transfere como antes
- [ ] Vender armadura vestida deixa a CA correta
- [ ] Primeiro carregamento medido em Android real na LAN, e anotado no PR

## Documentação

- [ ] README reflete o app que existe agora: ficha + inventário + loja
- [ ] `docs/ESPEC_Ficha.md` atualizado onde a implementação divergiu, com o motivo
- [ ] Perguntas da §17 respondidas ou ainda listadas como abertas
- [ ] O que ficou de fora está registrado: runas, bulk, contêineres, inventário
      por instância, validação de mãos

## PR

Abrir de `feat/ficha-pf2e` para `main`, com descrição em português dizendo: o que
entrou, o que ficou de fora e por quê, o que precisa de atenção na próxima
sessão. Fazer o merge. Não apagar a branch sem perguntar.
