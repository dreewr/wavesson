// Perks roguelike: a cada marco de distância a run pausa e você escolhe 1 de 3.
// Cada perk mexe só em `mods` (ou dispara um efeito imediato via `onPick`).

export function baseMods() {
  return {
    speedMult: 1,
    magnet: 0, // raio de atração de itens (px)
    shields: 0, // cada um salva um integrante de uma morte
    scoreMult: 1,
    slowImmune: false,
    dogSlow: 1, // multiplicador da velocidade dos cães
    surfer: false, // correnteza empurra em vez de matar
    warnBonus: 0, // segundos extras de aviso (polícia/onda)
    recruitBoost: 1,
  };
}

export const PERKS = [
  { id: 'pe', name: 'Pé de Pano', desc: '+12% de velocidade do bonde.', max: 5, apply: (m) => { m.speedMult += 0.12; } },
  { id: 'ima', name: 'Olho Grande', desc: 'Itens próximos vêm sozinhos até o bonde.', max: 4, apply: (m) => { m.magnet += 70; } },
  { id: 'cintura', name: 'Jogo de Cintura', desc: '+2 escudos: cada um livra um integrante de rodar.', max: 99, apply: (m) => { m.shields += 2; } },
  { id: 'galera', name: 'Chama a Galera', desc: '+3 integrantes agora.', max: 99, onPick: (run) => run.recruitMany(3) },
  { id: 'mao', name: 'Mão Leve', desc: '+30% de pontos em tudo que pegar.', max: 5, apply: (m) => { m.scoreMult += 0.3; } },
  { id: 'chinelo', name: 'Chinelo de Borracha', desc: 'Castelo de areia e água rasa não atrasam mais.', max: 1, apply: (m) => { m.slowImmune = true; } },
  { id: 'petisco', name: 'Petisco no Bolso', desc: 'Cachorros 30% mais lentos.', max: 2, apply: (m) => { m.dogSlow *= 0.7; } },
  { id: 'surfista', name: 'Fôlego de Surfista', desc: 'A correnteza joga de volta na areia em vez de levar.', max: 1, apply: (m) => { m.surfer = true; } },
  { id: 'olheiro', name: 'Olheiro', desc: 'Avisos de polícia e onda chegam antes; mais gente pra recrutar.', max: 2, apply: (m) => { m.warnBonus += 0.6; m.recruitBoost += 0.8; } },
];

export function rollPerkChoices(rng, taken, n = 3) {
  const pool = PERKS.filter((p) => (taken[p.id] || 0) < p.max);
  const out = [];
  while (out.length < n && pool.length) {
    const i = Math.floor(rng.next() * pool.length);
    out.push(pool.splice(i, 1)[0]);
  }
  return out;
}
