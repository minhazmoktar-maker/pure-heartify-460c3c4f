-- Shorts recommendation engine.
-- Same strict-halal eligibility floor as get_shorts_feed (approved + visual
-- sweep clean + halal_score >= 70 + canonical + embeddable). On top of it,
-- ranks by benefit rather than watch time: declared interests, channel
-- affinity from the caller's own history, crowd benefit-label yes-rate,
-- institutional co-signatures, freshness, plus per-user jitter. Already
-- watched/labelled shorts are excluded and each channel is capped at 2 slots.
create or replace function public.get_shorts_recommended(
  _limit int default 12,
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
  content_language text,
  score numeric,
  reason text
)
language sql
stable
security definer
set search_path = public
as $$
with me as (
  select auth.uid() as uid
),
interests as (
  select ui.primary_interest, ui.secondary_interest, ui.exploration_interest
  from public.user_interests ui, me
  where ui.user_id = me.uid
),
seen as (
  select wh.video_id from public.watch_history wh, me where wh.user_id = me.uid
  union
  select bl.video_id from public.benefit_labels bl, me where bl.user_id = me.uid
),
channel_affinity as (
  select v.channel_id, count(*)::numeric as watches
  from public.watch_history wh
  join public.curated_videos v on v.video_id = wh.video_id
  cross join me
  where wh.user_id = me.uid and v.channel_id is not null
    and wh.watched_at > now() - interval '90 days'
  group by v.channel_id
),
pool as (
  select v.video_id, v.title, v.channel_id, v.channel_title, v.thumbnail_url,
         v.category, v.duration_seconds, v.halal_score, v.published_at,
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
    and not exists (select 1 from seen s where s.video_id = v.video_id)
  order by v.published_at desc nulls last
  limit 600
),
benefit as (
  select bl.video_id,
         count(*) filter (where bl.worth_it = 'yes')::numeric
           / greatest(count(*) filter (where bl.worth_it is not null), 1)::numeric as yes_rate,
         count(*) filter (where bl.worth_it is not null) as labels
  from public.benefit_labels bl
  where bl.video_id in (select video_id from pool)
  group by bl.video_id
),
cosign as (
  select ac.video_id, count(*)::numeric as signatures
  from public.attestation_cosignatures ac
  where ac.revoked_at is null and ac.video_id in (select video_id from pool)
  group by ac.video_id
),
scored as (
  select p.*,
         (case
            when i.primary_interest is not null and p.category = i.primary_interest then 3.0
            when i.secondary_interest is not null and p.category = i.secondary_interest then 2.0
            when i.exploration_interest is not null and p.category = i.exploration_interest then 1.0
            else 0.0
          end)
         + least(coalesce(ca.watches, 0) * 0.4, 1.5)
         + coalesce(b.yes_rate, 0.5) * least(coalesce(b.labels, 0), 10) * 0.15
         + least(coalesce(cs.signatures, 0) * 0.75, 2.25)
         + (coalesce(p.halal_score, 70) - 70) / 30.0
         + greatest(0, 1 - extract(epoch from (now() - coalesce(p.published_at, now()))) / 2592000.0)
         + (('x' || substr(md5(p.video_id || coalesce(me.uid::text, 'anon')), 1, 8))::bit(32)::bigint % 1000) / 4000.0
         as score,
         case
           when coalesce(cs.signatures, 0) > 0 then 'institution_cosigned'
           when i.primary_interest is not null and p.category = i.primary_interest then 'your_interest'
           when coalesce(ca.watches, 0) > 0 then 'channel_you_watch'
           when coalesce(b.labels, 0) >= 3 and coalesce(b.yes_rate, 0) >= 0.6 then 'found_beneficial'
           else 'fresh_pick'
         end as reason
  from pool p
  cross join me
  left join interests i on true
  left join channel_affinity ca on ca.channel_id = p.channel_id
  left join benefit b on b.video_id = p.video_id
  left join cosign cs on cs.video_id = p.video_id
),
capped as (
  select s.*, row_number() over (
    partition by coalesce(s.channel_id, s.video_id) order by s.score desc
  ) as per_channel
  from scored s
)
select video_id, title, channel_id, channel_title, thumbnail_url, category,
       duration_seconds, halal_score, published_at, content_language, score, reason
from capped
where per_channel <= 2
order by score desc, published_at desc nulls last, video_id
limit least(greatest(coalesce(_limit, 12), 1), 50)
offset greatest(coalesce(_offset, 0), 0)
$$;

revoke all on function public.get_shorts_recommended(int, int, text, int, int) from public;
grant execute on function public.get_shorts_recommended(int, int, text, int, int)
  to anon, authenticated, service_role;