// Cola tudo: telas (DOM), loop, eventos da run → som/efeitos, recorde.

import { Run } from './run.js';
import { loadImages } from './assets.js';
import { createRenderer } from './render.js';
import { createInput } from './input.js';
import { createAudio, TRACKS } from './audio.js';
import { randomSeed } from './rng.js';
import { TICK, quantize, createRecorder } from './replay.js';
import { CAUSE_NAMES, summarize, needsAssist } from './stats.js';
import { summaryOf, recordRun, allRuns, topRuns, maybeAddTop, markVerified, exportJson } from './telemetry.js';
import { onlineEnabled, submitRun, fetchTop } from './online.js';
import { applyOrientation, stageSize, layoutForScreen, tryFullscreen } from './screen.js';

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const BEST_KEY = 'wavesson.best';

const store = {
  get() {
    try { return JSON.parse(localStorage.getItem(BEST_KEY)) || { score: 0, meters: 0 }; } catch { return { score: 0, meters: 0 }; }
  },
  set(v) { try { localStorage.setItem(BEST_KEY, JSON.stringify(v)); } catch {} },
};

const CAUSES = CAUSE_NAMES;

let screen = 'loading';
let run = null;
let renderer, input, audio;
let paused = false;
let bestScore = 0;
let lastLove = 0;
let recorder = null; // grava os comandos da run atual (replay/ranking)

// Telas do menu (.screen) vivem no palco de 1600x720; janelas do jogo (.overlay) ficam por cima do canvas.
function show(id) {
  for (const el of document.querySelectorAll('.screen, .overlay')) el.classList.toggle('show', el.id === id);
  document.body.classList.toggle('in-menu', !!document.querySelector('.screen.show'));
  document.body.classList.toggle('playing', !id);
  screen = id ?? 'game';
}

function fitStage() {
  applyOrientation();
  const st = stageSize();
  // no vertical o palco cresce com telas mais altas que 16:9 (mar e botões ficam ancorados embaixo)
  if (st.w === 720) st.h = Math.max(1280, Math.round((720 * innerHeight) / innerWidth));
  const s = Math.min(innerWidth / st.w, innerHeight / st.h);
  const stage = document.getElementById('stage');
  stage.style.setProperty('--s', s);
  stage.style.setProperty('--sh', `${st.h}px`);
  stage.style.width = `${st.w}px`;
  stage.style.height = `${st.h}px`;
}

function howtoPage(delta) {
  const el = $('howto');
  const page = Math.max(1, Math.min(3, Number(el.dataset.page) + delta));
  el.dataset.page = page;
  el.querySelector(`.p${page}[data-action="next"], .p${page}[data-action="back"]`)?.focus();
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
    case 'loot': s.loot(data.kind, data.combo); renderer.float(`+${data.pts}`, data.x + 20, data.y, data.combo > 1 ? '#7fd3ff' : '#ffe14d'); break;
    case 'dash': s.dash(); break;
    case 'rush': s.rush(); break;
    case 'recruit': if (data.n > 1) s.gas(); else s.recruit(); if (data.x != null) renderer.float('+1 Wavesson', data.x + 17, data.y, '#9cff8a', 24); break;
    case 'death': s.death(); renderer.shake(14); renderer.float('rodou!', data.x + 17, data.y + 30, '#ff5252', 26); break;
    case 'shield': s.shield(); renderer.float('livrou!', data.x + 17, data.y, '#7fe3ff', 26); break;
    case 'crumble': s.crumble(); break;
    case 'siren': s.siren(); break;
    case 'surfer': s.surfer(); break;
    case 'squadWarn': s.whistle(); break;
    case 'love': {
      // vários se apaixonando juntos: um suspiro e um texto só
      const now = performance.now();
      if (now - lastLove > 500) { s.love(); renderer.float('apaixonou!', data.x + 17, data.y - 10, '#ff4f8b', 28); }
      lastLove = now;
      break;
    }
    case 'awake': renderer.float('acorda!', data.x + 17, data.y - 10, '#fff', 24); break;
    case 'squadRun': s.stomp(); renderer.shake(5); break;
    case 'dodge': s.dodge(); renderer.float(`passou liso! +${data.pts}`, run.layout.w / 2, run.cameraY + 320, '#9cff8a', 34); break;
    case 'tideWarn': s.tideWarn(); break;
    case 'tide': s.tide(); renderer.shake(10); break;
    case 'biome': s.gas(); renderer.float(data.name.toUpperCase(), run.layout.w / 2, run.cameraY + 300, '#fff', 64); break;
    case 'perk': s.perk(); openPerks(data); break;
    case 'gameover': s.gameover(); setTimeout(openGameOver, 700); break;
  }
}

