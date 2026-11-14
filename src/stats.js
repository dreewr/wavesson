// Estatísticas das partidas (puro: usado no jogo e em tools/analyze.mjs).
// É daqui que sai a calibragem com gente de verdade: onde se morre, do quê,
// quão longe a maioria chega e se isso muda entre versões.

export const CAUSE_NAMES = {
  left: 'Ficou pra trás',
  love: 'Ficou apaixonado',
  dog: 'Cachorro',
  lifeguard: 'Salva-vidas',
  surfer: 'Surfista desatento',
  bombeiro: 'Bombeiros',
  police: 'Viatura',
  sea: 'Correnteza',
};

const quantile = (sorted, q) => {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * q;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
};

export function summarize(runs, { bucket = 50 } = {}) {
  const meters = runs.map((r) => r.meters).sort((a, b) => a - b);
  const causes = {};
  const deathsAt = {};
  let deathsTotal = 0;
  for (const r of runs) {
    for (const d of r.deathLog || []) {
      causes[d.cause] = (causes[d.cause] || 0) + 1;
      const b = Math.floor(d.m / bucket) * bucket;
      deathsAt[b] = (deathsAt[b] || 0) + 1;
      deathsTotal++;
    }
  }
  const byLayout = {};
  for (const r of runs) (byLayout[r.layout] ??= []).push(r.meters);
  return {
    runs: runs.length,
    best: meters.at(-1) || 0,
    median: Math.round(quantile(meters, 0.5)),
    p90: Math.round(quantile(meters, 0.9)),
    earlyRate: runs.length ? runs.filter((r) => r.meters < 60).length / runs.length : 0,
    avgSeconds: runs.length ? Math.round(runs.reduce((s, r) => s + (r.seconds || 0), 0) / runs.length) : 0,
    bestScore: Math.max(0, ...runs.map((r) => r.score || 0)),
    deathsTotal,
    causes: Object.entries(causes).sort((a, b) => b[1] - a[1]).map(([cause, n]) => ({ cause, name: CAUSE_NAMES[cause] || cause, n, pct: n / deathsTotal })),
    deathsAt: Object.entries(deathsAt).map(([m, n]) => ({ m: Number(m), n })).sort((a, b) => a.m - b.m),
    byLayout: Object.fromEntries(Object.entries(byLayout).map(([k, v]) => [k, { runs: v.length, median: Math.round(quantile(v.sort((a, b) => a - b), 0.5)) }])),
  };
}

// Ajuda pra iniciante: se as últimas partidas foram curtas, a próxima começa mais leve.
export function needsAssist(runs, { last = 5, under = 80 } = {}) {
  const recent = runs.slice(-last);
  if (recent.length < 3) return false;
  const sorted = recent.map((r) => r.meters).sort((a, b) => a - b);
  return quantile(sorted, 0.5) < under;
}
