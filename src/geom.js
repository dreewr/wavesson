export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

export function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Vetor mínimo para tirar `a` de dentro de `b` (ou null se não colidem).
export function pushOut(a, b) {
  if (!overlaps(a, b)) return null;
  const left = b.x - (a.x + a.w);
  const right = b.x + b.w - a.x;
  const up = b.y - (a.y + a.h);
  const down = b.y + b.h - a.y;
  const dx = Math.abs(left) < Math.abs(right) ? left : right;
  const dy = Math.abs(up) < Math.abs(down) ? up : down;
  return Math.abs(dx) < Math.abs(dy) ? { x: dx, y: 0 } : { x: 0, y: dy };
}

export function box(entity, hb) {
  return { x: entity.x + hb.ox, y: entity.y + hb.oy, w: hb.w, h: hb.h };
}

export function center(b) {
  return { x: b.x + b.w / 2, y: b.y + b.h / 2 };
}
