// Desenho no canvas. Lê o estado da Run, nunca o altera.

import { CREW } from './config.js';
import { LANDSCAPE } from './layout.js';
import { CREW_SKINS } from './defs.js';
import { viewport } from './screen.js';
import { PERKS as PERK_LIST } from './perks.js';
import { RUSH } from './run.js';

const DEEP_BLUE = '#10298f';
const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
// a água começa ~740px pra dentro do sprite do mar (1024px); no layout original ele ficava em x=610
const SEA_EDGE_IN_SPRITE = 740;

// Onde fica cada peça da HUD em cada enquadramento. O bilhete é desenhado nas
// coordenadas do layout horizontal e só transladado/escalado pro vertical.
const HUD = {
  landscape: { cardX: 620, cardY: 12, cardS: 1, comboX: 1185, comboY: 70, rushY: 300, tagSize: 18 },
  portrait: { cardX: 10, cardY: 10, cardS: 0.9, comboX: 30, comboY: 300, rushY: 420, tagSize: 15 },
};

export function createRenderer(canvas, images) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0 };
  // tamanho do mundo visível: vem do layout da run que está sendo desenhada
  let VIEW_W = LANDSCAPE.w, VIEW_H = LANDSCAPE.h, ZONE = LANDSCAPE.zone, hud = HUD.landscape;

  function useLayout(L) {
    VIEW_W = L.w;
    VIEW_H = L.h;
    ZONE = L.zone;
    hud = HUD[L.kind] || HUD.landscape;
    view.scale = Math.min(canvas.width / VIEW_W, canvas.height / VIEW_H);
    view.ox = (canvas.width - VIEW_W * view.scale) / 2;
    view.oy = (canvas.height - VIEW_H * view.scale) / 2;
  }
  const floaters = []; // "+100", "RODOU!" etc
  let shake = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const { w, h } = viewport();
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
  }
  addEventListener('resize', resize);
  resize();

  function float(text, x, y, color = '#fff', size = 26) {
    floaters.push({ text, x, y, color, size, t: 0 });
  }

  function anim(base, t, fps = 6) {
    return images[`${base}_${Math.floor(t * fps) % 2}`];
  }

  // ------------------------------------------------------------ cenário

  // textura de areia: pontinhos claros e escuros num ladrilho que rola com a praia
  const sandTile = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 160;
    const g = c.getContext('2d');
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 520; i++) {
      g.fillStyle = rnd() < 0.55 ? 'rgba(120,85,20,0.16)' : 'rgba(255,255,255,0.28)';
      const s = rnd() < 0.85 ? 2 : 3;
      g.fillRect(Math.floor(rnd() * 160), Math.floor(rnd() * 160), s, s);
    }
    return c;
  })();
  let sandPattern = null;

  function drawBeach(run) {
    const cam = run.cameraY;
    ctx.fillStyle = run.biome.sand;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    sandPattern ??= ctx.createPattern(sandTile, 'repeat');
    ctx.save();
    ctx.translate(0, -(cam % 160));
    ctx.fillStyle = sandPattern;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H + 160);
    ctx.restore();

    // areia molhada escurecendo até a beira d'água
    const wet0 = ZONE.shallow - 120 + run.tide.offset;
    const wet = ctx.createLinearGradient(wet0, 0, ZONE.shallow + run.tide.offset + 10, 0);
    wet.addColorStop(0, 'rgba(150,110,40,0)');
    wet.addColorStop(1, 'rgba(150,110,40,0.28)');
    ctx.fillStyle = wet;
    ctx.fillRect(wet0, 0, 140, VIEW_H);

    // calçadão (tile vertical)
    const walk = images[run.biome.walk];
    const tileH = (walk.height * ZONE.walkEnd) / walk.width;
    for (let y = -(cam % tileH); y < VIEW_H; y += tileH) ctx.drawImage(walk, 0, y, ZONE.walkEnd, tileH);
    // meio-fio do calçadão + sombra na areia
    ctx.fillStyle = '#d8d2c2';
    ctx.fillRect(ZONE.walkEnd - 2, 0, 7, VIEW_H);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(ZONE.walkEnd + 5, 0, 7, VIEW_H);

    // mar animado; a onda empurra tudo pra esquerda
    const off = run.tide.offset;
    const sea = images[`sea_${Math.floor(run.time * 5) % 6}`];
    const seaX = ZONE.shallow - SEA_EDGE_IN_SPRITE + off;
    for (let y = -(cam % 1024); y < VIEW_H; y += 1024) ctx.drawImage(sea, seaX, y, 1024, 1024);
    if (seaX + 1024 < VIEW_W) {
      ctx.fillStyle = DEEP_BLUE;
      ctx.fillRect(seaX + 1024, 0, VIEW_W - seaX - 1024, VIEW_H);
    }

    if (run.tide.phase === 'warn' && Math.floor(run.time * 6) % 2 === 0) {
      ctx.fillStyle = 'rgba(16,41,143,0.25)';
      ctx.fillRect(ZONE.shallow - run.tide.reach, 0, run.tide.reach, VIEW_H);
      label('ONDA VINDO!', ZONE.shallow - run.tide.reach / 2, 90, '#fff', 44, '#10298f');
    }
  }

  // ------------------------------------------------------------ entidades

  // sombra no chão: neutra pra obstáculos, avermelhada pra quem derruba
  const OWN_SHADOW = new Set(['surfer', 'bombeiro', 'police', 'banhista', 'towel', 'flipflop', 'phone', 'bag']);
  function groundShadow(e, sy) {
    if (OWN_SHADOW.has(e.kind)) return;
    const h = e.def.hit || { ox: 0, oy: e.h - 20, w: e.w, h: 20 };
    const deadly = e.def.role === 'deadly';
    ctx.fillStyle = deadly ? 'rgba(210,25,25,0.32)' : 'rgba(60,40,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(e.x + h.ox + h.w / 2, sy + h.oy + h.h - 3, h.w * 0.6, Math.max(6, h.h * 0.28), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEntity(run, e) {
    const sy = e.y - run.cameraY;
    groundShadow(e, sy);
    switch (e.kind) {
      case 'dog': {
        const img = anim('dog', e.t, 8);
        ctx.save();
        if (e.flip) {
          ctx.translate(e.x + e.w, sy);
          ctx.scale(-1, 1);
          ctx.drawImage(img, 0, 0, e.w, e.h);
        } else ctx.drawImage(img, e.x, sy, e.w, e.h);
        ctx.restore();
        return;
      }
      case 'vendor':
        ctx.drawImage(anim('vendor', e.t, 5), e.x, sy, e.w, e.h);
        return;
      case 'recruit': {
        const skin = CREW_SKINS[e.skin % CREW_SKINS.length];
        ctx.drawImage(images[`${skin}_0`], e.x, sy, CREW.w, CREW.h);
        // balão branco com "!" azul: dá pra ver em qualquer areia
        const bob = Math.sin(e.t * 6) * 4;
        const bx = e.x + CREW.w / 2, by = sy - 22 + bob;
        ctx.fillStyle = '#fff';
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(bx, by, 15, 0, Math.PI * 2);
        ctx.moveTo(bx - 5, by + 13);
        ctx.lineTo(bx, by + 22);
        ctx.lineTo(bx + 5, by + 13);
        ctx.fill();
        ctx.stroke();
        label('!', bx, by + 9, '#3a3d9b', 26, '#fff');
        return;
      }
      case 'police':
        drawPolice(run, e, sy);
        return;
      case 'surfer':
        drawSurfer(e, sy);
        return;
      case 'bombeiro':
        drawBombeiro(e, sy);
        return;
      case 'banhista':
        drawBanhista(run, e, sy);
        return;
      case 'flipflop': case 'phone': case 'bag': {
        const pulse = 1 + Math.sin(e.t * 8) * 0.06;
        const w = e.w * pulse, h = e.h * pulse;
        // brilho atrás do item
        const cx = e.x + e.w / 2, cy = sy + e.h / 2, r = Math.max(e.w, e.h) * 0.75;
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, r);
        glow.addColorStop(0, 'rgba(255,255,255,0.75)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
        ctx.drawImage(anim(e.kind, e.t, 4), e.x + (e.w - w) / 2, sy + (e.h - h) / 2, w, h);
        return;
      }
      default:
        if (e.sprite) ctx.drawImage(images[e.sprite], e.x, sy, e.w, e.h);
    }
  }

  const BOARD_COLORS = ['#ff7043', '#29b6f6', '#ffee58', '#66bb6a', '#ec407a'];

  // Surfista Desatento: um integrante "de sunga" com prancha debaixo do braço
  // (não havia sprite em 2017; reaproveita a arte do bando + prancha desenhada).
  function drawSurfer(e, sy) {
    const skin = CREW_SKINS[e.skin % CREW_SKINS.length];
    const running = e.state === 'run';
    const frame = images[`${skin}_${running ? Math.floor(e.t * 12) % 2 : 0}`];
    const bob = e.state === 'emerge' ? Math.sin(e.t * 14) * 3 : 0;
    const px = e.x + 58, py = sy + bob;

    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(e.x + e.w / 2, sy + e.h - 4, 70, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.drawImage(frame, px, py, 34, 100);

    // prancha (bico pra esquerda, pra onde ele corre)
    const by = py + 52;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#222';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(e.x + 4, by + 11);
    ctx.quadraticCurveTo(e.x + 20, by - 2, e.x + 60, by);
    ctx.lineTo(e.x + e.w - 14, by);
    ctx.quadraticCurveTo(e.x + e.w, by + 11, e.x + e.w - 14, by + 22);
    ctx.lineTo(e.x + 60, by + 22);
    ctx.quadraticCurveTo(e.x + 20, by + 24, e.x + 4, by + 11);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = BOARD_COLORS[e.skin % BOARD_COLORS.length];
    ctx.fillRect(e.x + 30, by + 8, e.w - 50, 6);

    if (e.state === 'emerge') {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(e.x + 40, sy + e.h - 10, 70, 6);
      label('!', px + 17, py - 12, '#e53935', 36);
    } else if (running && Math.floor(e.t * 10) % 2 === 0) {
      // respingos de areia
      ctx.fillStyle = 'rgba(141,110,63,0.6)';
      ctx.fillRect(e.x + e.w - 6, sy + e.h - 12, 6, 6);
      ctx.fillRect(e.x + e.w + 6, sy + e.h - 20, 5, 5);
    }
  }

  const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524'];

  // Bombeiro guarda-vidas de sunga, em pixel art feita no código
  // (correndo de costas pra câmera, subindo a praia).
  function drawBombeiro(e, sy) {
    const running = e.squad.state === 'run';
    const ph = running ? Math.floor(e.t * 12) % 2 : 0;
    const x = Math.round(e.x), y = Math.round(sy);
    const skin = SKIN[e.tone % SKIN.length];
    const R = (c, rx, ry, rw, rh) => { ctx.fillStyle = c; ctx.fillRect(x + rx, y + ry, rw, rh); };
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + 22, y + 97, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    // pernas alternando
    R(skin, 12, 70, 8, ph ? 22 : 26);
    R(skin, 24, 70, 8, ph ? 26 : 22);
    R('#222', 11, ph ? 90 : 94, 10, 4);
    R('#222', 23, ph ? 94 : 90, 10, 4);
    // sunga vermelha
    R('#d32f2f', 10, 60, 24, 12);
    R('#ffd600', 10, 60, 24, 3);
    // tronco e braços balançando
    R(skin, 11, 32, 22, 30);
    R(skin, 3, ph ? 34 : 40, 8, 22);
    R(skin, 33, ph ? 40 : 34, 8, 22);
    // cabeça + boné de guarda-vidas (vermelho com aba amarela)
    R(skin, 14, 14, 16, 18);
    R('#d32f2f', 12, 6, 20, 10);
    R('#ffd600', 12, 14, 20, 3);
    R('#000', 13, 6, 18, 2);
    // número nas costas
    R('#fff', 18, 40, 8, 8);
    R('#d32f2f', 21, 41, 2, 6);
    R('#d32f2f', 19, 43, 6, 2);
  }

  const BIKINI = ['#e91e63', '#00bcd4', '#ff9800', '#8e24aa', '#43a047', '#f44336'];
  const HAIR = ['#3e2723', '#212121', '#f9a825', '#6d4c41', '#bf360c', '#111'];
  const TOWEL = [['#ff6f91', '#fff'], ['#29b6f6', '#fff'], ['#ffd54f', '#ef6c00'], ['#66bb6a', '#fff']];

  function heart(x, y, r, color = '#e91e63') {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.9);
    ctx.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.6, y - r * 1.4, x, y - r * 0.5);
    ctx.bezierCurveTo(x + r * 0.6, y - r * 1.4, x + r * 1.6, y - r * 0.2, x, y + r * 0.9);
    ctx.fill();
  }

  // Banhista deitada de bruços na toalha, de óculos escuros, mexendo o pé.
  function drawBanhista(run, e, sy) {
    const k = e.look ?? 0;
    const x = Math.round(e.x), y = Math.round(sy);
    const skin = SKIN[(k + 1) % SKIN.length];
    const [t1, t2] = TOWEL[k % TOWEL.length];
    const R = (c, rx, ry, rw, rh) => { ctx.fillStyle = c; ctx.fillRect(x + rx, y + ry, rw, rh); };

    // raio de "perigo": só aparece quando o bando chega perto
    const c = run.crewCenter();
    if (c) {
      const d = Math.hypot(c.x - (e.x + e.w / 2), c.y - (e.y + e.h / 2));
      if (d < e.def.aura * 2.6) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.5, (e.def.aura * 2.6 - d) / 200);
        ctx.strokeStyle = '#ff4f8b';
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = -run.time * 30;
        ctx.beginPath();
        ctx.ellipse(e.x + e.w / 2, sy + e.h / 2, e.def.aura, e.def.aura * 0.8, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }

    // toalha listrada com sombra
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(x + 4, y + 22, e.w, 44);
    for (let i = 0; i < 10; i++) R(i % 2 ? t2 : t1, i * 15, 18, 15, 44);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y + 18, e.w, 44);

    // pernas (um pé balança)
    const kick = Math.sin(e.t * 4) > 0 ? -8 : 0;
    R(skin, 92, 33, 44, 9);
    R(skin, 92, 44, 36, 9);
    R(skin, 128, 44 + kick, 8, 10);
    // biquíni + tronco
    R(skin, 40, 30, 54, 24);
    R(BIKINI[k % BIKINI.length], 80, 30, 14, 24);
    R(BIKINI[k % BIKINI.length], 52, 30, 4, 24);
    // braço dobrado debaixo da cabeça
    R(skin, 22, 50, 28, 8);
    // cabeça, cabelo e óculos
    R(HAIR[k % HAIR.length], 10, 26, 30, 30);
    R(skin, 18, 30, 20, 22);
    R('#111', 18, 34, 20, 5);
    R('#e53935', 32, 46, 4, 2);
    // chapéu de praia de vez em quando
    if (k % 3 === 0) {
      ctx.fillStyle = '#f4e1a1';
      ctx.beginPath();
      ctx.ellipse(x + 18, y + 26, 22, 9, -0.2, 0, Math.PI * 2);
      ctx.fill();
      R('#e91e63', 8, 22, 22, 4);
    }
    // corações quando alguém do bando já se apaixonou
    if (e.charmed) {
      const b = Math.sin(e.t * 5) * 3;
      heart(x + 70, y + 8 + b, 7);
    }
  }

  function drawPolice(run, e, sy) {
    if (e.state === 'warn' || e.state === 'waiting') {
      const blink = Math.floor(e.t * 8) % 2 === 0;
      const x = e.dir > 0 ? 50 : VIEW_W - 50;
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = blink ? '#e53935' : '#1e5bff';
      ctx.fillRect(0, sy + 10, VIEW_W, e.h - 20);
      ctx.restore();
      ctx.fillStyle = blink ? '#e53935' : '#1e5bff';
      ctx.beginPath();
      const d = e.dir;
      ctx.moveTo(x - 30 * d, sy + 15);
      ctx.lineTo(x + 30 * d, sy + e.h / 2);
      ctx.lineTo(x - 30 * d, sy + e.h - 15);
      ctx.fill();
      label('POLÍCIA!', x + 110 * d, sy + e.h / 2 + 10, '#fff', 30, '#000');
      return;
    }
    // viatura em "pixel art" feita no código (não havia sprite)
    const { x, w, h } = e;
    ctx.save();
    if (e.dir < 0) { ctx.translate(x + w, 0); ctx.scale(-1, 1); } else ctx.translate(x, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(10, sy + h - 14, w - 10, 12);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(0, sy + 30, w, 50);
    ctx.fillStyle = '#222';
    ctx.fillRect(0, sy + 52, w, 10);
    ctx.fillStyle = '#f4f4f4';
    ctx.fillRect(50, sy + 8, 110, 26);
    ctx.fillStyle = '#7fb7e6';
    ctx.fillRect(60, sy + 12, 40, 18);
    ctx.fillRect(110, sy + 12, 40, 18);
    const blink = Math.floor(e.t * 10) % 2 === 0;
    ctx.fillStyle = blink ? '#e53935' : '#1e5bff';
    ctx.fillRect(85, sy, 20, 8);
    ctx.fillStyle = blink ? '#1e5bff' : '#e53935';
    ctx.fillRect(105, sy, 20, 8);
    ctx.fillStyle = '#111';
    for (const wx of [30, 160]) ctx.fillRect(wx, sy + 74, 34, 20);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(w - 10, sy + 36, 10, 10);
    ctx.restore();
  }

  function drawMember(run, m) {
    if (m.invulnT > 0 && Math.floor(m.invulnT * 12) % 2 === 0) return;
    const skin = CREW_SKINS[m.skin];
    const img = images[`${skin}_${Math.floor(m.animT * (m.moving ? 9 : 5)) % 2}`];
    const sy = m.y - run.cameraY;
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.beginPath();
    ctx.ellipse(m.x + CREW.w / 2, sy + CREW.h - 2, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    if (m.dashing) {
      ctx.globalAlpha = 0.3;
      ctx.drawImage(img, m.x, sy - 24, CREW.w, CREW.h);
      ctx.globalAlpha = 0.15;
      ctx.drawImage(img, m.x, sy - 48, CREW.w, CREW.h);
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(img, m.x, sy, CREW.w, CREW.h);
    if (m.slowT > 0) label('~', m.x + CREW.w / 2, sy - 4, '#8d6e3f', 28);
    if (m.loveT > 0) {
      // apaixonado: corações subindo e balançando em volta da cabeça
      for (let i = 0; i < 3; i++) {
        const ph = (m.animT * 1.4 + i / 3) % 1;
        heart(m.x + CREW.w / 2 + Math.sin((ph + i) * 6) * 12, sy - 6 - ph * 34, 6 + i, `rgba(233,30,99,${1 - ph})`);
      }
    }

  }

  // ------------------------------------------------------------ HUD

  function label(text, x, y, color = '#fff', size = 28, stroke = '#000', align = 'center') {
    ctx.font = `700 ${size}px Kalam, "Comic Sans MS", cursive`;
    ctx.textAlign = align;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // HUD: a estrutura do original de 2017 (Pontos / Wavessons / Distância, no
  // topo central, rótulo à esquerda e valor à direita) num "bilhete" de papel
  // com a letra manuscrita dos menus. Em volta: combo, vantagens, pique, escudos.
  const HAND = 'Kalam, "Comic Sans MS", "Chalkboard SE", cursive';
  const INK = '#222';
  const BLUE = '#3a3d9b';
  const PAPER = '#fffdf2';

  function text(t, x, y, { size = 28, weight = 700, color = INK, align = 'left', stroke = null, italic = false } = {}) {
    ctx.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${HAND}`;
    ctx.textAlign = align;
    if (stroke) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = Math.max(4, size / 6);
      ctx.strokeStyle = stroke;
      ctx.strokeText(t, x, y);
    }
    ctx.fillStyle = color;
    ctx.fillText(t, x, y);
    return ctx.measureText(t).width;
  }

  function paper(x, y, w, h, rot = 0) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(-w / 2 + 6, -h / 2 + 6, w, h);
    ctx.fillStyle = PAPER;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.strokeStyle = INK;
    ctx.lineWidth = 3;
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
  }

  function wave(x0, x1, y, amp, color, width, upto = 1) {
    ctx.beginPath();
    const end = x0 + (x1 - x0) * upto;
    for (let x = x0; x <= end; x += 4) {
      const yy = y + Math.sin((x - x0) / 14) * amp;
      x === x0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  const fmt = (n) => Math.floor(n).toLocaleString('pt-BR');

  function drawCard(run) {
    const X = 620, Y = 12, W = 500, H = 196;
    paper(X, Y, W, H, -0.012);
    const LX = 800, VX = 816;
    text('Pontos:', LX, 62, { align: 'right', size: 30 });
    text(fmt(run.score), VX, 64, { size: 40, color: '#000' });

    text('Wavessons:', LX, 112, { align: 'right', size: 30 });
    const nW = text(String(run.crew.length), VX, 114, { size: 36, color: '#000' });
    // carinhas do bando
    const heads = Math.min(run.crew.length, 10);
    for (let i = 0; i < heads; i++) {
      const skin = CREW_SKINS[run.crew[i].skin];
      ctx.drawImage(images[`${skin}_0`], 0, 0, 34, 40, VX + nW + 10 + i * 17, 84, 15, 18);
    }
    if (run.crew.length > 10) text('+', VX + nW + 12 + heads * 17, 102, { size: 22 });
    text(`×${run.crewMult.toFixed(2).replace('.', ',')}`, VX + nW + 12, 128, { size: 18, color: BLUE, weight: 400 });

    text('Distância:', LX, 162, { align: 'right', size: 30 });
    const dW = text(`${Math.floor(run.meters)} m`, VX, 164, { size: 34, color: '#000' });
    text(run.biome.name, VX + dW + 12, 162, { size: 22, color: BLUE, weight: 400 });

    // a "onda" até a próxima vantagem
    const prevAt = run.nextPerkAt - run.perkStep;
    const p = Math.max(0, Math.min(1, (run.meters - prevAt) / (run.nextPerkAt - prevAt)));
    wave(650, 1050, 186, 4, 'rgba(58,61,155,0.22)', 4);
    wave(650, 1050, 186, 4, BLUE, 6, p);
    text('★', 1070, 196, { size: 26, color: p >= 0.95 ? '#e6a700' : 'rgba(58,61,155,0.5)', weight: 400 });
  }

  function drawCombo(run) {
    if (run.combo.n < 2) return;
    const x = hud.comboX, y = hud.comboY;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(0.06);
    const pop = 1 + Math.max(0, run.combo.t - 1.9) * 0.6;
    ctx.scale(pop, pop);
    text('combo', 0, 0, { size: 26, color: INK, stroke: '#fff' });
    text(`×${run.comboMult.toFixed(1).replace('.', ',')}`, 0, 44, { size: 48, color: BLUE, stroke: '#fff', italic: true });
    // o risco embaixo some junto com a janela do combo
    ctx.fillStyle = BLUE;
    ctx.fillRect(0, 56, 110 * (run.combo.t / 2.2), 5);
    ctx.restore();
  }

  function drawSide(run, best) {
    // recorde + vantagens pegas, em etiquetinhas de papel no canto direito
    // em tela de toque o botão de pausa (DOM) fica no canto: as etiquetas descem
    const cssPerWorld = view.scale / (canvas.width / Math.max(1, canvas.clientWidth || innerWidth));
    let y = TOUCH ? 80 / cssPerWorld : 18;
    const tag = (t, color = INK, size = 20) => {
      ctx.font = `700 ${size}px ${HAND}`;
      const w = ctx.measureText(t).width + 22;
      paper(VIEW_W - 18 - w, y, w, size + 14, 0.01);
      text(t, VIEW_W - 29, y + size + 4, { size, color, align: 'right' });
      y += size + 22;
    };
    if (best > 0) tag(`recorde ${fmt(best)}`, "#777", hud.tagSize);
    for (const p of PERK_LIST) {
      const lvl = run.taken[p.id];
      if (lvl) tag(lvl > 1 ? `${p.name} ×${lvl}` : p.name, BLUE, hud.tagSize);
    }
  }

  function drawShields(run) {
    const n = Math.min(run.mods.shields, 12);
    if (!n) return;
    const x0 = 870 - (n * 22) / 2;
    for (let i = 0; i < n; i++) {
      const x = x0 + i * 22, y = 228;
      ctx.beginPath();
      ctx.moveTo(x, y - 9); ctx.lineTo(x + 8, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 8, y); ctx.closePath();
      ctx.fillStyle = '#7fd3ff';
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (run.mods.shields > 12) text('+', x0 + 12 * 22, 236, { size: 22 });
  }

  function drawDash(run) {
    const ready = run.dash.cd === 0;
    const X = 20, Y = VIEW_H - 92, W = 210, H = 74;
    paper(X, Y, W, H, 0.015);
    const p = 1 - run.dash.cd / run.dashCooldown;
    text(ready ? 'PIQUE!' : 'pique', X + 16, Y + 38, { size: 30, color: ready ? BLUE : '#999', italic: ready });
    text('espaço', X + W - 14, Y + 36, { size: 16, color: '#999', weight: 400, align: 'right' });
    ctx.fillStyle = 'rgba(58,61,155,0.15)';
    ctx.fillRect(X + 16, Y + 50, W - 32, 9);
    ctx.fillStyle = ready ? BLUE : '#888';
    ctx.fillRect(X + 16, Y + 50, (W - 32) * p, 9);
  }

  function drawRush(run) {
    if (run.rush.t <= 0) return;
    const elapsed = RUSH.seconds - run.rush.t;
    if (elapsed < 2) {
      // anúncio grande, some pra não tapar o bando
      ctx.save();
      ctx.globalAlpha = Math.min(1, (2 - elapsed) * 2);
      ctx.translate(VIEW_W / 2, hud.rushY);
      ctx.rotate(Math.sin(run.time * 6) * 0.03);
      const s = 1 + Math.max(0, 0.3 - elapsed) * 1.5;
      ctx.scale(s, s);
      text('HORA DO ARRASTÃO!', 0, 0, { size: 60, color: BLUE, stroke: '#fff', align: 'center', italic: true });
      text('pontos em dobro', 0, 38, { size: 26, color: INK, stroke: '#fff', align: 'center' });
      ctx.restore();
    }
  }

  // lembrete compacto embaixo do bilhete (desenhado dentro da transformação do bilhete)
  function drawRushNote(run) {
    if (run.rush.t <= 0) return;
    paper(760, 246, 220, 40, 0.02);
    text(`Hora do Arrastão · ${Math.ceil(run.rush.t)}s`, 870, 274, { size: 21, color: BLUE, align: 'center' });
  }

  function drawDanger(run) {
    const danger = run.inDanger;
    if (!danger.length) return;
    const a = 0.25 + Math.sin(run.time * 14) * 0.12;
    const g = ctx.createLinearGradient(0, 0, 0, 120);
    g.addColorStop(0, `rgba(229,57,53,${a})`);
    g.addColorStop(1, 'rgba(229,57,53,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, 120);
  }

  // quem está quase saindo por cima ganha um alerta, desenhado por cima da HUD
  function drawDangerMarks(run) {
    const blink = Math.floor(run.time * 10) % 2 === 0;
    for (const m of run.inDanger) {
      const sy = m.y - run.cameraY;
      label(blink ? '!' : '↓', m.x + CREW.w / 2, Math.max(30, sy + CREW.h + 30), '#e53935', 36, '#fff');
    }
  }

  function crewUnder(run, x0, y0, x1, y1) {
    return run.crew.some((m) => {
      const sy = m.y - run.cameraY;
      return m.x + CREW.w > x0 && m.x < x1 && sy < y1 && sy + CREW.h > y0;
    });
  }

  // Aviso dos bombeiros: as faixas exatas por onde o pelotão vai subir
  // piscam na borda de baixo, com setas e contagem. O buraco do paredão fica limpo.
  function drawSquadWarnings(run) {
    for (const { q, members } of run.squads) {
      if (q.state !== 'warn') continue;
      const total = q.warn + run.mods.warnBonus;
      const left = Math.max(0, total - q.t);
      const blink = Math.floor(q.t * (left < 0.6 ? 14 : 7)) % 2 === 0;
      const H = 170;
      // faixas ocupadas (mescla bombeiros vizinhos)
      const xs = members.map((e) => [e.x, e.x + e.w]).sort((a, b) => a[0] - b[0]);
      const lanes = [];
      for (const [a, b] of xs) {
        const last = lanes[lanes.length - 1];
        if (last && a <= last[1] + 24) last[1] = Math.max(last[1], b);
        else lanes.push([a, b]);
      }
      for (const [a, b] of lanes) {
        const g = ctx.createLinearGradient(0, VIEW_H, 0, VIEW_H - H);
        g.addColorStop(0, blink ? 'rgba(229,57,53,0.55)' : 'rgba(255,214,0,0.5)');
        g.addColorStop(1, 'rgba(229,57,53,0)');
        ctx.fillStyle = g;
        ctx.fillRect(a - 6, VIEW_H - H, b - a + 12, H);
        // setinhas subindo
        for (let x = a + 6; x < b; x += 44) {
          const yy = VIEW_H - 18 - ((q.t * 120) % 60);
          ctx.fillStyle = blink ? '#e53935' : '#ffd600';
          ctx.beginPath();
          ctx.moveTo(x + 10, yy - 16); ctx.lineTo(x + 22, yy); ctx.lineTo(x - 2, yy);
          ctx.closePath();
          ctx.fill();
        }
      }
      const cx = (lanes[0][0] + lanes[lanes.length - 1][1]) / 2;
      const lx = Math.min(VIEW_W - 200, Math.max(200, cx));
      text('BOMBEIROS!', lx, VIEW_H - 112, { size: 42, color: '#d32f2f', stroke: '#fff', align: 'center', italic: true });
      // barrinha da contagem
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.fillRect(lx - 90, VIEW_H - 98, 180, 10);
      ctx.fillStyle = '#d32f2f';
      ctx.fillRect(lx - 88, VIEW_H - 96, 176 * (left / total), 6);
    }
  }

  function drawHud(run, best) {
    drawDanger(run);
    drawSquadWarnings(run);
    // o bilhete fica translúcido quando tem gente do bando passando por baixo
    const s = hud.cardS;
    const under = crewUnder(run, hud.cardX - 5, 0, hud.cardX + 505 * s, hud.cardY + 200 * s);
    ctx.save();
    ctx.globalAlpha = under ? 0.35 : 1;
    ctx.translate(hud.cardX, hud.cardY);
    ctx.scale(s, s);
    ctx.translate(-620, -12);
    drawCard(run);
    drawShields(run);
    drawRushNote(run);
    ctx.restore();
    drawCombo(run);
    drawSide(run, best);
    drawDash(run);
    drawRush(run);
    ctx.globalAlpha = 1;
    drawDangerMarks(run);
  }

  function roundRect(x, y, w, h, r) {
    if (w <= 0) return;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.min(r, w / 2));
    ctx.fill();
  }

  function drawFloaters(run, dt) {
    for (let i = floaters.length - 1; i >= 0; i--) {
      const f = floaters[i];
      f.t += dt;
      if (f.t > 1) { floaters.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - f.t;
      label(f.text, f.x, f.y - run.cameraY - f.t * 60, f.color, f.size);
      ctx.globalAlpha = 1;
    }
  }

  function drawStick(stick) {
    if (!stick.active) return;
    // o joystick é desenhado em coordenadas de tela (CSS px → canvas px)
    const dpr = canvas.width / viewport().w;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(stick.ox * dpr, stick.oy * dpr, 70 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc((stick.ox + stick.x * 70) * dpr, (stick.oy + stick.y * 70) * dpr, 30 * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  return {
    float,
    shake(amount) { shake = Math.max(shake, amount); },
    draw(run, dt, { best = 0, stick } = {}) {
      useLayout(run.layout);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      shake = Math.max(0, shake - dt * 30);
      const sx = (Math.random() - 0.5) * shake, sy = (Math.random() - 0.5) * shake;
      ctx.setTransform(view.scale, 0, 0, view.scale, view.ox + sx * view.scale, view.oy + sy * view.scale);
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, VIEW_W, VIEW_H);
      ctx.clip();

      drawBeach(run);
      for (const item of run.drawList()) {
        if (item.type === 'member') drawMember(run, item.m);
        else drawEntity(run, item.e);
      }
      drawFloaters(run, dt);
      ctx.restore();
      drawHud(run, best);
      if (stick) drawStick(stick);
    },
  };
}
