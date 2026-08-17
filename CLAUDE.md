# Instruções para o Claude Code

O briefing do projeto, o escopo e as regras de Git estão no [README](README.md).
Este arquivo é o que precisa ser obedecido ao escrever código.

## Idioma

- Comentários, commits e interface em **português**; nomes de código em inglês.
- Nomes de item e ficha técnica do PF2e (`Damage`, `AC Bonus`, `Longsword`) ficam
  em inglês — é o vocabulário publicado. **Moldura nossa é traduzida**: rótulo de
  categoria, título de tela, botão, mensagem.

## Sistema visual

A referência completa, com o porquê de cada valor, está em
[docs/design-system.md](docs/design-system.md). O resumo obrigatório:

### A regra que resume todas as outras

**Nenhum valor visual literal fora de `src/styles/tokens.css`.** Sem `fontSize`
solto, sem `#hex`, sem `rgba()`, sem `borderRadius: 7`. Se falta um degrau, use o
vizinho; se o vizinho não serve, o degrau novo entra em `tokens.css` com nome e
comentário — nunca cravado no componente.

Foi a violação dessa regra que produziu, ao longo do projeto, 12 tamanhos de
fonte, 8 cinzas de texto, 4 tamanhos de stepper e 7 tamanhos de botão para os
mesmos três papéis.

### Nada de `style={{}}` para aparência

`style` inline só é aceitável para valor calculado em tempo de execução (a
rotação do chevron, por exemplo). Tamanho, cor, espaço, raio e peso vão para uma
classe. Precisa de um respiro num lugar só? Crie a classe com o nome do lugar
(`.item-note__field`, `.sheet__center-row`) — é uma linha de CSS e não vaza.

### Escala tipográfica — seis degraus, sem meio-termo

| Token | px | Papel |
|---|---|---|
| `--t-label` | 11 | sobrancelha, rótulo de aba, contador |
| `--t-meta` | 12 | metadado, rótulo de campo, texto de apoio |
| `--t-sm` | 13 | texto secundário, botão, chip, campo compacto |
| `--t-body` | 14.5 | corpo, nome de item, campo de texto |
| `--t-lg` | 16 | título de folha e de tela cheia |
| `--t-title` | 26 | título de tela |

Alturas de linha: `--lh-tight` (1.15) título · `--lh-snug` (1.35) nome e rótulo ·
`--lh-text` (1.5) texto corrido.

### Cor — quatro tintas de texto, e só

`--text` (nome, valor, título) · `--text-body` (texto corrido) · `--text-2`
(metadado, sobrancelha, contagem) · `--text-3` (unidade, fonte, aba inativa).
`--ornament` é traço de ícone decorativo, **não** um quinto cinza de texto.

Superfícies: `--surface-sunken` (campo, painel) e `--surface-raised` (botão
neutro, pastilha). Duas, não quatro.

### Azul age, vermelho destrói

`--accent` para o que se desfaz: editar, enviar, vender, comprar, filtrar.
`--danger` para o que **não** se desfaz: excluir item, jogador, loja, histórico.
Um botão que abre uma confirmação destrutiva já é vermelho — não espera o
diálogo para virar vermelho.

### Ícones herdam a cor

Todo SVG em `Icons.jsx` desenha com `currentColor`. Quem define a cor é o botão
que o contém. **Nenhum ícone tem cor própria.**

### Confirmar à esquerda, cancelar à direita

Em todo par aceitar/cancelar — diálogo, painel, rodapé de tela cheia — a ação
que a pessoa veio fazer vem **primeiro**, e a saída fica depois. Use
`<SheetActions>` (`components/Sheet.jsx`), que já garante a ordem; se o layout
não permitir, mantenha a ordem à mão. Par invertido é bug.

Onde as duas opções agem (o "± Ajustar moedas": Adicionar e Remover), a positiva
fica à esquerda pela mesma razão.

### Componentes com dono único

Antes de escrever marcação nova, verifique se já existe o componente:

| Precisa de | Use | Nunca |
|---|---|---|
| mostrar moedas | `<Coins>` / `<Price>` | marcação à mão com `.coin-dot` |
| mudar quantidade | `<Stepper>` (`sm` / `lg`) | botões `+`/`−` próprios |
| par aceitar/cancelar | `<SheetActions>` | dois `.btn--wide` soltos |
| sobrancelha de seção | `.label` | tamanho e cinza próprios |
| rótulo de campo | `.field-label` | idem |
| vazio dentro de painel | `.empty--inline` | `.empty` com padding remendado |

