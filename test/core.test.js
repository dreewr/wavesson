import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng } from '../src/rng.js';
import { difficultyAt } from '../src/difficulty.js';
import { placeSolids, generateRow, LANE_MIN, LANE_MAX } from '../src/generator.js';
import { DEFS } from '../src/defs.js';
import { pushOut } from '../src/geom.js';
import { Run } from '../src/run.js';
import { PERKS } from '../src/perks.js';

test('rng é determinístico por seed', () => {
  const a = createRng('ARRASTAO'), b = createRng('ARRASTAO'), c = createRng('OUTRA');
  const sa = Array.from({ length: 20 }, a.next), sb = Array.from({ length: 20 }, b.next);
  assert.deepEqual(sa, sb);
  assert.notDeepEqual(sa, Array.from({ length: 20 }, c.next));
  assert.ok(sa.every((v) => v >= 0 && v < 1));
});

test('dificuldade só aumenta com a distância', () => {
  let prev = difficultyAt(0);
  for (let m = 50; m <= 5000; m += 50) {
    const d = difficultyAt(m);
    assert.ok(d.scrollSpeed >= prev.scrollSpeed, `speed em ${m}`);
    assert.ok(d.rowGap <= prev.rowGap, `rowGap em ${m}`);
    assert.ok(d.gapWidth <= prev.gapWidth);
    assert.ok(d.weights.dog >= prev.weights.dog);
    assert.ok(d.gapWidth >= 150, 'passagem nunca fica menor que o mínimo');
    prev = d;
  }
  assert.equal(difficultyAt(0).weights.police, 0, 'sem polícia no começo');
  assert.ok(difficultyAt(400).weights.police > 0);
});

test('fileiras de sólidos sempre deixam passagem', () => {
  const rng = createRng(42);
  for (let i = 0; i < 2000; i++) {
    const gw = rng.range(150, 260);
    const { gap, solids } = placeSolids(rng, rng.int(1, 8), gw);
    assert.ok(gap.from >= LANE_MIN - 1e-6 && gap.to <= LANE_MAX + 1e-6);
    for (const s of solids) {
      const h = DEFS[s.kind].hit;
      const x0 = s.x + h.ox, x1 = x0 + h.w;
      assert.ok(x1 <= gap.from || x0 >= gap.to, `sólido ${s.kind} invade a passagem`);
    }
  }
});

test('gerador só produz tipos conhecidos', () => {
  const rng = createRng('g');
  for (let i = 0; i < 1500; i++) {
    const { specs } = generateRow(rng, i * 200, difficultyAt(i * 3));
    for (const s of specs) assert.ok(DEFS[s.kind], s.kind);
  }
});

test('pushOut separa caixas sobrepostas', () => {
  const v = pushOut({ x: 0, y: 0, w: 10, h: 10 }, { x: 0, y: 8, w: 10, h: 10 });
  assert.deepEqual(v, { x: 0, y: -2 });
  assert.equal(pushOut({ x: 0, y: 0, w: 5, h: 5 }, { x: 10, y: 10, w: 5, h: 5 }), null);
});

function simulate(seed, seconds, policy) {
  const events = [];
  const run = new Run({ seed, onEvent: (n) => events.push(n) });
  const dt = 1 / 60;
  for (let t = 0; t < seconds * 60 && !run.over; t++) {
    if (run.perkChoices) run.choosePerk(run.perkChoices[0]);
    run.update(dt, policy(run, t));
  }
  return { run, events };
}

test('parado o bonde acaba rodando (jogo tem pressão)', () => {
  const { run } = simulate('parado', 600, () => ({ x: 0, y: 0 }));
  assert.ok(run.over, `ainda vivo em ${run.meters.toFixed(0)}m`);
  assert.ok(run.meters > 30);
});

test('run é reproduzível com a mesma seed e mesmo input', () => {
  const policy = (r, t) => ({ x: Math.sin(t / 50), y: Math.cos(t / 70) * 0.3 });
  const a = simulate('REPLAY', 90, policy).run, b = simulate('REPLAY', 90, policy).run;
  assert.equal(a.score, b.score);
  assert.equal(a.crew.length, b.crew.length);
  assert.equal(a.cameraY, b.cameraY);
});

