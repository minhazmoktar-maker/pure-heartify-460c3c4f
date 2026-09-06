-- Search was timing out: the substring lane scanned the whole serving corpus
-- with ILIKE '%q%' and then sorted every match by published_at. Add trigram +
-- partial indexes matching the serving predicate, drop the unnecessary sort,
-- and bound the function with its own statement timeout so a slow lane fails
-- fast instead of hanging the request.

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

CREATE INDEX IF NOT EXISTS curated_videos_serving_title_trgm
  ON public.curated_videos USING gin (lower(title) extensions.gin_trgm_ops)
  WHERE COALESCE(is_hidden, false) = false
    AND COALESCE(is_archived, false) = false
    AND is_trusted_channel = true
    AND COALESCE(halal_score, 0) >= 85
    AND visual_state = 'clean';

CREATE INDEX IF NOT EXISTS curated_videos_serving_channel_trgm
  ON public.curated_videos USING gin (lower(channel_title) extensions.gin_trgm_ops)
  WHERE COALESCE(is_hidden, false) = false
    AND COALESCE(is_archived, false) = false
    AND is_trusted_channel = true
    AND COALESCE(halal_score, 0) >= 85
    AND visual_state = 'clean';

CREATE INDEX IF NOT EXISTS curated_videos_serving_published_at
  ON public.curated_videos (published_at DESC NULLS LAST)
  WHERE COALESCE(is_hidden, false) = false
    AND COALESCE(is_archived, false) = false
    AND is_trusted_channel = true
    AND COALESCE(halal_score, 0) >= 85
    AND visual_state = 'clean';

CREATE INDEX IF NOT EXISTS curated_videos_serving_category_published
  ON public.curated_videos (category, published_at DESC NULLS LAST)
  WHERE COALESCE(is_hidden, false) = false
    AND COALESCE(is_archived, false) = false
    AND is_trusted_channel = true
    AND COALESCE(halal_score, 0) >= 85
    AND visual_state = 'clean';

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
SET statement_timeout TO '9s'
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
        lower(v.title) LIKE q || '%'
        OR lower(v.channel_title) LIKE q || '%'
        OR lower(coalesce(v.category, '')) LIKE q || '%'
      )
    LIMIT 300
  ),
  contains_ids AS (
    -- No ORDER BY: with the trigram indexes in place the planner can stop as
    -- soon as the limit is filled instead of sorting every substring match.
    SELECT v.id
    FROM public.curated_videos v
    WHERE (_category IS NULL OR v.category = _category)
      AND (_channel  IS NULL OR v.channel_title = _channel)
      AND COALESCE(v.is_hidden, false) = false
      AND COALESCE(v.is_archived, false) = false
      AND v.is_trusted_channel = true
      AND COALESCE(v.halal_score, 0) >= 85
      AND v.visual_state = 'clean'
      AND (lower(v.title) LIKE '%' || q || '%' OR lower(v.channel_title) LIKE '%' || q || '%')
    LIMIT 400
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
        WHEN lower(v.title) LIKE '%' || q || '%' THEN 0.66
        WHEN lower(v.channel_title) LIKE '%' || q || '%' THEN 0.58
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