create or replace function public.enqueue_transcript_backlog(_limit integer default 40)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  _inserted integer;
begin
  with popular as (
    select v.video_id,
           coalesce(w.cnt, 0) as cnt
    from public.curated_videos v
    left join (
      select video_id, count(*)::int as cnt
      from public.watch_history
      group by video_id
    ) w on w.video_id = v.video_id
    where v.moderation_state = 'approved'
      and coalesce(v.is_hidden, false) = false
      and coalesce(v.is_archived, false) = false
      and not exists (select 1 from public.video_transcripts t where t.video_id = v.video_id)
      and not exists (select 1 from public.transcript_jobs j where j.video_id = v.video_id)
    order by coalesce(w.cnt, 0) desc, v.ingested_at desc nulls last
    limit greatest(coalesce(_limit, 40), 1)
  )
  insert into public.transcript_jobs (video_id, priority)
  select video_id, least(cnt, 40) from popular
  on conflict (video_id) do nothing;
  get diagnostics _inserted = row_count;
  return _inserted;
end;
$$;
revoke all on function public.enqueue_transcript_backlog(integer) from public, anon, authenticated;

select cron.schedule(
  'transcript-backlog-hourly',
  '35 * * * *',
  $$select public.enqueue_transcript_backlog(40);$$
);

select cron.schedule(
  'ingest-captions-10min',
  '*/10 * * * *',
  $$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/ingest-captions',
    headers:=jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{"limit": 3}'::jsonb,
    timeout_milliseconds:=300000);
  $$
);