# Fase 10 — Abas Feats e Ações

**Modelo:** Sonnet · **Depende de:** fases 4 e 9 · **Ler antes:** espec §3, §5.4, §12.3

Duas abas de apresentação pura. Nenhum cálculo.

## Arquivos

- `src/screens/CharacterSheet/Feats.jsx` (novo)
- `src/screens/CharacterSheet/Acoes.jsx` (novo)
- `src/styles/screens.css`

## Feats

- Agrupados em: features de classe · feats de classe · ancestralidade e herança ·
  outros. O agrupamento sai da categoria que veio no `feats` do Pathbuilder.
- Favoritos no topo.
- Linha expandida mostra custo em ações, fonte, nível e **descrição vinda do
  Foundry** (`sheet.feats[].descriptionHtml`, resolvido na fase 4).
- **Não resolvido não some** (§5.4): aparece com o nome que veio, sem descrição,
  marcado discretamente. Com o Rurik, isso vale para o que não estiver no
  `en.json`.

## Ações

- Agrupadas em Classe · Perícia · Básicas.
- **As básicas vêm do pack `actions` e valem para todo personagem**, não do
  Pathbuilder — Stride, Strike, Raise a Shield, Seek, Escape e o resto.
- Filtro por traço, alimentado pelo `traits` estendido na fase 4.
- Favoritos. Custo em ações e descrição do Foundry.
- Expandir/recolher tudo.

## Zero placeholder (D11)

O protótipo escreve nomes e descrições de ação à mão, em português. **Nada disso
sobrevive.** Tudo vem do pack, em inglês (D12). Se um verbete não existir na
fonte, ele não aparece com texto aproximado — aparece sem descrição.

## Identidade visual

Lista agrupada e colapsável já existe no app (Biblioteca). Reusar o padrão e as
classes, não criar lista nova. Chevron nunca é o alvo de toque — é o `.icon-btn`
em volta. Estado `--on` depois do bloco base no CSS.

## Não fazer nesta fase

Nenhum cálculo. Nenhuma ação executável (não existe "usar feat"). Nenhuma
descrição escrita à mão.

## Pronto quando

- [ ] Feats do Rurik agrupados corretamente, com descrição do Foundry
- [ ] Nomes não resolvidos visíveis, sem descrição, nunca omitidos
- [ ] Ações básicas aparecem mesmo para personagem sem feat nenhum
- [ ] Filtro por traço funciona
- [ ] Nenhum texto de regra escrito à mão no diff
- [ ] `npm run build`, `npm run lint:visual`, `npm run smoke` passam
- [ ] Testado em Android real na LAN
- [ ] Commit e push
