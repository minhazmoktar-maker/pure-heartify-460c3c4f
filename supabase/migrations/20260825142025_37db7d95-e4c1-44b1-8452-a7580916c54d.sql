-- 1) Scale the visual-safety sweep so the unchecked backlog clears before launch.
do $$
declare
  i int;
  url text := 'https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/visual-safety-sweep';
begin
  for i in 6..11 loop
    perform cron.schedule(
      'visual-safety-sweep-par-' || i,
      '* * * * *',
      format($f$select net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json'),
        body := jsonb_build_object('worker', %s),
        timeout_milliseconds := 55000
      );$f$, url, i)
    );
  end loop;
end $$;

-- 2) Launch monitoring aggregate: halal serving floor, sweep throughput,
--    cross-user feed overlap, edge-function errors, and platform split.
create or replace function public.launch_monitor(p_hours int default 24)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - make_interval(hours => greatest(1, least(p_hours, 168)));
  v_corpus jsonb;
  v_sweep jsonb;
  v_overlap numeric;
  v_pairs int;
  v_errors jsonb;
  v_platforms jsonb;
  v_gates jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;

  select jsonb_object_agg(coalesce(visual_state,'unknown'), c)
    into v_corpus
  from (select visual_state, count(*) c from curated_videos group by 1) t;

  select jsonb_build_object(
           'checked_last_10m', count(*) filter (where visual_checked_at > now() - interval '10 minutes'),
           'checked_last_60m', count(*) filter (where visual_checked_at > now() - interval '60 minutes')
         )
    into v_sweep
  from curated_videos;

  with u as (
    select user_id, array_agg(distinct video_id) vids
    from feed_impressions
    where first_seen_at > v_since and user_id is not null
    group by user_id
    having count(distinct video_id) >= 10
    limit 60
  ), pairs as (
    select a.user_id ua, b.user_id ub,
           cardinality(array(select unnest(a.vids) intersect select unnest(b.vids)))::numeric inter,
           cardinality(array(select unnest(a.vids) union select unnest(b.vids)))::numeric uni
    from u a join u b on a.user_id < b.user_id
    limit 400
  )
  select round(avg(inter / nullif(uni,0)) * 100, 1), count(*) into v_overlap, v_pairs from pairs;

  select coalesce(jsonb_agg(x order by x->>'fn_name'), '[]'::jsonb) into v_errors
  from (
    select jsonb_build_object(
             'fn_name', fn_name,
             'requests', count(*),
             'errors', count(*) filter (where not ok),
             'error_rate', round((count(*) filter (where not ok))::numeric / count(*), 4),
             'p95_ms', percentile_disc(0.95) within group (order by duration_ms)
           ) x
    from function_metrics
    where created_at > v_since
    group by fn_name
  ) s;

  select coalesce(jsonb_object_agg(p, c), '{}'::jsonb) into v_platforms
  from (
    select coalesce(nullif(properties->>'platform',''), 'web') p, count(*) c
    from analytics_events
    where created_at > v_since
    group by 1
  ) t;

  select jsonb_build_object(
           'safety_events', count(*) filter (where event_name in ('safety_gate_block','autoplay_blocked','halal_gate_block')),
           'autoplay_starts', count(*) filter (where event_name in ('autoplay_start','video_autoplay')),
           'client_errors', count(*) filter (where event_name in ('client_error','error'))
         )
    into v_gates
  from analytics_events
  where created_at > v_since;

  return jsonb_build_object(
    'window_hours', greatest(1, least(p_hours, 168)),
    'generated_at', now(),
    'corpus', coalesce(v_corpus, '{}'::jsonb),
    'sweep', v_sweep,
    'feed_overlap_pct', v_overlap,
    'feed_overlap_pairs', v_pairs,
    'functions', v_errors,
    'platforms', v_platforms,
    'gates', v_gates
  );
end $$;

revoke all on function public.launch_monitor(int) from public, anon;
grant execute on function public.launch_monitor(int) to authenticated, service_role;