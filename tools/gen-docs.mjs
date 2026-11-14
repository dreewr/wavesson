// Gera docs/JOGABILIDADE.md a partir do código (bestiário em src/catalog.js +
// números de verdade de difficulty.js, run.js, perks.js, layout.js...).
// Um teste falha se a doc estiver desatualizada: rode `npm run docs`.

import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CATALOG, CATEGORIES } from '../src/catalog.js';
import { difficultyAt, PATTERN_COST, SAW_LENGTH, TIER_LENGTH } from '../src/difficulty.js';
import { DEFS } from '../src/defs.js';
import { PERKS } from '../src/perks.js';
import { DASH, COMBO, RUSH, LOVE, ASSIST, DANGER_MARGIN } from '../src/run.js';
import { makeLayout } from '../src/layout.js';
import { CREW, BIOMES, BIOME_LENGTH, PERK_FIRST_AT, PERK_STEP, PERK_STEP_GROWTH } from '../src/config.js';

const r1 = (n) => (Math.round(n * 100) / 100).toLocaleString('pt-BR');
const r0 = (n) => Math.round(n).toLocaleString('pt-BR');

function unlockAt(item) {
  if (item.id === 'tide') return firstMeter((d) => d.tideEvery !== Infinity);
  if (item.id === 'rush') return BIOME_LENGTH;
  if (item.id === 'sea') return 0;
  if (!item.pattern) return 0;
  return firstMeter((d) => (d.weights[item.pattern] ?? 0) > 0);
}
function firstMeter(pred) {
  for (let m = 0; m <= 5000; m += 5) if (pred(difficultyAt(m))) return m;
  return null;
}

