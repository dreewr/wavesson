// Geração procedural da praia, uma "fileira" por vez.
// Puro: recebe rng + dificuldade, devolve specs { kind, x, y, ... }.
// Garantia de jogabilidade: fileiras com sólidos sempre deixam ao menos uma
// passagem de largura >= diff.gapWidth.

import { ZONE } from './config.js';
import { DEFS } from './defs.js';

export const LANE_MIN = 10;
export const LANE_MAX = ZONE.shallow - 30;

function solidKindAt(rng, x, width) {
  if (x + width <= ZONE.walkEnd + 10) return 'palm';
  return rng.chance(0.25) && x > ZONE.sandStart ? 'net' : 'umbrella';
}

// Escolhe a passagem e preenche o resto com até `count` sólidos sem invadi-la.
export function placeSolids(rng, count, gapWidth) {
  const gapCenter = rng.range(LANE_MIN + gapWidth / 2, LANE_MAX - gapWidth / 2);
  const gap = { from: gapCenter - gapWidth / 2, to: gapCenter + gapWidth / 2 };
  const placed = [];
  let tries = 0;
  while (placed.length < count && tries++ < count * 12) {
    const probe = rng.range(LANE_MIN, LANE_MAX);
    const kind = solidKindAt(rng, probe, 130);
    const d = DEFS[kind];
    const x = Math.min(probe, LANE_MAX - d.w);
    const hx = x + d.hit.ox;
    const hw = d.hit.w;
    if (hx < gap.to && hx + hw > gap.from) continue; // invade a passagem
    if (placed.some((p) => hx < p.hx + p.hw + 20 && hx + hw + 20 > p.hx)) continue;
    placed.push({ kind, x, hx, hw });
  }
  return { gap, solids: placed.map(({ kind, x }) => ({ kind, x })) };
}

function lootLine(rng, y, x0, n, kind = 'flipflop') {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ kind, x: x0 + i * 55, y: y + 10 });
  return out;
}

const PATTERNS = {
  solids(rng, y, diff) {
    const count = rng.int(2, 3 + Math.min(3, diff.tier));
    const { gap, solids } = placeSolids(rng, count, diff.gapWidth);
    const out = solids.map((s) => ({ ...s, y: y - DEFS[s.kind].hit.oy }));
    // um mimo na passagem
    if (rng.chance(0.5)) out.push({ kind: 'phone', x: (gap.from + gap.to) / 2 - 12, y: y - 10 });
    return out;
  },

  castles(rng, y, diff) {
    const out = [];
    const n = rng.int(2, 4 + Math.min(2, diff.tier));
    for (let i = 0; i < n; i++) {
      out.push({ kind: 'castle', x: rng.range(ZONE.sandStart, ZONE.sandEnd - 60), y: y + rng.range(-40, 40) });
    }
    // recompensa atrás dos castelos
    out.push({ kind: rng.chance(0.3) ? 'bag' : 'phone', x: rng.range(ZONE.sandStart, ZONE.sandEnd - 60), y: y + 60 });
    return out;
  },

  dog(rng, y, diff, count = 1) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const amp = diff.dogAmp * rng.range(0.7, 1.1);
      const cx = rng.range(LANE_MIN + amp + 45, LANE_MAX - amp - 45);
      out.push({ kind: 'dog', x: cx, y: y + i * 90, amp, speed: diff.dogSpeed * rng.range(0.85, 1.15), phase: rng.range(0, Math.PI * 2) });
    }
    out.push(...lootLine(rng, y + 40, rng.range(ZONE.sandStart, ZONE.sandEnd - 250), rng.int(2, 4)));
    return out;
  },

  vendor(rng, y, diff) {
    return [{ kind: 'vendor', x: rng.range(ZONE.sandStart, ZONE.sandEnd - 100), y, speed: diff.vendorSpeed }];
  },

  lifeguard(rng, y, diff) {
    const out = [];
    const n = diff.tier >= 3 ? rng.int(1, 3) : 1;
    for (let i = 0; i < n; i++) {
      const x = rng.range(ZONE.sandStart + 40, ZONE.shallow - 60);
      out.push({ kind: 'lifeguard', x, y: y + rng.range(-30, 30), chase: diff.lifeguardChase });
      if (rng.chance(0.6)) out.push({ kind: 'bag', x: x + rng.pick([-90, 90]), y: y + 20 });
    }
    return out;
  },

  loot(rng, y) {
    const out = lootLine(rng, y, rng.range(LANE_MIN, ZONE.sandEnd - 350), rng.int(3, 6));
    if (rng.chance(0.4)) out.push({ kind: 'phone', x: rng.range(ZONE.sandStart, ZONE.sandEnd), y: y + 70 });
    if (rng.chance(0.15)) out.push({ kind: 'bag', x: rng.range(ZONE.shallow - 120, ZONE.deep - 40), y: y + 40 }); // isca no raso
    return out;
  },

  recruit(rng, y) {
    return [{ kind: 'recruit', x: rng.range(LANE_MIN + 20, ZONE.sandEnd), y, skin: rng.int(0, 4) }];
  },

  surfer(rng, y, diff) {
    const n = diff.tier >= 4 && rng.chance(0.4) ? 2 : 1;
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ kind: 'surfer', x: ZONE.shallow + 10 + i * 40, y: y + i * 130, speed: diff.surferSpeed * rng.range(0.9, 1.1), zigzag: diff.surferZigzag, skin: rng.int(0, 4) });
    }
    out.push(...lootLine(rng, y + 30, rng.range(ZONE.sandStart, ZONE.sandEnd - 300), rng.int(2, 4)));
    return out;
  },

  police(rng, y) {
    return [{ kind: 'police', x: 0, y, dir: rng.chance(0.6) ? 1 : -1 }];
  },

  combo(rng, y, diff) {
    // sólidos + cachorro patrulhando a passagem
    const { gap, solids } = placeSolids(rng, rng.int(3, 5), diff.gapWidth + 40);
    const out = solids.map((s) => ({ ...s, y: y - DEFS[s.kind].hit.oy }));
    const cx = (gap.from + gap.to) / 2;
    out.push({ kind: 'dog', x: cx, y: y + 80, amp: Math.min(diff.dogAmp, 220), speed: diff.dogSpeed, phase: rng.range(0, 6.28) });
    out.push({ kind: 'bag', x: cx - 30, y: y + 20 });
    return out;
  },
};

export const PATTERN_NAMES = Object.keys(PATTERNS);

export function generateRow(rng, y, diff, opts = {}) {
  const weights = opts.rush
    ? { loot: 6, recruit: 2.2, castles: 1.2, solids: 1.5, dog: 0.4 } // Hora do Arrastão: fartura
    : { ...diff.weights };
  if (opts.recruitBoost) weights.recruit *= opts.recruitBoost;
  const pattern = rng.weighted(weights);
  const specs = PATTERNS[pattern](rng, y, diff);
  if (rng.chance(0.25)) {
    specs.unshift({ kind: 'towel', x: rng.range(ZONE.sandStart, ZONE.sandEnd - 200), y: y + rng.range(-120, 120) });
  }
  return { pattern, specs };
}
