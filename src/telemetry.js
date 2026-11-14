// Telemetria local: cada partida vira um registro no navegador (sem servidor).
// A tela de estatísticas lê daqui, e "exportar" baixa um JSON que dá pra
// juntar de vários jogadores com `node tools/analyze.mjs arquivos.json`.

const RUNS_KEY = 'wavesson.runs';
const TOP_KEY = 'wavesson.top';
const MAX_RUNS = 300;
const MAX_TOP = 10;

const load = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; } catch { return fallback; }
};
const save = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch { return false; }
};

export function summaryOf(run, rec, version) {
  return {
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    at: new Date().toISOString(),
    v: version || 'local',
    seed: run.seed,
    layout: run.layout.kind,
    assist: !!run.assist,
    meters: Math.floor(run.meters),
    score: Math.floor(run.score),
    seconds: Math.round((rec?.ticks ?? run.time * 60) / 60),
    maxCrew: run.maxCrew,
    recruited: run.recruited,
    comboBest: run.combo.best,
    loot: { ...run.loot },
    perks: { ...run.taken },
    deaths: { ...run.deaths },
    deathLog: run.deathLog.slice(0, 60),
  };
}

export function recordRun(summary) {
  const runs = load(RUNS_KEY, []);
  runs.push(summary);
  save(RUNS_KEY, runs.slice(-MAX_RUNS));
}

export function allRuns() {
  return load(RUNS_KEY, []);
}

// Ranking local: guarda as 10 melhores com a gravação (pra conferir/rever).
export function topRuns() {
  return load(TOP_KEY, []);
}

export function maybeAddTop(summary, replayRec) {
  const top = topRuns();
  const entry = { ...summary, replay: replayRec, verified: null };
  top.push(entry);
  top.sort((a, b) => b.score - a.score);
  const kept = top.slice(0, MAX_TOP);
  if (!kept.includes(entry)) return null;
  // a gravação pode ser grande; se não couber, guarda sem ela
  if (!save(TOP_KEY, kept)) {
    entry.replay = null;
    save(TOP_KEY, kept);
  }
  return entry;
}

export function markVerified(id, ok) {
  const top = topRuns();
  const e = top.find((t) => t.id === id);
  if (e) { e.verified = ok; save(TOP_KEY, top); }
}

export function exportJson() {
  const data = { app: 'wavesson', exportedAt: new Date().toISOString(), runs: allRuns(), top: topRuns().slice(0, 3) };
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `wavesson-dados-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
