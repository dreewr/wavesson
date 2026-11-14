// Vira-lata caramelo em pixel art (32x22 pixels, de perfil, olhando pra direita).
// Desenhado pixel a pixel; 4 quadros = 2 posições de pata (trote) x 2 de rabo.
//   c caramelo  l caramelo claro  d marrom  k preto  w brilho do olho
//   r coleira   p língua

export const DOG_COLORS = {
  c: '#c68642',
  l: '#e0ac69',
  d: '#8d5524',
  k: '#1b1b2a',
  w: '#ffffff',
  r: '#d32f2f',
  p: '#ff6f91',
};

const BODY = [
  '.......................ccc......',
  '.....................dccccc.....',
  '....................ddcccccc....',
  '....................ddcccccccc..',
  '....................ddccccwkcc..',
  '....................ddcccccclllk',
  '.....................dcccccllllk',
  '.....................ccccclllll.',
  '....ccccccccccccccrrrcccclpp....',
  '....cccccccccccccccrrrcccc.pp...',
  '....ccccccccccccccccccllcc......',
  '....cccccccccccccccccclllc......',
  '....dccccccccccccccccclllc......',
  '....dcccclllllllllllcclll.......',
  '.....ccclllllllllllllccl........',
];

// rabo: pontos (x, y, cor) desenhados por cima do corpo
const TAILS = [
  [[3, 7, 'c'], [2, 6, 'c'], [2, 5, 'c'], [1, 4, 'd'], [1, 3, 'd'], [3, 8, 'c']],
  [[3, 8, 'c'], [3, 7, 'c'], [2, 7, 'c'], [1, 6, 'c'], [0, 6, 'd'], [0, 5, 'd']],
];

const LEGS = [
  [
    '.....cc..cc.......cc..cc........',
    '....cc....cc.....cc....cc.......',
    '....cc....cc.....cc....cc.......',
    '...cc......cc...cc......cc......',
    '...kk......kk...kk......kk......',
  ],
  [
    '......cccc.........cccc.........',
    '......cc.cc........cc.cc........',
    '......cc.cc........cc.cc........',
    '......cc.cc........cc.cc........',
    '......kk.kk........kk.kk........',
  ],
];

export const DOG_W = 32;
export const DOG_H = 22;

// devolve as linhas do quadro (legs 0/1, tail 0/1), 32 colunas cada
export function dogFrame(legs, tail) {
  const rows = BODY.map((r) => r.padEnd(DOG_W, '.').split(''));
  for (const [x, y, ch] of TAILS[tail]) rows[y][x] = ch;
  for (const r of LEGS[legs]) rows.push(r.padEnd(DOG_W, '.').split(''));
  while (rows.length < DOG_H) rows.push('.'.repeat(DOG_W).split(''));
  return rows.map((r) => r.slice(0, DOG_W).join(''));
}
