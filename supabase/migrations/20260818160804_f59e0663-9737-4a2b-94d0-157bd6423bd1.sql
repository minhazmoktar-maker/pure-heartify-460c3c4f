create table if not exists public.video_transcripts (
  video_id text primary key,
  language text not null default 'en',
  source text not null,
  model text,
  segment_count integer not null default 0,
  duration_ms integer,
  full_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.video_transcripts to anon, authenticated;
grant all on public.video_transcripts to service_role;
alter table public.video_transcripts enable row level security;
create policy "video_transcripts_public_read" on public.video_transcripts for select using (true);

create table if not exists public.transcript_segments (
  id bigserial primary key,
  video_id text not null,
  language text not null default 'en',
  start_ms integer not null,
  end_ms integer,
  text text not null,
  tsv tsvector generated always as (to_tsvector('simple', coalesce(text, ''))) stored
);
create index if not exists transcript_segments_video_start_idx on public.transcript_segments (video_id, start_ms);
create index if not exists transcript_segments_tsv_idx on public.transcript_segments using gin (tsv);
grant select on public.transcript_segments to anon, authenticated;
grant all on public.transcript_segments to service_role;
alter table public.transcript_segments enable row level security;
create policy "transcript_segments_public_read" on public.transcript_segments for select using (true);

create table if not exists public.transcript_jobs (
  video_id text primary key,
  status text not null default 'queued' check (status in ('queued','running','done','failed')),
  priority integer not null default 0,
  attempts integer not null default 0,
  language_hint text,
  error text,
  requested_by uuid,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists transcript_jobs_pick_idx on public.transcript_jobs (status, priority desc, next_attempt_at);
grant select on public.transcript_jobs to authenticated;
grant all on public.transcript_jobs to service_role;
alter table public.transcript_jobs enable row level security;
create policy "transcript_jobs_auth_read" on public.transcript_jobs for select to authenticated using (true);

create or replace function public.enqueue_transcript_job(_video_id text, _language_hint text default null)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  _uid uuid := auth.uid();
  _status text;
begin
  if _uid is null then
    raise exception 'authentication required';
  end if;
  if _video_id is null or length(trim(_video_id)) = 0 or length(_video_id) > 32 then
    raise exception 'invalid video id';
  end if;
  if exists (select 1 from public.video_transcripts where video_id = _video_id) then
    return 'done';
  end if;
  insert into public.transcript_jobs as j (video_id, priority, language_hint, requested_by)
  values (_video_id, 50, nullif(left(coalesce(_language_hint, ''), 8), ''), _uid)
  on conflict (video_id) do update
    set priority = greatest(j.priority, 50),
        status = case when j.status = 'failed' and j.attempts < 5 then 'queued' else j.status end,
        updated_at = now()
  returning status into _status;
  return _status;
end;
$$;
revoke all on function public.enqueue_transcript_job(text, text) from public, anon;
grant execute on function public.enqueue_transcript_job(text, text) to authenticated;

create or replace function public.search_transcript_moments(
  _q text,
  _limit integer default 20,
  _video_id text default null
)
returns table (video_id text, start_ms integer, end_ms integer, text text, language text, rank real)
language sql
stable
security definer
set search_path = public
as $$
  select s.video_id, s.start_ms, s.end_ms, s.text, s.language,
         ts_rank(s.tsv, websearch_to_tsquery('simple', _q)) as rank
  from public.transcript_segments s
  where length(coalesce(_q, '')) >= 2
    and s.tsv @@ websearch_to_tsquery('simple', _q)
    and (_video_id is null or s.video_id = _video_id)
  order by rank desc, s.video_id, s.start_ms
  limit least(greatest(coalesce(_limit, 20), 1), 100);
$$;
revoke all on function public.search_transcript_moments(text, integer, text) from public;
grant execute on function public.search_transcript_moments(text, integer, text) to anon, authenticated;