test('run longa não quebra e passa por perks, polícia e onda', () => {
  // "bot" simples: desvia horizontalmente do perigo mais próximo à frente
  const policy = (run) => {
    const c = run.crewCenter();
    if (!c) return { x: 0, y: 0 };
    let x = 0;
    for (const e of run.entities) {
      if (e.def.role !== 'deadly' && e.def.role !== 'solid') continue;
      const dy = e.y - c.y;
      if (dy < -40 || dy > 260) continue;
      const ex = e.x + e.w / 2;
      if (Math.abs(ex - c.x) < 200) x += ex > c.x ? -1 : 1;
    }
    if (c.x > 1200) x -= 1;
    if (c.x < 150) x += 0.5;
    return { x: Math.max(-1, Math.min(1, x)), y: c.y - run.cameraY < 300 ? 0.4 : -0.2 };
  };
  const seen = new Set();
  for (const seed of ['A', 'B', 'C', 'D']) {
    const { run, events } = simulate(seed, 400, policy);
    events.forEach((e) => seen.add(e));
    assert.ok(Number.isFinite(run.score));
  }
  for (const e of ['loot', 'perk', 'death']) assert.ok(seen.has(e), `evento ${e} nunca aconteceu`);
});

test('perks respeitam máximo e mexem nos mods', () => {
  const run = new Run({ seed: 'p' });
  run.perkChoices = [PERKS[0]];
  run.choosePerk(PERKS[0]);
  assert.ok(run.mods.speedMult > 1);
  const before = run.crew.length;
  run.perkChoices = [PERKS.find((p) => p.id === 'galera')];
  run.choosePerk(run.perkChoices[0]);
  assert.equal(run.crew.length, before + 3);
});

test('surfista desatento sai da água, atravessa a praia e derruba quem estiver no caminho', async () => {
  const { difficultyAt } = await import('../src/difficulty.js');
  const events = [];
  const run = new Run({ seed: 'surf', onEvent: (n, d) => events.push([n, d]) });
  run.entities = [];
  run.nextRowY = Infinity; // sem geração: só o surfista
  const m = run.crew[0];
  run.crew = [m];
  run.spawn({ kind: 'surfer', x: 1360, y: run.cameraY + 300, speed: 500, zigzag: false, skin: 0 }, difficultyAt(200));
  const s = run.entities[0];
  m.x = 700;
  m.y = s.y - 20;
  for (let i = 0; i < 60 * 4 && run.crew.length; i++) {
    m.y = s.y - 20; // fica parado na linha dele
    m.x = 700;
    run.update(1 / 60, { x: 0, y: 0 });
  }
  assert.ok(events.some(([n]) => n === 'surfer'), 'surfista nunca começou a correr');
  assert.ok(run.deaths.surfer === 1, `mortes: ${JSON.stringify(run.deaths)}`);
});

test('surfista só aparece depois do primeiro trecho', () => {
  assert.equal(difficultyAt(0).weights.surfer, 0);
  assert.ok(difficultyAt(200).weights.surfer > 0);
});

test('pique arranca pra frente e dá um respiro de invulnerabilidade', async () => {
  const { DASH } = await import('../src/run.js');
  const run = new Run({ seed: 'dash' });
  run.entities = [];
  run.nextRowY = Infinity;
  const y0 = run.crew[0].y - run.cameraY;
  run.update(1 / 60, { x: 0, y: 0, dash: true });
  for (let i = 0; i < 10; i++) run.update(1 / 60, { x: 0, y: 0 });
  assert.ok(run.crew[0].y - run.cameraY > y0 + 60, 'pique parado deveria jogar o bando pra frente');
  assert.ok(run.dash.cd > 0, 'pique entra em recarga');
  // durante o pique, perigo não derruba
  run.dash.t = DASH.duration;
  assert.equal(run.kill(run.crew[0], 'dog'), false);
  // mas ficar pra trás sim
  assert.equal(run.kill(run.crew[0], 'left'), true);
  // não dá pra repicar em recarga
  const cd = run.dash.cd;
  run.update(1 / 60, { x: 0, y: 0, dash: true });
  assert.ok(run.dash.cd < cd);
});

test('combo cresce com itens seguidos e zera depois da janela', async () => {
  const { COMBO } = await import('../src/run.js');
  const run = new Run({ seed: 'combo' });
  run.entities = [];
  run.nextRowY = Infinity;
  const m = run.crew[0];
  const pts = [];
  for (let i = 0; i < 4; i++) {
    run.spawn({ kind: 'phone', x: m.x, y: m.y + 30 }, difficultyAt(0));
    const before = run.score;
    run.touch(m);
    pts.push(run.score - before);
  }
  assert.equal(run.combo.n, 4);
  assert.ok(pts[3] > pts[0], 'combo multiplica os pontos');
  for (let i = 0; i < 60 * (COMBO.window + 0.5); i++) run.update(1 / 60, { x: 0, y: 0 });
  assert.equal(run.combo.n, 0);
});

