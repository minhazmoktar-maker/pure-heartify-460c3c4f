
CREATE OR REPLACE FUNCTION public.pool_trending_7d(_limit int DEFAULT 60, _exclude_premium boolean DEFAULT false)
RETURNS SETOF public.surface_video LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH pool AS (
    SELECT v.*,
      EXTRACT(EPOCH FROM (now() - v.published_at))/86400.0 AS age_d
    FROM public.curated_videos v
    WHERE v.moderation_state IN ('approved','auto_approved')
      AND v.is_hidden=false AND v.is_archived=false
      AND v.published_at >= now() - interval '30 days'
      AND (NOT _exclude_premium OR v.is_premium_only=false)
  )
  SELECT video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language
  FROM pool
  ORDER BY
    (coalesce(halal_score,80)::float / GREATEST(age_d + 2, 3))
      * CASE WHEN is_trusted_channel THEN 1.20 ELSE 1.0 END
    DESC
  LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.pool_popular_week(_limit int DEFAULT 60, _exclude_premium boolean DEFAULT false)
RETURNS SETOF public.surface_video LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT v.video_id,v.title,v.channel_id,v.channel_title,v.thumbnail_url,v.category,v.section_id,v.published_at,v.ingested_at,v.halal_score,v.view_count,v.is_trusted_channel,v.is_premium_only,v.content_language
  FROM public.curated_videos v
  WHERE v.moderation_state IN ('approved','auto_approved')
    AND v.is_hidden=false AND v.is_archived=false
    AND v.published_at >= now() - interval '14 days'
    AND (NOT _exclude_premium OR v.is_premium_only=false)
  ORDER BY
    (CASE WHEN v.is_trusted_channel THEN 1 ELSE 0 END) DESC,
    coalesce(v.halal_score,80) DESC,
    v.published_at DESC
  LIMIT _limit
$$;
