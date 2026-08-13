# Fase 11 — Aba Magias + Compêndio

**Modelo:** Sonnet · **Depende de:** fases 4 e 10 · **Ler antes:** espec §4.1, §5.3, §12.3

A maior das cinco abas, e a única sem dado real por trás.

## Bloqueios — verificar antes de começar

1. **Precisa de um JSON de conjurador** em `docs/fixtures/`. O Rurik é bárbaro:
   `spellCasters` está vazio e `focusPoints` é 0. Todo o conteúdo de magia do
   protótipo é um mago arcano nível 5 **inventado**. Sem fixture real, **pare e
   peça** — não implemente contra o mock.
2. **Pergunta 1 da §17 da espec:** `settings.ownedCategories` e `remasterFilter`
   filtram o compêndio de magias, ou ele mostra tudo? Sem resposta, perguntar.

## Arquivos

- `src/screens/CharacterSheet/Magias.jsx` (novo)
- `src/screens/CharacterSheet/Compendio.jsx` (novo)
- `src/screens/CharacterSheet/SpellDetail.jsx` (novo)
- `src/state/reducer.js` — `USE_SPELL_SLOT`, `PREPARE_SPELL`, `ADD_SPELL`,
  `REMOVE_SPELL`
- `src/styles/screens.css`

## Blocos

- **Conjuração:** tradição, preparada ou espontânea, DC, ataque. Do
  `sheet.spellcasting`, derivado do `spellCasters` do Pathbuilder.
- **Truques**, com contagem.
- **Foco:** pontos em `<Stepper>` e botão **Refocus** (+1 ponto). O descanso
  noturno mora no Resumo, não aqui.
- **Slots por círculo:** preparadas, marcáveis como usadas. `slotsUsed` no
  servidor.
- **Grimório**, para quem tem.
- **Lista especial:** magia de item, ritual ou concessão do mestre. Livre, sem
  limite de slot.
- **Compêndio arcano:** navega o `src/data/index.spells.json` (~1.994 entradas,
  no bundle), com filtro de tradição e círculo. A descrição vem sob demanda de
  `GET /api/entry/:slug` — offline funciona porque o servidor é o PC da mesa.
  Falha de rede mostra o verbete sem descrição, com aviso; não trava a tela.

## Regras

- **Aba oculta** quando `sheet.spellcasting` é nulo. Confirmar com o Rurik.
- Slots usados e magias preparadas moram no servidor (§14): dois celulares veem o
  mesmo estado.
- `USE_SPELL_SLOT` e companhia **não entram no histórico** — mudam demais.
- Zero conteúdo escrito à mão. Nome, círculo, tradição, custo, traços e descrição
  vêm do pack, em inglês.

## Não fazer nesta fase

Nenhuma regra nova em `sheet.js`. Nenhuma rolagem. Nada de efeito de magia
aplicado automaticamente (não existe "conjurar" que altera número).

## Pronto quando

- [ ] Existe fixture de conjurador e a aba foi testada contra ele
- [ ] Aba oculta para o Rurik
- [ ] Slots, preparação e foco sincronizam entre dois aparelhos
- [ ] Compêndio navega offline; descrição chega do servidor
- [ ] Servidor fora do ar não trava a tela
- [ ] Nenhuma magia escrita à mão no diff
- [ ] `npm test`, `npm run build`, `npm run lint:visual`, `npm run smoke` passam
- [ ] Testado em Android real na LAN
- [ ] Commit e push