test('praia nova dispara a Hora do Arrastão, com fileiras de fartura', () => {
  const events = [];
  const run = new Run({ seed: 'rush', onEvent: (n) => events.push(n) });
  run.mods.shields = 1e9;
  run.nextPerkAt = Infinity;
  run.cameraY = 399.5 * 100;
  run.crew.forEach((m) => (m.y = run.cameraY + 300));
  run.nextRowY = run.cameraY + 720;
  for (let i = 0; i < 30; i++) run.update(1 / 60, { x: 0, y: 0 });
  assert.ok(events.includes('rush'));
  assert.ok(run.rush.t > 0);
  const rng = createRng('fartura');
  const counts = {};
  for (let i = 0; i < 400; i++) {
    const { pattern } = generateRow(rng, i * 200, difficultyAt(1000), { rush: true });
    counts[pattern] = (counts[pattern] || 0) + 1;
  }
  assert.ok(!counts.police && !counts.lifeguard && !counts.surfer, 'sem perigos pesados na Hora');
  assert.ok(counts.loot > 150);
});

test('bando pequeno ganha mais chance de recrutar', () => {
  const run = new Run({ seed: 'rb' });
  const full = run.recruitBoost;
  run.crew.length = 2;
  assert.ok(run.recruitBoost > full * 2);
});

function squadRun(form, seed = 'bombeiros') {
  const events = [];
  const run = new Run({ seed, onEvent: (n, d) => events.push([n, d]) });
  run.entities = [];
  run.nextRowY = Infinity;
  run.nextPerkAt = Infinity;
  const rng = createRng(seed + form);
  let spec;
  do { spec = generateRow(rng, run.cameraY + VIEW_H + 100, difficultyAt(600), {}).specs.find((s) => s.kind === 'squad'); }
  while (!spec || spec.form !== form);
  run.spawn(spec, difficultyAt(600));
  return { run, events, spec };
}

import { VIEW_H } from '../src/config.js';

test('bombeiros avisam antes e não derrubam ninguém durante o aviso', () => {
  const { run, events, spec } = squadRun('column');
  // bando parado bem na faixa da coluna, perto da borda de baixo
  run.crew.forEach((m) => { m.x = spec.members[0].dx; });
  let warnedAt = null, ranAt = null;
  for (let i = 0; i < 60 * 8 && run.crew.length; i++) {
    run.crew.forEach((m) => { m.x = spec.members[0].dx; });
    run.update(1 / 60, { x: 0, y: 0 });
    if (warnedAt === null && events.some(([n]) => n === 'squadWarn')) warnedAt = run.time;
    if (ranAt === null && events.some(([n]) => n === 'squadRun')) ranAt = run.time;
    if (ranAt === null) assert.ok(!run.deaths.bombeiro, 'derrubou durante o aviso');
  }
  assert.ok(warnedAt !== null && ranAt !== null);
  assert.ok(ranAt - warnedAt >= spec.warn - 0.05, `aviso durou ${(ranAt - warnedAt).toFixed(2)}s`);
  assert.ok(run.deaths.bombeiro > 0, 'quem ficou na faixa deveria ser derrubado');
});

test('paredão de bombeiros sempre deixa um buraco e quem passa nele ganha bônus', () => {
  const { run, events, spec } = squadRun('wall');
  const xs = spec.members.map((m) => m.dx).sort((a, b) => a - b);
  let gap = null;
  for (let i = 1; i < xs.length; i++) if (xs[i] - (xs[i - 1] + 44) >= 150) gap = (xs[i - 1] + 44 + xs[i]) / 2;
  assert.ok(gap !== null, 'paredão sem buraco');
  // bando todo enfileirado no buraco
  for (let i = 0; i < 60 * 10 && !events.some(([n]) => n === 'dodge'); i++) {
    run.crew.forEach((m, k) => { m.x = gap - 17; m.y = run.cameraY + 200 + k * 2; });
    run.update(1 / 60, { x: 0, y: 0 });
  }
  assert.ok(!run.deaths.bombeiro, JSON.stringify(run.deaths));
  assert.ok(events.some(([n]) => n === 'dodge'), 'passou liso deveria dar bônus');
});

// ------------------------------------------------------------ layout vertical
import { makeLayout } from '../src/layout.js';

