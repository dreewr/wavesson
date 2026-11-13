// Catálogo de tudo que aparece na praia: tamanho de desenho, caixa de colisão
// e papel no jogo. Substitui os ~60 objetos duplicados do projeto Construct.
//
// role:
//   solid   – bloqueia (empurra integrantes; quem fica pra trás da câmera morre)
//   deadly  – encostou, perdeu o integrante
//   slow    – atrasa quem pisa e some
//   loot    – pontos
//   recruit – vira integrante novo
//   decor   – só enfeite

export const DEFS = {
  umbrella: { w: 200, h: 160, role: 'solid', hit: { ox: 45, oy: 112, w: 110, h: 40 }, sprites: ['umbrella1', 'umbrella2', 'umbrella3'] },
  net: { w: 340, h: 160, role: 'solid', hit: { ox: 0, oy: 118, w: 340, h: 38 }, sprites: ['net'] },
  palm: { w: 130, h: 148, role: 'solid', hit: { ox: 25, oy: 104, w: 80, h: 40 }, sprites: ['palm'] },
  vendor: { w: 96, h: 128, role: 'solid', hit: { ox: 14, oy: 70, w: 68, h: 56 }, sprites: ['vendor_0', 'vendor_1'] },
  castle: { w: 54, h: 80, role: 'slow', hit: { ox: 4, oy: 30, w: 46, h: 48 }, sprites: ['castle'] },
  dog: { w: 90, h: 72, role: 'deadly', hit: { ox: 14, oy: 18, w: 62, h: 48 }, sprites: ['dog_0', 'dog_1'] },
  lifeguard: { w: 50, h: 100, role: 'deadly', hit: { ox: 8, oy: 20, w: 34, h: 76 }, sprites: ['lifeguard'] },
  police: { w: 220, h: 100, role: 'deadly', hit: { ox: 8, oy: 10, w: 204, h: 84 }, sprites: [] },
  recruit: { w: 34, h: 100, role: 'recruit', hit: { ox: 0, oy: 10, w: 34, h: 90 }, sprites: [] },
  flipflop: { w: 40, h: 50, role: 'loot', hit: { ox: 0, oy: 0, w: 40, h: 50 }, sprites: ['flipflop_0', 'flipflop_1'], points: 10 },
  phone: { w: 25, h: 45, role: 'loot', hit: { ox: -6, oy: -4, w: 37, h: 53 }, sprites: ['phone_0', 'phone_1'], points: 100 },
  bag: { w: 60, h: 60, role: 'loot', hit: { ox: 0, oy: 0, w: 60, h: 60 }, sprites: ['bag_0', 'bag_1'], points: 200 },
  towel: { w: 200, h: 100, role: 'decor', hit: null, sprites: ['towel1', 'towel2', 'towel3'] },
};

export const CREW_SKINS = ['crew1', 'crew2', 'crew3', 'crew4', 'crew5'];
