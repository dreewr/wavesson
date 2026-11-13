// Música/ambiente com <audio> e efeitos sintetizados com WebAudio
// (o projeto original só tinha música e a sirene).

const MUTE_KEY = 'wavesson.muted';

function pickTheme() {
  const probe = document.createElement('audio');
  return probe.canPlayType('audio/ogg; codecs="vorbis"') ? 'assets/audio/theme.ogg' : 'assets/audio/theme.m4a';
}

export function createAudio() {
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch {}

  const music = new Audio(pickTheme());
  music.loop = true;
  music.volume = 0.45;
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
    loot: (kind) => tone(kind === 'flipflop' ? 660 : kind === 'phone' ? 880 : 990, 0.09, { slide: 400 }),
    recruit: () => { tone(523, 0.08); tone(784, 0.12, { delay: 0.08 }); },
    death: () => tone(220, 0.25, { type: 'sawtooth', slide: -150, vol: 0.1 }),
    shield: () => tone(1200, 0.15, { type: 'triangle', slide: -600, vol: 0.1 }),
    crumble: () => noise(0.15, 0.08),
    perk: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.12, { delay: i * 0.07, type: 'triangle' })),
    tideWarn: () => tone(110, 0.6, { type: 'sine', vol: 0.15, slide: 40 }),
    tide: () => noise(1.4, 0.25),
    siren: () => { if (!muted) { siren.currentTime = 0; siren.play().catch(() => {}); } },
    gameover: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, { delay: i * 0.15, type: 'sawtooth', vol: 0.07 })),
  };

  return {
    sfx,
    startMusic() { play(music); },
    startGame() { play(music); play(sea); },
    stopGame() { sea.pause(); },
    get muted() { return muted; },
    toggleMute() {
      muted = !muted;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch {}
      for (const a of [music, sea, siren]) a.muted = muted;
      if (!muted) play(music);
      return muted;
    },
    init() { for (const a of [music, sea, siren]) a.muted = muted; },
  };
}