function startRun(seed = randomSeed()) {
  document.activeElement?.blur?.();
  const layout = layoutForScreen();
  // ajuda pra iniciante: se as últimas partidas foram curtas, começa mais leve
  const assist = needsAssist(allRuns());
  run = new Run({ seed, onEvent, layout, assist });
  recorder = createRecorder({ seed, layout, version: MY_VERSION, assist });
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
  recorder?.perk(p.id);
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
      <tr><td>Maior bando</td><td>${run.maxCrew}</td></tr>
      <tr><td>Recrutados</td><td>${run.recruited}</td></tr>
      <tr><td>Maior combo</td><td>×${run.combo.best}</td></tr>
      <tr><td>Celulares / bolsas / chinelos</td><td>${run.loot.phone} / ${run.loot.bag} / ${run.loot.flipflop}</td></tr>
      ${deaths}
      <tr><td>Seed</td><td>${run.seed}${run.assist ? ' · com ajuda' : ''}</td></tr>
    </table>
    <div id="rankNote"></div>`;
  saveRun();
  updateMenuBest();
  audio.stopGame();
  show('gameover');
  document.querySelector('#gameover .primary').focus();
}

// Fim de partida: telemetria local, ranking local (com a gravação) e
// verificação da pontuação refazendo a partida em segundo plano.
let lastEntry = null;
function saveRun() {
  const rec = recorder?.finish(run);
  const summary = summaryOf(run, rec, MY_VERSION);
  recordRun(summary);
  const entry = maybeAddTop(summary, rec);
  lastEntry = entry;
  $('onlineSubmit').hidden = !(entry && onlineEnabled());
  if (!entry) return;
  const pos = topRuns().findIndex((t) => t.id === entry.id) + 1;
  $('rankNote').innerHTML = `<b>#${pos}</b> no seu ranking · <span id="verifyNote">conferindo a partida…</span>`;
  setTimeout(async () => {
    const { verify } = await import('./replay.js');
    const res = rec ? verify(rec) : { ok: false };
    markVerified(entry.id, res.ok);
    const note = document.getElementById('verifyNote');
    if (note) note.textContent = res.ok ? 'partida conferida ✓' : 'não deu pra conferir';
  }, 50);
}

async function sendOnline() {
  if (!lastEntry) return;
  const nick = $('nick').value.trim();
  try { localStorage.setItem('wavesson.nick', nick); } catch {}
  $('sendOnline').disabled = true;
  const res = await submitRun(lastEntry, nick).catch(() => ({ ok: false }));
  $('sendOnline').textContent = res.ok ? 'enviado! (entra no ranking depois de conferido)' : 'falhou, tenta de novo';
  $('sendOnline').disabled = res.ok;
}

const fmt = (n) => Math.floor(n).toLocaleString('pt-BR');
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

