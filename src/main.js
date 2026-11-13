// Cola tudo: telas (DOM), loop, eventos da run → som/efeitos, recorde.

import { Run } from './run.js';
import { loadImages } from './assets.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio, TRACKS } from './audio.js';
import { randomSeed } from './rng.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const BEST_KEY = 'wavesson.best';

const store = {
  get() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || { score: 0, meters: 0 }; } catch { return { score: 0, meters: 0 }; }
  },
  set(v) { try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch {} },
};

const CAUSES = { left: 'Ficou pra trás', dog: 'Cachorro', lifeguard: 'Salva-vidas', police: 'Viatura', sea: 'Correnteza' };

let screen = 'loading';
let run = null;
let renderer, input, audio;
let paused = false;
let bestScore = 0;

function show(id) {
  for (const el of document.querySelectorAll('.overlay')) el.classList.toggle('show', el.id === id);
  screen = id ?? 'game';
}

function todaySeed() {
  const d = new Date();
  return `DIA-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
}

function updateMenuBest() {
  const best = store.get();
  bestScore = best.score;
  $('menuBest').textContent = best.score ? `Recorde: ${Math.floor(best.score).toLocaleString('pt-BR')} pts · ${Math.floor(best.meters)} m` : '';
}

function onEvent(name, data) {
  const s = audio.sfx;
  switch (name) {
    case 'loot': s.loot(data.kind); renderer.float(`+${data.pts}`, data.x + 20, data.y, '#ffe14d'); break;
    case 'recruit': if (data.n > 1) s.gas(); else s.recruit(); if (data.x != null) renderer.float('+1 no bonde', data.x + 17, data.y, '#9cff8a', 24); break;
    case 'death': s.death(); renderer.shake(14); renderer.float('rodou!', data.x + 17, data.y + 30, '#ff5252', 26); break;
    case 'shield': s.shield(); renderer.float('livrou!', data.x + 17, data.y, '#7fe3ff', 26); break;
    case 'crumble': s.crumble(); break;
    case 'siren': s.siren(); break;
    case 'tideWarn': s.tideWarn(); break;
    case 'tide': s.tide(); renderer.shake(10); break;
    case 'biome': s.gas(); renderer.float(data.name.toUpperCase(), 800, run.cameraY + 300, '#fff', 64); break;
    case 'perk': s.perk(); openPerks(data); break;
    case 'gameover': s.gameover(); setTimeout(openGameOver, 700); break;
  }
}

function startRun(seed = randomSeed()) {
  run = new Run({ seed, onEvent });
  paused = false;
  audio.startGame();
  show(null);
}

function openPerks(choices) {
  const box = $('perkCards');
  box.innerHTML = '';
  choices.forEach((p, i) => {
    const b = document.createElement('button');
    b.className = 'card';
    const lvl = run.taken[p.id] || 0;
    b.innerHTML = `<span class="key">${i + 1}${lvl ? ` · nível ${lvl + 1}` : ''}</span><b>${p.name}</b><span>${p.desc}</span>`;
    b.onclick = () => pickPerk(p);
    box.appendChild(b);
  });
  show('perk');
  box.querySelector('button')?.focus();
}

function pickPerk(p) {
  run.choosePerk(p);
  show(null);
}

function openGameOver() {
  if (screen !== 'game') return;
  const best = store.get();
  const record = run.score > best.score;
  if (record) store.set({ score: run.score, meters: Math.max(best.meters, run.meters) });
  else if (run.meters > best.meters) store.set({ ...best, meters: run.meters });
  const deaths = Object.entries(run.deaths).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `<tr><td>${CAUSES[k] ?? k}</td><td>${v}</td></tr>`).join('');
  $('summary').innerHTML = `
    <div class="big">${Math.floor(run.score).toLocaleString('pt-BR')} pts</div>
    ${record ? '<div class="record">NOVO RECORDE!</div>' : `<div>Recorde: ${Math.floor(best.score).toLocaleString('pt-BR')}</div>`}
    <table>
      <tr><td>Distância</td><td>${Math.floor(run.meters)} m (${run.biome.name})</td></tr>
      <tr><td>Maior bonde</td><td>${run.maxCrew}</td></tr>
      <tr><td>Recrutados</td><td>${run.recruited}</td></tr>
      <tr><td>Celulares / bolsas / chinelos</td><td>${run.loot.phone} / ${run.loot.bag} / ${run.loot.flipflop}</td></tr>
      ${deaths}
      <tr><td>Seed</td><td>${run.seed}</td></tr>
    </table>`;
  updateMenuBest();
  audio.stopGame();
  show('gameover');
  document.querySelector('#gameover .primary').focus();
}

function renderTracks() {
  const list = $('trackList');
  list.innerHTML = '';
  for (const t of TRACKS) {
    const b = document.createElement('button');
    b.className = 'track' + (t.id === audio.trackId ? ' selected' : '');
    b.textContent = (t.id === audio.trackId ? '▶ ' : '') + t.name;
    b.onclick = () => { audio.setTrack(t.id); renderTracks(); };
    list.appendChild(b);
  }
}

function togglePause(force) {
  if (!run || run.over || run.perkChoices) return;
  paused = force ?? !paused;
  show(paused ? 'pause' : null);
}

function bindUi() {
  document.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    if (!action) return;
    audio.startMusic();
    switch (action) {
      case 'play': return startRun();
      case 'daily': return startRun(todaySeed());
      case 'howto': return show('howto');
      case 'credits': return show('credits');
      case 'music': renderTracks(); return show('music');
      case 'back': return show('menu');
      case 'resume': return togglePause(false);
      case 'again': return startRun();
      case 'quit': run = null; audio.stopGame(); updateMenuBest(); return show('menu');
    }
  });

  addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') audio.toggleMute();
    if (screen === 'perk' && /^Digit[1-3]$/.test(e.code)) {
      const p = run.perkChoices?.[Number(e.code.at(-1)) - 1];
      if (p) pickPerk(p);
    }
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    if (e.code === 'Enter' && screen === 'menu' && document.activeElement === document.body) startRun();
    if (e.code === 'Enter' && screen === 'gameover' && document.activeElement === document.body) startRun();
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });
}

async function boot() {
  audio = createAudio();
  audio.init();
  const images = await loadImages((p) => { $('loadpct').textContent = `${Math.round(p * 100)}%`; });
  renderer = createRenderer(canvas, images);
  input = createInput(canvas);
  bindUi();
  updateMenuBest();

  const params = new URLSearchParams(location.search);
  if (params.has('seed')) startRun(params.get('seed'));
  else show('menu');

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (run) {
      if (screen === 'game' && !paused) run.update(dt, input.read());
      renderer.draw(run, screen === 'game' && !paused ? dt : 0, { best: bestScore, stick: input.stick });
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // ganchos para depuração no console
  window.wavesson = { get run() { return run; }, startRun };
}

boot().catch((err) => {
  $('loading').innerHTML = `<p>Deu ruim carregando: ${err.message}</p>`;
  console.error(err);
});
