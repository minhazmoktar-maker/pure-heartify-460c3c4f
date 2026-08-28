alter table public.curated_videos
  add column if not exists duration_seconds integer,
  add column if not exists duration_checked_at timestamptz;

create index if not exists curated_videos_duration_unchecked_idx
  on public.curated_videos (duration_checked_at)
  where duration_checked_at is null;

create or replace function public.apply_video_durations(_payload jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  with d as (
    select (x->>'video_id')::text as vid,
           nullif(x->>'duration_seconds','')::int as secs
    from jsonb_array_elements(coalesce(_payload, '[]'::jsonb)) x
  )
  update public.curated_videos cv
     set duration_seconds = coalesce(d.secs, cv.duration_seconds),
         duration_checked_at = now()
    from d
   where cv.video_id = d.vid;
  get diagnostics n = row_count;
  return n;
end;
$$;

revoke all on function public.apply_video_durations(jsonb) from public;
revoke all on function public.apply_video_durations(jsonb) from anon;
revoke all on function public.apply_video_durations(jsonb) from authenticated;
grant execute on function public.apply_video_durations(jsonb) to service_role;