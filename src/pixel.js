// Arte unificada: tudo que é "mundo" passa pela mesma máquina de pixel art.
//
//   1. desenhado em baixa resolução (1 pixel = PIXEL unidades do mundo) e
//      ampliado sem suavizar → mesmo tamanho de pixel pra tudo;
//   2. personagens/objetos ganham contorno escuro de 1 pixel;
//   3. cores presas a uma paleta única de praia, com pontilhado ordenado
//      (Bayer 4x4) nas transições.
//
// Assim os sprites de 2017, os guarda-sóis vetoriais, o calçadão fotográfico e
// os bonecos desenhados em código ficam com a mesma cara. A interface (bilhete,
// letra manuscrita) fica de fora de propósito: mundo em pixel, UI em papel.

export const PIXEL = 2; // unidades do mundo por pixel da arte

export const PALETTE = [
  // tinta / sombras
  '#1b1b2a', '#3a2f2a', '#4a4a52', '#8a8a8a', '#d8d2c2', '#ffffff',
  // areia (inclui os tons das 4 praias) e areia molhada
  '#e9cf6b', '#edd57e', '#f0d98f', '#f3dea0', '#d9b85a', '#c49a45', '#a8803a', '#7a5a2a',
  // mar
  '#10298f', '#1738bd', '#3a6fd8', '#6fa8ff', '#c8e4ff', '#b8c060',
  // peles
  '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#5a3519',
  // quentes
  '#d32f2f', '#ff6f91', '#e91e63', '#ef6c00', '#ffd54f', '#fff176',
  // frios / verdes
  '#43a047', '#1b5e20', '#00bcd4', '#8e24aa', '#3a3d9b',
];

export const OUTLINE = '#1b1b2a';

const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const RGB = PALETTE.map(hex);
// little-endian: ABGR em Uint32
const pack = ([r, g, b], a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
const PACKED = Uint32Array.from(RGB.map((c) => pack(c)));
const OUTLINE_PACKED = pack(hex(OUTLINE));

// tabela 32x32x32 → índice da cor mais próxima (distância "redmean", barata e boa pro olho)
const LUT = (() => {
  const lut = new Uint8Array(32 * 32 * 32);
  for (let r = 0; r < 32; r++) {
    for (let g = 0; g < 32; g++) {
      for (let b = 0; b < 32; b++) {
        const R = r * 8 + 4, G = g * 8 + 4, B = b * 8 + 4;
        let best = 0, bd = Infinity;
        for (let i = 0; i < RGB.length; i++) {
          const [pr, pg, pb] = RGB[i];
          const rm = (R + pr) / 2;
          const dr = R - pr, dg = G - pg, db = B - pb;
          const d = (2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db;
          if (d < bd) { bd = d; best = i; }
        }
        lut[(r << 10) | (g << 5) | b] = best;
      }
    }
  }
  return lut;
})();

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v - 7.5) * 1.6);

// Prende cada pixel à paleta, com pontilhado. Pixels transparentes ficam como estão.
export function quantize(img) {
  const { width: w, height: h } = img;
  const px = new Uint32Array(img.data.buffer);
  for (let y = 0; y < h; y++) {
    const row = y * w, by = (y & 3) << 2;
    for (let x = 0; x < w; x++) {
      const i = row + x;
      const c = px[i];
      const a = c >>> 24;
      if (a < 8) continue;
      const d = BAYER[by | (x & 3)];
      let r = (c & 255) + d, g = ((c >>> 8) & 255) + d, b = ((c >>> 16) & 255) + d;
      r = r < 0 ? 0 : r > 255 ? 255 : r;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      b = b < 0 ? 0 : b > 255 ? 255 : b;
      px[i] = (PACKED[LUT[((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)]] & 0x00ffffff) | (a << 24);
    }
  }
  return img;
}

// Bordas duras (sem semitransparência) + contorno de 1 pixel em volta do que é opaco.
export function outline(img, color = OUTLINE_PACKED) {
  const { width: w, height: h } = img;
  const px = new Uint32Array(img.data.buffer);
  const solid = new Uint8Array(w * h);
  for (let i = 0; i < px.length; i++) {
    const a = px[i] >>> 24;
    if (a >= 110) { solid[i] = 1; px[i] = (px[i] | 0xff000000) >>> 0; } else px[i] = 0;
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (solid[i]) continue;
      if ((x > 0 && solid[i - 1]) || (x < w - 1 && solid[i + 1]) || (y > 0 && solid[i - w]) || (y < h - 1 && solid[i + w])) px[i] = color;
    }
  }
  return img;
}

// Converte uma imagem inteira pra pixel art (usado no menu, uma vez só).
export function pixelateImage(img, { scale = 1 / PIXEL, withOutline = false } = {}) {
  const w = Math.max(1, Math.round(img.naturalWidth * scale));
  const h = Math.max(1, Math.round(img.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, w, h);
  const data = g.getImageData(0, 0, w, h);
  if (withOutline) outline(data);
  quantize(data);
  g.putImageData(data, 0, 0);
  return c;
}
