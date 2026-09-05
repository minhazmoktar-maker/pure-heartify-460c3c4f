-- lovable-cron-fallback-reviewed: 288 runs/day; shared anonymous feed/recommendations cache must never be empty — a cold burst measured 13-25s p50; 5-minute cadence sits inside the 10-minute stale-while-revalidate grace window.
create or replace function public.warm_edge_caches()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  base text := 'https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/';
  anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE';
  hdrs jsonb;
begin
  hdrs := jsonb_build_object('Content-Type','application/json','apikey',anon,'Authorization','Bearer '||anon);
  perform net.http_post(url := base||'feed', headers := hdrs, body := '{"limit":20}'::jsonb);
  perform net.http_post(url := base||'recommendations', headers := hdrs, body := '{"limit":24,"surface":"home"}'::jsonb);
exception when others then
  null;
end;
$$;

revoke all on function public.warm_edge_caches() from public, anon, authenticated;

select cron.schedule('warm-edge-caches', '*/5 * * * *', $$select public.warm_edge_caches();$$);
