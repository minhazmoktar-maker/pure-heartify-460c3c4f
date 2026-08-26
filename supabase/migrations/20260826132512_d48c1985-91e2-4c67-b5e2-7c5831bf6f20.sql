create or replace function public.lane_analytics_filtered(
  p_from date default null,
  p_to date default null,
  p_country text default null,
  p_language text default null,
  p_lane text default null
)
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
  where public.has_role(auth.uid(), 'admin')
    and e.occurred_at >= coalesce(p_from, (now() - interval '30 days')::date)
    and e.occurred_at < coalesce(p_to, current_date) + interval '1 day'
    and (p_country is null or p_country = '' or coalesce(nullif(e.country,''), 'ZZ') = upper(p_country))
    and (p_language is null or p_language = '' or coalesce(nullif(e.content_language,''), 'unknown') = lower(p_language))
    and (p_lane is null or p_lane = '' or e.lane = p_lane)
  group by 1, 2, 3
  order by impressions desc
$$;

revoke all on function public.lane_analytics_filtered(date, date, text, text, text) from public;
grant execute on function public.lane_analytics_filtered(date, date, text, text, text) to authenticated;