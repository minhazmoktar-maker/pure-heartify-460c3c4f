CREATE OR REPLACE FUNCTION public.search_autocomplete(_prefix text, _limit integer DEFAULT 8)
RETURNS TABLE(suggestion text, kind text, score numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
  WITH p AS (
    SELECT
      lower(btrim(coalesce(_prefix, ''))) AS q,
      lower(btrim(coalesce(_prefix, ''))) || '%' AS q_prefix,
      GREATEST(1, LEAST(coalesce(_limit, 8), 20)) AS lim
  ),
  approved_ch AS (
    SELECT lower(ac.title) AS suggestion, 'channel'::text AS kind,
           25::numeric AS videos, 1.10::numeric AS source_weight
    FROM public.approved_channels ac, p
    WHERE p.q <> ''
      AND ac.title IS NOT NULL
      AND lower(ac.title) LIKE p.q_prefix
      AND NOT public._suggestion_is_blocked(ac.title)
    ORDER BY lower(ac.title)
    LIMIT 60
  ),
  categories AS (
    SELECT suggestion, 'category'::text AS kind, 20::numeric AS videos, 0.90::numeric AS source_weight
    FROM (
      VALUES
        ('quran'), ('tafsir'), ('seerah'), ('hadith'), ('dua'), ('adhkar'),
        ('fiqh'), ('aqeedah'), ('salah'), ('ramadan'), ('hajj'), ('umrah'),
        ('zakat'), ('islamic history'), ('islamic finance'), ('arabic'),
        ('education'), ('science'), ('history'), ('productivity'), ('family'),
        ('kids'), ('business'), ('lectures'), ('spirituality'), ('dawah'),
        ('lifestyle'), ('food')
    ) AS c(suggestion), p
    WHERE p.q <> ''
      AND c.suggestion LIKE p.q_prefix
  ),
  popular AS (
    SELECT lower(sq.normalized_query) AS suggestion, 'popular'::text AS kind,
           COUNT(*)::numeric AS videos, 0.78::numeric AS source_weight
    FROM public.search_queries sq, p
    WHERE p.q <> ''
      AND sq.normalized_query IS NOT NULL
      AND sq.normalized_query <> ''
      AND COALESCE(sq.result_count,0) > 0
      AND lower(sq.normalized_query) LIKE p.q_prefix
      AND sq.created_at > now() - interval '90 days'
      AND NOT public._suggestion_is_blocked(sq.normalized_query)
    GROUP BY lower(sq.normalized_query)
    ORDER BY COUNT(*) DESC, lower(sq.normalized_query)
    LIMIT 30
  ),
  merged AS (
    SELECT * FROM approved_ch
    UNION ALL SELECT * FROM categories
    UNION ALL SELECT * FROM popular
  ),
  scored AS (
    SELECT suggestion, kind,
      (
        source_weight +
        CASE kind
          WHEN 'channel'  THEN 0.28
          WHEN 'category' THEN 0.18
          WHEN 'popular'  THEN 0.14
          ELSE 0.04
        END +
        LEAST(ln(1 + videos) / 10.0, 0.24)
      )::numeric AS score
    FROM merged
    WHERE length(suggestion) BETWEEN 2 AND 90
      AND NOT public._suggestion_is_blocked(suggestion)
  ),
  ranked AS (
    SELECT suggestion, kind, score,
      ROW_NUMBER() OVER (PARTITION BY suggestion ORDER BY score DESC) AS rn
    FROM scored
  )
  SELECT suggestion, kind, score
  FROM ranked, p
  WHERE rn = 1
  ORDER BY score DESC, suggestion ASC
  LIMIT (SELECT lim FROM p);
$$;

REVOKE ALL ON FUNCTION public.search_autocomplete(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_autocomplete(text, integer) TO anon, authenticated, service_role;