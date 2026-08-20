-- Migration: wire visual_state through every recommendation RPC and enforce
-- the verified-only halal serving floor (visual_state = 'clean').

-- Drop dependent functions first so ALTER TYPE is safe.
DROP FUNCTION IF EXISTS public.pool_because_you_watched(uuid, integer, boolean);
DROP FUNCTION IF EXISTS public.pool_beneficial_v1(uuid, integer, boolean);
DROP FUNCTION IF EXISTS public.pool_continue_watching(uuid, integer);
DROP FUNCTION IF EXISTS public.pool_for_you_v2(uuid, integer, boolean);
DROP FUNCTION IF EXISTS public.pool_hidden_gems(integer, integer, integer, boolean);
DROP FUNCTION IF EXISTS public.pool_new_channels(integer, integer, boolean);
DROP FUNCTION IF EXISTS public.pool_new_videos(integer, integer, boolean);
DROP FUNCTION IF EXISTS public.pool_popular_week(integer, boolean);
DROP FUNCTION IF EXISTS public.pool_recently_added(integer, integer, boolean);
DROP FUNCTION IF EXISTS public.pool_trending_7d(integer, boolean);
DROP FUNCTION IF EXISTS public.get_feed_candidates_diversified(integer, integer, text, text, text[], timestamp with time zone, boolean, text, text[]);
DROP FUNCTION IF EXISTS public.search_videos(text, text, text, integer, integer);

-- Extend composite return types with the visual safety signal.
ALTER TYPE public.surface_video ADD ATTRIBUTE visual_state text;
ALTER TYPE public.beneficial_video ADD ATTRIBUTE visual_state text;

-- Recreate every pool function with the visual_state column selected and the
-- strict 'clean' floor enforced at the database layer.

CREATE OR REPLACE FUNCTION public.pool_because_you_watched(
  _user_id uuid,
  _limit integer DEFAULT 40,
  _exclude_premium boolean DEFAULT false
)
RETURNS SETOF surface_video
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
    AND (coalesce(h.completed, false) = true OR coalesce(h.progress_seconds, 0) > 60)
    AND v.embedding IS NOT NULL
    AND v.visual_state = 'clean';

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
         v.is_premium_only, v.content_language, v.visual_state
  FROM public.curated_videos v
  WHERE v.embedding IS NOT NULL
    AND v.moderation_state IN ('approved','auto_approved')
    AND v.is_hidden = false
    AND v.is_archived = false
    AND v.visual_state = 'clean'
    AND NOT (v.video_id = ANY(seed_videos))
    AND (seed_channels IS NULL OR NOT (v.channel_id = ANY(seed_channels)))
    AND (NOT _exclude_premium OR v.is_premium_only = false)
  ORDER BY v.embedding <=> seed_embedding
  LIMIT _limit;
END $function$;