async function renderStats(tab = 'local') {
  $('rankTabs').hidden = !onlineEnabled();
  for (const b of document.querySelectorAll('#rankTabs .tab')) b.classList.toggle('on', b.dataset.rank === tab);
  const list = $('rankList');
  if (tab === 'online') {
    list.innerHTML = '<li class="empty">carregando…</li>';
    const rows = await fetchTop().catch(() => []);
    list.innerHTML = rows.length
      ? rows.map((r) => `<li><span class="pts">${fmt(r.score)}</span> ${esc(r.name)}<span class="meta">${r.meters} m · ${r.layout === 'portrait' ? 'em pé' : 'deitado'}</span></li>`).join('')
      : '<li class="empty">ninguém ainda — seja o primeiro!</li>';
  } else {
    const top = topRuns();
    list.innerHTML = top.length
      ? top.map((t) => `<li><span class="pts">${fmt(t.score)}</span><span class="meta">${t.meters} m · ${t.layout === 'portrait' ? 'em pé' : 'deitado'} · ${t.at.slice(5, 10).split('-').reverse().join('/')}</span>${t.verified === true ? ' <span class="ok" title="partida refeita e conferida">✓</span>' : t.verified === false ? ' <span class="bad">?</span>' : ''}</li>`).join('')
      : '<li class="empty">joga uma aí!</li>';
  }
  const s = summarize(allRuns());
  if (!s.runs) { $('statsBody').innerHTML = '<p>Ainda sem partidas.</p>'; return; }
  const maxAt = Math.max(1, ...s.deathsAt.map((d) => d.n));
  const lastBucket = s.deathsAt.at(-1)?.m ?? 0;
  const buckets = [];
  for (let m = 0; m <= Math.min(lastBucket, 1500); m += 50) buckets.push(s.deathsAt.find((d) => d.m === m)?.n || 0);
  $('statsBody').innerHTML = `
    <div class="nums">
      <div><b>${s.runs}</b><span>partidas</span></div>
      <div><b>${s.median} m</b><span>metade chega até</span></div>
      <div><b>${s.best} m</b><span>mais longe</span></div>
      <div><b>${Math.round(s.earlyRate * 100)}%</b><span>morrem antes de 60 m</span></div>
    </div>
    <div class="bars">${s.causes.slice(0, 5).map((c) => `<div class="bar"><span>${c.name}</span><i class="${c.cause === 'left' || c.cause === 'love' ? '' : 'red'}" style="width:${Math.round(c.pct * 100)}%"></i><span>${Math.round(c.pct * 100)}%</span></div>`).join('')}</div>
    <div class="hist" title="onde o bando perde gente (a cada 50 m)">${buckets.map((n) => `<i style="height:${Math.round((n / maxAt) * 100)}%"></i>`).join('')}</div>
    <div class="hist-legend"><span>0 m</span><span>onde se perde gente</span><span>${Math.min(lastBucket, 1500)} m</span></div>`;
}

function renderTracks() {
  const list = $('trackList');
  list.innerHTML = '';
  for (const t of TRACKS) {
    const b = document.createElement('button');
    b.className = 'track' + (t.id === audio.trackId ? ' selected' : '');
    b.textContent = t.name;
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
      case 'play': tryFullscreen(); return startRun();
      case 'daily': tryFullscreen(); return startRun(todaySeed());
      case 'howto': $('howto').dataset.page = 1; return show('howto');
      case 'next': return howtoPage(1);
      case 'prev': return howtoPage(-1);
      case 'credits': return show('credits');
      case 'music': renderTracks(); return show('music');
      case 'stats': renderStats(); return show('stats');
      case 'export': return exportJson();
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
    if (e.code === 'KeyP' || e.code === 'Escape') {
      if (screen === 'howto' || screen === 'credits' || screen === 'music' || screen === 'stats') return show('menu');
      togglePause();
    }
    if (screen === 'howto' && e.code === 'ArrowRight') howtoPage(1);
    if (screen === 'howto' && e.code === 'ArrowLeft') howtoPage(-1);
    if (e.code === 'Enter' && screen === 'menu' && document.activeElement === document.body) startRun();
    if (e.code === 'Enter' && screen === 'gameover' && document.activeElement === document.body) startRun();
  });

  document.addEventListener('visibilitychange', () => { if (document.hidden) togglePause(true); });
}

