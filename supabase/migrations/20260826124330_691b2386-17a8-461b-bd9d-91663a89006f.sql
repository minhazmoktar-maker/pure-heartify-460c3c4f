create table if not exists public.creator_upload_captions (
  id uuid primary key default gen_random_uuid(),
  upload_id uuid not null references public.creator_uploads(id) on delete cascade,
  language text not null,
  source text not null default 'asr',
  model text,
  segment_count integer not null default 0,
  segments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (upload_id, language)
);

grant select on public.creator_upload_captions to anon, authenticated;
grant all on public.creator_upload_captions to service_role;
alter table public.creator_upload_captions enable row level security;

drop policy if exists "captions readable for approved uploads" on public.creator_upload_captions;
create policy "captions readable for approved uploads"
on public.creator_upload_captions for select to anon, authenticated
using (exists (
  select 1 from public.creator_uploads u
  where u.id = creator_upload_captions.upload_id and u.status = 'approved'
));

drop policy if exists "creators read own upload captions" on public.creator_upload_captions;
create policy "creators read own upload captions"
on public.creator_upload_captions for select to authenticated
using (exists (
  select 1 from public.creator_uploads u
  where u.id = creator_upload_captions.upload_id and u.user_id = auth.uid()
));

create index if not exists creator_upload_captions_upload_idx
  on public.creator_upload_captions (upload_id);

create table if not exists public.lane_events (
  id bigserial primary key,
  occurred_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null,
  session_id text,
  kind text not null check (kind in ('impression','click','watch')),
  lane text not null check (lane in ('native','diversified')),
  country text,
  ui_language text,
  content_language text,
  video_id text,
  watched_seconds integer not null default 0,
  duration_seconds integer not null default 0
);

grant all on public.lane_events to service_role;
alter table public.lane_events enable row level security;

drop policy if exists "admins read lane events" on public.lane_events;
create policy "admins read lane events"
on public.lane_events for select to authenticated
using (public.has_role(auth.uid(), 'admin'));

create index if not exists lane_events_time_idx on public.lane_events (occurred_at desc);
create index if not exists lane_events_dim_idx on public.lane_events (country, content_language, lane);

create or replace function public.log_lane_events(p_events jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
begin
  if p_events is null or jsonb_typeof(p_events) <> 'array' then
    return 0;
  end if;

  insert into public.lane_events
    (user_id, session_id, kind, lane, country, ui_language, content_language, video_id, watched_seconds, duration_seconds)
  select
    auth.uid(),
    left(coalesce(e->>'session_id',''), 64),
    e->>'kind',
    e->>'lane',
    upper(left(coalesce(e->>'country',''), 2)),
    left(coalesce(e->>'ui_language',''), 12),
    left(coalesce(e->>'content_language',''), 12),
    left(coalesce(e->>'video_id',''), 64),
    greatest(0, least(86400, coalesce((e->>'watched_seconds')::numeric, 0)::integer)),
    greatest(0, least(86400, coalesce((e->>'duration_seconds')::numeric, 0)::integer))
  from jsonb_array_elements(p_events) as e
  where e->>'kind' in ('impression','click','watch')
    and e->>'lane' in ('native','diversified')
  limit 200;

  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.log_lane_events(jsonb) from public;
grant execute on function public.log_lane_events(jsonb) to anon, authenticated;

create or replace function public.lane_analytics(p_days integer default 30)
returns table (
  country text,
  content_language text,
  lane text,
  impressions bigint,
  clicks bigint,
  watch_seconds bigint,
  completed_watches bigint,
  click_through numeric,
  avg_watch_seconds numeric,
  retention_pct numeric
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(e.country,''), 'ZZ') as country,
    coalesce(nullif(e.content_language,''), 'unknown') as content_language,
    e.lane,
    count(*) filter (where e.kind = 'impression') as impressions,
    count(*) filter (where e.kind = 'click') as clicks,
    coalesce(sum(e.watched_seconds) filter (where e.kind = 'watch'), 0) as watch_seconds,
    count(*) filter (where e.kind = 'watch' and e.duration_seconds > 0 and e.watched_seconds >= 0.9 * e.duration_seconds) as completed_watches,
    round(
      100.0 * count(*) filter (where e.kind = 'click')
      / greatest(1, count(*) filter (where e.kind = 'impression')), 2) as click_through,
    round(
      coalesce(sum(e.watched_seconds) filter (where e.kind = 'watch'), 0)::numeric
      / greatest(1, count(*) filter (where e.kind = 'watch')), 1) as avg_watch_seconds,
    round(
      100.0 * coalesce(sum(e.watched_seconds) filter (where e.kind = 'watch' and e.duration_seconds > 0), 0)::numeric
      / greatest(1, coalesce(sum(e.duration_seconds) filter (where e.kind = 'watch' and e.duration_seconds > 0), 0)), 2) as retention_pct
  from public.lane_events e
  where e.occurred_at > now() - make_interval(days => greatest(1, least(365, coalesce(p_days, 30))))
    and public.has_role(auth.uid(), 'admin')
  group by 1, 2, 3
  order by impressions desc
$$;

revoke all on function public.lane_analytics(integer) from public;
grant execute on function public.lane_analytics(integer) to authenticated;