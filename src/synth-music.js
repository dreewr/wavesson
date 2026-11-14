// "Samba do Arrastão": trilha original sintetizada na hora (WebAudio), sem
// arquivo nenhum. Chiptune com levada de samba: surdo marcando o 2, tamborim
// no teleco-teco, baixo saltitante e uma melodia pentatônica de 4 compassos.
// É a trilha que pode ir pra um lançamento sem problema de direito autoral.

const BPM = 104;
const STEP = 60 / BPM / 4; // semicolcheia
const LOOKAHEAD = 0.12; // s de agenda à frente

const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);
// tonalidade: Ré maior / Si menor (pentatônica)
const BASS = [38, 0, 45, 0, 38, 0, 45, 45, 43, 0, 50, 0, 43, 0, 45, 47]; // 1 compasso, 16 passos (0 = pausa)
const BASS_PROG = [0, 0, 5, 7]; // transposição por compasso: I I IV V
const MELODY = [
  [74, 0, 76, 0, 78, 0, 81, 0, 78, 76, 0, 74, 0, 0, 71, 0],
  [74, 0, 0, 76, 78, 0, 76, 0, 74, 0, 71, 0, 69, 0, 0, 0],
  [79, 0, 78, 0, 76, 0, 79, 0, 81, 0, 79, 78, 76, 0, 74, 0],
  [76, 0, 78, 0, 76, 74, 0, 71, 74, 0, 0, 0, 0, 0, 0, 0],
];
const TAMBORIM = [1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0]; // teleco-teco
const SURDO = [0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]; // marca no 2
const GANZA = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

export function createSynthMusic(getCtx) {
  let master = null;
  let timer = null;
  let nextTime = 0;
  let step = 0;
  let noiseBuf = null;

  function setup(c) {
    if (master) return;
    master = c.createGain();
    master.gain.value = 0.32;
    master.connect(c.destination);
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.3, c.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function osc(c, t, freq, dur, type, vol, slideTo) {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function noise(c, t, dur, vol, freq) {
    const s = c.createBufferSource();
    const f = c.createBiquadFilter();
    const g = c.createGain();
    s.buffer = noiseBuf;
    f.type = 'highpass';
    f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(master);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  function schedule(c, t, s) {
    const bar = Math.floor(s / 16) % 4;
    const i = s % 16;
    const b = BASS[i];
    if (b) osc(c, t, NOTE(b + BASS_PROG[bar] - 12), STEP * 1.6, 'square', 0.09);
    const m = MELODY[bar][i];
    if (m) osc(c, t, NOTE(m), STEP * 1.8, 'triangle', 0.11);
    if (SURDO[i]) osc(c, t, 90, 0.32, 'sine', 0.5, 45);
    if (i === 0) osc(c, t, 70, 0.18, 'sine', 0.25, 50);
    if (TAMBORIM[i]) noise(c, t, 0.05, 0.12, 5000);
    if (GANZA[i]) noise(c, t, 0.025, i % 4 === 0 ? 0.05 : 0.025, 8000);
  }

  function tick() {
    const c = getCtx();
    while (nextTime < c.currentTime + LOOKAHEAD) {
      schedule(c, nextTime, step);
      // leve swing de samba nas semicolcheias pares
      nextTime += STEP * (step % 2 === 0 ? 1.08 : 0.92);
      step++;
    }
  }

  return {
    get playing() {
      return timer !== null;
    },
    start() {
      if (timer) return;
      const c = getCtx();
      setup(c);
      c.resume?.();
      nextTime = c.currentTime + 0.05;
      timer = setInterval(tick, 25);
      tick();
    },
    stop() {
      clearInterval(timer);
      timer = null;
    },
    setMuted(m) {
      if (master) master.gain.value = m ? 0 : 0.32;
    },
  };
}
