// Carrega todas as imagens de assets/img numa tacada só.

const NAMES = [
  ...[1, 2, 3, 4, 5].flatMap((i) => [`crew${i}_0`, `crew${i}_1`]),
  'lifeguard', 'castle', 'net', 'palm', 'vendor_0', 'vendor_1',
  'umbrella1', 'umbrella2', 'umbrella3', 'towel1', 'towel2', 'towel3',
  'phone_0', 'phone_1', 'flipflop_0', 'flipflop_1', 'bag_0', 'bag_1',
  'walk_copacabana', 'walk_ipanema',
];

export async function loadImages(onProgress = () => {}) {
  const images = {};
  let done = 0;
  await Promise.all(
    NAMES.map(
      (name) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => { images[name] = img; onProgress(++done / NAMES.length); resolve(); };
          img.onerror = () => reject(new Error(`falha ao carregar ${name}`));
          img.src = `assets/img/${name}.png`;
        }),
    ),
  );
  return images;
}
