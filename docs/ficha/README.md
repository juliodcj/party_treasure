# Fases da ficha PF2e

Um arquivo por sessão de trabalho. Abra a sessão com **este arquivo da fase** e o
`CLAUDE.md`. A espec (`docs/ESPEC_Ficha.md`) é consulta por seção, não leitura
integral.

Uma fase por sessão. Commit ao fim da fase, não a cada arquivo.

| Fase | Arquivo | Entrega | Modelo |
|---|---|---|---|
| 0 | `fase-00.md` | `main`, README, `lint:visual` | Sonnet |
| 1 | `fase-01.md` | `build-catalog.mjs` para o layout novo | Sonnet |
| 2 | `fase-02.md` | Parser do Pathbuilder + teste do Rurik | **Opus** |
| 3 | `fase-03.md` | Migração `version 6` | **Opus** |
| 4 | `fase-04.md` | Ingestão de feats/magias/ações/condições | Sonnet |
| 5 | `fase-05.md` | `src/lib/sheet.js` — o motor | **Opus** |
| 6 | `fase-06.md` | Vincular ficha no Mestre + estado vazio | Sonnet |
| 7 | `fase-07.md` | Equipar itens + invariantes | **Opus** |
| 8 | `fase-08.md` | Aba Resumo | Sonnet |
| 9 | `fase-09.md` | Aba Ataques + modificadores manuais | Sonnet |
| 10 | `fase-10.md` | Abas Feats e Ações | Sonnet |
| 11 | `fase-11.md` | Aba Magias + Compêndio | Sonnet |
| 12 | `fase-12.md` | PR e merge na `main` | **Opus** |

## Dependências

```
0 → 1 → 4
0 → 2 → 3 → 5 → 6 → 7 → 8 → 9 → 10
                              4 ─┴→ 11 → 12
```

Fase 4 só é bloqueante para 10 e 11. Fases 2 e 3 podem correr antes da 1.

## Bloqueios conhecidos

- **Fase 11 precisa de um JSON de conjurador** em `docs/fixtures/`. O Rurik é
  bárbaro e não exercita nada de magia. Se não existir, pare e peça.
- **Fase 8** depende da resposta sobre descanso noturno (§17 da espec).
- **Fase 11** depende da resposta sobre filtro de conteúdo no compêndio.

## Regra geral

Se a fase pedir algo que a espec não cobre, **pergunte antes de implementar**.
Fase marcada Sonnet que precise encostar em `src/state/`, `server/` ou
`src/lib/sheet.js` foi classificada errado: pare e avise.
