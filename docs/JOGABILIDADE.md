# Wavesson — inimigos e jogabilidade

> **Gerado automaticamente** por `tools/gen-docs.mjs` a partir do código do jogo.
> Não edite à mão: mude o jogo (ou o texto em `src/catalog.js`) e rode `npm run docs`.
> Os testes falham se esta página ficar desatualizada.

## Como se joga

Você comanda o **bando inteiro** de uma vez, descendo uma praia infinita. A praia rola sozinha;
quem fica pra trás da tela (ou é empurrado pra fora dela) **roda**. Pegue itens, recrute a galera,
desvie dos perigos. Acabou o bando, acabou a partida.

| Ação | Teclado | Celular |
|---|---|---|
| Mover o bando | WASD / setas | arrastar o dedo |
| Pique (arrancada) | Espaço / Shift | botão PIQUE |
| Pausa | P / Esc | botão II |
| Som | M | — |
| Escolher vantagem | 1 2 3 | tocar no cartão |

**Pique:** arrancada de 0,24 s a 3,4× a velocidade, com 3,2 s de recarga. Durante o pique nada derruba o bando (só ficar pra trás) e ele desperta quem estiver apaixonado. Sem direção, ele arranca pra frente.

**Perigo de ficar pra trás:** quando alguém chega a 70px do topo, a borda de cima fica vermelha e aparece um "!" piscando nele.

## Bestiário

"Libera em" é a distância a partir da qual o elemento pode aparecer. "Custo" é quanto ele gasta do
orçamento de ameaça da praia (ver *Como a dificuldade sobe*).

### Perigos — encostou, perdeu um integrante

| | Libera em | Custo | O que faz | Como lidar | Desde |
|---|---|---|---|---|---|
| **Cachorro Nervoso** | 0 m | 2 | Corre de um lado pro outro numa faixa da areia, cada vez mais rápido e mais largo. | Espere ele virar e passe atrás. O vaivém encolhe na praia estreita (celular em pé). | 2017 |
| **Salva-Vidas** | 150 m | 2,5 | Fica parado de guarda, às vezes com uma bolsa do lado de isca. Mais longe, passa a perseguir o bando devagar. | Dê a volta larga. Quando ele começar a perseguir, não pare perto. | 2017 |
| **Surfista Desatento** | 150 m | 2,5 | Sai do mar, para um instante ajeitando a prancha ("!" vermelho) e atravessa a praia inteira sem olhar, passando por cima de tudo. | Ao ver o "!", saia da linha dele. Mais longe ele vem em zigue-zague e em dupla. | 2017 (no papel) · 2026 (no jogo) |
| **Pelotão de Bombeiros** | 150 m | 4 | Bombeiros guarda-vidas de sunga sobem a praia correndo, de baixo pra cima: em coluna, em "V" ou num paredão com um buraco. | O aviso na borda de baixo pinta exatamente as faixas por onde eles vão passar — o buraco do paredão fica limpo. Passar sem perder ninguém dá bônus ("passou liso!"). | 2026 |
| **Viatura** | 300 m | 3,5 | Cruza a praia de lado a lado em alta velocidade. Uma faixa piscando e a sirene avisam antes. | Saia da faixa que pisca. O aviso fica mais curto mais longe. | 2026 |
| **Água funda (correnteza)** | 0 m | — | Passou da beira, a correnteza leva. Na água rasa você só fica lento. | Fique na areia. A vantagem "Fôlego de Surfista" joga de volta em vez de levar. | 2026 |

### Obstáculos — bloqueiam e empurram (quem fica pra trás da tela roda)

