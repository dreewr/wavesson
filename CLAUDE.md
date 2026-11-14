# Project Context — Wavesson

_Last updated: 2026-11-14_

## Goal & Success Criteria

**Goal:** Transformar o jogo da hackathon de 2017 ("Arrastão", Construct 2) num roguelike infinito de verdade, jogável no navegador e no celular, com jogadores reais e dificuldade calibrada por dados.
**Success looks like:** amigos jogando pelo link/instalado no celular; telemetria mostrando mediana e causas de morte saudáveis; ranking (local e, quando ligado, online) sem trapaça.

## Current State

- Port completo pra HTML5/JS puro (sem build), publicado em https://dreewr.github.io/wavesson/ via GitHub Actions (`.github/workflows/pages.yml`) a cada push na `main`.
- Dois layouts: horizontal (1600x720, o de 2017) e vertical (celular em pé, 720 x altura da tela).
- Dificuldade = curva por distância + orçamento de ameaça por fileira + ritmo em serra por praia; calibrada por simulação de bot.
- Passo fixo 60 Hz + gravação de comandos → replay determinístico (ranking à prova de trapaça).
- Telemetria local + tela de estatísticas + export JSON; `tools/analyze.mjs` junta exports.
- Ranking online (Supabase) pronto mas **desligado** até configurar `src/online-config.js`.
- Branch `feat/jogo-real` com telemetria/replay/PWA/trilha original/docs ainda não mesclada na `main`.

## Key Resources

| Resource | Role |
|----------|------|
| `docs/JOGABILIDADE.md` | Doc pública de inimigos e jogabilidade — **gerada** por `npm run docs` |
| `src/difficulty.js` | Curva de dificuldade, custos de ameaça, serra |
| `src/catalog.js` | Texto do bestiário (fonte da doc) |
| `src/layout.js` | Parâmetros dos layouts horizontal/vertical |
| `src/replay.js` | Passo fixo, gravação, replay e verificação |
| `tools/analyze.mjs` | Relatório de calibragem a partir de exports dos jogadores |
| `docs/RANKING-ONLINE.md` | Como ligar o ranking online |
| `legacy/` | Projeto Construct 2 original (referência) |

## Decisions & Constraints

| What | Why |
|------|-----|
| JS puro, sem bundler | Roda em qualquer lugar, deploy trivial; o "build" só carimba versão |
| Toda mudança de jogabilidade → `npm run docs` | A doc pública não pode mentir; o teste `docs.test.js` falha se ficar velha |
| Calibrar com `node` + bot antes de publicar mudanças de dificuldade | O vertical já ficou 2× mais difícil/fácil sem perceber em mais de uma ocasião |
| Partida precisa continuar determinística | Ranking e replays dependem disso (`replay refaz a partida` no teste) |
| Músicas de terceiros só por memória afetiva, repo pessoal | Pra lançamento público/comercial precisam sair; a trilha original sintetizada é a substituta |
| Commits com e-mail noreply do GitHub | Repo é público |
| Arte: tudo do mundo passa por `src/pixel.js` (pixel 2×, contorno, paleta) via cache de sprites em `render.js`; UI fica nítida | Unificar 2017 + novos sem redesenhar à mão, a custo ~0 por quadro |
| Escala: integrante = 100 unidades ≈ 1,75 m; tamanhos em `src/defs.js` seguem essa régua | Pedido de redesign "tudo em escala" |
| Beta publicada em dreewr.github.io/wavesson-beta (repo dreewr/wavesson-beta ← `git push beta feat/jogo-real:main`) | Testar a versão nova sem mexer na main |
| Caricatura racial do menu de 2017 e sprite com escudo do Corinthians fora do jogo | Estereótipo / marca registrada |

## Open Questions

- Tema "arrastão" num lançamento aberto (lojas, divulgação): manter, suavizar ou reenquadrar? Decisão do André.
- Ligar o ranking online (criar projeto Supabase).

## Next Steps

- Juntar exports de alguns jogadores reais e rodar `npm run analyze` pra recalibrar.
- Mesclar `feat/jogo-real` na `main` depois de jogar.

---

## Regras do projeto (pra qualquer sessão)

1. Mudou inimigo, número de dificuldade, vantagem ou pontuação? Rode `npm run docs` e commite a doc junto.
2. Elemento novo na praia precisa de entrada em `src/catalog.js` (o teste cobra).
3. `npm test` antes de qualquer push — o deploy roda os testes e não publica se falhar.
4. Personagem/objeto novo: desenhe normal e passe por `bake()`/`sprite()` no render — nada de desenhar direto no canvas do mundo, senão foge da arte unificada.
5. Não quebre o determinismo: nada de `Math.random()`/`Date.now()` dentro de `src/run.js`, `generator.js` ou `difficulty.js` (use o `rng` da run).

## Self-Maintenance Rules

These rules are directives for Claude. They define how this document stays alive.

### Capture Rules

**Hard rules ("nunca", "sempre", "toda vez", "jamais"):** save to `memory/` and add a row to **Decisions & Constraints**.

**Soft context ("lembre", "memorize", "não esqueça", "anota"):** save to `memory/`; only add here if it affects project workflow.

**Implicit decisions:** when a decision is made, an approach is abandoned, a milestone is completed, a new resource becomes important, or an open question is resolved — update the relevant sections.

### Update Protocol

When any section changes: rewrite **Current State** (overwrite), update **Key Resources**, add rows to **Decisions & Constraints**, move resolved **Open Questions**, revise **Next Steps**, prepend a log entry, update `_Last updated_`.

### Log Maintenance

When the log exceeds 15 entries, summarize the oldest 10 into an "Archive Summary" paragraph and delete them.

### Realignment Check

Every 5 log entries, review **Goal** and **Decisions** against **Current State**; if something seems contradicted, ask André before changing it.

---

## Log

- **2026-11-14** — Branch `feat/jogo-real`: passo fixo + replay, orçamento de ameaça + serra, telemetria/estatísticas/análise, ranking local verificado + online (desligado), PWA, trilha original sintetizada, doc pública gerada do código, CI.
- **2026-11-13** — Port do Construct 2, roguelike infinito, layout/HUD originais, surfista, bombeiros, banhista, layout vertical, deploy versionado no GitHub Pages.
