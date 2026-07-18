
DROP FUNCTION IF EXISTS public.search_autocomplete(text, integer);

CREATE INDEX IF NOT EXISTS idx_curated_videos_title_lower
  ON public.curated_videos ((lower(title)) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_curated_videos_channel_lower
  ON public.curated_videos ((lower(channel_title)) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_curated_videos_category_lower
  ON public.curated_videos ((lower(category)));
CREATE INDEX IF NOT EXISTS idx_search_queries_normalized_lower
  ON public.search_queries ((lower(normalized_query)) text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_search_queries_created_at
  ON public.search_queries (created_at DESC);

CREATE OR REPLACE FUNCTION public._suggestion_is_blocked(_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(_text) ~*
    '(^|[^a-z])(female|females|woman|women|girl|girls|actress|actresses|singer|singers|song|songs|music|musical|musician|musicians|band|bands|concert|concerts|dance|dancer|dancing|kpop|k-pop|kdrama|k-drama|anime|manga|movie|movies|film|films|netflix|hollywood|bollywood|celebrity|celebrities|gossip|dating|romance|romantic|kiss|kissing|nude|nudity|sexy|porn|pornstar|onlyfans|drake|beyonce|rihanna|kanye|selena|bieber|ariana|nicki|cardi|megan|kardashian|jenner)($|[^a-z])'
$$;
REVOKE ALL ON FUNCTION public._suggestion_is_blocked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._suggestion_is_blocked(text) TO anon, authenticated, service_role;

CREATE FUNCTION public.search_autocomplete(_prefix text, _limit integer DEFAULT 8)
RETURNS TABLE(suggestion text, kind text, score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (
    SELECT
      lower(btrim(_prefix)) AS q,
      lower(btrim(_prefix)) || '%' AS q_prefix,
      '%' || lower(btrim(_prefix)) || '%' AS q_sub
  ),
  channels AS (
    SELECT lower(cv.channel_title) AS suggestion, 'channel'::text AS kind,
           COUNT(*)::numeric AS videos,
           MAX(CASE WHEN lower(cv.channel_title) LIKE (SELECT q_prefix FROM p) THEN 1 ELSE 0 END) AS is_prefix
    FROM public.curated_videos cv
    WHERE (SELECT q FROM p) <> ''
      AND cv.is_trusted_channel = true
      AND cv.moderation_state IN ('approved','auto_approved')
      AND COALESCE(cv.is_hidden,false) = false
      AND COALESCE(cv.is_archived,false) = false
      AND lower(cv.channel_title) LIKE (SELECT q_sub FROM p)
    GROUP BY lower(cv.channel_title)
    LIMIT 60
  ),
  categories AS (
    SELECT lower(cv.category) AS suggestion, 'category'::text AS kind,
           COUNT(*)::numeric AS videos,
           MAX(CASE WHEN lower(cv.category) LIKE (SELECT q_prefix FROM p) THEN 1 ELSE 0 END) AS is_prefix
    FROM public.curated_videos cv
    WHERE (SELECT q FROM p) <> ''
      AND cv.category IS NOT NULL
      AND cv.moderation_state IN ('approved','auto_approved')
      AND lower(cv.category) LIKE (SELECT q_sub FROM p)
    GROUP BY lower(cv.category)
    LIMIT 30
  ),
  titles AS (
    SELECT lower(cv.title) AS suggestion, 'title'::text AS kind,
           1::numeric AS videos, 1 AS is_prefix
    FROM public.curated_videos cv
    WHERE (SELECT q FROM p) <> ''
      AND cv.moderation_state IN ('approved','auto_approved')
      AND COALESCE(cv.is_hidden,false) = false
      AND COALESCE(cv.is_archived,false) = false
      AND lower(cv.title) LIKE (SELECT q_prefix FROM p)
    GROUP BY lower(cv.title)
    LIMIT 40
  ),
  history AS (
    SELECT lower(sq.normalized_query) AS suggestion, 'popular'::text AS kind,
           COUNT(*)::numeric AS videos,
           MAX(CASE WHEN lower(sq.normalized_query) LIKE (SELECT q_prefix FROM p) THEN 1 ELSE 0 END) AS is_prefix
    FROM public.search_queries sq
    WHERE (SELECT q FROM p) <> ''
      AND sq.normalized_query IS NOT NULL
      AND sq.normalized_query <> ''
      AND COALESCE(sq.result_count,0) > 0
      AND lower(sq.normalized_query) LIKE (SELECT q_sub FROM p)
      AND sq.created_at > now() - interval '90 days'
    GROUP BY lower(sq.normalized_query)
    LIMIT 30
  ),
  merged AS (
    SELECT * FROM channels
    UNION ALL SELECT * FROM categories
    UNION ALL SELECT * FROM titles
    UNION ALL SELECT * FROM history
  ),
  scored AS (
    SELECT suggestion, kind,
      (
        (is_prefix * 0.45) +
        CASE kind
          WHEN 'channel'  THEN 0.25
          WHEN 'popular'  THEN 0.20
          WHEN 'category' THEN 0.15
          ELSE 0.05
        END +
        LEAST(ln(1 + videos) / 10.0, 0.30)
      )::numeric AS score
    FROM merged
    WHERE NOT public._suggestion_is_blocked(suggestion)
      AND length(suggestion) BETWEEN 2 AND 90
  ),
  ranked AS (
    SELECT suggestion, kind, score,
      ROW_NUMBER() OVER (PARTITION BY suggestion ORDER BY score DESC) AS rn
    FROM scored
  )
  SELECT suggestion, kind, score
  FROM ranked WHERE rn = 1
  ORDER BY score DESC, suggestion ASC
  LIMIT GREATEST(_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.search_autocomplete(text,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_autocomplete(text,integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_trending(_limit integer DEFAULT 8)
RETURNS TABLE(suggestion text, hits bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lower(normalized_query) AS suggestion, COUNT(*) AS hits
  FROM public.search_queries
  WHERE normalized_query IS NOT NULL
    AND normalized_query <> ''
    AND COALESCE(result_count,0) > 0
    AND created_at > now() - interval '14 days'
    AND NOT public._suggestion_is_blocked(normalized_query)
    AND length(normalized_query) BETWEEN 2 AND 60
  GROUP BY lower(normalized_query)
  ORDER BY hits DESC, suggestion ASC
  LIMIT GREATEST(_limit,1);
$$;
REVOKE ALL ON FUNCTION public.search_trending(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_trending(integer) TO anon, authenticated, service_role;
