// Geração procedural da praia, uma "fileira" por vez.
// Puro: recebe rng + dificuldade, devolve specs { kind, x, y, ... }.
// Garantia de jogabilidade: fileiras com sólidos sempre deixam ao menos uma
// passagem de largura >= diff.gapWidth.

// O enquadramento (largura da praia, faixas) vem de `layout` — ver layout.js.

import { DEFS } from './defs.js';
import { LANDSCAPE } from './layout.js';
import { PATTERN_COST } from './difficulty.js';

export const LANE_MIN = LANDSCAPE.laneMin;
export const LANE_MAX = LANDSCAPE.laneMax;

function solidKindAt(rng, x, L) {
  if (x <= Math.max(10, L.zone.walkEnd - 120)) return 'palm';
  return rng.chance(0.25) && x > L.zone.sandStart ? 'net' : 'umbrella';
}

// amplitude máxima do cachorro pra ele caber na faixa jogável
const maxDogAmp = (L) => (L.laneMax - L.laneMin) / 2 - 60;
// praia estreita → vaivém do cachorro proporcionalmente menor
const dogAmpScale = (L) => Math.min(1, Math.max(0.5, (L.laneMax - L.laneMin) / 1300));

// Escolhe a passagem e preenche o resto com até `count` sólidos sem invadi-la.
export function placeSolids(rng, count, gapWidth, L = LANDSCAPE) {
  const LANE_MIN = L.laneMin, LANE_MAX = L.laneMax;
  const gapCenter = rng.range(LANE_MIN + gapWidth / 2, LANE_MAX - gapWidth / 2);
  const gap = { from: gapCenter - gapWidth / 2, to: gapCenter + gapWidth / 2 };
  const placed = [];
  let tries = 0;
  while (placed.length < count && tries++ < count * 12) {
    const probe = rng.range(LANE_MIN, LANE_MAX);
    const kind = solidKindAt(rng, probe, L);
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
  solids(rng, y, diff, L) {
    const count = rng.int(2, 3 + Math.min(3, diff.tier));
    const { gap, solids } = placeSolids(rng, count, diff.gapWidth, L);
    const out = solids.map((s) => ({ ...s, y: y - DEFS[s.kind].hit.oy }));
    // um mimo na passagem
    if (rng.chance(0.5)) out.push({ kind: 'phone', x: (gap.from + gap.to) / 2 - 12, y: y - 10 });
    return out;
  },

  castles(rng, y, diff, L) {
    const out = [];
    const n = rng.int(2, 4 + Math.min(2, diff.tier));
    for (let i = 0; i < n; i++) {
      out.push({ kind: 'castle', x: rng.range(L.zone.sandStart, L.zone.sandEnd - 60), y: y + rng.range(-40, 40) });
    }
    // recompensa atrás dos castelos
    out.push({ kind: rng.chance(0.3) ? 'bag' : 'phone', x: rng.range(L.zone.sandStart, L.zone.sandEnd - 60), y: y + 60 });
    return out;
  },

  dog(rng, y, diff, L) {
    const out = [];
    for (let i = 0; i < 1; i++) {
      const amp = Math.min(diff.dogAmp * dogAmpScale(L) * rng.range(0.7, 1.1), maxDogAmp(L));
      const cx = rng.range(L.laneMin + amp + 45, L.laneMax - amp - 45);
      out.push({ kind: 'dog', x: cx, y: y + i * 90, amp, speed: diff.dogSpeed * rng.range(0.85, 1.15), phase: rng.range(0, Math.PI * 2) });
    }
    out.push(...lootLine(rng, y + 40, rng.range(L.zone.sandStart, L.zone.sandEnd - 250), rng.int(2, 4)));
    return out;
  },

  vendor(rng, y, diff, L) {
    return [{ kind: 'vendor', x: rng.range(L.zone.sandStart, L.zone.sandEnd - 100), y, speed: diff.vendorSpeed }];
  },

  lifeguard(rng, y, diff, L) {
    const out = [];
    const n = diff.tier >= 3 ? rng.int(1, 3) : 1;
    for (let i = 0; i < n; i++) {
      const x = rng.range(L.zone.sandStart + 40, L.zone.shallow - 60);
      out.push({ kind: 'lifeguard', x, y: y + rng.range(-30, 30), chase: diff.lifeguardChase });
      if (rng.chance(0.6)) out.push({ kind: 'bag', x: x + rng.pick([-90, 90]), y: y + 20 });
    }
    return out;
  },

  loot(rng, y, diff, L) {
    const out = lootLine(rng, y, rng.range(L.laneMin, L.zone.sandEnd - 350), rng.int(3, 6));
    if (rng.chance(0.4)) out.push({ kind: 'phone', x: rng.range(L.zone.sandStart, L.zone.sandEnd), y: y + 70 });
    if (rng.chance(0.15)) out.push({ kind: 'bag', x: rng.range(L.zone.shallow - 120, L.zone.deep - 40), y: y + 40 }); // isca no raso
    return out;
  },

  recruit(rng, y, diff, L) {
    return [{ kind: 'recruit', x: rng.range(L.laneMin + 20, L.zone.sandEnd), y, skin: rng.int(0, 4) }];
  },

  surfer(rng, y, diff, L) {
    const n = diff.tier >= 4 && rng.chance(0.4) ? 2 : 1;
    const out = [];
    for (let i = 0; i < n; i++) {
      out.push({ kind: 'surfer', x: L.zone.shallow + 10 + i * 40, y: y + i * 130, speed: diff.surferSpeed * rng.range(0.9, 1.1), zigzag: diff.surferZigzag, skin: rng.int(0, 4) });
    }
    out.push(...lootLine(rng, y + 30, rng.range(L.zone.sandStart, L.zone.sandEnd - 300), rng.int(2, 4)));
    return out;
  },

  // Bombeiros: coluna estreita, "V" ou um paredão com um buraco pra passar.
  squad(rng, y, diff, L) {
    const STEP = 62;
    const forms = diff.tier >= 3 ? ['column', 'vee', 'wall', 'wall'] : ['column', 'vee', 'wall'];
    const form = rng.pick(forms);
    const members = [];
    if (form === 'column') {
      const x = rng.range(L.laneMin + 20, L.zone.sandEnd - 60);
      const n = rng.int(3, 4 + Math.min(3, diff.tier));
      for (let i = 0; i < n; i++) members.push({ dx: x + (i % 2) * 14, dy: i * 80 });
    } else if (form === 'vee') {
      const cx = rng.range(L.laneMin + 220, L.zone.sandEnd - 220);
      const arms = rng.int(2, 3);
      members.push({ dx: cx, dy: 0 });
      for (let i = 1; i <= arms; i++) {
        members.push({ dx: cx - i * STEP, dy: i * 70 });
        members.push({ dx: cx + i * STEP, dy: i * 70 });
      }
    } else {
      const width = Math.min(1150, 520 + diff.tier * 90, L.laneMax - L.laneMin - 20);
      const x0 = rng.range(L.laneMin, Math.max(L.laneMin, L.zone.sandEnd - width));
      const gapW = diff.gapWidth + 50;
      const gap = rng.range(x0 + STEP + 10, x0 + width - gapW - STEP - 10); // buraco sempre no meio
      for (let x = x0; x <= x0 + width; x += STEP) {
        if (x + 44 > gap && x < gap + gapW) continue;
        members.push({ dx: x, dy: rng.range(0, 24) });
      }
    }
    return [{ kind: 'squad', x: 0, y, form, members, speed: diff.squadSpeed, warn: diff.squadWarn }];
  },

  // Banhista: deitada na areia, com uma bolsa do lado de isca.
  banhista(rng, y, diff, L) {
    const n = diff.tier >= 4 && L.kind === 'landscape' && rng.chance(0.35) ? 2 : 1;
    const out = [];
    for (let i = 0; i < n; i++) {
      const x = rng.range(L.zone.sandStart, L.zone.sandEnd - 160);
      out.push({ kind: 'banhista', x, y: y + i * 150, look: rng.int(0, 5) });
      if (rng.chance(0.6)) out.push({ kind: rng.chance(0.4) ? 'bag' : 'phone', x: x + rng.pick([-40, 175]), y: y + 10 + i * 150 });
    }
    return out;
  },

  police(rng, y, diff, L) {
    return [{ kind: 'police', x: 0, y, dir: rng.chance(0.6) ? 1 : -1 }];
  },

  combo(rng, y, diff, L) {
    // sólidos + cachorro patrulhando a passagem
    const { gap, solids } = placeSolids(rng, rng.int(3, 5), diff.gapWidth + 40, L);
    const out = solids.map((s) => ({ ...s, y: y - DEFS[s.kind].hit.oy }));
    const amp = Math.min(diff.dogAmp * dogAmpScale(L), 220, maxDogAmp(L));
    const mid = (gap.from + gap.to) / 2;
    // o cachorro patrulha a passagem, mas sem sair da faixa jogável
    const cx = Math.min(Math.max(mid, L.laneMin + amp + 45), L.laneMax - amp - 45);
    out.push({ kind: 'dog', x: cx, y: y + 80, amp, speed: diff.dogSpeed, phase: rng.range(0, 6.28) });
    out.push({ kind: 'bag', x: mid - 30, y: y + 20 });
    return out;
  },
};

export const PATTERN_NAMES = Object.keys(PATTERNS);

export function generateRow(rng, y, diff, opts = {}) {
  const L = opts.layout || LANDSCAPE;
  const weights = opts.rush
    ? { loot: 6, recruit: 2.2, castles: 1.2, solids: 1.5, dog: 0.4 } // Hora do Arrastão: fartura
    : { ...diff.weights };
  if (opts.recruitBoost) weights.recruit *= opts.recruitBoost;
  // orçamento de ameaça: só entra o que a praia "pode pagar" agora
  if (opts.budget != null) {
    for (const k of Object.keys(weights)) if ((PATTERN_COST[k] ?? 0) > opts.budget) weights[k] = 0;
    if (!Object.values(weights).some((w) => w > 0)) weights.loot = 1;
  }
  const pattern = rng.weighted(weights);
  const specs = PATTERNS[pattern](rng, y, diff, L);
  if (rng.chance(0.25)) {
    specs.unshift({ kind: 'towel', x: rng.range(L.zone.sandStart, L.zone.sandEnd - 200), y: y + rng.range(-120, 120) });
  }
  return { pattern, specs, cost: PATTERN_COST[pattern] ?? 0 };
}
