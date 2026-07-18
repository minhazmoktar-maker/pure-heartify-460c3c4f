
CREATE OR REPLACE FUNCTION public.search_autocomplete(_prefix text, _limit integer DEFAULT 8)
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
  approved_ch AS (
    -- Highest-trust source: channels promoted to approved_channels
    SELECT lower(ac.title) AS suggestion, 'channel'::text AS kind,
           25::numeric AS videos,
           CASE WHEN lower(ac.title) LIKE (SELECT q_prefix FROM p) THEN 1 ELSE 0 END AS is_prefix
    FROM public.approved_channels ac
    WHERE (SELECT q FROM p) <> ''
      AND ac.title IS NOT NULL
      AND lower(ac.title) LIKE (SELECT q_sub FROM p)
  ),
  trusted_ch AS (
    -- Channel names from trusted curated videos
    SELECT lower(cv.channel_title) AS suggestion, 'channel'::text AS kind,
           COUNT(*)::numeric AS videos,
           MAX(CASE WHEN lower(cv.channel_title) LIKE (SELECT q_prefix FROM p) THEN 1 ELSE 0 END) AS is_prefix
    FROM public.curated_videos cv
    WHERE (SELECT q FROM p) <> ''
      AND cv.is_trusted_channel = true
      AND cv.channel_title IS NOT NULL
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
      AND cv.is_trusted_channel = true
      AND lower(cv.category) LIKE (SELECT q_sub FROM p)
    GROUP BY lower(cv.category)
    LIMIT 30
  ),
  titles AS (
    SELECT lower(cv.title) AS suggestion, 'title'::text AS kind,
           1::numeric AS videos, 1 AS is_prefix
    FROM public.curated_videos cv
    WHERE (SELECT q FROM p) <> ''
      AND cv.is_trusted_channel = true
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
    SELECT * FROM approved_ch
    UNION ALL SELECT * FROM trusted_ch
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
