// Cliente do ranking online (Supabase REST). Só envia a gravação da partida;
// quem decide se a pontuação vale é o servidor, refazendo a partida
// (ver supabase/functions/verify-run). Desligado se online-config.js estiver vazio.

import { ONLINE } from './online-config.js';

export const onlineEnabled = () => Boolean(ONLINE.url && ONLINE.anonKey);

const headers = () => ({
  apikey: ONLINE.anonKey,
  Authorization: `Bearer ${ONLINE.anonKey}`,
  'Content-Type': 'application/json',
});

export async function submitRun(entry, name) {
  if (!onlineEnabled()) return { ok: false, reason: 'desligado' };
  const body = {
    name: String(name || 'anônimo').slice(0, 16),
    score: entry.score,
    meters: entry.meters,
    layout: entry.layout,
    seed: entry.seed,
    version: entry.v,
    replay: entry.replay,
  };
  const res = await fetch(`${ONLINE.url}/rest/v1/runs`, { method: 'POST', headers: { ...headers(), Prefer: 'return=minimal' }, body: JSON.stringify(body) });
  return { ok: res.ok, status: res.status };
}

export async function fetchTop(limit = 20) {
  if (!onlineEnabled()) return [];
  const q = `select=name,score,meters,layout&order=score.desc&limit=${limit}`;
  const res = await fetch(`${ONLINE.url}/rest/v1/leaderboard?${q}`, { headers: headers() });
  return res.ok ? res.json() : [];
}