### Toque

Botão-ícone: `--tap-sm` (28px) em linha de lista, `--tap-md` (36px) no cabeçalho.
Botão largo de diálogo: 44px. **Chevron e ícone nunca são o alvo** — o alvo é o
botão em volta, com `.icon-btn`.

### Formas

Raios: `--r-sm` (8) botão pequeno e campo compacto · `--r-md` (12) campo, painel,
botão largo · `--r-lg` (16) folha e menu flutuante · `--r-pill`.
Desabilitado: sempre `var(--disabled)`.

## Ficha de personagem

A ficha PF2e está implementada: importação do JSON do Pathbuilder, motor de
cálculo e as cinco sub-abas (Resumo, Ataques, Magias, Feats, Ações), mais o
gestor de condições e o controle de HP. Referência: `docs/ESPEC_Ficha.md`.

**Antes de mexer na ficha, leia a seção da espec que trata da peça em questão.**
Ela é consulta por seção, não leitura de cabo a rabo.

### Regras que valem em toda sessão

**Escopo.** Este programa não é um character builder. É uma ficha melhorada do
Pathbuilder, com gestão de inventário, loja e ações do mestre. Fora do escopo,
e a lista é essa: **iniciativa, combate e bestiário.** Ideia fora disso: anote
como sugestão e siga em frente.

**Zero placeholder.** Nenhum texto de regra, nome, descrição ou número de jogo é
escrito à mão no código. Tudo vem dos packs do Foundry ou do JSON do Pathbuilder.
Dado que não existe na fonte não aparece na tela — não se preenche com
aproximação.

**Idioma.** Dado de pack fica em inglês (`Frightened` continua `Frightened`).
Moldura nossa é traduzida: rótulo, título, botão, mensagem.

**Identidade visual.** A ficha não traz sistema visual próprio. Vale
`docs/design-system.md` inteiro. Nenhum valor visual literal fora de
`src/styles/tokens.css`. `npm run lint:visual` prova isso.

**`player.sheet` pode ser nulo.** Personagem sem ficha importada é caso de
primeira classe: tem inventário e carteira, funciona como antes, e não mostra
cálculo nem controle de equipar. Todo código que lê `sheet` trata `null`.

**Item que sai do inventário sai do slot.** `SELL_ITEM`, `TRANSFER_ITEM`,
`DROP_ITEM` e `CHANGE_ITEM_QTY` para zero precisam desequipar o item e limpar
`favorites` e `itemMods`. Slot apontando para item inexistente é bônus fantasma
na CA.

**Nada regride.** O app é usado hoje. Nenhuma mudança pode quebrar comprar,
vender, transferir ou a Loja. Migração de schema nunca descarta mesa.

**Errar em silêncio é o único erro inaceitável.** Slug que não resolve, nome que
não casa, chave desconhecida no JSON: aparece na tela com o nome que veio, entra
no log, e segue. Nunca sumir.

**Estado calculável não se guarda; fato de mesa não se recalcula.** HP é fato
(persiste, todos veem). CA é cálculo (sai do que está vestido agora). Na dúvida:
foi decidido ou foi derivado?

**Onde o app não sabe, ele admite.** O motor não acerta Giant Instinct, weapon
specialization nem Rage. A saída é o modificador manual com rótulo do jogador,
aparecendo no breakdown — nunca chutar.

**Prefira a decisão que apaga trabalho.** Quando duas opções servem, ganha a que
remove código.

### Git

Branch de trabalho saindo de `main`. Commit ao fim de cada tarefa concluída,
não a cada arquivo. Push logo após o commit. Merge de volta na `main` quando
estiver funcionando.
Conflito: resolva você; se for decisão de produto, pergunte em português simples.
Nunca `push --force`, `reset --hard` em coisa não commitada, nem reescrita de
histórico já enviado.

### Se estiver ambíguo

Pergunte antes de implementar. Perguntas em aberto conhecidas estão no fim de
`docs/ESPEC_Ficha.md`. Não decida sozinho o que estiver listado lá.

## Antes de dar uma tarefa por pronta

1. `npm run build` passa.
2. Nenhum `style={{}}` novo com aparência; nenhum valor literal novo no CSS.
3. Todo par aceitar/cancelar com confirmar à esquerda.
4. Testar em celular Android real na LAN (`npm run dev` imprime o IP).
