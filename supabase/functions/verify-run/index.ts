// Supabase Edge Function: refaz a partida enviada e marca se a pontuação vale.
// Disparada por um Database Webhook em INSERT na tabela public.runs.
// O código do jogo vem direto do site publicado, então a regra é a mesma do jogo.
//
// deploy: supabase functions deploy verify-run --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';
import { verify } from 'https://dreewr.github.io/wavesson/src/replay.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

Deno.serve(async (req) => {
  const { record } = await req.json();
  if (!record?.id) return new Response('sem registro', { status: 400 });
  const rec = record.replay;
  const result = verify({ ...rec, claimed: { ...rec.claimed, score: record.score, meters: record.meters } });
  await db.from('runs').update({ verified: result.ok, checked_at: new Date().toISOString() }).eq('id', record.id);
  return Response.json(result);
});