CREATE OR REPLACE FUNCTION public.pool_beneficial_v1(
  _user_id uuid,
  _limit integer DEFAULT 160,
  _exclude_premium boolean DEFAULT false
)
RETURNS SETOF beneficial_video
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH prof AS (
    SELECT creator_affinity, topic_affinity, language_affinity, signal_count
    FROM public.user_taste_profiles WHERE user_id = _user_id
  ),
  goals AS (
    SELECT primary_interest, secondary_interest, exploration_interest
    FROM public.user_interests WHERE user_id = _user_id
  ),
  seen AS (
    SELECT video_id FROM public.watch_history WHERE user_id = _user_id
  ),
  seen_channels AS (
    SELECT DISTINCT v.channel_id
    FROM public.watch_history h
    JOIN public.curated_videos v ON v.video_id = h.video_id
    WHERE h.user_id = _user_id AND h.watched_at > now() - interval '30 days'
      AND v.channel_id IS NOT NULL
      AND v.visual_state = 'clean'
  ),
  scored AS (
    SELECT v.*,
      (CASE v.moderation_state
         WHEN 'approved' THEN 1.0
         WHEN 'auto_approved' THEN 0.85
         ELSE 0.6 END)
        + (CASE WHEN v.is_trusted_channel THEN 0.15 ELSE 0 END)
        + COALESCE(v.halal_score, 90)::numeric / 500.0                             AS trust_s,
      (CASE WHEN v.category = (SELECT primary_interest FROM goals) THEN 0.60
            WHEN v.category = (SELECT secondary_interest FROM goals) THEN 0.35
            WHEN v.category = (SELECT exploration_interest FROM goals) THEN 0.20
            ELSE 0 END)                                                            AS goal_s,
      COALESCE((SELECT (topic_affinity->>v.category)::numeric FROM prof), 0)       AS topic_s,
      COALESCE((SELECT (creator_affinity->>v.channel_id)::numeric FROM prof), 0)   AS creator_s,
      COALESCE((SELECT (language_affinity->>v.content_language)::numeric FROM prof), 0) AS lang_s,
      (CASE WHEN v.channel_id IS NOT NULL
              AND v.channel_id NOT IN (SELECT channel_id FROM seen_channels)
            THEN 0.25 ELSE 0 END)                                                  AS novelty_s,
      0.30 / GREATEST(EXTRACT(EPOCH FROM (now() - COALESCE(v.published_at, v.ingested_at)))/86400.0 + 3, 3)
                                                                                   AS fresh_s
    FROM public.curated_videos v
    WHERE v.moderation_state IN ('approved','auto_approved')
      AND v.is_hidden = false
      AND v.is_archived = false
      AND v.visual_state = 'clean'
      AND (NOT _exclude_premium OR v.is_premium_only = false)
      AND v.video_id NOT IN (SELECT video_id FROM seen)
  ),
  ranked AS (
    SELECT s.*,
      (1.4 * trust_s + 1.6 * goal_s + 1.2 * topic_s + 0.9 * creator_s
       + 0.5 * lang_s + 0.6 * novelty_s + 0.4 * fresh_s) AS benefit_score,
      CASE
        WHEN (SELECT primary_interest FROM goals) IS NOT NULL
             AND s.category = (SELECT primary_interest FROM goals)
          THEN 'Aligned with your goal: ' || s.category
        WHEN creator_s >= 0.4 THEN 'From a creator you learn from'
        WHEN topic_s >= 0.4 THEN 'Because you learn ' || s.category
        WHEN s.is_trusted_channel THEN 'Trusted source · reviewed'
        WHEN s.channel_id IS NOT NULL
             AND s.channel_id NOT IN (SELECT channel_id FROM seen_channels)
          THEN 'New voice worth hearing'
        WHEN COALESCE(s.halal_score, 0) >= 95 THEN 'Highly reviewed'
        ELSE 'Beneficial for you'
      END AS reason
    FROM scored s
  ),
  capped AS (
    SELECT r.*,
      row_number() OVER (
        PARTITION BY COALESCE(r.channel_id, r.channel_title, r.video_id)
        ORDER BY r.benefit_score DESC NULLS LAST, r.ingested_at DESC
      ) AS ch_rn
    FROM (
      SELECT * FROM ranked ORDER BY benefit_score DESC NULLS LAST, ingested_at DESC LIMIT 4000
    ) r
  )
  SELECT video_id, title, channel_id, channel_title, thumbnail_url, category, section_id,
         published_at, ingested_at, halal_score, view_count, is_trusted_channel,
         is_premium_only, content_language, reason, benefit_score, visual_state
  FROM capped
  WHERE ch_rn <= 3
  ORDER BY ch_rn ASC, benefit_score DESC NULLS LAST, ingested_at DESC
  LIMIT _limit
$function$;

CREATE OR REPLACE FUNCTION public.pool_continue_watching(
  _user_id uuid,
  _limit integer DEFAULT 12
)
RETURNS SETOF surface_video
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH latest AS (
    SELECT DISTINCT ON (h.video_id) h.video_id, h.watched_at
    FROM public.watch_history h
    WHERE h.user_id = _user_id
      AND h.watched_at >= now() - interval '30 days'
      AND coalesce(h.completed, false) = false
      AND coalesce(h.duration_seconds, 0) > 30
      AND coalesce(h.progress_seconds, 0) BETWEEN 10 AND (h.duration_seconds - 30)
    ORDER BY h.video_id, h.watched_at DESC
  )
  SELECT v.video_id, v.title, v.channel_id, v.channel_title, v.thumbnail_url,
         v.category, v.section_id, v.published_at, v.ingested_at,
         v.halal_score, v.view_count, v.is_trusted_channel,
         v.is_premium_only, v.content_language, v.visual_state
  FROM latest l JOIN public.curated_videos v ON v.video_id = l.video_id
  WHERE v.moderation_state IN ('approved','auto_approved')
    AND v.is_hidden = false
    AND v.is_archived = false
    AND v.visual_state = 'clean'
  ORDER BY l.watched_at DESC LIMIT _limit
