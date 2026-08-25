create table if not exists public.corpus_progress_snapshots (
  id bigserial primary key,
  captured_at timestamptz not null default now(),
  clean bigint not null default 0,
  flagged bigint not null default 0,
  unchecked bigint not null default 0,
  other bigint not null default 0,
  total bigint not null default 0
);

grant select on public.corpus_progress_snapshots to authenticated;
grant all on public.corpus_progress_snapshots to service_role;
alter table public.corpus_progress_snapshots enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'corpus_progress_snapshots'
      and policyname = 'admins read corpus progress'
  ) then
    create policy "admins read corpus progress"
      on public.corpus_progress_snapshots for select to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

create index if not exists corpus_progress_snapshots_captured_idx
  on public.corpus_progress_snapshots (captured_at desc);

create or replace function public.snapshot_corpus_progress()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_clean bigint; v_flagged bigint; v_unchecked bigint; v_other bigint; v_total bigint;
begin
  select count(*) filter (where visual_state = 'clean'),
         count(*) filter (where visual_state = 'flagged'),
         count(*) filter (where visual_state is null or visual_state = 'unchecked'),
         count(*) filter (where visual_state is not null
                            and visual_state not in ('clean','flagged','unchecked')),
         count(*)
    into v_clean, v_flagged, v_unchecked, v_other, v_total
  from curated_videos;

  insert into public.corpus_progress_snapshots (clean, flagged, unchecked, other, total)
  values (v_clean, v_flagged, v_unchecked, v_other, v_total);

  delete from public.corpus_progress_snapshots where captured_at < now() - interval '30 days';
end $$;

revoke all on function public.snapshot_corpus_progress() from public, anon, authenticated;
grant execute on function public.snapshot_corpus_progress() to service_role;

select cron.unschedule('corpus-progress-snapshot')
where exists (select 1 from cron.job where jobname = 'corpus-progress-snapshot');

select cron.schedule(
  'corpus-progress-snapshot',
  '*/10 * * * *',
  $$select public.snapshot_corpus_progress();$$
);

select public.snapshot_corpus_progress();

create or replace function public.corpus_progress(p_hours int default 24)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hours int := greatest(1, least(coalesce(p_hours, 24), 720));
  v_since timestamptz := now() - make_interval(hours => v_hours);
  v_series jsonb;
  v_now record;
  v_first record;
  v_rate numeric;
  v_eta numeric;
  v_last10 bigint;
  v_last60 bigint;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'captured_at', captured_at, 'clean', clean, 'flagged', flagged,
           'unchecked', unchecked, 'other', other, 'total', total
         ) order by captured_at), '[]'::jsonb)
    into v_series
  from public.corpus_progress_snapshots
  where captured_at > v_since;

  select clean, flagged, unchecked, other, total, captured_at
    into v_now
  from public.corpus_progress_snapshots order by captured_at desc limit 1;

  select clean, flagged, unchecked, total, captured_at
    into v_first
  from public.corpus_progress_snapshots
  where captured_at > v_since order by captured_at asc limit 1;

  select count(*) filter (where visual_checked_at > now() - interval '10 minutes'),
         count(*) filter (where visual_checked_at > now() - interval '60 minutes')
    into v_last10, v_last60
  from curated_videos;

  v_rate := case
    when v_last60 > 0 then v_last60::numeric / 60
    when v_last10 > 0 then v_last10::numeric / 10
    else null end;
  v_eta := case when v_rate > 0 and v_now.unchecked > 0
                then round(v_now.unchecked / v_rate) else null end;

  return jsonb_build_object(
    'generated_at', now(),
    'window_hours', v_hours,
    'current', jsonb_build_object(
      'clean', coalesce(v_now.clean, 0),
      'flagged', coalesce(v_now.flagged, 0),
      'unchecked', coalesce(v_now.unchecked, 0),
      'other', coalesce(v_now.other, 0),
      'total', coalesce(v_now.total, 0),
      'captured_at', v_now.captured_at
    ),
    'window_start', case when v_first.captured_at is null then null else jsonb_build_object(
      'clean', v_first.clean, 'flagged', v_first.flagged,
      'unchecked', v_first.unchecked, 'total', v_first.total,
      'captured_at', v_first.captured_at
    ) end,
    'checked_last_10m', v_last10,
    'checked_last_60m', v_last60,
    'checked_per_minute', round(coalesce(v_rate, 0), 1),
    'eta_minutes', v_eta,
    'coverage_pct', case when coalesce(v_now.total, 0) > 0
      then round((v_now.total - v_now.unchecked)::numeric * 100 / v_now.total, 2) else 0 end,
    'series', v_series
  );
end $$;

