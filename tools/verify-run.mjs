// Confere gravações de partidas refazendo cada uma (o mesmo que o servidor
// do ranking online faz). Aceita um export do jogo ou um JSON de gravação.
//
// uso: node tools/verify-run.mjs wavesson-dados.json

import { readFileSync } from 'node:fs';
import { verify } from '../src/replay.js';

const file = process.argv[2];
if (!file) {
  console.error('uso: node tools/verify-run.mjs <arquivo.json>');
  process.exit(1);
}
const data = JSON.parse(readFileSync(file, 'utf8'));
const recs = data.frames ? [data] : (data.top || []).map((t) => t.replay).filter(Boolean);
if (!recs.length) {
  console.error('nenhuma gravação encontrada no arquivo');
  process.exit(1);
}
let bad = 0;
for (const rec of recs) {
  const r = verify(rec);
  if (!r.ok) bad++;
  console.log(`${r.ok ? '✓' : '✗'} seed ${rec.seed}: declarado ${rec.claimed.score} pts / ${rec.claimed.meters} m → refeito ${r.score ?? '-'} pts / ${r.meters ?? '-'} m${r.error ? ` (${r.error})` : ''}`);
}
process.exit(bad ? 2 : 0);