| | Libera em | Custo | O que faz | Como lidar | Desde |
|---|---|---|---|---|---|
| **Guarda-sol** | 0 m | 1 | Bloqueia. Fileiras de sólidos sempre deixam ao menos uma passagem. | Procure a passagem cedo; a rolagem empurra quem fica preso. | 2017 |
| **Rede de Vôlei** | 0 m | 1 | Bloqueia uma faixa larga. | Contorne pelas pontas. | 2017 |
| **Coqueiro** | 0 m | 1 | Bloqueia o calçadão (pra ele não virar caminho livre). | Desça pra areia. | 2017 |
| **Carro de Picolé** | 150 m | 1 | Sobe a praia na contramão e vai empurrando quem estiver na frente. | Saia da frente — ser empurrado pra fora da tela por ele é um jeito comum de rodar. | 2017 |

### Atrapalham — não derrubam, mas te seguram

| | Libera em | Custo | O que faz | Como lidar | Desde |
|---|---|---|---|---|---|
| **Castelo de Areia** | 0 m | 0,8 | Pisou, desmancha e o integrante fica lento por um tempo. Costuma ter recompensa atrás. | Vale a pena se o resto do bando estiver folgado. "Chinelo de Borracha" anula. | 2017 |
| **Banhista** | 0 m | 1,5 | Deitada na toalha. Quem passa no raio dela (círculo rosa) fica apaixonado: corações, quase sem controle, é puxado pra ela e vai ficando pra trás. | Passe longe — ou use o PIQUE, que desperta todo mundo na hora. Morrer apaixonado aparece como "Ficou apaixonado". | 2026 |

### Coisas boas

| | Libera em | Custo | O que faz | Como lidar | Desde |
|---|---|---|---|---|---|
| **Chinelo** | 0 m | 0 | Pontos. **10 pts.** | — | 2017 |
| **Celular** | 0 m | 0 | Pontos. **100 pts.** | — | 2017 |
| **Bolsa** | 0 m | 0 | Pontos — muitas vezes de isca perto de perigo. **200 pts.** | — | 2017 |
| **Galera com "!"** | 0 m | 0 | Encostou, entra pro bando. Bando maior multiplica os pontos. Quando o bando está pequeno aparece mais gente. | — | 2017 |

### Eventos da praia

| | Libera em | Custo | O que faz | Como lidar | Desde |
|---|---|---|---|---|---|
| **Onda** | 450 m | — | "ONDA VINDO!": a água avança sobre a areia por alguns segundos e volta. | Afaste-se da beira assim que aparecer o aviso. | 2026 |
| **Hora do Arrastão** | 400 m | — | Ao chegar numa praia nova: alguns segundos de fartura (muito item, pouco perigo) e pontos em dobro. É o "respiro" da curva em serra. | Aproveite pra encher o combo. | 2026 |

## Pontuação

- 1 ponto por metro, mais os itens (chinelo, celular, bolsa).
- **Tamanho do bando:** cada integrante além do primeiro soma +8% em tudo que você pega.
- **Combo:** itens pegos em menos de 2,2 s um do outro somam +10% cada, até ×3.
- **Hora do Arrastão:** 9 s de pontos ×2 ao chegar numa praia nova.
- **Passou liso:** atravessar um pelotão de bombeiros sem perder ninguém dá bônus.
- Vantagem **Mão Leve** multiplica tudo.

## Vantagens (roguelike)

A primeira escolha vem aos 120 m; depois a cada 140 m, e o intervalo cresce 30 m a cada escolha. Sempre 3 opções sorteadas.

| Vantagem | Efeito | Máx. |
|---|---|---|
| **Pé de Pano** | +12% de velocidade do bonde. | 5 |
| **Olho Grande** | Itens próximos vêm sozinhos até o bonde. | 4 |
| **Jogo de Cintura** | +2 escudos: cada um livra um integrante de rodar. | ∞ |
| **Chama a Galera** | +3 integrantes agora. | ∞ |
| **Mão Leve** | +30% de pontos em tudo que pegar. | 5 |
| **Chinelo de Borracha** | Castelo de areia e água rasa não atrasam mais. | 1 |
| **Petisco no Bolso** | Cachorros 30% mais lentos. | 2 |
| **Fôlego de Surfista** | A correnteza joga de volta na areia em vez de levar. | 1 |
| **Fôlego de Maratonista** | O pique recarrega 30% mais rápido. | 2 |
| **Olheiro** | Avisos de polícia e onda chegam antes; mais gente pra recrutar. | 2 |

