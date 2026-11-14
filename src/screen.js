// Celular em pé: o jogo é horizontal (1600x720), então em tela de toque na
// vertical giramos tudo 90° dentro de #root e o jogo ocupa a tela inteira
// (é só virar o aparelho, mesmo com a rotação travada).

const portraitTouch = () =>
  matchMedia('(pointer: coarse)').matches && innerHeight > innerWidth;

let rotated = false;

export function isRotated() {
  return rotated;
}

// tamanho da área do jogo em px CSS, já considerando o giro
export function viewport() {
  return rotated ? { w: innerHeight, h: innerWidth } : { w: innerWidth, h: innerHeight };
}

// coordenadas de tela (clientX/Y) → coordenadas dentro de #root
export function toLocal(clientX, clientY) {
  return rotated ? { x: clientY, y: innerWidth - clientX } : { x: clientX, y: clientY };
}

export function applyOrientation() {
  rotated = portraitTouch();
  const root = document.getElementById('root');
  if (!root) return;
  const { w, h } = viewport();
  root.style.width = `${w}px`;
  root.style.height = `${h}px`;
  document.documentElement.classList.toggle('rotated', rotated);
}

// Android: tela cheia + trava na horizontal (aí nem precisa girar). iOS ignora.
export async function tryLandscapeFullscreen() {
  if (!matchMedia('(pointer: coarse)').matches) return;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
    await screen.orientation?.lock?.('landscape');
  } catch {
    // sem suporte: segue com o giro via CSS
  }
}
