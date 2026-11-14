// Bestiário: o texto de cada elemento da praia. É a fonte da doc pública
// (docs/JOGABILIDADE.md, gerada por tools/gen-docs.mjs). Números (distância de
// liberação, custo, velocidades) NÃO ficam aqui: a doc lê direto do código.

export const CATEGORIES = [
  ['deadly', 'Perigos — encostou, perdeu um integrante'],
  ['solid', 'Obstáculos — bloqueiam e empurram (quem fica pra trás da tela roda)'],
  ['hinder', 'Atrapalham — não derrubam, mas te seguram'],
  ['good', 'Coisas boas'],
  ['event', 'Eventos da praia'],
];

export const CATALOG = [
  // ---------------------------------------------------------------- perigos
  { id: 'dog', cat: 'deadly', name: 'Cachorro Nervoso (vira-lata caramelo)', since: '2017 · redesenhado em 2026', pattern: 'dog',
    does: 'Um caramelo de coleira vermelha que trota de um lado pro outro numa faixa da areia, cada vez mais rápido e mais largo.',
    counter: 'Espere ele virar e passe atrás. O vaivém encolhe na praia estreita (celular em pé).' },
  { id: 'lifeguard', cat: 'deadly', name: 'Salva-Vidas', since: 2017, pattern: 'lifeguard',
    does: 'Fica parado de guarda, às vezes com uma bolsa do lado de isca. Mais longe, passa a perseguir o bando devagar.',
    counter: 'Dê a volta larga. Quando ele começar a perseguir, não pare perto.' },
  { id: 'surfer', cat: 'deadly', name: 'Surfista Desatento', since: '2017 (no papel) · 2026 (no jogo)', pattern: 'surfer',
    does: 'Sai do mar, para um instante ajeitando a prancha ("!" vermelho) e atravessa a praia inteira sem olhar, passando por cima de tudo.',
    counter: 'Ao ver o "!", saia da linha dele. Mais longe ele vem em zigue-zague e em dupla.' },
  { id: 'squad', cat: 'deadly', name: 'Pelotão de Bombeiros', since: 2026, pattern: 'squad',
    does: 'Bombeiros guarda-vidas de sunga sobem a praia correndo, de baixo pra cima: em coluna, em "V" ou num paredão com um buraco.',
    counter: 'O aviso na borda de baixo pinta exatamente as faixas por onde eles vão passar — o buraco do paredão fica limpo. Passar sem perder ninguém dá bônus ("passou liso!").' },
  { id: 'police', cat: 'deadly', name: 'Viatura', since: 2026, pattern: 'police',
    does: 'Cruza a praia de lado a lado em alta velocidade. Uma faixa piscando e a sirene avisam antes.',
    counter: 'Saia da faixa que pisca. O aviso fica mais curto mais longe.' },
  { id: 'sea', cat: 'deadly', name: 'Água funda (correnteza)', since: 2026,
    does: 'Passou da beira, a correnteza leva. Na água rasa você só fica lento.',
    counter: 'Fique na areia. A vantagem "Fôlego de Surfista" joga de volta em vez de levar.' },

  // ---------------------------------------------------------------- obstáculos
  { id: 'umbrella', cat: 'solid', name: 'Guarda-sol', since: 2017, pattern: 'solids',
    does: 'Bloqueia. Fileiras de sólidos sempre deixam ao menos uma passagem.',
    counter: 'Procure a passagem cedo; a rolagem empurra quem fica preso.' },
  { id: 'net', cat: 'solid', name: 'Rede de Vôlei', since: 2017, pattern: 'solids',
    does: 'Bloqueia uma faixa larga.', counter: 'Contorne pelas pontas.' },
  { id: 'palm', cat: 'solid', name: 'Coqueiro', since: 2017, pattern: 'solids',
    does: 'Bloqueia o calçadão (pra ele não virar caminho livre).', counter: 'Desça pra areia.' },
  { id: 'vendor', cat: 'solid', name: 'Carro de Picolé', since: 2017, pattern: 'vendor',
    does: 'Sobe a praia na contramão e vai empurrando quem estiver na frente.',
    counter: 'Saia da frente — ser empurrado pra fora da tela por ele é um jeito comum de rodar.' },

  // ---------------------------------------------------------------- atrapalham
  { id: 'castle', cat: 'hinder', name: 'Castelo de Areia', since: 2017, pattern: 'castles',
    does: 'Pisou, desmancha e o integrante fica lento por um tempo. Costuma ter recompensa atrás.',
    counter: 'Vale a pena se o resto do bando estiver folgado. "Chinelo de Borracha" anula.' },
  { id: 'banhista', cat: 'hinder', name: 'Banhista', since: 2026, pattern: 'banhista',
    does: 'Deitada na toalha. Quem passa no raio dela (círculo rosa) fica apaixonado: corações, quase sem controle, é puxado pra ela e vai ficando pra trás.',
    counter: 'Passe longe — ou use o PIQUE, que desperta todo mundo na hora. Morrer apaixonado aparece como "Ficou apaixonado".' },

  // ---------------------------------------------------------------- coisas boas
  { id: 'flipflop', cat: 'good', name: 'Chinelo', since: 2017, pattern: 'loot', does: 'Pontos.', counter: '' },
  { id: 'phone', cat: 'good', name: 'Celular', since: 2017, pattern: 'loot', does: 'Pontos.', counter: '' },
  { id: 'bag', cat: 'good', name: 'Bolsa', since: 2017, pattern: 'loot', does: 'Pontos — muitas vezes de isca perto de perigo.', counter: '' },
  { id: 'recruit', cat: 'good', name: 'Galera com "!"', since: 2017, pattern: 'recruit',
    does: 'Encostou, entra pro bando. Bando maior multiplica os pontos. Quando o bando está pequeno aparece mais gente.',
    counter: '' },

  // ---------------------------------------------------------------- eventos
  { id: 'tide', cat: 'event', name: 'Onda', since: 2026,
    does: '"ONDA VINDO!": a água avança sobre a areia por alguns segundos e volta.',
    counter: 'Afaste-se da beira assim que aparecer o aviso.' },
  { id: 'rush', cat: 'event', name: 'Hora do Arrastão', since: 2026,
    does: 'Ao chegar numa praia nova: alguns segundos de fartura (muito item, pouco perigo) e pontos em dobro. É o "respiro" da curva em serra.',
    counter: 'Aproveite pra encher o combo.' },
];