## Como a dificuldade sobe

Tudo é função da distância (`src/difficulty.js`). Sobe forte até ~1.500 m e depois continua subindo devagar, pra sempre. A cada 150 m muda o "nível", que libera coisas novas.

Três mecanismos trabalham juntos:

1. **Curva por distância** — velocidade, espaçamento, avisos e inimigos mudam com os metros (tabela abaixo).
2. **Orçamento de ameaça** — a cada fileira a praia ganha pontos de ameaça e só pode "comprar" o que tem.
   Isso evita sequências impossíveis e deixa a densidade de perigo previsível.
3. **Ritmo em serra** — a intensidade sobe ao longo de cada praia (400 m, de 0,8× a 1,25×) e despenca na troca,
   onde vem a Hora do Arrastão. Tensão → alívio → tensão maior.

| Metros | Rolagem (px/s) | Fileiras a cada (px) | Passagem mín. (px) | Ameaça/fileira | Intensidade | Aviso viatura | Aviso bombeiros | Onda a cada |
|---|---|---|---|---|---|---|---|---|
| 0 | 170 | 300 | 260 | 0,88 | 0,8× | 1,6 s | 2 s | — |
| 150 | 196 | 287 | 252 | 1,25 | 0,97× | 1,53 s | 1,92 s | — |
| 300 | 222 | 274 | 243 | 1,68 | 1,14× | 1,46 s | 1,84 s | — |
| 450 | 248 | 261 | 235 | 1,43 | 0,86× | 1,39 s | 1,76 s | 26 s |
| 600 | 274 | 248 | 226 | 1,91 | 1,03× | 1,32 s | 1,68 s | 24 s |
| 900 | 326 | 222 | 209 | 2,04 | 0,91× | 1,18 s | 1,52 s | 20 s |
| 1.200 | 378 | 196 | 192 | 2,1 | 0,8× | 1,04 s | 1,36 s | 16 s |
| 1.500 | 430 | 170 | 175 | 3,41 | 1,14× | 0,9 s | 1,2 s | 12 s |
| 2.000 | 450 | 165 | 175 | 2,56 | 0,8× | 0,9 s | 1,2 s | 9 s |
| 3.000 | 490 | 155 | 175 | 3,69 | 1,03× | 0,9 s | 1,2 s | 9 s |

**Custo de cada tipo de fileira:**

`loot` 0 · `recruit` 0 · `castles` 0,8 · `solids` 1 · `vendor` 1 · `banhista` 1,5 · `dog` 2 · `lifeguard` 2,5 · `surfer` 2,5 · `police` 3,5 · `combo` 3,5 · `squad` 4

**Ajuda pra iniciante:** se a mediana das suas últimas partidas ficou abaixo de 80 m, a próxima começa com a praia a 82% da velocidade até 150 m. A partida aparece como "com ajuda".

**Apaixonado (banhista):** 2,6 s com 25% do controle, puxado a 150 px/s; depois 3 s de imunidade.

## Celular em pé × deitado

Com a tela em pé o jogo usa um layout próprio: a praia é mais estreita e você enxerga mais à frente.
Pra compensar, os números abaixo foram calibrados por simulação (bot jogando milhares de partidas).

| | Deitado / PC | Em pé |
|---|---|---|
| Mundo visível | 1600×720 | 720×altura da tela (~1560) |
| Areia jogável | 1050 px | 420 px |
| Velocidade da praia | 1× | 1,3× |
| Espaçamento das fileiras | 1× | 1,15× |
| Orçamento de ameaça | 1× | 2,4× |
| Alcance da onda | 1× | 0,42× |

## Praias

A cada 400 m muda a praia (e vem a Hora do Arrastão): Copacabana → Ipanema → Leblon → Barra → (volta pro começo, mais difícil).

O bando começa com 6 integrantes e anda a 380 px/s em relação à praia.
