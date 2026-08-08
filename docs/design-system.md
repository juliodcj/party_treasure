# Sistema visual

Referência completa do que o aplicativo usa e por quê. As regras de curto prazo,
as que precisam ser obedecidas em toda sessão, estão no [CLAUDE.md](../CLAUDE.md);
aqui está o raciocínio por trás delas.

O aplicativo é claro, mobile-first, com linguagem iOS, numa coluna de 360px (a
tela de um Galaxy S23). Não existe tema escuro e não está previsto.

---

## 0. A regra que resume todas as outras

**Nenhum valor visual literal fora de `src/styles/tokens.css`.**

Este projeto foi escrito ao longo de muitas sessões, e cada uma acrescentou um
tamanho de fonte, um cinza, um raio. Uma auditoria em agosto de 2026 encontrou:

- **12 tamanhos de fonte** no CSS, seis deles espremidos entre 12 e 14,5px
- **8 cinzas de texto**, cinco dentro de uma faixa de 0,2 de opacidade
- **4 cinzas de superfície**, com dois pares separados por 0,01
- **6 estilos** para a mesma etiqueta pequena
- **4 tamanhos de stepper** e **2 molduras** para o mesmo controle
- **7 tamanhos de botão** onde o sistema declarava 3
- **60 estilos inline** em 11 arquivos — a porta por onde quase tudo entrou

Nenhuma dessas decisões foi errada isoladamente. O erro foi tomá-las fora do
sistema, uma de cada vez. Daí a regra ser sobre o *lugar* da decisão, não sobre o
valor: se falta um degrau, use o vizinho; se o vizinho não serve, o degrau novo
entra em `tokens.css` com nome e comentário.

---

## 1. Tipografia

### Escala

Seis degraus. Meio pixel não é hierarquia — se dois textos precisam parecer
diferentes, a diferença tem que ser visível.

| Token | px | Papel | Exemplos |
|---|---|---|---|
| `--t-label` | 11 | sobrancelha, rótulo de aba, contador | `WEAPON`, `BOLSA DE VALEROS`, `Nv 3`, rótulos da barra de abas |
| `--t-meta` | 12 | metadado, rótulo de campo, texto de apoio | `Valor`, `Damage`, `12 itens`, `Player Core` |
| `--t-sm` | 13 | texto secundário, botão, chip, campo compacto | `Comprar`, `Cancelar`, descrição do item, `Todos os níveis` |
| `--t-body` | 14.5 | corpo, nome de item, campo de texto | `Steel Shield`, `Buscar item...`, `Excluir Dagger?` |
| `--t-lg` | 16 | título de folha e de tela cheia | `Carrinho`, `Editar loja`, inicial do avatar |
| `--t-title` | 26 | título de tela | `Inventário`, `Ferreiro de Venis` |

### Altura de linha

| Token | Valor | Onde |
|---|---|---|
| `--lh-tight` | 1.15 | título de tela |
| `--lh-snug` | 1.35 | padrão do `body`: nome, rótulo, linha de lista |
| `--lh-text` | 1.5 | texto corrido: descrição, verbete de traço, estado vazio |

### Espacejamento

`--track-label` (+0,5px) para sobrancelha em caixa alta. `--track-title` (−0,5px)
para os títulos de 26px. Não há terceiro valor.

### As duas etiquetas

Havia seis variações do mesmo papel. Agora há duas classes, e toda etiqueta
pequena usa uma delas:

**`.label`** — sobrancelha. Rotula a faixa ou o bloco que vem abaixo. É a
**única** coisa em caixa alta do aplicativo.
11px · 700 · caixa alta · +0,5px · `--text-2`.
Usada em: faixa de grupo da lista (`WEAPON`, `JOGADORES`), bolsa do cabeçalho
(`BOLSA DE VALEROS`), resumo do carrinho (`CARTEIRA`), Configurações.

**`.field-label`** — rótulo de campo. Fica colado no campo e não separa seções,
por isso não grita.
12px · 700 · capitalizado · `--text-2`.
Usada em: `Valor` no formulário de item, `Para qual personagem?`, ficha técnica
de arma/armadura (`Damage`, `AC Bonus`).

As classes estruturais compõem com elas: `class="label list-group__title"`. A
estrutural cuida de posição e sticky; a de etiqueta, de tipo e cor.

---

## 2. Cor

### Texto — quatro tintas

| Token | α | Papel |
|---|---|---|
| `--text` | 100% | nome, valor, título, item ativo |
| `--text-body` | 0,75 | texto corrido: descrição, parágrafo, observação |
| `--text-2` | 0,6 | secundário: metadado, sobrancelha, contagem, estado vazio |
| `--text-3` | 0,4 | terciário: unidade (`/un`), livro de origem, aba inativa |

