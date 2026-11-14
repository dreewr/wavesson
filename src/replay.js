// Passo fixo + gravação de partidas.
//
// A simulação sempre anda em fatias de 1/60 s e o input é quantizado, então
// "seed + comandos" reproduz a partida exatamente (no mesmo motor JS). Isso
// serve pra três coisas: ranking à prova de trapaça (o servidor refaz a
// partida e confere a pontuação), reproduzir bugs e analisar como as pessoas jogam.

import { Run } from './run.js';
import { makeLayout } from './layout.js';

export const TICK = 1 / 60;
export const REPLAY_FORMAT = 1;
const Q = 8; // eixo quantizado em oitavos: -8..8

export function quantize(input) {
  const q = (v) => Math.max(-Q, Math.min(Q, Math.round((v || 0) * Q)));
  return { x: q(input.x) / Q, y: q(input.y) / Q, dash: !!input.dash };
}

// Grava os comandos de cada tick em "corridas" iguais: [quantos, x, y, pique].
export function createRecorder({ seed, layout, version = null, assist = false }) {
  const frames = [];
  const perks = [];
  let ticks = 0;
  return {
    tick(input) {
      const qx = Math.round(input.x * Q), qy = Math.round(input.y * Q), d = input.dash ? 1 : 0;
      const last = frames[frames.length - 1];
      if (last && last[1] === qx && last[2] === qy && last[3] === d && !d) last[0]++;
      else frames.push([1, qx, qy, d]);
      ticks++;
    },
    perk(id) {
      perks.push(id);
    },
    get ticks() {
      return ticks;
    },
    finish(run) {
      return {
        format: REPLAY_FORMAT,
        version,
        seed,
        assist,
        layout: { kind: layout.kind, h: layout.h },
        frames,
        perks,
        claimed: { score: Math.floor(run.score), meters: Math.floor(run.meters), ticks },
      };
    },
  };
}

// Refaz a partida a partir da gravação. Devolve a Run no estado final.
export function replay(rec, { onEvent } = {}) {
  const layout = makeLayout(rec.layout.kind, rec.layout.h);
  const run = new Run({ seed: rec.seed, layout, onEvent, assist: !!rec.assist });
  let perkIdx = 0;
  for (const [count, qx, qy, d] of rec.frames) {
    for (let i = 0; i < count; i++) {
      if (run.over) return run;
      if (run.perkChoices) {
        const id = rec.perks[perkIdx++];
        // só vale escolher entre as 3 oferecidas (senão era trapaça)
        const perk = run.perkChoices.find((p) => p.id === id);
        if (!perk) throw new Error(`vantagem fora das opções no replay: ${id}`);
        run.choosePerk(perk);
      }
      run.update(TICK, { x: qx / Q, y: qy / Q, dash: d === 1 && i === 0 });
    }
  }
  return run;
}

// Confere se a pontuação declarada bate com a partida refeita.
export function verify(rec) {
  try {
    const run = replay(rec);
    const score = Math.floor(run.score), meters = Math.floor(run.meters);
    const ok = run.over && score === rec.claimed.score && meters === rec.claimed.meters;
    return { ok, score, meters, over: run.over, claimed: rec.claimed };
  } catch (err) {
    return { ok: false, error: err.message, claimed: rec.claimed };
  }
}
