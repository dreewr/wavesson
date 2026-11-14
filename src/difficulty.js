// Curva de dificuldade em função da distância percorrida (metros).
// Tudo aqui é puro: fácil de testar e de calibrar.

export const TIER_LENGTH = 150; // metros por "nível"

// Quanto cada tipo de fileira "custa" do orçamento de ameaça. Coisas boas são de graça.
export const PATTERN_COST = {
  loot: 0,
  recruit: 0,
  castles: 0.8,
  solids: 1,
  vendor: 1,
  banhista: 1.5,
  dog: 2,
  lifeguard: 2.5,
  surfer: 2.5,
  police: 3.5,
  combo: 3.5,
  squad: 4,
};

// Ritmo em serra: a tensão sobe ao longo de cada praia (400 m) e despenca na
// troca, onde vem a Hora do Arrastão (alívio). 0,8 → 1,25.
export const SAW_LENGTH = 400;
export function intensityAt(meters) {
  const phase = (Math.max(0, meters) % SAW_LENGTH) / SAW_LENGTH;
  return 0.8 + 0.45 * phase;
}

const lerp = (a, b, t) => a + (b - a) * t;
const sat = (x) => Math.max(0, Math.min(1, x));

export function difficultyAt(meters) {
  const m = Math.max(0, meters);
  const tier = Math.floor(m / TIER_LENGTH);
  // 0 → 1 ao longo de ~1500 m, depois continua subindo devagar (infinito).
  const ramp = sat(m / 1500);
  const late = Math.max(0, m - 1500) / 1000;

  const intensity = intensityAt(m);
  return {
    tier,
    intensity,
    // orçamento de ameaça ganho a cada fileira (gasto pelos padrões; ver PATTERN_COST)
    threatPerRow: (lerp(1.1, 3.0, ramp) + late * 0.4) * intensity,
    threatCap: lerp(4, 9, ramp) + late,
    scrollSpeed: Math.min(560, lerp(170, 430, ramp) + late * 40),
    // distância vertical entre "fileiras" de conteúdo
    rowGap: Math.max(140, lerp(300, 170, ramp) - late * 10),
    // largura mínima da passagem garantida entre sólidos
    gapWidth: Math.max(150, lerp(260, 175, ramp)),
    dogSpeed: lerp(1.6, 3.4, ramp) + late * 0.3, // rad/s da oscilação
    dogAmp: lerp(140, 380, ramp),
    lifeguardChase: tier >= 4 ? Math.min(160, 60 + (tier - 4) * 15) : 0,
    vendorSpeed: lerp(240, 420, ramp),
    surferSpeed: lerp(280, 520, ramp) + late * 30,
    surferZigzag: tier >= 5,
    squadSpeed: lerp(380, 640, ramp) + late * 30, // px/s subindo, além da rolagem
    squadWarn: Math.max(1.1, lerp(2.0, 1.2, ramp)), // segundos de aviso na borda de baixo
    policeSpeed: lerp(800, 1150, ramp),
    policeWarn: Math.max(0.8, lerp(1.6, 0.9, ramp)), // segundos de aviso
    tideEvery: tier >= 3 ? Math.max(9, 26 - (tier - 3) * 2) : Infinity, // s
    tideReach: Math.min(520, 260 + tier * 25), // px que a água avança
    weights: {
      solids: 3,
      loot: lerp(3, 2, ramp),
      recruit: 1.4,
      castles: lerp(1.5, 2, ramp),
      dog: lerp(1.2, 3, ramp),
      vendor: tier >= 1 ? lerp(0.6, 1.4, ramp) : 0,
      lifeguard: tier >= 1 ? lerp(0.6, 1.8, ramp) : 0,
      banhista: lerp(0.7, 1.4, ramp),
      surfer: tier >= 1 ? lerp(0.6, 1.6, ramp) : 0,
      squad: tier >= 1 ? lerp(0.6, 1.5, ramp) + late * 0.3 : 0,
      police: tier >= 2 ? lerp(0.5, 1.6, ramp) + late * 0.3 : 0,
      combo: tier >= 3 ? lerp(0.4, 2, ramp) + late * 0.5 : 0,
    },
  };
}