`--ornament` (0,3) é traço de ícone decorativo — chevron, seta do carrinho.
**Não é um quinto cinza de texto** e não deve ser usado como tal; vive separado
justamente por isso.

### Superfícies — duas

`--surface-sunken` (0,03) para o que afunda: campo, painel, item aberto, corpo
de pasta, ficha técnica.
`--surface-raised` (0,06) para o que sobe: botão neutro, pastilha de quantidade,
traço clicável, avatar, o `−` do stepper.

Eram quatro, com 0,02 contra 0,03 e 0,05 contra 0,06 — diferenças invisíveis que
só criavam chance de escolher errado.

### Um azul para toda ação de linha; vermelho só dentro do diálogo

`--accent` / `--accent-ink` / `--accent-tint` é a cor de **toda ação de
item/jogador/loja em botão-ícone** — editar, enviar, vender, excluir, dar
comprar, distribuir. `.icon-btn--accent` é o padrão do aplicativo; a lixeira
usa o mesmo azul das outras ações da linha, não uma cor à parte.

`--danger` / `--danger-ink` / `--danger-tint` fica reservado a `.btn--danger` —
o botão largo dentro de um diálogo: "Excluir" em `<SheetActions
confirmVariant="danger">`, o "− Remover" de ajustar moedas. Botão-ícone de
linha (`.icon-btn`) não tem variante vermelha em uso: `.icon-btn--danger`
existe em `components.css` mas está sem chamador de propósito, preservado
para se um caso desse tipo aparecer.

Isto foi uma escolha deliberada revertida em agosto de 2026: uma tentativa
anterior pintou a lixeira de vermelho já na linha, mas isso quebrou a leitura
visual das ações do item — editar, enviar, vender, excluir precisam ler como
um grupo, e um ícone destoando ali chama mais atenção do que merece antes de
qualquer confirmação.

### Moedas

`--gold`, `--silver`, `--copper` colorem **só o pontinho**. O número é sempre
`--text`. Havia três esquemas (preto nos preços, tingido na bolsa, cinza nas
listas do Mestre) para o mesmo dado.

---

## 3. Componentes com dono único

Antes de escrever marcação, verifique se o componente existe.

### `<Coins>` e `<Price>` — `components/Coins.jsx`

O único desenho de moeda. `<Coins gold silver copper size showZeros>` para
carteira; `<Price totalCp size>` para preço, que converte de cobre.

Tamanhos: `sm` (12px, ponto 7) nas listas do Mestre e na troca de personagem ·
`md` (13px, ponto 8) nos preços · `lg` (14,5px, ponto 10) na bolsa do cabeçalho.

`showZeros` mostra as três denominações mesmo zeradas — numa carteira o zero é
informação ("não tenho cobre"), num preço é ruído.

### `<Stepper>` — `components/Stepper.jsx`

O `−` cinza e o `+` azul dentro de uma **pílula tingida**, sempre. Dois tamanhos:
`sm` (botões de 24, pílula de 32) na linha de lista; `lg` (botões de 32) no
diálogo em que a quantidade é a decisão principal.

Tamanho, vão e corpo do número saem do CSS. O componente não faz contas — a
versão antiga derivava tudo de um degrau seco `size >= 30`, então 22 e 24 saíam
idênticos e 30 saltava de uma vez.

A pílula veio da Loja, que era o único lugar que a tinha. Agora é o padrão.

### `<SheetActions>` — `components/Sheet.jsx`

O par aceitar/cancelar. Ver a seção 4.

### `.label` / `.field-label` / `.empty--inline`

Ver seções 1 e 5.

---

## 4. Ordem das ações: confirmar à esquerda

Em todo par aceitar/cancelar — diálogo, painel do Mestre, rodapé de tela cheia —
**a ação que a pessoa veio fazer vem primeiro**, e a saída fica depois.

```jsx
<SheetActions
  onCancel={fechar}
  onConfirm={salvar}
  confirmLabel="Salvar"
/>
```

`<SheetActions>` já garante a ordem. Quando o layout não permitir usá-lo (a linha
de renomear item, que tem um campo antes dos botões), mantenha a ordem à mão.

Onde as duas opções agem em vez de uma cancelar — o "±" de ajustar moedas, com
`+ Adicionar` e `− Remover` — a positiva fica à esquerda pela mesma razão.

**Par invertido é bug.**

---

## 5. Formas, espaço e toque

### Raios

| Token | px | Onde |
|---|---|---|
| `--r-sm` | 8 | botão pequeno, campo compacto, aba de segmento, caixa de seleção |
| `--r-md` | 12 | campo, painel, botão largo, menu embutido, ficha técnica |
| `--r-lg` | 16 | folha, menu flutuante, tela modal |
| `--r-pill` | 999 | pílula, botão-ícone, pontinho, avatar |

### Alvos de toque

