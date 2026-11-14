// Relatório de calibragem a partir dos dados exportados pelos jogadores
// (botão "exportar meus dados" na tela de estatísticas).
//
// uso: node tools/analyze.mjs dados-andre.json dados-amigo.json ...

import { readFileSync } from 'node:fs';
import { summarize, CAUSE_NAMES } from '../src/stats.js';

const files = process.argv.slice(2);
if (!files.length) {
  console.error('uso: node tools/analyze.mjs <arquivo.json> [mais arquivos...]');
  process.exit(1);
}

const runs = files.flatMap((f) => {
  const data = JSON.parse(readFileSync(f, 'utf8'));
  return (data.runs || []).map((r) => ({ ...r, player: f }));
});

const pct = (x) => `${Math.round(x * 100)}%`;
const s = summarize(runs);
const out = [];
out.push(`# Relatório Wavesson — ${runs.length} partidas de ${files.length} jogador(es)\n`);
out.push(`| | |\n|---|---|`);
out.push(`| Metade chega até | **${s.median} m** |`);
out.push(`| 10% melhores passam de | ${s.p90} m |`);
out.push(`| Mais longe | ${s.best} m |`);
out.push(`| Morrem antes de 60 m | ${pct(s.earlyRate)} |`);
out.push(`| Duração média | ${s.avgSeconds} s |\n`);

out.push(`## Por enquadramento\n`);
for (const [k, v] of Object.entries(s.byLayout)) out.push(`- ${k === 'portrait' ? 'em pé' : 'deitado'}: ${v.runs} partidas, mediana ${v.median} m`);

out.push(`\n## Por versão\n`);
const byV = {};
for (const r of runs) (byV[r.v] ??= []).push(r);
for (const [v, rs] of Object.entries(byV)) out.push(`- \`${v}\`: ${rs.length} partidas, mediana ${summarize(rs).median} m`);

out.push(`\n## Do que se morre\n`);
for (const c of s.causes) out.push(`- ${c.name}: ${c.n} (${pct(c.pct)})`);

out.push(`\n## Onde se morre (trechos de 50 m com mais perdas)\n`);
for (const d of [...s.deathsAt].sort((a, b) => b.n - a.n).slice(0, 6)) out.push(`- ${d.m}–${d.m + 50} m: ${d.n}`);

const perkCount = {};
for (const r of runs) for (const [id, n] of Object.entries(r.perks || {})) perkCount[id] = (perkCount[id] || 0) + n;
out.push(`\n## Vantagens mais escolhidas\n`);
for (const [id, n] of Object.entries(perkCount).sort((a, b) => b[1] - a[1])) out.push(`- ${id}: ${n}`);

// pistas automáticas pra calibrar
const hints = [];
if (s.earlyRate > 0.35) hints.push('Muita gente morre antes de 60 m: o começo está difícil (veja ASSIST e os primeiros valores de difficulty.js).');
if (s.median > 800) hints.push('A mediana passa de 800 m: o jogo pode estar fácil demais no meio.');
const top = s.causes[0];
if (top && top.pct > 0.4 && top.cause !== 'left') hints.push(`${top.name} responde por ${pct(top.pct)} das perdas: pode estar forte ou mal sinalizado.`);
const left = s.causes.find((c) => c.cause === 'left');
if (left && left.pct > 0.55) hints.push('"Ficou pra trás" domina: obstáculos sólidos/rolagem podem estar apertando demais, ou o pique é pouco descoberto.');
out.push(`\n## Pistas\n`);
out.push(hints.length ? hints.map((h) => `- ${h}`).join('\n') : '- Nada gritante. Bom sinal.');
out.push(`\n_Causas conhecidas: ${Object.values(CAUSE_NAMES).join(', ')}._`);
console.log(out.join('\n'));
