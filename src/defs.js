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

// ESCALA: o integrante do bando é a régua — 100 unidades de altura ≈ 1,75 m,
// ou seja ~57 unidades por metro. Tudo foi dimensionado por ela (com um pouco
// de exagero nos itens pra serem legíveis; a área de coleta deles é maior que o
// desenho, então continua fácil pegar).
//
//   pessoa 1,75 m → 100      cachorro ~0,6 m de altura → 44      guarda-sol Ø 2,4 m → 140
//   castelo ~0,8 m → 50      chinelo ~0,28 m → 30                 celular (exagerado) → 28
//   bolsa de praia ~0,6 m → 38   prancha 2 m → 115                deitada na toalha 1,9 m → 112
export const DEFS = {
  umbrella: { w: 140, h: 112, role: 'solid', hit: { ox: 31, oy: 78, w: 78, h: 30 }, sprites: ['umbrella1', 'umbrella2', 'umbrella3'] },
  net: { w: 272, h: 128, role: 'solid', hit: { ox: 0, oy: 94, w: 272, h: 30 }, sprites: ['net'] },
  palm: { w: 150, h: 170, role: 'solid', hit: { ox: 45, oy: 128, w: 60, h: 36 }, sprites: ['palm'] },
  vendor: { w: 96, h: 128, role: 'solid', hit: { ox: 14, oy: 70, w: 68, h: 56 }, sprites: ['vendor_0', 'vendor_1'] },
  castle: { w: 34, h: 50, role: 'slow', hit: { ox: 1, oy: 18, w: 32, h: 30 }, sprites: ['castle'] },
  // vira-lata caramelo em pixel art (desenhado em render.js, 32x22 pixels)
  dog: { w: 64, h: 44, role: 'deadly', hit: { ox: 8, oy: 10, w: 50, h: 32 }, sprites: [] },
  lifeguard: { w: 50, h: 100, role: 'deadly', hit: { ox: 8, oy: 20, w: 34, h: 76 }, sprites: ['lifeguard'] },
  // Surfista Desatento: estava na página de inimigos de 2017 mas nunca foi feito.
  // Sai do mar com a prancha debaixo do braço e atravessa a praia sem olhar.
  surfer: { w: 118, h: 104, role: 'deadly', hit: { ox: 4, oy: 46, w: 110, h: 54 }, sprites: [] },
  // Pelotão de bombeiros (guarda-vidas de sunga) subindo a praia correndo.
  // A run expande o 'squad' em vários 'bombeiro', todos presos à mesma formação.
  bombeiro: { w: 44, h: 100, role: 'deadly', hit: { ox: 9, oy: 14, w: 26, h: 82 }, sprites: [] },
  squad: { w: 0, h: 0, role: 'event', hit: null, sprites: [] },
  police: { w: 220, h: 100, role: 'deadly', hit: { ox: 8, oy: 10, w: 204, h: 84 }, sprites: [] },
  recruit: { w: 34, h: 100, role: 'recruit', hit: { ox: 0, oy: 10, w: 34, h: 90 }, sprites: [] },
  flipflop: { w: 24, h: 30, role: 'loot', hit: { ox: -10, oy: -10, w: 44, h: 50 }, sprites: ['flipflop_0', 'flipflop_1'], points: 10 },
  phone: { w: 16, h: 28, role: 'loot', hit: { ox: -14, oy: -12, w: 44, h: 52 }, sprites: ['phone_0', 'phone_1'], points: 100 },
  bag: { w: 38, h: 38, role: 'loot', hit: { ox: -8, oy: -8, w: 54, h: 54 }, sprites: ['bag_0', 'bag_1'], points: 200 },
  // Banhista deitada na toalha: não machuca, mas quem passa perto fica apaixonado
  // (perde o controle por um tempo e é puxado pra ela). O pique desperta.
  banhista: { w: 112, h: 50, role: 'charm', hit: null, aura: 90, sprites: [] },
  towel: { w: 120, h: 60, role: 'decor', hit: null, sprites: ['towel1', 'towel2', 'towel3'] },
};

export const CREW_SKINS = ['crew1', 'crew2', 'crew3', 'crew4', 'crew5'];