$function$;

CREATE OR REPLACE FUNCTION public.pool_for_you_v2(
  _user_id uuid,
  _limit integer DEFAULT 200,
  _exclude_premium boolean DEFAULT false
)
RETURNS SETOF surface_video
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
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
      COALESCE((SELECT (language_affinity->>v.content_language)::numeric FROM p), 0) AS lang_s,
      EXTRACT(EPOCH FROM (now() - v.published_at))/86400.0 AS age_d
    FROM public.curated_videos v
    WHERE v.moderation_state IN ('approved','auto_approved')
      AND v.is_hidden = false
      AND v.is_archived = false
      AND v.visual_state = 'clean'
      AND (NOT _exclude_premium OR v.is_premium_only = false)
      AND v.video_id NOT IN (SELECT video_id FROM seen)
  )
  SELECT video_id, title, channel_id, channel_title, thumbnail_url, category, section_id,
         published_at, ingested_at, halal_score, view_count, is_trusted_channel,
         is_premium_only, content_language, visual_state
  FROM scored
  ORDER BY (
      2.0 * topic_s
    + 1.5 * creator_s
    + 0.8 * lang_s
    + 0.4 / GREATEST(age_d + 2, 3)
  ) DESC NULLS LAST,
  ingested_at DESC
  LIMIT _limit
$function$;

CREATE OR REPLACE FUNCTION public.pool_hidden_gems(
  _limit integer DEFAULT 60,
  _min_halal integer DEFAULT 90,
  _max_views integer DEFAULT 5000,
  _exclude_premium boolean DEFAULT false
)
RETURNS SETOF surface_video
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT v.video_id, v.title, v.channel_id, v.channel_title, v.thumbnail_url,
         v.category, v.section_id, v.published_at, v.ingested_at,
         v.halal_score, v.view_count, v.is_trusted_channel,
         v.is_premium_only, v.content_language, v.visual_state
  FROM public.curated_videos v
  WHERE v.moderation_state IN ('approved','auto_approved')
    AND v.is_hidden = false
    AND v.is_archived = false
    AND v.visual_state = 'clean'
    AND v.halal_score >= _min_halal
    AND coalesce(v.view_count, 0) < _max_views
    AND v.published_at >= now() - interval '365 days'
    AND (NOT _exclude_premium OR v.is_premium_only = false)
  ORDER BY v.halal_score DESC, v.ingested_at DESC LIMIT _limit
$function$;

CREATE OR REPLACE FUNCTION public.pool_new_channels(
  _limit integer DEFAULT 24,
  _window_days integer DEFAULT 45,
  _exclude_premium boolean DEFAULT false
)
RETURNS SETOF surface_video
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH first_seen AS (
    SELECT channel_id, min(ingested_at) AS first_ingested
    FROM public.curated_videos
    WHERE moderation_state IN ('approved','auto_approved')
      AND is_hidden = false
      AND is_archived = false
      AND visual_state = 'clean'
      AND channel_id IS NOT NULL
    GROUP BY channel_id
    HAVING min(ingested_at) >= now() - make_interval(days=>_window_days)
  ),
  picked AS (
    SELECT v.*,
      row_number() OVER (
        PARTITION BY v.channel_id
        ORDER BY v.view_count DESC NULLS LAST, v.ingested_at DESC
      ) AS rn
    FROM public.curated_videos v
    JOIN first_seen f ON f.channel_id = v.channel_id
    WHERE v.moderation_state IN ('approved','auto_approved')
      AND v.is_hidden = false
      AND v.is_archived = false
      AND v.visual_state = 'clean'
      AND (NOT _exclude_premium OR v.is_premium_only = false)
  )
  SELECT video_id, title, channel_id, channel_title, thumbnail_url, category, section_id,
         published_at, ingested_at, halal_score, view_count, is_trusted_channel,
         is_premium_only, content_language, visual_state
  FROM picked
  WHERE rn = 1
  ORDER BY ingested_at DESC LIMIT _limit
