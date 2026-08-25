create table if not exists public.feed_serve_samples (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  experiment_key text not null default 'feed_diversity_v6',
  variant text not null,
  user_id uuid,
  session_id text,
  surface text,
  sort text,
  latency_ms integer not null,
  item_count integer not null default 0,
  cache_hit boolean not null default false,
  country text
);

grant select on public.feed_serve_samples to authenticated;
grant all on public.feed_serve_samples to service_role;
alter table public.feed_serve_samples enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'feed_serve_samples'
      and policyname = 'admins read feed serve samples'
  ) then
    create policy "admins read feed serve samples"
      on public.feed_serve_samples for select to authenticated
      using (public.has_role(auth.uid(), 'admin'));
  end if;
end $$;

create index if not exists feed_serve_samples_created_idx
  on public.feed_serve_samples (created_at desc);
create index if not exists feed_serve_samples_variant_idx
  on public.feed_serve_samples (experiment_key, variant, created_at desc);

create or replace function public.purge_feed_serve_samples()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.feed_serve_samples where created_at < now() - interval '30 days';
$$;

revoke all on function public.purge_feed_serve_samples() from public, anon, authenticated;
grant execute on function public.purge_feed_serve_samples() to service_role;

select cron.unschedule('purge-feed-serve-samples')
where exists (select 1 from cron.job where jobname = 'purge-feed-serve-samples');

select cron.schedule(
  'purge-feed-serve-samples',
  '17 4 * * *',
  $$select public.purge_feed_serve_samples();$$
);

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
  ), serves as (
    select variant,
           count(*) as serves,
           round(avg(latency_ms)::numeric, 1) as latency_avg_ms,
           percentile_disc(0.5) within group (order by latency_ms) as latency_p50_ms,
           percentile_disc(0.95) within group (order by latency_ms) as latency_p95_ms,
           round(avg(item_count)::numeric, 1) as items_per_serve,
           round((count(*) filter (where cache_hit))::numeric / greatest(count(*), 1), 4) as cache_hit_rate
    from public.feed_serve_samples
    where experiment_key = p_key and created_at > v_since
    group by variant
  ), sized as (
    select variant_key from exposure
    union
    select variant as variant_key from serves
  ), subjects as (
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
           'subjects', coalesce(sub.subjects, 0),
           'identified_subjects', coalesce(sub.identified_subjects, 0),
           'watchers', coalesce(w.watchers, 0),
           'watch_seconds', coalesce(w.watch_seconds, 0),
           'watch_seconds_per_user', case when coalesce(w.watchers, 0) > 0
             then round(w.watch_seconds / w.watchers, 1) else 0 end,
           'completion_rate', case when coalesce(w.sessions, 0) > 0
             then round(w.completions::numeric / w.sessions, 4) else null end,
           'autoplay_starts', coalesce(ev.autoplay_starts, 0),
           'gate_blocks', coalesce(ev.gate_blocks, 0),
           'autoplay_pass_rate', case when coalesce(ev.autoplay_starts, 0) + coalesce(ev.gate_blocks, 0) > 0
             then round(ev.autoplay_starts::numeric / (ev.autoplay_starts + ev.gate_blocks), 4)
             else null end,
           'client_errors', coalesce(ev.client_errors, 0),
           'error_rate', case when coalesce(ev.total_events, 0) > 0
             then round(ev.client_errors::numeric / ev.total_events, 4) else null end,
           'serves', coalesce(sv.serves, 0),
           'latency_avg_ms', sv.latency_avg_ms,
           'latency_p50_ms', sv.latency_p50_ms,
           'latency_p95_ms', sv.latency_p95_ms,
           'items_per_serve', sv.items_per_serve,
           'cache_hit_rate', sv.cache_hit_rate,
           'is_control', coalesce(v.is_control, s.variant_key = 'control')
         ) order by coalesce(v.is_control, s.variant_key = 'control') desc, s.variant_key), '[]'::jsonb)
    into v_rows
  from sized s
  left join subjects sub on sub.variant_key = s.variant_key
  left join watch w on w.variant_key = s.variant_key
  left join events ev on ev.variant_key = s.variant_key
  left join serves sv on sv.variant = s.variant_key
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

