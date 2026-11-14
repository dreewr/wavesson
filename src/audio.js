// Música/ambiente com <audio> e efeitos sintetizados com WebAudio
// (o projeto original só tinha música, a sirene e a vinheta do gás).

const MUTE_KEY = 'wavesson.muted';
const TRACK_KEY = 'wavesson.track';

function themeSrc() {
  const probe = document.createElement('audio');
  return probe.canPlayType('audio/ogg; codecs="vorbis"') ? 'assets/audio/theme.ogg' : 'assets/audio/theme.m4a';
}

// As faixas que a equipe separou na hackathon de 2017.
export const TRACKS = [
  { id: 'tema', name: 'Tema do Wavesson', src: themeSrc() },
  { id: 'sweet', name: 'Sweet Dreams', src: 'assets/audio/music/sweet-dreams.m4a' },
  { id: 'naruto', name: 'Naruto: The Raising Fighting Spirit', src: 'assets/audio/music/naruto.m4a' },
  { id: 'familia', name: 'A Grande Família', src: 'assets/audio/music/grande-familia.m4a' },
  { id: 'aleatorio', name: 'Aleatório (troca a cada run)', src: null },
];

export function createAudio() {
  let muted = false;
  let trackId = 'tema';
  try {
    muted = localStorage.getItem(MUTE_KEY) === '1';
    trackId = localStorage.getItem(TRACK_KEY) || 'tema';
  } catch {}
  if (!TRACKS.some((t) => t.id === trackId)) trackId = 'tema';

  const music = new Audio();
  music.loop = true;
  music.volume = 0.45;
  const gas = new Audio('assets/audio/o-gas.m4a');
  gas.volume = 0.7;

  function resolveTrack() {
    if (trackId !== 'aleatorio') return TRACKS.find((t) => t.id === trackId);
    const pool = TRACKS.filter((t) => t.src && !music.src.endsWith(t.src));
    return pool[Math.floor(Math.random() * pool.length)];
  }
  function loadTrack() {
    const t = resolveTrack();
    if (!music.src.endsWith(t.src)) music.src = t.src;
  }
  loadTrack();
  const sea = new Audio('assets/audio/sea.m4a');
  sea.loop = true;
  sea.volume = 0.25;
  const siren = new Audio('assets/audio/siren.wav');
  siren.volume = 0.5;

  let ctx = null;
  const ac = () => (ctx ??= new (window.AudioContext || window.webkitAudioContext)());

  function tone(freq, dur, { type = 'square', vol = 0.08, slide = 0, delay = 0 } = {}) {
    if (muted) return;
    const c = ac();
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function noise(dur, vol = 0.15) {
    if (muted) return;
    const c = ac();
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const g = c.createGain();
    g.gain.value = vol;
    src.buffer = buf;
    src.connect(filter).connect(g).connect(c.destination);
    src.start();
  }

  const play = (a) => { if (!muted) a.play().catch(() => {}); };

  const sfx = {
    // o tom sobe junto com o combo
    loot: (kind, combo = 1) => tone((kind === 'flipflop' ? 660 : kind === 'phone' ? 880 : 990) * Math.pow(1.06, Math.min(combo - 1, 12)), 0.09, { slide: 400 }),
    dash: () => tone(300, 0.18, { type: 'triangle', slide: 500, vol: 0.09 }),
    rush: () => { if (!muted) { gas.currentTime = 0; gas.play().catch(() => {}); } [659, 784, 988, 1319].forEach((f, i) => tone(f, 0.14, { delay: 0.5 + i * 0.08, type: 'square', vol: 0.06 })); },
    recruit: () => { tone(523, 0.08); tone(784, 0.12, { delay: 0.08 }); },
    death: () => tone(220, 0.25, { type: 'sawtooth', slide: -150, vol: 0.1 }),
    shield: () => tone(1200, 0.15, { type: 'triangle', slide: -600, vol: 0.1 }),
    crumble: () => noise(0.15, 0.08),
    perk: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.07, type: 'triangle' })),
    tideWarn: () => tone(110, 0.6, { type: 'sine', vol: 0.15, slide: 40 }),
    tide: () => noise(1.4, 0.25),
    surfer: () => noise(0.35, 0.12),
    // apito de guarda-vidas: trinado agudo
    whistle: () => { for (let i = 0; i < 6; i++) tone(i % 2 ? 2900 : 2500, 0.07, { delay: i * 0.075, type: 'square', vol: 0.05 }); tone(2700, 0.35, { delay: 0.5, type: 'square', vol: 0.05 }); },
    stomp: () => { for (let i = 0; i < 4; i++) setTimeout(() => noise(0.08, 0.12), i * 110); },
    // suspiro apaixonado: sobe e desce
    love: () => { tone(523, 0.22, { type: 'sine', slide: 260, vol: 0.09 }); tone(784, 0.3, { delay: 0.2, type: 'sine', slide: -240, vol: 0.08 }); },
    dodge: () => { tone(784, 0.08, { type: 'triangle' }); tone(1175, 0.14, { delay: 0.08, type: 'triangle' }); },
    siren: () => { if (!muted) { siren.currentTime = 0; siren.play().catch(() => {}); } },
    gas: () => { if (!muted) { gas.currentTime = 0; gas.play().catch(() => {}); } },
    gameover: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, { delay: i * 0.15, type: 'sawtooth', vol: 0.07 })),
  };

  return {
    sfx,
    startMusic() { play(music); },
    startGame() {
      if (trackId === 'aleatorio') { loadTrack(); music.currentTime = 0; }
      play(music);
      play(sea);
    },
    get trackId() { return trackId; },
    setTrack(id) {
      if (!TRACKS.some((t) => t.id === id)) return;
      trackId = id;
      try { localStorage.setItem(TRACK_KEY, id); } catch {}
      loadTrack();
      music.currentTime = 0;
      play(music);
    },
    stopGame() { sea.pause(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
      for (const a of [music, sea, siren, gas]) a.muted = muted;
      if (!muted) play(music);
      return muted;
    },
    init() { for (const a of [music, sea, siren, gas]) a.muted = muted; },
  };
}