$function$;

CREATE OR REPLACE FUNCTION public.pool_new_videos(
  _limit integer DEFAULT 40,
  _window_days integer DEFAULT 7,
  _exclude_premium boolean DEFAULT false
)
RETURNS SETOF surface_video
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT v.video_id, v.title, v.channel_id, v.channel_title, v.thumbnail_url,
         v.category, v.section_id, v.published_at, v.ingested_at,
         v.halal_score, v.view_count, v.is_trusted_channel,
         v.is_premium_only, v.content_language, v.visual_state
  FROM public.curated_videos v
  WHERE v.moderation_state IN ('approved','auto_approved')
    AND v.is_hidden = false
    AND v.is_archived = false
    AND v.visual_state = 'clean'
    AND v.published_at IS NOT NULL
    AND v.published_at >= now() - make_interval(days=>_window_days)
    AND (NOT _exclude_premium OR v.is_premium_only = false)
  ORDER BY v.published_at DESC LIMIT _limit
$function$;

CREATE OR REPLACE FUNCTION public.pool_popular_week(
  _limit integer DEFAULT 60,
  _exclude_premium boolean DEFAULT false
)
RETURNS SETOF surface_video
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT v.video_id, v.title, v.channel_id, v.channel_title, v.thumbnail_url,
         v.category, v.section_id, v.published_at, v.ingested_at,
         v.halal_score, v.view_count, v.is_trusted_channel,
         v.is_premium_only, v.content_language, v.visual_state
  FROM public.curated_videos v
  WHERE v.moderation_state IN ('approved','auto_approved')
    AND v.is_hidden = false
    AND v.is_archived = false
    AND v.visual_state = 'clean'
    AND v.published_at >= now() - interval '14 days'
    AND (NOT _exclude_premium OR v.is_premium_only = false)
  ORDER BY
    (CASE WHEN v.is_trusted_channel THEN 1 ELSE 0 END) DESC,
    coalesce(v.halal_score, 80) DESC,
    v.published_at DESC
  LIMIT _limit
$function$;

CREATE OR REPLACE FUNCTION public.pool_recently_added(
  _limit integer DEFAULT 40,
  _window_hours integer DEFAULT 168,
  _exclude_premium boolean DEFAULT false
)
RETURNS SETOF surface_video
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH base AS (
    SELECT v.video_id, v.title, v.channel_id, v.channel_title, v.thumbnail_url,
           v.category, v.section_id, v.published_at, v.ingested_at,
           v.halal_score, v.view_count, v.is_trusted_channel,
           v.is_premium_only, v.content_language, v.visual_state,
           row_number() OVER (
             PARTITION BY COALESCE(v.channel_id, v.channel_title, v.video_id)
             ORDER BY v.ingested_at DESC
           ) AS ch_rn
    FROM public.curated_videos v
    WHERE v.moderation_state IN ('approved','auto_approved')
      AND v.is_hidden = false
      AND v.is_archived = false
      AND v.visual_state = 'clean'
      AND v.ingested_at >= now() - make_interval(hours=>_window_hours)
      AND (NOT _exclude_premium OR v.is_premium_only = false)
  )
  SELECT video_id, title, channel_id, channel_title, thumbnail_url, category, section_id,
         published_at, ingested_at, halal_score, view_count, is_trusted_channel,
         is_premium_only, content_language, visual_state
  FROM base
  WHERE ch_rn <= 2
  ORDER BY ch_rn ASC, ingested_at DESC
  LIMIT _limit
$function$;

CREATE OR REPLACE FUNCTION public.pool_trending_7d(
  _limit integer DEFAULT 60,
  _exclude_premium boolean DEFAULT false
)
RETURNS SETOF surface_video
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  WITH pool AS (
    SELECT v.*,
      EXTRACT(EPOCH FROM (now() - v.published_at))/86400.0 AS age_d
    FROM public.curated_videos v
    WHERE v.moderation_state IN ('approved','auto_approved')
      AND v.is_hidden = false
      AND v.is_archived = false
      AND v.visual_state = 'clean'
      AND v.published_at >= now() - interval '30 days'
      AND (NOT _exclude_premium OR v.is_premium_only = false)
  )
  SELECT video_id, title, channel_id, channel_title, thumbnail_url, category, section_id,
         published_at, ingested_at, halal_score, view_count, is_trusted_channel,
         is_premium_only, content_language, visual_state
  FROM pool
  ORDER BY
    (coalesce(halal_score, 80)::float / GREATEST(age_d + 2, 3))
      * CASE WHEN is_trusted_channel THEN 1.20 ELSE 1.0 END
    DESC
  LIMIT _limit
