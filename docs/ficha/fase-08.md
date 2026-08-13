# Fase 8 — Aba Resumo

**Modelo:** Sonnet · **Depende de:** fase 7 · **Ler antes:** espec §11, §12.1, §12.3

Primeira aba de verdade. Todo o cálculo já existe em `src/lib/sheet.js` — esta
fase é apresentação.

**Bloqueio:** depende da resposta à pergunta 2 da §17 da espec (descanso noturno é
por personagem ou da mesa toda?). Se não houver resposta, implementar por
personagem e **perguntar**.

## Arquivos

- `src/screens/CharacterSheet/Resumo.jsx` (novo)
- `src/screens/CharacterSheet/HpSheet.jsx`, `ConditionsSheet.jsx`,
  `BreakdownSheet.jsx` (novos)
- `src/screens/CharacterSheet/index.jsx` — sub-abas
- `src/components/Icons.jsx`
- `src/styles/screens.css`

## Blocos, na ordem do protótipo

HP com barra e HP temporário · condições em chips · atributos · defesas (CA,
escudo, três salvamentos) · outras estatísticas (Percepção, Deslocamento, Tamanho,
DC de Classe, DC de Magia, Ataque de Magia) · perícias com grau e bônus ·
proficiências de arma e armadura · resistências, sentidos, idiomas · rodapé.

## O que não pode faltar

1. **Todo número é tocável e abre o breakdown.** Este é o ponto da tela inteira. O
   `stat()` já devolve `parts` com rótulo — o `BreakdownSheet` só lista. Número
   com `altered` sai em `--danger`, e a folha diz que foi condição.
2. **Sub-abas** Resumo · Ataques · Magias · Feats · Ações. Magias não aparece se
   `sheet.spellcasting` for nulo. As outras quatro já existem, ainda vazias.
3. **HP:** stepper e campo de valor, com Dano e Cura. Dano consome HP temporário
   antes do HP real. HP temporário não acumula: vale o maior. Usar `<Stepper>`.
4. **Condições:** as 43 do `conditions.json`, em inglês. As 8 com efeito mecânico
   primeiro; as demais atrás de "mostrar mais". As que têm valor usam `<Stepper>`.
   Encumbered aparece **sem efeito** (bulk adiado).
5. **Escudo:** só quando há escudo empunhado. Erguer/Baixar, Dureza, PV com
   stepper, VT. Abaixo do VT, quebrado e sem bônus.
6. **Descanso noturno** aqui, não na aba Magias — mexe em HP e condições. Repõe
   foco e slots, cura `conMod × level` (mínimo 1 por nível), **reduz Doomed em 1**
   (não zera). É `--accent`, e confirma antes.
7. **Rodapé:** `Importada em 10/08 · Nv 1`. O botão **Atualizar** do protótipo
   **não importa aqui** (D14): navega para a linha do personagem na tela do Mestre.
8. **Não resolvidos:** o que está em `sheet.unresolved` aparece em Sentidos ou
   Outros com o nome que veio e sem descrição. Nunca sumir.

## Identidade visual

Ver §12.1 da espec. Em especial nesta tela: as sub-abas são `.seg__tab` e o estado
`--on` precisa vir **depois** do bloco base no CSS, senão a base sobrescreve e o
texto fica branco no branco — bug já vivido, documentado no §8 do design system.
Todo `+`/`−` é `<Stepper>`. Nenhum `oklch()` do protótipo sobrevive.

## Não fazer nesta fase

Ataques, Magias, Feats e Ações. Nenhuma regra nova em `sheet.js` — se faltar
cálculo, é sinal de que a fase 5 ficou incompleta: voltar lá, não calcular na tela.

## Pronto quando

- [ ] Todos os blocos renderizam com o Rurik importado
- [ ] Todo número abre breakdown com as parcelas rotuladas
- [ ] Frightened 2 deixa CA e testes em `--danger`, com a folha explicando
- [ ] Dano consome temporário primeiro; cura não passa do máximo
- [ ] Escudo só aparece quando empunhado; quebra abaixo do VT
- [ ] Sub-aba Magias oculta para o Rurik
- [ ] `sheet.unresolved` visível
- [ ] `npm run lint:visual` passa — zero literal do protótipo
- [ ] `npm test`, `npm run build`, `npm run smoke` passam
- [ ] Testado em Android real na LAN
- [ ] Commit e push
