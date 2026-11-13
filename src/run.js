// Estado e regras de uma run. Sem DOM: dá pra rodar headless nos testes.
// O mundo rola para baixo; o bonde acompanha a câmera sozinho (como no
// original) e o input move cada integrante em relação a ela.

import { VIEW_W, VIEW_H, PX_PER_METER, ZONE, CREW, PERK_FIRST_AT, PERK_STEP, PERK_STEP_GROWTH, BIOMES, BIOME_LENGTH } from './config.js';
import { DEFS, CREW_SKINS } from './defs.js';
import { createRng } from './rng.js';
import { difficultyAt } from './difficulty.js';
import { generateRow } from './generator.js';
import { baseMods, rollPerkChoices } from './perks.js';
import { overlaps, pushOut, box, clamp, center } from './geom.js';

const TIDE = { warn: 1.8, surge: 1.1, hold: 1.6, recede: 2.2 };

// Pique: arrancada curta na direção do input (pra frente se parado),
// com um fiapo de invulnerabilidade. Principal ferramenta contra "ficou pra trás".
export const DASH = { duration: 0.24, cooldown: 3.2, mult: 3.4 };
// Combo: itens pegos em sequência rápida multiplicam os pontos.
export const COMBO = { window: 2.2, step: 0.1, max: 3 };
// Hora do Arrastão: ao chegar numa praia nova, alguns segundos de fartura.
export const RUSH = { seconds: 9, lootMult: 2 };
// Margem (px) do topo da tela em que o integrante já está em perigo.
export const DANGER_MARGIN = 70;

export class Run {
  constructor({ seed, onEvent = () => {} }) {
    this.seed = seed;
    this.rng = createRng(seed);
    this.emit = onEvent;
    this.time = 0;
    this.cameraY = 0;
    this.nextRowY = VIEW_H + 120;
    this.entities = [];
    this.crew = [];
    this.score = 0;
    this.loot = { flipflop: 0, phone: 0, bag: 0 };
    this.deaths = {};
    this.recruited = 0;
    this.maxCrew = 0;
    this.mods = baseMods();
    this.taken = {};
    this.perkStep = PERK_STEP;
    this.nextPerkAt = PERK_FIRST_AT;
    this.perkChoices = null;
    this.over = false;
    this.tide = { phase: 'idle', t: 0, offset: 0, reach: 0 };
    this.nextTideAt = Infinity;
    this.biomeIndex = 0;
    this.diff = difficultyAt(0);
    this.dash = { t: 0, cd: 0 };
    this.combo = { n: 0, t: 0, best: 0 };
    this.rush = { t: 0, fromY: -1, toY: -1 };

    // formação inicial, parecida com a do layout Track de 2017
    for (let i = 0; i < CREW.startSize; i++) {
      this.addMember(720 + (i % 3) * 70 + (i > 2 ? 35 : 0), 260 + Math.floor(i / 3) * 90, i % CREW_SKINS.length);
    }
  }

  get meters() {
    return this.cameraY / PX_PER_METER;
  }

  get comboMult() {
    return Math.min(COMBO.max, 1 + COMBO.step * Math.max(0, this.combo.n - 1));
  }

  get dashCooldown() {
    return DASH.cooldown * this.mods.dashCdMult;
  }

  // pra HUD: integrantes perto de serem deixados pra trás
  get inDanger() {
    return this.crew.filter((m) => m.y - this.cameraY < DANGER_MARGIN);
  }

  get crewMult() {
    return 1 + 0.08 * Math.max(0, this.crew.length - 1);
  }

  get biome() {
    return BIOMES[this.biomeIndex % BIOMES.length];
  }

  get waterline() {
    return { shallow: ZONE.shallow + this.tide.offset, deep: ZONE.deep + this.tide.offset };
  }

  addMember(x, y, skin = this.rng.int(0, CREW_SKINS.length - 1)) {
    this.crew.push({ x, y, skin, slowT: 0, invulnT: 0, animT: this.rng.next() });
    this.maxCrew = Math.max(this.maxCrew, this.crew.length);
  }