export function buildDocs() {
  const L = makeLayout('landscape');
  const P = makeLayout('portrait', 1560);
  const out = [];
  const w = (s = '') => out.push(s);

  w('# Wavesson — inimigos e jogabilidade');
  w();
  w('> **Gerado automaticamente** por `tools/gen-docs.mjs` a partir do código do jogo.');
  w('> Não edite à mão: mude o jogo (ou o texto em `src/catalog.js`) e rode `npm run docs`.');
  w('> Os testes falham se esta página ficar desatualizada.');
  w();
  w('## Como se joga');
  w();
  w('Você comanda o **bando inteiro** de uma vez, descendo uma praia infinita. A praia rola sozinha;');
  w('quem fica pra trás da tela (ou é empurrado pra fora dela) **roda**. Pegue itens, recrute a galera,');
  w('desvie dos perigos. Acabou o bando, acabou a partida.');
  w();
  w('| Ação | Teclado | Celular |');
  w('|---|---|---|');
  w('| Mover o bando | WASD / setas | arrastar o dedo |');
  w('| Pique (arrancada) | Espaço / Shift | botão PIQUE |');
  w('| Pausa | P / Esc | botão II |');
  w('| Som | M | — |');
  w('| Escolher vantagem | 1 2 3 | tocar no cartão |');
  w();
  w(`**Pique:** arrancada de ${r1(DASH.duration)} s a ${r1(DASH.mult)}× a velocidade, com ${r1(DASH.cooldown)} s de recarga. Durante o pique nada derruba o bando (só ficar pra trás) e ele desperta quem estiver apaixonado. Sem direção, ele arranca pra frente.`);
  w();
  w(`**Perigo de ficar pra trás:** quando alguém chega a ${DANGER_MARGIN}px do topo, a borda de cima fica vermelha e aparece um "!" piscando nele.`);
  w();

  w('## Bestiário');
  w();
  w('"Libera em" é a distância a partir da qual o elemento pode aparecer. "Custo" é quanto ele gasta do');
  w('orçamento de ameaça da praia (ver *Como a dificuldade sobe*).');
  for (const [cat, title] of CATEGORIES) {
    const items = CATALOG.filter((c) => c.cat === cat);
    if (!items.length) continue;
    w();
    w(`### ${title}`);
    w();
    w('| | Libera em | Custo | O que faz | Como lidar | Desde |');
    w('|---|---|---|---|---|---|');
    for (const it of items) {
      const m = unlockAt(it);
      const cost = it.pattern ? r1(PATTERN_COST[it.pattern] ?? 0) : '—';
      const pts = DEFS[it.id]?.points ? ` **${DEFS[it.id].points} pts.**` : '';
      w(`| **${it.name}** | ${m == null ? '—' : `${m} m`} | ${cost} | ${it.does}${pts} | ${it.counter || '—'} | ${it.since} |`);
    }
  }
  w();

  w('## Pontuação');
  w();
  w('- 1 ponto por metro, mais os itens (chinelo, celular, bolsa).');
  w(`- **Tamanho do bando:** cada integrante além do primeiro soma +8% em tudo que você pega.`);
  w(`- **Combo:** itens pegos em menos de ${r1(COMBO.window)} s um do outro somam +${r0(COMBO.step * 100)}% cada, até ×${r1(COMBO.max)}.`);
  w(`- **Hora do Arrastão:** ${RUSH.seconds} s de pontos ×${RUSH.lootMult} ao chegar numa praia nova.`);
  w('- **Passou liso:** atravessar um pelotão de bombeiros sem perder ninguém dá bônus.');
  w('- Vantagem **Mão Leve** multiplica tudo.');
  w();

  w('## Vantagens (roguelike)');
  w();
  w(`A primeira escolha vem aos ${PERK_FIRST_AT} m; depois a cada ${PERK_STEP} m, e o intervalo cresce ${PERK_STEP_GROWTH} m a cada escolha. Sempre 3 opções sorteadas.`);
  w();
  w('| Vantagem | Efeito | Máx. |');
  w('|---|---|---|');
  for (const p of PERKS) w(`| **${p.name}** | ${p.desc} | ${p.max >= 99 ? '∞' : p.max} |`);
  w();

  w('## Como a dificuldade sobe');
  w();
  w(`Tudo é função da distância (\`src/difficulty.js\`). Sobe forte até ~1.500 m e depois continua subindo devagar, pra sempre. A cada ${TIER_LENGTH} m muda o "nível", que libera coisas novas.`);
  w();
  w('Três mecanismos trabalham juntos:');
  w();
  w('1. **Curva por distância** — velocidade, espaçamento, avisos e inimigos mudam com os metros (tabela abaixo).');
  w('2. **Orçamento de ameaça** — a cada fileira a praia ganha pontos de ameaça e só pode "comprar" o que tem.');
  w('   Isso evita sequências impossíveis e deixa a densidade de perigo previsível.');
  w(`3. **Ritmo em serra** — a intensidade sobe ao longo de cada praia (${SAW_LENGTH} m, de 0,8× a 1,25×) e despenca na troca,`);
  w('   onde vem a Hora do Arrastão. Tensão → alívio → tensão maior.');
  w();
  w('| Metros | Rolagem (px/s) | Fileiras a cada (px) | Passagem mín. (px) | Ameaça/fileira | Intensidade | Aviso viatura | Aviso bombeiros | Onda a cada |');
  w('|---|---|---|---|---|---|---|---|---|');
  for (const m of [0, 150, 300, 450, 600, 900, 1200, 1500, 2000, 3000]) {
    const d = difficultyAt(m);
    w(`| ${r0(m)} | ${r0(d.scrollSpeed)} | ${r0(d.rowGap)} | ${r0(d.gapWidth)} | ${r1(d.threatPerRow)} | ${r1(d.intensity)}× | ${r1(d.policeWarn)} s | ${r1(d.squadWarn)} s | ${d.tideEvery === Infinity ? '—' : `${r0(d.tideEvery)} s`} |`);
  }
  w();
  w('**Custo de cada tipo de fileira:**');
  w();
  w(Object.entries(PATTERN_COST).sort((a, b) => a[1] - b[1]).map(([k, v]) => `\`${k}\` ${r1(v)}`).join(' · '));
  w();
  w(`**Ajuda pra iniciante:** se a mediana das suas últimas partidas ficou abaixo de 80 m, a próxima começa com a praia a ${r1(ASSIST.scroll * 100)}% da velocidade até ${ASSIST.meters} m. A partida aparece como "com ajuda".`);
  w();
  w(`**Apaixonado (banhista):** ${r1(LOVE.seconds)} s com ${r0(LOVE.control * 100)}% do controle, puxado a ${LOVE.pull} px/s; depois ${r1(LOVE.cooldown)} s de imunidade.`);
  w();

  w('## Celular em pé × deitado');
  w();
  w('Com a tela em pé o jogo usa um layout próprio: a praia é mais estreita e você enxerga mais à frente.');
  w('Pra compensar, os números abaixo foram calibrados por simulação (bot jogando milhares de partidas).');
  w();
  w('| | Deitado / PC | Em pé |');
  w('|---|---|---|');
  w(`| Mundo visível | ${L.w}×${L.h} | ${P.w}×altura da tela (~${P.h}) |`);
  w(`| Areia jogável | ${L.zone.sandEnd - L.zone.sandStart} px | ${P.zone.sandEnd - P.zone.sandStart} px |`);
  w(`| Velocidade da praia | ${r1(L.speedMult)}× | ${r1(P.speedMult)}× |`);
  w(`| Espaçamento das fileiras | ${r1(L.rowGapMult)}× | ${r1(P.rowGapMult)}× |`);
  w(`| Orçamento de ameaça | ${r1(L.threatMult)}× | ${r1(P.threatMult)}× |`);
  w(`| Alcance da onda | ${r1(L.tideScale)}× | ${r1(P.tideScale)}× |`);
  w();

  w('## Praias');
  w();
  w(`A cada ${BIOME_LENGTH} m muda a praia (e vem a Hora do Arrastão): ${BIOMES.map((b) => b.name).join(' → ')} → (volta pro começo, mais difícil).`);
  w();
  w(`O bando começa com ${CREW.startSize} integrantes e anda a ${CREW.speed} px/s em relação à praia.`);
  w();
  return out.join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  writeFileSync(new URL('../docs/JOGABILIDADE.md', import.meta.url), buildDocs());
  console.log('docs/JOGABILIDADE.md atualizado');
}
