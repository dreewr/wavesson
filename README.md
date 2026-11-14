# Wavesson 🌊

**Wave + son**: a onda de gente, o arrastão no calçadão. Você controla o bonde inteiro de uma vez,
descendo a praia de Copacabana → Ipanema → Leblon → Barra, pegando chinelo, celular e bolsa,
recrutando a galera e fugindo de cachorro, salva-vidas, viatura e da onda.

Feito numa hackathon em jan/2017 (Construct 2). Em 2026 virou um **roguelike infinito** em HTML5 puro.

## Jogar

**Online:** https://dreewr.github.io/wavesson/

Local:

```bash
npm start   # python3 -m http.server 5173
```

Abra http://localhost:5173. Sem build, sem dependências. `?seed=QUALQUERCOISA` fixa a praia.

**Controles:** WASD/setas ou arrastar na tela · `Espaço`/`Shift` pique · `P`/`Esc` pausa · `M` som · `1 2 3` escolhem vantagem.
No celular aparecem os botões PIQUE e pausa.

## O que mudou em relação ao original

| 2017 (hackathon) | 2026 |
|---|---|
| Mapa fixo de 52.000 px montado à mão | Praia infinita gerada por seed, fileira a fileira |
| Cada regra copiada 6× (uma por integrante, `favelado_1..6`) | Uma lista `crew[]`; o bonde pode ter qualquer tamanho |
| Dificuldade constante | Velocidade, densidade e perigos crescem com a distância (`src/difficulty.js`) |
| Só cachorro e salva-vidas matavam (o Surfista Desatento estava nas instruções mas nunca foi feito) | + Surfista Desatento de verdade, pelotão de bombeiros subindo a praia (com aviso na borda de baixo), viatura com aviso e sirene, onda que avança sobre a areia, salva-vidas que perseguem |
| Pontos só por item | Multiplicador pelo tamanho do bando, **combo** de itens seguidos e vantagens roguelike a cada trecho |
| Só dava pra andar | **Pique**: arrancada curta com recarga e um respiro de invulnerabilidade |
| — | **Hora do Arrastão** a cada praia nova: fartura e pontos em dobro |
| Integrante sumia sem aviso ao ficar pra trás | Alerta piscando e topo da tela avermelhado; bando pequeno atrai mais recrutas |
| — | Recorde local, desafio do dia (seed por data), toque no celular |
| Menu, instruções, créditos e HUD de texto no topo | Mesmo layout e sprites de 2017; HUD virou um bilhete manuscrito no mesmo lugar (Pontos / Wavessons / Distância) com carinhas do bando, onda até a próxima vantagem, combo, etiquetas das vantagens e medidor de pique |
| Botão Options sem função, músicas importadas e nunca tocadas | Seletor de música no menu com as faixas da equipe; vinheta do gás na troca de praia |

## Estrutura

```
src/
  config.js      constantes do mundo (zonas da praia, tamanho do bonde)
  defs.js        catálogo de entidades: sprite, hitbox e papel (solid/deadly/slow/loot/recruit)
  difficulty.js  curva de dificuldade (pura)
  generator.js   geração procedural com passagem garantida (pura)
  perks.js       vantagens roguelike
  run.js         regras e estado de uma run (sem DOM, roda headless)
  render.js      canvas
  input.js, audio.js, assets.js, main.js
test/            node --test: determinismo, curva, passagem garantida, simulação de runs
legacy/          o projeto Construct 2 original, pra referência
```

```bash
npm test
```

## Créditos

Arte, sprites e trilha: equipe Wavesson02 (hackathon, 2017).

As faixas do seletor de música (Sweet Dreams, Naruto, A Grande Família e a vinheta do gás) pertencem
aos seus autores. Estão aqui só pela memória afetiva da hackathon, num projeto pessoal e sem fins
comerciais; se algum detentor pedir, elas saem.