revoke all on function public.corpus_progress(int) from public, anon;
grant execute on function public.corpus_progress(int) to authenticated, service_role;

do $$
declare
  v_status text;
  v_id uuid;
begin
  select e.enumlabel into v_status
  from pg_enum e join pg_type t on t.oid = e.enumtypid
  where t.typname = 'experiment_status' and e.enumlabel in ('running','active','live')
  limit 1;

  if not exists (select 1 from public.experiments where key = 'feed_diversity_v6') then
    insert into public.experiments (key, name, description, primary_metric, traffic_allocation, status, started_at)
    values (
      'feed_diversity_v6',
      'Feed diversity v6 vs v5 ranking',
      'Control = current v5 Gumbel personalization. Variant "diverse" widens sampling temperature, tightens the per-channel cap and raises the long-tail quota.',
      'watch_seconds_per_user',
      1.0,
      coalesce(v_status, 'draft')::public.experiment_status,
      now()
    )
    returning id into v_id;

    insert into public.experiment_variants (experiment_id, key, weight, is_control, payload)
    values
      (v_id, 'control', 0.5, true,  jsonb_build_object('max_per_channel', 3, 'temp_boost', 0, 'long_tail_share', 0.20)),
      (v_id, 'diverse', 0.5, false, jsonb_build_object('max_per_channel', 2, 'temp_boost', 0.15, 'long_tail_share', 0.30));
  end if;
end $$;

create or replace function public.experiment_feed_metrics(
  p_key text default 'feed_diversity_v6',
  p_hours int default 168
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_hours int := greatest(1, least(coalesce(p_hours, 168), 720));
  v_since timestamptz := now() - make_interval(hours => v_hours);
  v_exp_id uuid;
  v_rows jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;

  select id into v_exp_id from public.experiments where key = p_key;
  if v_exp_id is null then
    return jsonb_build_object('error', 'experiment_not_found', 'key', p_key);
  end if;

  with exposure as (
    select distinct variant_key, user_id
    from public.experiment_exposures
    where experiment_id = v_exp_id and created_at > v_since
  ), sized as (
    select variant_key,
           count(*) as subjects,
           count(user_id) as identified_subjects
    from exposure group by variant_key
  ), watch as (
    select e.variant_key,
           coalesce(sum(w.progress_seconds), 0)::numeric as watch_seconds,
           count(distinct w.user_id) as watchers,
           count(*) filter (where w.completed) as completions,
           count(w.id) as sessions
    from exposure e
    left join public.watch_history w
      on w.user_id = e.user_id and w.watched_at > v_since
    group by e.variant_key
  ), events as (
    select e.variant_key,
           count(*) filter (where a.event_name in ('autoplay_start','video_autoplay')) as autoplay_starts,
           count(*) filter (where a.event_name in ('safety_gate_block','autoplay_blocked','halal_gate_block')) as gate_blocks,
           count(*) filter (where a.event_name in ('client_error','error')) as client_errors,
           count(a.id) as total_events
    from exposure e
    left join public.analytics_events a
      on a.user_id = e.user_id and a.created_at > v_since
    group by e.variant_key
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'variant', s.variant_key,
           'subjects', s.subjects,
           'identified_subjects', s.identified_subjects,
           'watchers', w.watchers,
           'watch_seconds', w.watch_seconds,
           'watch_seconds_per_user', case when w.watchers > 0
             then round(w.watch_seconds / w.watchers, 1) else 0 end,
           'completion_rate', case when w.sessions > 0
             then round(w.completions::numeric / w.sessions, 4) else null end,
           'autoplay_starts', ev.autoplay_starts,
           'gate_blocks', ev.gate_blocks,
           'autoplay_pass_rate', case when (ev.autoplay_starts + ev.gate_blocks) > 0
             then round(ev.autoplay_starts::numeric / (ev.autoplay_starts + ev.gate_blocks), 4)
             else null end,
           'client_errors', ev.client_errors,
           'error_rate', case when ev.total_events > 0
             then round(ev.client_errors::numeric / ev.total_events, 4) else null end,
           'is_control', coalesce(v.is_control, false)
         ) order by coalesce(v.is_control, false) desc, s.variant_key), '[]'::jsonb)
    into v_rows
  from sized s
  left join watch w on w.variant_key = s.variant_key
  left join events ev on ev.variant_key = s.variant_key
  left join public.experiment_variants v
    on v.experiment_id = v_exp_id and v.key = s.variant_key;

  return jsonb_build_object(
    'key', p_key,
    'window_hours', v_hours,
    'generated_at', now(),
    'variants', v_rows
  );
end $$;

revoke all on function public.experiment_feed_metrics(text, int) from public, anon;
grant execute on function public.experiment_feed_metrics(text, int) to authenticated, service_role;