`--tap-sm` (28px) para botão-ícone em linha de lista · `--tap-md` (36px) para
cabeçalho e avatar · 44px para o botão largo de diálogo.

**Chevron e ícone nunca são o alvo.** Um `<button>` contendo só um SVG de 7×12px
tem 7×12px de área clicável — envolva sempre com `.icon-btn` (mais
`.icon-btn--ghost` quando for só o chevron).

### Alturas de linha da lista

50px para linha de uma informação (item), 56px de piso para linha de duas
(jogador, loja, pasta). Rows de duas linhas podem passar disso conforme o
conteúdo; o que não pode variar é o padding.

### Estado vazio

`.empty` tem respiro de tela cheia (60px). Dentro de um painel de 220px, use
`.empty--inline` (24px).

### Desabilitado

Sempre `opacity: var(--disabled)`. Havia quatro opacidades diferentes.

---

## 6. Ícones — `components/Icons.jsx`

**Todo SVG desenha com `currentColor`.** Quem define a cor é o botão que o
contém, via `.icon-btn--accent` (padrão de toda ação de linha, incluindo
excluir) ou `.icon-btn--ghost` (chevron).

Nenhum ícone tem cor própria. Seis deles traziam o azul cravado em `oklch`, o que
significava que trocar o azul do aplicativo em `tokens.css` mudava botões, chips,
flutuante e barra de abas — e deixava todos os ícones no azul antigo.

O mesmo vale para tamanho: o glifo do stepper é dimensionado por CSS
(`.step svg { width: 42% }`), não por conta no JavaScript.

---

## 7. Idioma na interface

**Moldura nossa é traduzida. Dado do PF2e — inclusive o rótulo de categoria —
não é.**

| Traduzido | Em inglês |
|---|---|
| título de tela, botão, mensagem, rótulo de campo, estado vazio, confirmação | categoria (`Weapon`, `Ammunition`, `Container`), nome do item (`Steel Shield`) |
| | ficha técnica (`Damage`, `AC Bonus`, `Hands`), traço (`agile`), livro de origem |

`CATEGORIES` em `data/catalog.js` guarda os rótulos em inglês **de propósito**,
alinhados palavra por palavra com o `type` bruto do Foundry (`weapon` →
`Weapon`, `backpack` → `Container`). Chegou a existir uma versão traduzida
(`Arma`, `Munição`...), revertida em agosto de 2026: quando novos packs forem
importados no futuro, o rótulo em inglês é o que permite reconhecer de olho um
`type` novo ou um caso de borda, sem depender de uma tradução nossa que pode
ficar desatualizada ou ambígua. Ver o comentário em `categoryLabel`.

O critério geral segue valendo para todo o resto: se o texto existe porque
**nós** o escrevemos e não precisa espelhar um `type` do pack, vai em
português.

---

## 8. Duas armadilhas de cascata, já vividas

**`<button>` zera `text-transform` e `letter-spacing`.** O reset em
`base.css` (`button { font: inherit; ... }`) não cobre essas duas
propriedades, e o navegador tem sua própria UA-style zerando-as em elementos
de formulário. Resultado: um `<button>` dentro de um `.label` (caixa alta,
tracking) não herda nem uma coisa nem outra, mesmo com `font-size` e
`font-weight` chegando certinho por herança. `.list-group__toggle` declara
`text-transform: inherit; letter-spacing: inherit;` por causa disso — qualquer
novo botão dentro de um elemento com essas propriedades precisa do mesmo.

**Estado "ligado" precisa vir depois no arquivo, não antes.** `.chip`,
`.seg__tab` e `.chip--on`, `.seg__tab--on` têm a mesma especificidade
(0,1,0). Quando as duas regras miram a mesma propriedade (`background`,
`border-color`), quem chegar por último no arquivo vence — não quem tem a
classe mais "específica" na intenção. Um bug real: `.chip--on` estava
declarado *antes* de `.chip`, então `.chip` (que vinha depois) sobrescrevia o
fundo e a borda do estado ligado de volta para branco, deixando o texto branco
sobre fundo branco. A regra prática: sempre declare o estado (`--on`,
`--active`, `--selected`) **depois** do bloco base da mesma classe, ou suba a
especificidade dele de propósito (ex.: repetir o seletor).

---

## 9. Onde mora o quê

```
src/styles/
  tokens.css       cor, tipo, espaço, raio, toque — a fonte de tudo
  base.css         reset, casca do aplicativo, rolagem, estado vazio
  components.css   etiqueta, botão, stepper, moeda, campo, folha, flutuante
  screens.css      cabeçalho, lista agrupada, item, carrinho, Mestre, abas
```

`components.css` é o que se repete em mais de uma tela. `screens.css` é o que
pertence a uma tela ou a um bloco específico. Na dúvida, se um segundo lugar
puder querer aquilo, é componente.
