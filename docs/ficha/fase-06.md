# Fase 6 — Vincular ficha no Mestre + aba Ficha vazia

**Modelo:** Sonnet · **Depende de:** fases 3, 4 e 5 · **Ler antes:** espec §6, §12.1

Primeira fase com tela. Ainda não desenha ficha nenhuma — cria o caminho de
entrada e a aba.

## Arquivos

- `src/screens/GmScreen.jsx`
- `src/screens/CharacterSheet/index.jsx` (novo)
- `src/screens/CharacterSheet/ImportSheet.jsx` (novo)
- `src/App.jsx` — quarta aba
- `src/components/Icons.jsx` — ícone da aba
- `src/styles/screens.css`

## Passos

1. **Quarta aba.** `TABS` em `App.jsx` tem três: Inventário, Loja, Mestre. Entra
   **Ficha**, primeira da lista. O primeiro botão da barra continua sendo o
   seletor de personagem, que não é aba. A Biblioteca continua sendo tela filha do
   Mestre.
2. **Estado vazio da aba Ficha**, para `player.sheet === null`:

   > **Personagem sem ficha importada**
   > Este personagem tem inventário e carteira, mas não tem ficha. Para importar,
   > vá em Mestre → escolha o personagem → Vincular ficha.

   Usar `.empty`, não marcação nova.
3. **Na linha do personagem no `GmScreen`**, três ações (D14 — importar só aqui):
   - **Vincular ficha** — quando `sheet` é nulo
   - **Atualizar ficha** — quando já existe
   - **Remover ficha** — quando já existe, e é `--danger`, porque não se desfaz
4. **Folha de importação** (`components/Sheet.jsx`, não folha nova):
   textarea para colar o JSON → `parsePathbuilder` → `resolveNames` no servidor →
   tela de resultado mostrando **o que não resolveu, com os nomes** → confirmar.
   `<SheetActions>` garante confirmar à esquerda.
5. **Erros com mensagem útil, em português:** JSON inválido, JSON que não é do
   Pathbuilder, servidor fora do ar durante a resolução (a ficha ainda entra, sem
   descrições, e avisa).
6. **Depois de importar**, mostrar o aviso honesto — sem ele o usuário acha que a
   importação falhou:

   > Ficha importada. Agora monte a mochila no Inventário e vista a armadura.

7. Se a ficha existe, a aba mostra por enquanto só o cabeçalho: nome, `Nv N`,
   linha `Rurik · Dwarf (Dromaar) · Barbarian · Sailor`, e as cinco sub-abas
   desabilitadas. O conteúdo vem nas fases 8 a 11.

## Não fazer nesta fase

Nenhum número calculado na tela. Nenhum controle de equipar. Nenhuma sub-aba
funcionando.

## Pronto quando

- [ ] Quatro abas; Biblioteca segue filha do Mestre
- [ ] Personagem sem ficha: estado vazio, e Inventário/Loja funcionando como antes
- [ ] Vincular, Atualizar e Remover funcionam pela tela do Mestre
- [ ] Remover ficha não apaga item, moeda nem nota
- [ ] JSON inválido dá mensagem, não tela branca
- [ ] Nomes não resolvidos aparecem na confirmação
- [ ] `npm test`, `npm run build`, `npm run lint:visual`, `npm run smoke` passam
- [ ] Testado em Android real na LAN
- [ ] Commit e push
