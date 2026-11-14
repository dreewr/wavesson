// Teclado (WASD / setas) + toque/mouse como joystick virtual
// (arraste a partir de onde encostou). Espaço/Shift ou o botão PIQUE = arrancada.

const KEYS = {
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
};

export function createInput(canvas, toWorldScale) {
  const down = new Set();
  let dashQueued = false;
  const stick = { active: false, ox: 0, oy: 0, x: 0, y: 0, id: null };

  addEventListener('keydown', (e) => {
    if (KEYS[e.code]) { down.add(e.code); e.preventDefault(); }
    // só durante o jogo (foco no body); em menus o Espaço continua apertando botão
    const free = e.target === document.body || e.target === canvas;
    if (free && (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') && !e.repeat) {
      dashQueued = true;
      e.preventDefault();
    }
  });
  addEventListener('keyup', (e) => down.delete(e.code));
  addEventListener('blur', () => down.clear());

  canvas.addEventListener('pointerdown', (e) => {
    stick.active = true;
    stick.id = e.pointerId;
    stick.ox = e.clientX;
    stick.oy = e.clientY;
    stick.x = stick.y = 0;
    try { canvas.setPointerCapture(e.pointerId); } catch {}
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!stick.active || e.pointerId !== stick.id) return;
    const radius = 70;
    const dx = e.clientX - stick.ox, dy = e.clientY - stick.oy;
    stick.x = Math.max(-1, Math.min(1, dx / radius));
    stick.y = Math.max(-1, Math.min(1, dy / radius));
  });
  const end = (e) => { if (e.pointerId === stick.id) { stick.active = false; stick.x = stick.y = 0; } };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  return {
    stick,
    queueDash() { dashQueued = true; },
    read() {
      let x = 0, y = 0;
      for (const code of down) { x += KEYS[code][0]; y += KEYS[code][1]; }
      x = Math.max(-1, Math.min(1, x + stick.x));
      y = Math.max(-1, Math.min(1, y + stick.y));
      const dash = dashQueued;
      dashQueued = false;
      return { x, y, dash };
    },
  };
}
