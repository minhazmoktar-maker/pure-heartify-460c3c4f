
-- 1. Taste profile store
CREATE TABLE IF NOT EXISTS public.user_taste_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_affinity jsonb NOT NULL DEFAULT '{}'::jsonb,
  topic_affinity   jsonb NOT NULL DEFAULT '{}'::jsonb,
  language_affinity jsonb NOT NULL DEFAULT '{}'::jsonb,
  hour_histogram   jsonb NOT NULL DEFAULT '{}'::jsonb,
  avg_completion   numeric NOT NULL DEFAULT 0,
  avg_session_len  numeric NOT NULL DEFAULT 0,
  interest_drift   numeric NOT NULL DEFAULT 0,
  signal_count     integer NOT NULL DEFAULT 0,
  last_signal_at   timestamptz,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_taste_profiles TO authenticated;
GRANT ALL    ON public.user_taste_profiles TO service_role;

ALTER TABLE public.user_taste_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user reads own taste" ON public.user_taste_profiles;
CREATE POLICY "user reads own taste" ON public.user_taste_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 2. Aggregator: reads recent multi-signal activity for one user, applies
--    exponential time decay (half-life ~ 7 days), writes the profile.
CREATE OR REPLACE FUNCTION public.refresh_user_taste_profile(_user_id uuid)
RETURNS public.user_taste_profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _now timestamptz := now();
  _row public.user_taste_profiles;
BEGIN
  WITH
  -- Watch signals with weights:
  --   completed   = 1.0
  --   > 60% prog  = 0.7
  --   any watch   = 0.3
  -- Time decay: 0.5 ^ (age_days / 7)
  watch AS (
    SELECT h.video_id,
           v.channel_id, v.channel_title, v.category, v.content_language,
           EXTRACT(HOUR FROM h.watched_at AT TIME ZONE 'UTC')::int AS hour,
           CASE
             WHEN h.completed THEN 1.0
             WHEN h.duration_seconds > 0
               AND h.progress_seconds::numeric / h.duration_seconds > 0.6 THEN 0.7
             ELSE 0.3
           END AS base_w,
           POWER(0.5, GREATEST(EXTRACT(EPOCH FROM (_now - h.watched_at)) / 86400.0, 0) / 7.0) AS decay,
           h.watched_at AS at
    FROM public.watch_history h
    JOIN public.curated_videos v USING (video_id)
    WHERE h.user_id = _user_id
      AND h.watched_at >= _now - interval '60 days'
  ),
  -- Favorites (likes/bookmarks): strong positive
  favs AS (
    SELECT f.video_id, v.channel_id, v.channel_title, v.category, v.content_language,
           EXTRACT(HOUR FROM f.created_at AT TIME ZONE 'UTC')::int AS hour,
           1.5 AS base_w,
           POWER(0.5, GREATEST(EXTRACT(EPOCH FROM (_now - f.created_at)) / 86400.0, 0) / 14.0) AS decay,
           f.created_at AS at
    FROM public.favorites f
    JOIN public.curated_videos v USING (video_id)
    WHERE f.user_id = _user_id
      AND f.created_at >= _now - interval '90 days'
  ),
  -- Skips / hides / not-interested: negative
  neg AS (
    SELECT i.video_id, v.channel_id, v.channel_title, v.category, v.content_language,
           EXTRACT(HOUR FROM i.last_action_at AT TIME ZONE 'UTC')::int AS hour,
           CASE i.last_action
             WHEN 'hide'           THEN -1.2
             WHEN 'not_interested' THEN -1.0
             WHEN 'skip'           THEN -0.4
             ELSE -0.2
           END AS base_w,
           POWER(0.5, GREATEST(EXTRACT(EPOCH FROM (_now - i.last_action_at)) / 86400.0, 0) / 10.0) AS decay,
           i.last_action_at AS at
    FROM public.feed_impressions i
    JOIN public.curated_videos v USING (video_id)
    WHERE i.user_id = _user_id
      AND i.last_action IS NOT NULL
      AND i.last_action IN ('skip','hide','not_interested','block')
      AND i.last_action_at >= _now - interval '60 days'
  ),
  signals AS (
    SELECT * FROM watch
    UNION ALL SELECT * FROM favs
    UNION ALL SELECT * FROM neg
  ),
  weighted AS (
    SELECT *, base_w * decay AS w FROM signals
  ),
  creator AS (
    SELECT jsonb_object_agg(channel_id, sw)
      FILTER (WHERE channel_id IS NOT NULL) AS m
    FROM (
      SELECT channel_id, SUM(w) AS sw
      FROM weighted GROUP BY channel_id
      ORDER BY SUM(w) DESC NULLS LAST LIMIT 40
    ) t
  ),
  topic AS (
    SELECT jsonb_object_agg(category, sw)
      FILTER (WHERE category IS NOT NULL) AS m
    FROM (
      SELECT category, SUM(w) AS sw
      FROM weighted GROUP BY category
    ) t
  ),
  lang AS (
    SELECT jsonb_object_agg(content_language, sw)
      FILTER (WHERE content_language IS NOT NULL) AS m
    FROM (
      SELECT content_language, SUM(w) AS sw
      FROM weighted GROUP BY content_language
    ) t
  ),
  hours AS (
    SELECT jsonb_object_agg(hour::text, sw) AS m
    FROM (
      SELECT hour, SUM(w) AS sw
      FROM weighted WHERE w > 0 GROUP BY hour
    ) t
  ),
  agg AS (
    SELECT
      AVG(CASE WHEN base_w > 0 THEN base_w END) AS avg_completion,
      COUNT(*) AS signal_count,
      MAX(at) AS last_signal_at
    FROM weighted
  ),
  -- Interest drift: cosine distance between last-7d and prior-30d topic
  -- vectors (0 = identical, 1 = totally different). Cheap proxy: share of
  -- top-3 recent categories missing from prior top-3.
  recent_top AS (
    SELECT array_agg(category) AS c FROM (
      SELECT category FROM weighted
      WHERE at >= _now - interval '7 days' AND w > 0 AND category IS NOT NULL
      GROUP BY category ORDER BY SUM(w) DESC LIMIT 3
    ) t
  ),
  prior_top AS (
    SELECT array_agg(category) AS c FROM (
      SELECT category FROM weighted
      WHERE at <  _now - interval '7 days' AND w > 0 AND category IS NOT NULL
      GROUP BY category ORDER BY SUM(w) DESC LIMIT 3
    ) t
  )
  INSERT INTO public.user_taste_profiles AS p (
    user_id, creator_affinity, topic_affinity, language_affinity,
    hour_histogram, avg_completion, avg_session_len, interest_drift,
    signal_count, last_signal_at, updated_at
  )
  SELECT
    _user_id,
    COALESCE((SELECT m FROM creator), '{}'::jsonb),
    COALESCE((SELECT m FROM topic),   '{}'::jsonb),
    COALESCE((SELECT m FROM lang),    '{}'::jsonb),
    COALESCE((SELECT m FROM hours),   '{}'::jsonb),
    COALESCE((SELECT avg_completion FROM agg), 0),
    0,
    CASE
      WHEN (SELECT c FROM recent_top) IS NULL OR (SELECT c FROM prior_top) IS NULL THEN 0
      ELSE 1.0 - (
        COALESCE(cardinality(ARRAY(
          SELECT unnest((SELECT c FROM recent_top))
          INTERSECT SELECT unnest((SELECT c FROM prior_top))
        )),0)::numeric
        / GREATEST(cardinality((SELECT c FROM recent_top)), 1)
      )
    END,
    COALESCE((SELECT signal_count FROM agg), 0),
    (SELECT last_signal_at FROM agg),
    _now
  ON CONFLICT (user_id) DO UPDATE SET
    creator_affinity  = EXCLUDED.creator_affinity,
    topic_affinity    = EXCLUDED.topic_affinity,
    language_affinity = EXCLUDED.language_affinity,
    hour_histogram    = EXCLUDED.hour_histogram,
    avg_completion    = EXCLUDED.avg_completion,
    interest_drift    = EXCLUDED.interest_drift,
    signal_count      = EXCLUDED.signal_count,
    last_signal_at    = EXCLUDED.last_signal_at,
    updated_at        = EXCLUDED.updated_at
  RETURNING * INTO _row;

  RETURN _row;