  recruitMany(n) {
    const c = this.crewCenter() || { x: VIEW_W / 2, y: this.cameraY + VIEW_H / 2 };
    for (let i = 0; i < n; i++) {
      this.addMember(clamp(c.x + this.rng.range(-80, 80), 20, ZONE.sandEnd), c.y + this.rng.range(-60, 40));
    }
    this.recruited += n;
    this.emit('recruit', { n });
  }

  crewCenter() {
    if (!this.crew.length) return null;
    let x = 0, y = 0;
    for (const m of this.crew) { x += m.x + CREW.w / 2; y += m.y + CREW.h / 2; }
    return { x: x / this.crew.length, y: y / this.crew.length };
  }

  choosePerk(perk) {
    if (!this.perkChoices) return;
    this.taken[perk.id] = (this.taken[perk.id] || 0) + 1;
    perk.apply?.(this.mods);
    perk.onPick?.(this);
    this.perkChoices = null;
    this.perkStep += PERK_STEP_GROWTH;
    this.nextPerkAt += this.perkStep;
    this.emit('perkTaken', perk);
  }

  // ---------------------------------------------------------------- update

  update(dt, input) {
    if (this.over || this.perkChoices) return;
    dt = Math.min(dt, 1 / 20);
    this.time += dt;
    const before = this.meters;
    const diff = (this.diff = difficultyAt(before));

    this.cameraY += diff.scrollSpeed * dt;
    this.score += (this.meters - before) * this.mods.scoreMult;

    this.dash.t = Math.max(0, this.dash.t - dt);
    this.dash.cd = Math.max(0, this.dash.cd - dt);
    if (input.dash && this.dash.cd === 0) {
      this.dash.t = DASH.duration;
      this.dash.cd = this.dashCooldown;
      this.emit('dash');
    }
    this.combo.t = Math.max(0, this.combo.t - dt);
    if (this.combo.t === 0) this.combo.n = 0;
    this.rush.t = Math.max(0, this.rush.t - dt);

    this.spawnAhead();
    this.updateTide(dt, diff);
    this.updateEntities(dt, diff);
    this.updateCrew(dt, diff, input);
    this.cull();

    const biome = Math.floor(this.meters / BIOME_LENGTH);
    if (biome !== this.biomeIndex) {
      this.biomeIndex = biome;
      this.emit('biome', this.biome);
      this.startRush(diff);
    }

    if (!this.crew.length) {
      this.over = true;
      this.emit('gameover', this);
      return;
    }
    if (this.meters >= this.nextPerkAt) {
      this.perkChoices = rollPerkChoices(this.rng, this.taken);
      if (this.perkChoices.length) this.emit('perk', this.perkChoices);
      else this.perkChoices = null;
    }
  }

  startRush(diff) {
    this.rush.t = RUSH.seconds;
    // as fileiras ainda não geradas dentro da janela da Hora viram fartura
    this.rush.fromY = this.nextRowY;
    this.rush.toY = this.cameraY + VIEW_H + diff.scrollSpeed * RUSH.seconds;
    this.emit('rush');
  }

  // bando pequeno → mais gente pra recrutar (evita run morta sem volta)
  get recruitBoost() {
    const n = this.crew.length;
    return this.mods.recruitBoost * (n <= 2 ? 2.6 : n <= 4 ? 1.6 : 1);
  }

  spawnAhead() {
    while (this.nextRowY < this.cameraY + VIEW_H + 400) {
      const diff = difficultyAt(this.nextRowY / PX_PER_METER);
      const rush = this.nextRowY >= this.rush.fromY && this.nextRowY < this.rush.toY;
      const { specs } = generateRow(this.rng, this.nextRowY, diff, { recruitBoost: this.recruitBoost, rush });
      for (const s of specs) this.spawn(s, diff);
      this.nextRowY += diff.rowGap * this.rng.range(0.8, 1.2);
    }
  }

  spawn(spec, diff) {
    const def = DEFS[spec.kind];
    const e = { ...spec, def, w: def.w, h: def.h, t: 0, dead: false, sprite: def.sprites.length ? this.rng.pick(def.sprites) : null };
    if (e.kind === 'dog') { e.cx = spec.x; e.x = spec.x - def.w / 2; }
    if (e.kind === 'squad') return this.spawnSquad(spec);
    if (e.kind === 'police') {
      e.state = 'waiting';
      e.speed = diff.policeSpeed;
      e.warn = diff.policeWarn;
      e.x = e.dir > 0 ? -def.w - 40 : VIEW_W + 40;
    }
    this.entities.push(e);
  }

