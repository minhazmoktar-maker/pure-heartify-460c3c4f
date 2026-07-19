
DROP TYPE IF EXISTS public.surface_video CASCADE;
CREATE TYPE public.surface_video AS (
  video_id text, title text, channel_id text, channel_title text, thumbnail_url text,
  category text, section_id text, published_at timestamptz, ingested_at timestamptz,
  halal_score integer, view_count integer, is_trusted_channel boolean,
  is_premium_only boolean, content_language text
);

CREATE OR REPLACE FUNCTION public.pool_recently_added(_limit int DEFAULT 40, _window_hours int DEFAULT 168, _exclude_premium boolean DEFAULT false)
RETURNS SETOF public.surface_video LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT v.video_id,v.title,v.channel_id,v.channel_title,v.thumbnail_url,v.category,v.section_id,v.published_at,v.ingested_at,v.halal_score,v.view_count,v.is_trusted_channel,v.is_premium_only,v.content_language
  FROM public.curated_videos v
  WHERE v.moderation_state IN ('approved','auto_approved') AND v.is_hidden=false AND v.is_archived=false
    AND v.ingested_at >= now() - make_interval(hours=>_window_hours)
    AND (NOT _exclude_premium OR v.is_premium_only=false)
  ORDER BY v.ingested_at DESC LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.pool_new_videos(_limit int DEFAULT 40, _window_days int DEFAULT 7, _exclude_premium boolean DEFAULT false)
RETURNS SETOF public.surface_video LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT v.video_id,v.title,v.channel_id,v.channel_title,v.thumbnail_url,v.category,v.section_id,v.published_at,v.ingested_at,v.halal_score,v.view_count,v.is_trusted_channel,v.is_premium_only,v.content_language
  FROM public.curated_videos v
  WHERE v.moderation_state IN ('approved','auto_approved') AND v.is_hidden=false AND v.is_archived=false
    AND v.published_at IS NOT NULL
    AND v.published_at >= now() - make_interval(days=>_window_days)
    AND (NOT _exclude_premium OR v.is_premium_only=false)
  ORDER BY v.published_at DESC LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.pool_trending_7d(_limit int DEFAULT 60, _exclude_premium boolean DEFAULT false)
RETURNS SETOF public.surface_video LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH pool AS (
    SELECT v.*, EXTRACT(EPOCH FROM (now() - v.published_at))/86400.0 AS age_d
    FROM public.curated_videos v
    WHERE v.moderation_state IN ('approved','auto_approved') AND v.is_hidden=false AND v.is_archived=false
      AND v.published_at >= now() - interval '30 days'
      AND v.view_count IS NOT NULL AND v.view_count > 500
      AND (NOT _exclude_premium OR v.is_premium_only=false)
  )
  SELECT video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language
  FROM pool
  ORDER BY (ln(view_count + 10) / GREATEST(age_d + 2, 3)) * CASE WHEN is_trusted_channel THEN 1.15 ELSE 1.0 END DESC
  LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.pool_popular_week(_limit int DEFAULT 60, _exclude_premium boolean DEFAULT false)
RETURNS SETOF public.surface_video LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT v.video_id,v.title,v.channel_id,v.channel_title,v.thumbnail_url,v.category,v.section_id,v.published_at,v.ingested_at,v.halal_score,v.view_count,v.is_trusted_channel,v.is_premium_only,v.content_language
  FROM public.curated_videos v
  WHERE v.moderation_state IN ('approved','auto_approved') AND v.is_hidden=false AND v.is_archived=false
    AND v.published_at >= now() - interval '7 days' AND v.view_count IS NOT NULL
    AND (NOT _exclude_premium OR v.is_premium_only=false)
  ORDER BY v.view_count DESC LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.pool_hidden_gems(_limit int DEFAULT 60, _min_halal int DEFAULT 90, _max_views int DEFAULT 5000, _exclude_premium boolean DEFAULT false)
RETURNS SETOF public.surface_video LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT v.video_id,v.title,v.channel_id,v.channel_title,v.thumbnail_url,v.category,v.section_id,v.published_at,v.ingested_at,v.halal_score,v.view_count,v.is_trusted_channel,v.is_premium_only,v.content_language
  FROM public.curated_videos v
  WHERE v.moderation_state IN ('approved','auto_approved') AND v.is_hidden=false AND v.is_archived=false
    AND v.halal_score >= _min_halal
    AND coalesce(v.view_count,0) < _max_views
    AND v.published_at >= now() - interval '365 days'
    AND (NOT _exclude_premium OR v.is_premium_only=false)
  ORDER BY v.halal_score DESC, v.ingested_at DESC LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.pool_new_channels(_limit int DEFAULT 24, _window_days int DEFAULT 45, _exclude_premium boolean DEFAULT false)
