# Changelog

## Jogo real (branch `feat/jogo-real`)

- **Replay determinístico:** simulação em passo fixo de 60 Hz e gravação dos comandos; qualquer partida pode ser refeita.
- **Orçamento de ameaça** por fileira e **ritmo em serra** por praia (tensão → Hora do Arrastão → tensão maior).
- **Telemetria local**, tela **ranking & estatísticas**, export JSON e `npm run analyze` pra calibrar com jogadores reais.
- **Ajuda pra iniciante:** quem anda morrendo cedo começa com a praia mais lenta.
- **Ranking local verificado** (refaz a partida) e **ranking online** opcional (Supabase + verificação no servidor).
- **PWA:** instalável, tela cheia, offline.
- **Trilha original** sintetizada: "Samba do Arrastão".
- **Doc pública** `docs/JOGABILIDADE.md` gerada do código + teste/CI que barra doc desatualizada.
- **Arte unificada em pixel art** (jogo e menu): mesma grade de pixel, contorno e paleta pra tudo; sprites convertidos uma vez e guardados em cache (quadro de 7,9 ms → 0,5 ms).
- **Botão de som** no menu, na pausa e em OPTIONS (além da tecla M).

## 2026-11-14

- Layout vertical próprio pro celular em pé (menus e HUD incluídos), calibrado por simulação.
- Banhista que deixa o bando apaixonado; areia com textura, sombras de perigo, brilho nos itens.
- Deploy pelo GitHub Actions com versão carimbada e auto-atualização (fim do cache velho).

## 2026-11-13

- Port do Construct 2 pra HTML5/JS; praia infinita, dificuldade progressiva, vantagens roguelike.
- Layout, menus e HUD originais de 2017 de volta; seletor de música com as faixas da equipe.
- Surfista Desatento, pelotão de bombeiros, viatura, onda, pique, combo, Hora do Arrastão.

## 2017-01

- Hackathon: "Arrastão" no Construct 2, equipe Wavesson02.