// O GitHub Pages deixa arquivos em cache por ~10 min. Logo depois de uma
// atualização, quem já tinha aberto o jogo pode receber HTML velho com JS novo.
// Nesse caso, renova o cache da página e recarrega (uma vez só).
async function healStaleCache() {
  if (document.getElementById('root')) {
    try { sessionStorage.removeItem('wavesson.healed'); } catch {}
    return false;
  }
  try {
    if (sessionStorage.getItem('wavesson.healed')) return false;
    sessionStorage.setItem('wavesson.healed', '1');
  } catch { return false; }
  await Promise.all([location.href, 'style.css'].map((u) => fetch(u, { cache: 'reload' }).catch(() => {})));
  location.reload();
  return true;
}

// Versão publicada: o deploy carimba main.js?v=<commit>. Se o servidor já tem
// uma versão mais nova que a que está rodando (cache do navegador), renova a
// página e recarrega uma vez — aí todos os arquivos vêm com a versão nova.
const MY_VERSION = new URL(import.meta.url).searchParams.get('v');

async function ensureLatest() {
  if (!MY_VERSION) return false; // rodando local, sem carimbo
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
    const { v } = await res.json();
    if (!v || v === MY_VERSION) return false;
    const key = `wavesson.updated.${v}`;
    if (sessionStorage.getItem(key)) return false; // já tentou: não entra em loop
    sessionStorage.setItem(key, '1');
    await fetch(location.href, { cache: 'reload' });
    location.reload();
    return true;
  } catch {
    return false;
  }
}

async function boot() {
  if (await healStaleCache()) return;
  if (await ensureLatest()) return;
  fitStage();
  addEventListener('resize', fitStage);
  screen.orientation?.addEventListener?.('change', () => setTimeout(fitStage, 50));
  audio = createAudio();
  audio.init();
  const images = await loadImages((p) => { $('loadpct').textContent = `${Math.round(p * 100)}%`; });
  renderer = createRenderer(canvas, images);
  input = createInput(canvas);
  $('sendOnline').addEventListener('click', sendOnline);
  try { $('nick').value = localStorage.getItem('wavesson.nick') || ''; } catch {}
  for (const b of document.querySelectorAll('#rankTabs .tab')) b.addEventListener('click', () => renderStats(b.dataset.rank));
  $('touchDash').addEventListener('pointerdown', (e) => { e.preventDefault(); input.queueDash(); });
  $('touchPause').addEventListener('pointerdown', (e) => { e.preventDefault(); togglePause(); });
  // a HUD do canvas usa a mesma letra dos menus; espera a fonte (no máx. 1,5 s)
  await Promise.race([document.fonts?.load('700 30px Kalam') ?? Promise.resolve(), new Promise((r) => setTimeout(r, 1500))]).catch(() => {});
  bindUi();
  updateMenuBest();

  const params = new URLSearchParams(location.search);
  if (params.has('seed')) startRun(params.get('seed'));
  else show('menu');

  // passo fixo: a simulação sempre anda de 1/60 s em 1/60 s (replay determinístico)
  let last = performance.now();
  let acc = 0;
  let pendingDash = false;
  const frame = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (run) {
      if (screen === 'game' && !paused) {
        acc = Math.min(acc + dt, 0.25);
        const raw = input.read();
        if (raw.dash) pendingDash = true; // guarda o pique até o próximo tick
        while (acc >= TICK && screen === 'game' && !run.over && !run.perkChoices) {
          const cmd = quantize({ ...raw, dash: pendingDash });
          pendingDash = false;
          recorder?.tick(cmd);
          run.update(TICK, cmd);
          acc -= TICK;
        }
      } else acc = 0;
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