RETURNS SETOF public.surface_video LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH first_seen AS (
    SELECT channel_id, min(ingested_at) AS first_ingested
    FROM public.curated_videos
    WHERE moderation_state IN ('approved','auto_approved') AND is_hidden=false AND is_archived=false AND channel_id IS NOT NULL
    GROUP BY channel_id
    HAVING min(ingested_at) >= now() - make_interval(days=>_window_days)
  ),
  picked AS (
    SELECT v.*, row_number() OVER (PARTITION BY v.channel_id ORDER BY v.view_count DESC NULLS LAST, v.ingested_at DESC) AS rn
    FROM public.curated_videos v
    JOIN first_seen f ON f.channel_id = v.channel_id
    WHERE v.moderation_state IN ('approved','auto_approved') AND v.is_hidden=false AND v.is_archived=false
      AND (NOT _exclude_premium OR v.is_premium_only=false)
  )
  SELECT video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,published_at,ingested_at,halal_score,view_count,is_trusted_channel,is_premium_only,content_language
  FROM picked WHERE rn=1 ORDER BY ingested_at DESC LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.pool_continue_watching(_user_id uuid, _limit int DEFAULT 12)
RETURNS SETOF public.surface_video LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH latest AS (
    SELECT DISTINCT ON (h.video_id) h.video_id, h.watched_at
    FROM public.watch_history h
    WHERE h.user_id = _user_id
      AND h.watched_at >= now() - interval '30 days'
      AND coalesce(h.completed,false)=false
      AND coalesce(h.duration_seconds,0) > 30
      AND coalesce(h.progress_seconds,0) BETWEEN 10 AND (h.duration_seconds - 30)
    ORDER BY h.video_id, h.watched_at DESC
  )
  SELECT v.video_id,v.title,v.channel_id,v.channel_title,v.thumbnail_url,v.category,v.section_id,v.published_at,v.ingested_at,v.halal_score,v.view_count,v.is_trusted_channel,v.is_premium_only,v.content_language
  FROM latest l JOIN public.curated_videos v ON v.video_id = l.video_id
  WHERE v.moderation_state IN ('approved','auto_approved') AND v.is_hidden=false AND v.is_archived=false
  ORDER BY l.watched_at DESC LIMIT _limit
$$;

CREATE OR REPLACE FUNCTION public.pool_because_you_watched(_user_id uuid, _limit int DEFAULT 40, _exclude_premium boolean DEFAULT false)
RETURNS SETOF public.surface_video LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
DECLARE
  seed_embedding extensions.vector(1536);
  seed_channels text[];
  seed_videos text[];
BEGIN
  SELECT array_agg(DISTINCT v.channel_id) FILTER (WHERE v.channel_id IS NOT NULL),
         array_agg(DISTINCT v.video_id)
  INTO seed_channels, seed_videos
  FROM public.watch_history h
  JOIN public.curated_videos v ON v.video_id = h.video_id
  WHERE h.user_id = _user_id
    AND h.watched_at >= now() - interval '60 days'
    AND (coalesce(h.completed,false) = true OR coalesce(h.progress_seconds,0) > 60)
    AND v.embedding IS NOT NULL;

  IF seed_videos IS NULL OR array_length(seed_videos, 1) IS NULL THEN RETURN; END IF;

  SELECT AVG(v.embedding)::extensions.vector(1536)
  INTO seed_embedding
  FROM public.curated_videos v
  WHERE v.video_id = ANY(seed_videos) AND v.embedding IS NOT NULL;

  IF seed_embedding IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT v.video_id, v.title, v.channel_id, v.channel_title, v.thumbnail_url,
         v.category, v.section_id, v.published_at, v.ingested_at,
         v.halal_score, v.view_count, v.is_trusted_channel,
         v.is_premium_only, v.content_language
  FROM public.curated_videos v
  WHERE v.embedding IS NOT NULL
    AND v.moderation_state IN ('approved','auto_approved')
    AND v.is_hidden=false AND v.is_archived=false
    AND NOT (v.video_id = ANY(seed_videos))
    AND (seed_channels IS NULL OR NOT (v.channel_id = ANY(seed_channels)))
    AND (NOT _exclude_premium OR v.is_premium_only=false)
  ORDER BY v.embedding <=> seed_embedding
  LIMIT _limit;
END $$;

GRANT EXECUTE ON FUNCTION public.pool_recently_added(int,int,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pool_new_videos(int,int,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pool_trending_7d(int,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pool_popular_week(int,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pool_hidden_gems(int,int,int,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pool_new_channels(int,int,boolean) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pool_continue_watching(uuid,int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pool_because_you_watched(uuid,int,boolean) TO authenticated;
