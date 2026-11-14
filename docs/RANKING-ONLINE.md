# Ranking online

O jogo já vem com **ranking local** (as 10 melhores partidas de cada aparelho, conferidas na hora).
O ranking online é opcional e fica desligado até você configurar um backend. O passo a passo
usa o [Supabase](https://supabase.com), que tem um plano grátis que sobra pra isso.

## Como a trapaça é barrada

O jogo é **determinístico**: mesma seed + mesmos comandos = mesma partida, tique por tique
(passo fixo de 1/60 s, comandos quantizados; ver `src/replay.js`). Então o jogador não manda
"fiz 9.000 pontos", e sim **a gravação da partida**. O servidor refaz a partida inteira e só
publica a pontuação se o resultado bater. Editar o número, inventar vantagens que não foram
oferecidas ou mexer na velocidade não passa.

Limite honesto: uma pessoa com muito tempo poderia escrever um bot que joga de verdade.
Isso nenhum ranking resolve sem moderação.

## Ligar (uns 15 minutos)

1. Crie um projeto no Supabase.
2. No **SQL Editor**, rode `supabase/schema.sql` (tabela `runs`, regras de acesso e a view `leaderboard`).
3. Publique a função que confere as partidas:
   ```bash
   supabase functions deploy verify-run --no-verify-jwt
   ```
4. Em **Database → Webhooks**, crie um webhook em `INSERT` na tabela `runs` chamando a função `verify-run`.
5. Em **Project Settings → API**, copie a *Project URL* e a chave *anon public* para `src/online-config.js`:
   ```js
   export const ONLINE = { url: 'https://SEU-PROJETO.supabase.co', anonKey: 'eyJ...' };
   ```
6. Commit + push. A tela **ranking & estatísticas** ganha a aba "online" e o fim de partida
   mostra o campo de apelido quando a partida entra no seu top 10.

A chave *anon* é pública por design (vai no navegador). Quem protege os dados são as regras
do `schema.sql`: de fora só dá pra inserir partidas não verificadas e ler a view de partidas conferidas.

## Conferir partidas na mão

```bash
node tools/verify-run.mjs wavesson-dados.json
```
