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

## Antes de dar uma tarefa por pronta

1. `npm run build` passa.
2. Nenhum `style={{}}` novo com aparência; nenhum valor literal novo no CSS.
3. Todo par aceitar/cancelar com confirmar à esquerda.
4. Testar em celular Android real na LAN (`npm run dev` imprime o IP).