END $$;

REVOKE ALL ON FUNCTION public.refresh_user_taste_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.refresh_user_taste_profile(uuid) TO authenticated, service_role;

-- 3. Personalized For You candidate pool: score = topic_affinity + creator_affinity + language_affinity
--    with a small freshness bonus. Excludes videos already in watch_history.
CREATE OR REPLACE FUNCTION public.pool_for_you_v2(
  _user_id uuid,
  _limit int DEFAULT 200,
  _exclude_premium boolean DEFAULT false
) RETURNS SETOF public.surface_video
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH p AS (
    SELECT creator_affinity, topic_affinity, language_affinity
    FROM public.user_taste_profiles WHERE user_id = _user_id
  ),
  seen AS (
    SELECT video_id FROM public.watch_history WHERE user_id = _user_id
  ),
  scored AS (
    SELECT v.*,
      COALESCE((SELECT (topic_affinity->>v.category)::numeric FROM p), 0)          AS topic_s,
      COALESCE((SELECT (creator_affinity->>v.channel_id)::numeric FROM p), 0)      AS creator_s,
      COALESCE((SELECT (language_affinity->>v.content_language)::numeric FROM p),0) AS lang_s,
      EXTRACT(EPOCH FROM (now() - v.published_at))/86400.0 AS age_d
    FROM public.curated_videos v
    WHERE v.moderation_state IN ('approved','auto_approved')
      AND v.is_hidden=false AND v.is_archived=false
      AND (NOT _exclude_premium OR v.is_premium_only=false)
      AND v.video_id NOT IN (SELECT video_id FROM seen)
  )
  SELECT video_id,title,channel_id,channel_title,thumbnail_url,category,section_id,
         published_at,ingested_at,halal_score,view_count,is_trusted_channel,
         is_premium_only,content_language
  FROM scored
  ORDER BY (
      2.0 * topic_s
    + 1.5 * creator_s
    + 0.8 * lang_s
    + 0.4 / GREATEST(age_d + 2, 3)
  ) DESC NULLS LAST,
  ingested_at DESC
  LIMIT _limit
$$;

REVOKE ALL ON FUNCTION public.pool_for_you_v2(uuid,int,boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pool_for_you_v2(uuid,int,boolean) TO authenticated, service_role;