test('layout vertical: tudo é gerado dentro da praia estreita e sólidos deixam passagem', () => {
  const L = makeLayout('portrait', 1560);
  const rng = createRng('vertical');
  for (let i = 0; i < 3000; i++) {
    const diff = difficultyAt(rng.range(0, 5000));
    const { specs } = generateRow(rng, i * 200, diff, { layout: L });
    for (const s of specs) {
      if (s.kind === 'police' || s.kind === 'squad') continue;
      assert.ok(s.x >= -1 && s.x <= L.w, `${s.kind} fora da tela: x=${s.x}`);
      if (s.kind === 'dog') assert.ok(s.x - s.amp >= L.laneMin - 1 && s.x + s.amp <= L.laneMax + 1, 'cachorro sai da faixa');
    }
    const squad = specs.find((s) => s.kind === 'squad');
    if (squad) for (const m of squad.members) assert.ok(m.dx >= 0 && m.dx + 44 <= L.w, 'bombeiro fora da tela');
  }
  for (let i = 0; i < 1500; i++) {
    const gw = rng.range(150, 260);
    const { gap, solids } = placeSolids(rng, rng.int(1, 6), gw, L);
    assert.ok(gap.from >= L.laneMin - 1e-6 && gap.to <= L.laneMax + 1e-6);
    for (const s of solids) {
      const h = DEFS[s.kind].hit;
      assert.ok(s.x + h.ox + h.w <= gap.from || s.x + h.ox >= gap.to);
    }
  }
});

test('layout vertical: run roda, mantém o bando na tela e acaba se ficar parado', () => {
  const L = makeLayout('portrait', 1400);
  const run = new Run({ seed: 'em-pé', layout: L });
  assert.ok(run.crew.every((m) => m.x >= 0 && m.x + 34 <= L.w));
  for (let i = 0; i < 60 * 600 && !run.over; i++) {
    if (run.perkChoices) run.choosePerk(run.perkChoices[0]);
    run.update(1 / 60, { x: 1, y: 0 });
    for (const m of run.crew) assert.ok(m.x <= L.w - 34 + 1e-6);
  }
  assert.ok(run.over);
});

test('banhista: quem passa perto se apaixona, o pique desperta e ficar pra trás apaixonado tem causa própria', async () => {
  const { LOVE } = await import('../src/run.js');
  const events = [];
  const run = new Run({ seed: 'praia', onEvent: (n) => events.push(n) });
  run.entities = [];
  run.nextRowY = Infinity;
  run.nextPerkAt = Infinity;
  const m = run.crew[0];
  run.crew = [m, run.crew[1]];
  run.spawn({ kind: 'banhista', x: m.x - 40, y: m.y + 60, look: 0 }, difficultyAt(0));
  run.update(1 / 60, { x: 0, y: 0 });
  assert.ok(m.loveT > 0, 'deveria se apaixonar');
  assert.ok(events.includes('love'));
  // apaixonado obedece pouco: empurrar pra direita quase não mexe
  const x0 = m.x;
  for (let i = 0; i < 20; i++) run.update(1 / 60, { x: 1, y: 0 });
  const other = run.crew[1];
  assert.ok(m.x - x0 < (20 / 60) * 380 * LOVE.control + 30, 'controle reduzido');
  // pique desperta
  run.dash.cd = 0;
  run.update(1 / 60, { x: 0, y: 0, dash: true });
  assert.equal(m.loveT, 0);
  assert.ok(events.includes('awake'));
  // apaixonado que sai por cima da tela conta como 'love'
  m.loveT = 1;
  m.y = run.cameraY - 200;
  run.dash.t = 0;
  run.update(1 / 60, { x: 0, y: 0 });
  assert.equal(run.deaths.love, 1);
  assert.ok(other);
});

// ------------------------------------------------------------ replay
import { createRecorder, replay, verify, quantize, TICK } from '../src/replay.js';

function playRecorded(seed, layout, seconds, policy) {
  const run = new Run({ seed, layout });
  const rec = createRecorder({ seed, layout });
  for (let t = 0; t < seconds * 60 && !run.over; t++) {
    if (run.perkChoices) { const p = run.perkChoices[t % run.perkChoices.length]; rec.perk(p.id); run.choosePerk(p); }
    const cmd = quantize(policy(run, t));
    rec.tick(cmd);
    run.update(TICK, cmd);
  }
  return { run, rec: rec.finish(run) };
}

test('replay refaz a partida exatamente e o verificador confirma a pontuação', () => {
  for (const kind of ['landscape', 'portrait']) {
    const L = makeLayout(kind, 1400);
    const policy = (r, t) => ({ x: Math.sin(t / 40), y: Math.cos(t / 90) * 0.4, dash: t % 300 === 0 });
    const { run, rec } = playRecorded('REPLAY-' + kind, L, 900, policy);
    assert.ok(run.over, 'a partida de teste deveria terminar');
    const again = replay(rec);
    assert.equal(again.score, run.score);
    assert.equal(again.meters, run.meters);
    assert.equal(verify(rec).ok, true);
    // pontuação adulterada é pega
    const fake = { ...rec, claimed: { ...rec.claimed, score: rec.claimed.score + 5000 } };
    assert.equal(verify(fake).ok, false);
    assert.ok(rec.frames.length < rec.claimed.ticks, 'gravação comprimida');
  }
});
