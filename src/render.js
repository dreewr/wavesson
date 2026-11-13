// Desenho no canvas. Lê o estado da Run, nunca o altera.

import { VIEW_W, VIEW_H, ZONE, CREW } from './config.js';
import { CREW_SKINS } from './defs.js';

const SEA_X = 610; // onde o sprite do mar (1024px) começa, como no layout original
const DEEP_BLUE = '#10298f';

export function createRenderer(canvas, images) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, ox: 0, oy: 0 };
  const floaters = []; // "+100", "RODOU!" etc
  let shake = 0;

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth, h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    view.scale = Math.min(w / VIEW_W, h / VIEW_H) * dpr;
    view.ox = (canvas.width - VIEW_W * view.scale) / 2;
    view.oy = (canvas.height - VIEW_H * view.scale) / 2;
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

  function drawBeach(run) {
    const cam = run.cameraY;
    ctx.fillStyle = run.biome.sand;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    // calçadão (tile vertical)
    const walk = images[run.biome.walk];
    const tileH = (walk.height * ZONE.walkEnd) / walk.width;
    for (let y = -(cam % tileH); y < VIEW_H; y += tileH) ctx.drawImage(walk, 0, y, ZONE.walkEnd, tileH);
    ctx.fillStyle = 'rgba(0,0,0,0.18)';
    ctx.fillRect(ZONE.walkEnd, 0, 8, VIEW_H);

    // mar animado; a onda empurra tudo pra esquerda
    const off = run.tide.offset;
    const sea = images[`sea_${Math.floor(run.time * 5) % 6}`];
    const seaX = SEA_X + off;
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

  function drawEntity(run, e) {
    const sy = e.y - run.cameraY;
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
        const bob = Math.sin(e.t * 6) * 5;
        label('!', e.x + CREW.w / 2, sy - 14 + bob, '#ffe14d', 34);
        return;
      }
      case 'police':
        drawPolice(run, e, sy);
        return;
      case 'flipflop': case 'phone': case 'bag': {
        const pulse = 1 + Math.sin(e.t * 8) * 0.06;
        const w = e.w * pulse, h = e.h * pulse;
        ctx.drawImage(anim(e.kind, e.t, 4), e.x + (e.w - w) / 2, sy + (e.h - h) / 2, w, h);
        return;
      }
      default:
        if (e.sprite) ctx.drawImage(images[e.sprite], e.x, sy, e.w, e.h);
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
    ctx.drawImage(img, m.x, sy, CREW.w, CREW.h);
    if (m.slowT > 0) label('~', m.x + CREW.w / 2, sy - 4, '#8d6e3f', 28);
  }

  // ------------------------------------------------------------ HUD

  function label(text, x, y, color = '#fff', size = 28, stroke = '#000', align = 'center') {
    ctx.font = `700 ${size}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = align;
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(3, size / 6);
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  // HUD no layout do original: rótulos em Arial negrito preto no topo central
  // ("Pontos:", "Wavessons:", "Distância:") com os valores ao lado.
  // Melhorias: contorno branco pra ler em cima de guarda-sol, multiplicador,
  // nome da praia, escudos e a barra até a próxima vantagem.
  function hudText(text, x, y, { bold = false, size = 32, align = 'left', color = '#000' } = {}) {
    ctx.font = `${bold ? 700 : 400} ${size}px Arial, Helvetica, sans-serif`;
    ctx.textAlign = align;
    ctx.lineJoin = 'round';
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeText(text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
  }

  function drawHud(run, best) {
    const LX = 878, VX = 928; // colunas do layout Track de 2017
    hudText('Pontos:', LX, 80, { bold: true, align: 'right' });
    hudText(Math.floor(run.score).toLocaleString('pt-BR'), VX, 80);
    hudText('Wavessons:', LX, 130, { bold: true, align: 'right' });
    hudText(String(run.crew.length), VX, 130);
    const crewW = ctx.measureText(String(run.crew.length)).width;
    hudText(`×${run.crewMult.toFixed(2).replace('.', ',')}`, VX + crewW + 14, 130, { size: 22, color: '#3a3d9b' });
    hudText('Distância:', LX, 180, { bold: true, align: 'right' });
    hudText(`${Math.floor(run.meters)} m`, VX, 180);
    const distW = ctx.measureText(`${Math.floor(run.meters)} m`).width;
    hudText(run.biome.name, VX + distW + 14, 180, { size: 22, color: '#3a3d9b' });

    // barra fina até a próxima vantagem, logo abaixo
    const prevAt = run.nextPerkAt - run.perkStep;
    const p = Math.max(0, Math.min(1, (run.meters - prevAt) / (run.nextPerkAt - prevAt)));
    const bx = 678, bw = 420, by = 198;
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(bx - 2, by - 2, bw + 4, 10);
    ctx.fillStyle = '#000';
    ctx.fillRect(bx, by, bw * p, 6);
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(bx, by, bw, 6);

    const shields = run.mods.shields;
    if (shields) hudText(`Escudos: ${'◆'.repeat(Math.min(shields, 8))}${shields > 8 ? '+' : ''}`, VX, 232, { size: 22, color: '#1565c0' });
    if (best > 0) hudText(`Recorde: ${Math.floor(best).toLocaleString('pt-BR')}`, VIEW_W - 24, 40, { size: 22, align: 'right', color: '#444' });
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
    const dpr = canvas.width / window.innerWidth;
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