  spawnSquad(spec) {
    const squad = { state: 'waiting', t: 0, tick: -1, y: spec.y, baseY: spec.y, speed: spec.speed, warn: spec.warn, form: spec.form, hit: false, size: spec.members.length };
    squad.depth = Math.max(...spec.members.map((m) => m.dy)) + DEFS.bombeiro.h;
    for (const m of spec.members) {
      this.entities.push({
        kind: 'bombeiro', def: DEFS.bombeiro, w: DEFS.bombeiro.w, h: DEFS.bombeiro.h,
        x: m.dx, y: spec.y + m.dy, dx: m.dx, dy: m.dy, squad, t: this.rng.range(0, 1), dead: false,
        tone: this.rng.int(0, 3),
      });
    }
  }

  // Um pelotão: espera → aviso preso na borda de baixo → sobe correndo → some por cima.
  updateSquad(q, dt) {
    if (q.tick === this.time) return;
    q.tick = this.time;
    const viewBottom = this.cameraY + VIEW_H;
    if (q.state === 'waiting') {
      if (q.y < viewBottom + 400) { q.state = 'warn'; q.t = 0; this.emit('squadWarn', q); }
      return;
    }
    q.t += dt;
    if (q.state === 'warn') {
      q.baseY = viewBottom + 30;
      if (q.t >= q.warn + this.mods.warnBonus) { q.state = 'run'; q.t = 0; this.emit('squadRun', q); }
    } else if (q.state === 'run') {
      q.baseY -= q.speed * dt;
      if (q.baseY + q.depth < this.cameraY - 40) {
        q.state = 'done';
        if (!q.hit && this.crew.length) {
          const pts = Math.round(100 * this.mods.scoreMult * this.crewMult);
          this.score += pts;
          this.emit('dodge', { pts });
        }
      }
    }
  }

  updateTide(dt, diff) {
    const tide = this.tide;
    if (tide.phase === 'idle') {
      if (this.nextTideAt === Infinity && diff.tideEvery !== Infinity) this.nextTideAt = this.time + diff.tideEvery * 0.5;
      if (this.time >= this.nextTideAt) {
        tide.phase = 'warn';
        tide.t = 0;
        tide.reach = diff.tideReach;
        this.emit('tideWarn');
      }
      return;
    }
    tide.t += dt;
    const warn = TIDE.warn + this.mods.warnBonus;
    if (tide.phase === 'warn' && tide.t >= warn) { tide.phase = 'surge'; tide.t = 0; this.emit('tide'); }
    else if (tide.phase === 'surge') {
      tide.offset = -tide.reach * Math.min(1, tide.t / TIDE.surge);
      if (tide.t >= TIDE.surge) { tide.phase = 'hold'; tide.t = 0; }
    } else if (tide.phase === 'hold' && tide.t >= TIDE.hold) { tide.phase = 'recede'; tide.t = 0; }
    else if (tide.phase === 'recede') {
      tide.offset = -tide.reach * Math.max(0, 1 - tide.t / TIDE.recede);
      if (tide.t >= TIDE.recede) {
        tide.phase = 'idle';
        tide.offset = 0;
        this.nextTideAt = this.time + diff.tideEvery;
      }
    }
  }

