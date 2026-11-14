// Escolhe o enquadramento pelo formato da tela: em pé → layout vertical
// (praia estreita e alta), deitado → layout horizontal original de 2017.
// Os menus também têm as duas versões (classe `portrait` no <html>).

import { makeLayout } from './layout.js';

export function isPortrait() {
  return innerHeight > innerWidth * 1.1;
}

export function viewport() {
  return { w: innerWidth, h: innerHeight };
}

// Layout pra uma run nova, já com a altura certa pra tela atual.
export function layoutForScreen() {
  return isPortrait() ? makeLayout('portrait', (720 * innerHeight) / innerWidth) : makeLayout('landscape');
}

// tamanho do palco dos menus em cada orientação
export function stageSize() {
  return isPortrait() ? { w: 720, h: 1280 } : { w: 1600, h: 720 };
}

export function applyOrientation() {
  document.documentElement.classList.toggle('portrait', isPortrait());
}

// Android: tela cheia pra esconder a barra do navegador. iOS ignora.
export async function tryFullscreen() {
  if (!matchMedia('(pointer: coarse)').matches) return;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  } catch {
    // sem suporte: segue normal
  }
}
