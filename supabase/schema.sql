-- Ranking online do Wavesson (Supabase / Postgres).
-- Rode no SQL Editor do projeto. Veja docs/RANKING-ONLINE.md.

create table if not exists public.runs (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  name        text not null check (char_length(name) between 1 and 16),
  score       integer not null check (score >= 0),
  meters      integer not null check (meters >= 0),
  layout      text not null check (layout in ('landscape', 'portrait')),
  seed        text not null,
  version     text,
  replay      jsonb not null,
  verified    boolean,          -- null = ainda não conferida; true/false = resultado
  checked_at  timestamptz
);

alter table public.runs enable row level security;

-- Qualquer um pode MANDAR uma partida (nunca marcar como verificada).
create policy "enviar partida" on public.runs
  for insert to anon
  with check (verified is null and checked_at is null);

-- Ninguém de fora lê a tabela crua: o ranking público é a view abaixo,
-- que só mostra partidas conferidas pelo servidor.
create or replace view public.leaderboard as
  select name, score, meters, layout, created_at
  from public.runs
  where verified = true
  order by score desc;

grant select on public.leaderboard to anon;