  updateEntities(dt, diff) {
    const viewBottom = this.cameraY + VIEW_H;
    for (const e of this.entities) {
      e.t += dt;
      const onScreen = e.y < viewBottom && e.y + e.h > this.cameraY;
      switch (e.kind) {
        case 'dog': {
          const ph = e.phase + e.t * e.speed * this.mods.dogSlow;
          e.x = e.cx + Math.sin(ph) * e.amp - e.w / 2;
          e.flip = Math.cos(ph) < 0;
          break;
        }
        case 'vendor':
          if (onScreen) e.y -= e.speed * dt;
          break;
        case 'lifeguard':
          if (e.chase && onScreen) {
            const target = this.nearestMember(e);
            if (target) {
              const dx = target.x - e.x, dy = target.y - e.y;
              const d = Math.hypot(dx, dy) || 1;
              e.x += (dx / d) * e.chase * dt;
              e.y += (dy / d) * e.chase * dt;
            }
          }
          break;
        case 'bombeiro':
          this.updateSquad(e.squad, dt);
          if (e.squad.state !== 'waiting') e.y = e.squad.baseY + e.dy;
          if (e.squad.state === 'done') e.dead = true;
          break;
        case 'surfer':
          // sai da água, para um instante ajeitando a prancha e atravessa a praia sem olhar
          if (!e.state) e.state = 'waiting';
          if (e.state === 'waiting' && e.y < viewBottom - 140) { e.state = 'emerge'; e.t = 0; }
          else if (e.state === 'emerge' && e.t >= 0.7) { e.state = 'run'; e.t = 0; this.emit('surfer', e); }
          else if (e.state === 'run') {
            e.x -= e.speed * dt;
            if (e.zigzag) e.y += Math.sin(e.t * 5) * 140 * dt;
            if (e.x < -e.w - 40) e.dead = true;
          }
          break;
        case 'police':
          if (e.state === 'waiting' && e.y < viewBottom + 60) {
            e.state = 'warn';
            e.t = 0;
            this.emit('siren', e);
          } else if (e.state === 'warn' && e.t >= e.warn + this.mods.warnBonus) {
            e.state = 'drive';
          } else if (e.state === 'drive') {
            e.x += e.dir * e.speed * dt;
            if ((e.dir > 0 && e.x > VIEW_W + 60) || (e.dir < 0 && e.x < -e.w - 60)) e.dead = true;
          }
          break;
        case 'loot':
          break;
      }
      if (this.mods.magnet && e.def.role === 'loot') this.attract(e, dt);
    }
  }

  attract(e, dt) {
    const c = { x: e.x + e.w / 2, y: e.y + e.h / 2 };
    const m = this.nearestMember(e);
    if (!m) return;
    const dx = m.x + CREW.w / 2 - c.x, dy = m.y + CREW.h / 2 - c.y;
    const d = Math.hypot(dx, dy);
    if (d < this.mods.magnet + 60 && d > 1) {
      const pull = 600 * dt;
      e.x += (dx / d) * pull;
      e.y += (dy / d) * pull;
    }
  }

  nearestMember(e) {
    let best = null, bd = Infinity;
    for (const m of this.crew) {
      const d = (m.x - e.x) ** 2 + (m.y - e.y) ** 2;
      if (d < bd) { bd = d; best = m; }
    }
    return best;
  }

  updateCrew(dt, diff, input) {
    const len = Math.hypot(input.x, input.y);
    const ix = len > 1 ? input.x / len : input.x;
    const iy = len > 1 ? input.y / len : input.y;
    const dashing = this.dash.t > 0;
    const speed = CREW.speed * this.mods.speedMult * (dashing ? DASH.mult : 1);
    // pique sem direção = arrancada pra frente (pra baixo)
    const dx = dashing && len < 0.1 ? 0 : ix;
    const dy = dashing && len < 0.1 ? 1 : iy;
    const water = this.waterline;

    for (const m of this.crew) {
      m.animT += dt;
      m.slowT = Math.max(0, m.slowT - dt);
      m.invulnT = Math.max(0, m.invulnT - dt);
      const inShallow = m.x + CREW.w / 2 > water.shallow;
      const slowed = !this.mods.slowImmune && (m.slowT > 0 || inShallow);
      const f = slowed ? 0.5 : 1;
      m.x += dx * speed * f * dt;
      m.y += (diff.scrollSpeed * (slowed ? 0.8 : 1) + dy * speed * f) * dt;
      m.x = clamp(m.x, 0, VIEW_W - CREW.w);
      m.y = Math.min(m.y, this.cameraY + VIEW_H - CREW.h - 4);
      m.moving = len > 0.1 || dashing;
      m.dashing = dashing;
    }

    this.separate();

    const solids = this.entities.filter((e) => e.def.role === 'solid' && !e.dead);
    for (let pass = 0; pass < 2; pass++) {
      for (const m of this.crew) {
        for (const s of solids) {
          const v = pushOut(box(m, CREW.feet), box(s, s.def.hit));
          if (v) { m.x += v.x; m.y += v.y; }
        }
      }
    }

    for (const m of [...this.crew]) {
      if (m.y + CREW.h / 2 < this.cameraY - CREW.behindMargin) { this.kill(m, 'left'); continue; }
      if (m.x + CREW.w / 2 > water.deep) {
        if (this.mods.surfer) m.x = water.shallow - CREW.w - 30;
        else if (!this.kill(m, 'sea')) m.x = water.shallow - CREW.w - 30;
        continue;
      }
      this.touch(m);
    }
  }