$function$;

-- Feed candidate RPC: already returns visual_state, now enforces the clean floor.
CREATE OR REPLACE FUNCTION public.get_feed_candidates_diversified(
  _limit integer DEFAULT 400,
  _per_channel integer DEFAULT 4,
  _category text DEFAULT NULL::text,
  _section_id text DEFAULT NULL::text,
  _section_aliases text[] DEFAULT NULL::text[],
  _cursor timestamp with time zone DEFAULT NULL::timestamp with time zone,
  _exclude_premium boolean DEFAULT true,
  _order text DEFAULT 'fresh'::text,
  _languages text[] DEFAULT NULL::text[]
)
RETURNS TABLE(
  video_id text, title text, channel_id text, channel_title text, thumbnail_url text,
  category text, section_id text, published_at timestamp with time zone, ingested_at timestamp with time zone,
  halal_score numeric, view_count bigint, is_trusted_channel boolean, is_premium_only boolean,
  content_language text, visual_state text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH base AS (
    SELECT
      cv.video_id, cv.title, cv.channel_id, cv.channel_title, cv.thumbnail_url,
      cv.category, cv.section_id, cv.published_at, cv.ingested_at,
      cv.halal_score, cv.view_count, cv.is_trusted_channel, cv.is_premium_only,
      cv.content_language, cv.visual_state,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(cv.channel_id, cv.channel_title, cv.video_id)
        ORDER BY
          CASE WHEN _order = 'recent' THEN cv.ingested_at ELSE cv.published_at END DESC NULLS LAST,
          cv.halal_score DESC NULLS LAST
      ) AS rn_channel
    FROM public.curated_videos cv
    WHERE cv.moderation_state IN ('approved','auto_approved')
      AND cv.is_hidden = false
      AND cv.is_archived = false
      AND cv.visual_state = 'clean'
      AND (NOT _exclude_premium OR cv.is_premium_only = false)
      AND (_category IS NULL OR cv.category = _category)
      AND (
        _languages IS NULL
        OR array_length(_languages, 1) IS NULL
        OR cv.content_language IS NULL
        OR lower(cv.content_language) = ANY(_languages)
      )
      AND (
        _section_id IS NULL
        OR cv.section_id = _section_id
        OR (_section_aliases IS NOT NULL AND cv.category = ANY(_section_aliases))
      )
      AND (
        _cursor IS NULL
        OR (CASE WHEN _order = 'recent' THEN cv.ingested_at ELSE cv.published_at END) < _cursor
      )
  )
  SELECT
    video_id, title, channel_id, channel_title, thumbnail_url,
    category, section_id, published_at, ingested_at,
    halal_score, view_count, is_trusted_channel, is_premium_only, content_language, visual_state
  FROM base
  WHERE rn_channel <= GREATEST(_per_channel, 1)
  ORDER BY
    CASE WHEN _order = 'recent' THEN ingested_at ELSE published_at END DESC NULLS LAST,
    halal_score DESC NULLS LAST,
    ingested_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 1);
$function$;

