// Dois jeitos de enquadrar a mesma praia:
//
//   landscape – o layout original de 2017: 1600x720, praia larga.
//   portrait  – celular em pé: 720 de largura e a altura que a tela der
//               (~1280–1600). A praia fica mais estreita e você enxerga mais à
//               frente, então a rolagem é um pouco mais rápida e as fileiras mais espaçadas
//               (calibrado por simulação pra ficar tão difícil quanto o horizontal).
//
// Tudo que depende de tamanho (geração, regras, desenho, HUD) lê daqui.

import { ZONE } from './config.js';

export function makeLayout(kind = 'landscape', height) {
  if (kind === 'portrait') {
    const zone = { walkEnd: 110, sandStart: 125, sandEnd: 545, shallow: 572, deep: 640 };
    return {
      kind,
      w: 720,
      h: Math.round(Math.min(1600, Math.max(1100, height || 1280))),
      zone,
      laneMin: 6,
      laneMax: zone.shallow - 24,
      tideScale: 0.42, // a onda avança proporcional à largura da areia
      speedMult: 1.3, // mais visão à frente → praia um pouco mais rápida
      rowGapMult: 0.9, // praia estreita, obstáculos em escala real: fileiras um pouco mais juntas
      threatMult: 2.4, // orçamento de ameaça por fileira (calibrado por simulação)
      start: { x: 250, y: 300 },
    };
  }
  return {
    kind: 'landscape',
    w: 1600,
    h: 720,
    zone: { ...ZONE },
    laneMin: 10,
    laneMax: ZONE.shallow - 30,
    tideScale: 1,
    speedMult: 1,
    rowGapMult: 1,
    threatMult: 1,
    start: { x: 720, y: 260 },
  };
}

export const LANDSCAPE = makeLayout('landscape');