  separate() {
    const r = CREW.separation;
    for (let i = 0; i < this.crew.length; i++) {
      for (let j = i + 1; j < this.crew.length; j++) {
        const a = this.crew[i], b = this.crew[j];
        let dx = b.x - a.x, dy = (b.y - a.y) * 0.5;
        let d = Math.hypot(dx, dy);
        if (d >= r) continue;
        if (d < 0.01) { dx = 1; dy = 0; d = 1; }
        const push = (r - d) / 2;
        a.x -= (dx / d) * push; b.x += (dx / d) * push;
        a.y -= (dy / d) * push; b.y += (dy / d) * push;
      }
    }
  }

  touch(m) {
    const body = box(m, CREW.body);
    for (const e of this.entities) {
      if (e.dead || !e.def.hit) continue;
      const role = e.def.role;
      if (role === 'solid' || role === 'decor') continue;
      if (e.kind === 'police' && e.state !== 'drive') continue;
      if (e.kind === 'surfer' && e.state === 'waiting') continue;
      if (e.kind === 'bombeiro' && e.squad.state !== 'run') continue;
      if (!overlaps(body, box(e, e.def.hit))) continue;

      if (role === 'deadly') {
        if (e.squad) e.squad.hit = true;
        if (this.kill(m, e.kind)) return;
      } else if (role === 'slow') {
        if (!this.mods.slowImmune) m.slowT = 1.6;
        e.dead = true;
        this.emit('crumble', e);
      } else if (role === 'loot') {
        e.dead = true;
        this.combo.n = this.combo.t > 0 ? this.combo.n + 1 : 1;
        this.combo.t = COMBO.window;
        this.combo.best = Math.max(this.combo.best, this.combo.n);
        const rushMult = this.rush.t > 0 ? RUSH.lootMult : 1;
        const pts = Math.round(e.def.points * this.mods.scoreMult * this.crewMult * this.comboMult * rushMult);
        this.score += pts;
        this.loot[e.kind]++;
        this.emit('loot', { kind: e.kind, pts, x: e.x, y: e.y, combo: this.combo.n });
      } else if (role === 'recruit') {
        e.dead = true;
        this.addMember(e.x, e.y, e.skin);
        this.recruited++;
        this.emit('recruit', { n: 1, x: e.x, y: e.y });
      }
    }
  }

  // Retorna true se o integrante saiu do bonde.
  kill(m, cause) {
    if ((m.invulnT > 0 || this.dash.t > 0) && cause !== 'left') return false;
    if (this.mods.shields > 0 && cause !== 'left') {
      this.mods.shields--;
      m.invulnT = CREW.invulnAfterShield;
      this.emit('shield', { x: m.x, y: m.y });
      return false;
    }
    const i = this.crew.indexOf(m);
    if (i < 0) return false;
    this.crew.splice(i, 1);
    this.deaths[cause] = (this.deaths[cause] || 0) + 1;
    this.emit('death', { cause, x: m.x, y: m.y });
    return true;
  }

  cull() {
    const top = this.cameraY - 300;
    this.entities = this.entities.filter((e) => !e.dead && e.y + e.h > top);
  }

  // pelotões ativos (pra desenhar o aviso)
  get squads() {
    const set = new Set();
    for (const e of this.entities) if (e.squad && e.squad.state !== 'done') set.add(e.squad);
    return [...set].map((q) => ({ q, members: this.entities.filter((e) => e.squad === q) }));
  }

  // para render: tudo na tela, ordenado pela base (profundidade)
  drawList() {
    const list = [];
    for (const e of this.entities) list.push({ type: 'entity', e, z: e.def.role === 'decor' ? -1e9 : e.y + e.h });
    for (const m of this.crew) list.push({ type: 'member', m, z: m.y + CREW.h });
    return list.sort((a, b) => a.z - b.z);
  }
}

export { center };