-- Search: enforce the visual clean floor on every path.
CREATE OR REPLACE FUNCTION public.search_videos(
  _query text,
  _category text DEFAULT NULL::text,
  _channel text DEFAULT NULL::text,
  _limit integer DEFAULT 40,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  video_id text, title text, channel_title text, category text, thumbnail_url text,
  halal_score integer, published_at timestamp with time zone, is_trusted_channel boolean,
  rank real, match_type text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  q text := lower(trim(coalesce(_query, '')));
BEGIN
  IF q = '' THEN
    RETURN QUERY
      SELECT v.video_id, v.title, v.channel_title, v.category, v.thumbnail_url,
             v.halal_score, v.published_at, v.is_trusted_channel,
             0.0::real, 'browse'::text
      FROM public.curated_videos v
      WHERE (_category IS NULL OR v.category = _category)
        AND (_channel  IS NULL OR v.channel_title = _channel)
        AND COALESCE(v.is_hidden, false) = false
        AND COALESCE(v.is_archived, false) = false
        AND v.is_trusted_channel = true
        AND COALESCE(v.halal_score, 0) >= 85
        AND v.visual_state = 'clean'
        AND (
          v.moderation_state IN ('approved','auto_approved')
          OR COALESCE(v.halal_score, 0) >= 85
        )
      ORDER BY v.published_at DESC NULLS LAST
      LIMIT _limit OFFSET _offset;
    RETURN;
  END IF;

  RETURN QUERY
  WITH prefix_ids AS (
    SELECT v.id
    FROM public.curated_videos v
    WHERE (_category IS NULL OR v.category = _category)
      AND (_channel  IS NULL OR v.channel_title = _channel)
      AND COALESCE(v.is_hidden, false) = false
      AND COALESCE(v.is_archived, false) = false
      AND v.is_trusted_channel = true
      AND COALESCE(v.halal_score, 0) >= 85
      AND v.visual_state = 'clean'
      AND (
        v.moderation_state IN ('approved','auto_approved')
        OR COALESCE(v.halal_score, 0) >= 85
      )
      AND (lower(v.title) LIKE q || '%' OR lower(v.channel_title) LIKE q || '%' OR lower(coalesce(v.category,'')) LIKE q || '%')
    ORDER BY lower(v.title), v.published_at DESC NULLS LAST
    LIMIT 300
  ),
  contains_ids AS (
    SELECT v.id
    FROM public.curated_videos v
    WHERE (_category IS NULL OR v.category = _category)
      AND (_channel  IS NULL OR v.channel_title = _channel)
      AND COALESCE(v.is_hidden, false) = false
      AND COALESCE(v.is_archived, false) = false
      AND v.is_trusted_channel = true
      AND COALESCE(v.halal_score, 0) >= 85
      AND v.visual_state = 'clean'
      AND (
        v.moderation_state IN ('approved','auto_approved')
        OR COALESCE(v.halal_score, 0) >= 85
      )
      AND (v.title ILIKE '%' || q || '%' OR v.channel_title ILIKE '%' || q || '%')
    ORDER BY v.published_at DESC NULLS LAST
    LIMIT 600
  ),
  ids AS (
    SELECT id FROM prefix_ids
    UNION
    SELECT id FROM contains_ids
  ),
  scored AS (
    SELECT
      v.video_id, v.title, v.channel_title, v.category, v.thumbnail_url,
      v.halal_score, v.published_at, v.is_trusted_channel,
      CASE
        WHEN lower(v.title) = q THEN 1.0
        WHEN lower(v.title) LIKE q || '%' THEN 0.90
        WHEN lower(v.channel_title) LIKE q || '%' THEN 0.84
        WHEN lower(coalesce(v.category,'')) LIKE q || '%' THEN 0.74
        WHEN v.title ILIKE '%' || q || '%' THEN 0.66
        WHEN v.channel_title ILIKE '%' || q || '%' THEN 0.58
        ELSE 0.25
      END::numeric AS lexical_score,
      GREATEST(
        0.0,
        1.0 - EXTRACT(EPOCH FROM (now() - coalesce(v.published_at, now()))) / (86400.0 * 365.0 * 3.0)
      ) AS recency_boost,
      COALESCE(v.halal_score, 0)::numeric / 100.0 AS halal_boost
    FROM ids
    JOIN public.curated_videos v USING (id)
    WHERE NOT public._suggestion_is_blocked(v.title)
      AND NOT public._suggestion_is_blocked(v.channel_title)
  )
  SELECT
    s.video_id, s.title, s.channel_title, s.category, s.thumbnail_url,
    s.halal_score, s.published_at, s.is_trusted_channel,
    (0.64 * s.lexical_score
     + 0.18 * s.recency_boost
     + 0.18 * s.halal_boost)::real AS rank,
    CASE
      WHEN s.lexical_score >= 0.74 THEN 'fulltext'
      WHEN s.lexical_score >= 0.58 THEN 'related'
      ELSE 'fuzzy'
    END::text AS match_type
  FROM scored s
  ORDER BY rank DESC, s.published_at DESC NULLS LAST
  LIMIT _limit OFFSET _offset;
END;
$function$;