create or replace function public.moderation_audit(
  p_state text default 'all',
  p_search text default null,
  p_limit int default 50,
  p_offset int default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 200));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_state text := lower(coalesce(p_state, 'all'));
  v_q text := nullif(btrim(coalesce(p_search, '')), '');
  v_rows jsonb;
  v_counts jsonb;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'forbidden';
  end if;

  select jsonb_build_object(
           'clean', count(*) filter (where visual_state = 'clean'),
           'flagged', count(*) filter (where visual_state = 'flagged'),
           'unchecked', count(*) filter (where visual_state is null or visual_state = 'unchecked'),
           'total', count(*)
         )
    into v_counts
  from curated_videos;

  select coalesce(jsonb_agg(t.r order by t.r_sort desc nulls last), '[]'::jsonb)
    into v_rows
  from (
    select jsonb_build_object(
             'video_id', cv.video_id,
             'title', cv.title,
             'channel_title', cv.channel_title,
             'category', cv.category,
             'content_language', cv.content_language,
             'thumbnail_url', cv.thumbnail_url,
             'serving_state', case
               when cv.visual_state = 'clean' then 'clean'
               when cv.visual_state = 'flagged' then 'flagged'
               when cv.visual_state is null or cv.visual_state = 'unchecked' then 'unchecked'
               else cv.visual_state end,
             'servable', (
               cv.visual_state = 'clean'
               and coalesce(cv.is_hidden, false) = false
               and coalesce(cv.is_archived, false) = false
               and coalesce(cv.embeddable, true) = true
             ),
             'policy_rules', (
               select coalesce(jsonb_agg(rules.rule), '[]'::jsonb) from (
                 select 'visual-sweep flag: ' || f as rule
                 from unnest(coalesce(cv.visual_flags, array[]::text[])) as f
                 union all
                 select 'serving floor: visual sweep has not run yet (unchecked is never served)'
                 where cv.visual_state is null or cv.visual_state = 'unchecked'
                 union all
                 select 'serving floor: hidden by admin - ' || coalesce(cv.hidden_reason, 'no reason recorded')
                 where coalesce(cv.is_hidden, false)
                 union all
                 select 'serving floor: archived'
                 where coalesce(cv.is_archived, false)
                 union all
                 select 'serving floor: not embeddable on YouTube'
                 where cv.embeddable is false
                 union all
                 select 'halal floor: halal score ' || coalesce(cv.halal_score, 0) || ' below untrusted-channel threshold (90)'
                 where coalesce(cv.halal_score, 0) < 90 and coalesce(cv.is_trusted_channel, false) = false
               ) rules
             ),
             'moderation_state', cv.moderation_state::text,
             'moderation_stage', cv.moderation_stage::text,
             'moderation_provider', cv.moderation_provider,
             'moderation_confidence', cv.moderation_confidence,
             'moderation_risk', cv.moderation_risk,
             'moderation_reasoning', cv.moderation_reasoning,
             'moderation_signals', cv.moderation_signals,
             'visual_flags', coalesce(cv.visual_flags, array[]::text[]),
             'visual_confidence', cv.visual_confidence,
             'halal_score', cv.halal_score,
             'is_trusted_channel', coalesce(cv.is_trusted_channel, false),
             'hidden_reason', cv.hidden_reason,
             'ingested_at', cv.ingested_at,
             'visual_checked_at', cv.visual_checked_at,
             'moderation_updated_at', cv.moderation_updated_at,
             'embed_checked_at', cv.embed_checked_at
           ) as r,
           coalesce(cv.visual_checked_at, cv.moderation_updated_at, cv.ingested_at) as r_sort
    from curated_videos cv
    where (
        v_state = 'all'
        or (v_state = 'clean' and cv.visual_state = 'clean')
        or (v_state = 'flagged' and cv.visual_state = 'flagged')
        or (v_state = 'unchecked' and (cv.visual_state is null or cv.visual_state = 'unchecked'))
      )
      and (
        v_q is null
        or cv.video_id = v_q
        or cv.title ilike '%' || v_q || '%'
        or cv.channel_title ilike '%' || v_q || '%'
      )
    order by coalesce(cv.visual_checked_at, cv.moderation_updated_at, cv.ingested_at) desc
    limit v_limit offset v_offset
  ) t;

  return jsonb_build_object(
    'generated_at', now(),
    'state', v_state,
    'search', v_q,
    'limit', v_limit,
    'offset', v_offset,
    'counts', v_counts,
    'rows', v_rows
  );
end $$;

revoke all on function public.moderation_audit(text, text, int, int) from public, anon;
grant execute on function public.moderation_audit(text, text, int, int) to authenticated, service_role;