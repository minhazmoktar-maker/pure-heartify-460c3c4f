-- Strict-halal short-form (reel) feed.
-- Only videos that passed BOTH text moderation and the visual safety sweep
-- ("clean") are eligible: the visual sweep is what rejects music/instruments
-- and non-mahram visual content, so shorts are held to the strictest bar on
-- the platform. Nothing unchecked or flagged is ever served here.
create or replace function public.get_shorts_feed(
  _limit int default 20,
  _offset int default 0,
  _lang text default null,
  _min_seconds int default 10,
  _max_seconds int default 120
)
returns table (
  video_id text,
  title text,
  channel_id text,
  channel_title text,
  thumbnail_url text,
  category text,
  duration_seconds int,
  halal_score numeric,
  published_at timestamptz,
  content_language text
)
language sql
stable
security definer
set search_path = public
as $$
  select v.video_id,
         v.title,
         v.channel_id,
         v.channel_title,
         v.thumbnail_url,
         v.category,
         v.duration_seconds,
         v.halal_score,
         v.published_at,
         v.content_language
  from public.curated_videos v
  where v.moderation_state in ('approved', 'auto_approved')
    and coalesce(v.is_hidden, false) = false
    and coalesce(v.is_archived, false) = false
    and coalesce(v.is_premium_only, false) = false
    and v.visual_state = 'clean'
    and coalesce(v.embeddable, true) = true
    and v.duration_seconds between greatest(coalesce(_min_seconds, 10), 5)
                               and least(coalesce(_max_seconds, 120), 180)
    and coalesce(v.halal_score, 0) >= 70
    and (v.duplicate_group_id is null or coalesce(v.is_duplicate_canonical, true) = true)
    and (_lang is null or v.content_language = _lang)
  order by v.published_at desc nulls last, v.halal_score desc, v.video_id
  limit least(greatest(coalesce(_limit, 20), 1), 50)
  offset greatest(coalesce(_offset, 0), 0)
$$;

revoke all on function public.get_shorts_feed(int, int, text, int, int) from public;
grant execute on function public.get_shorts_feed(int, int, text, int, int) to anon, authenticated, service_role;