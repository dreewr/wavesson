// Constantes do mundo. Coordenadas em pixels lógicos; y cresce para baixo
// (o arrastão "desce" a praia, como no original de 2017).

export const VIEW_W = 1600;
export const VIEW_H = 720;
export const PX_PER_METER = 100;

// Faixas horizontais da praia.
export const ZONE = {
  walkEnd: 250, // calçadão: 0..250
  sandStart: 270,
  sandEnd: 1320,
  shallow: 1350, // a partir daqui: água rasa (atrasa)
  deep: 1470, // a partir daqui: correnteza (mata)
};

export const CREW = {
  startSize: 6,
  speed: 380, // px/s relativo à câmera
  w: 34,
  h: 100,
  // caixa dos pés (colisão com sólidos) e do corpo (perigos/itens)
  feet: { ox: 4, oy: 74, w: 26, h: 24 },
  body: { ox: 5, oy: 10, w: 24, h: 86 },
  separation: 30,
  behindMargin: 40, // morre quando sai mais que isso por cima da tela
  invulnAfterShield: 1.2,
};

export const LOOT = {
  flipflop: { points: 10, w: 40, h: 50 },
  phone: { points: 100, w: 25, h: 45 },
  bag: { points: 200, w: 75, h: 75 },
};

export const CHUNK_H = 720;
export const FIRST_CHUNK_Y = VIEW_H; // primeira tela é segura

export const PERK_FIRST_AT = 120; // metros
export const PERK_STEP = 140; // intervalo cresce a cada escolha
export const PERK_STEP_GROWTH = 30;

export const BIOMES = [
  // areia mais quente e menos "limão" que a de 2017; cada praia um tom
  { name: 'Copacabana', walk: 'walk_copacabana', sand: '#e9cf6b' },
  { name: 'Ipanema', walk: 'walk_ipanema', sand: '#edd57e' },
  { name: 'Leblon', walk: 'walk_ipanema', sand: '#f0d98f' },
  { name: 'Barra', walk: 'walk_copacabana', sand: '#f3dea0' },
];
export const BIOME_LENGTH = 400; // metros
