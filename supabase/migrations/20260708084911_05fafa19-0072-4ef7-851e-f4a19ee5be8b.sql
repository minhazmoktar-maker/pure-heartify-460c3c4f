
CREATE OR REPLACE FUNCTION public.get_trending_searches(_limit int DEFAULT 12, _window_hours int DEFAULT 168)
RETURNS TABLE (query text, hits bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT normalized_query AS query, count(*) AS hits
  FROM public.search_queries
  WHERE created_at > now() - make_interval(hours => _window_hours)
    AND length(normalized_query) BETWEEN 2 AND 60
  GROUP BY normalized_query
  ORDER BY hits DESC, max(created_at) DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_trending_searches(int, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_related_searches(_query text, _limit int DEFAULT 8)
RETURNS TABLE (query text, hits bigint)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH seed AS (
    SELECT DISTINCT user_id
    FROM public.search_queries
    WHERE user_id IS NOT NULL
      AND normalized_query = lower(trim(_query))
      AND created_at > now() - interval '30 days'
  )
  SELECT normalized_query AS query, count(*) AS hits
  FROM public.search_queries sq
  JOIN seed s USING (user_id)
  WHERE sq.normalized_query <> lower(trim(_query))
    AND length(sq.normalized_query) BETWEEN 2 AND 60
  GROUP BY normalized_query
  ORDER BY hits DESC
  LIMIT _limit;
$$;
GRANT EXECUTE ON FUNCTION public.get_related_searches(text, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_videos(
  _query text,
  _category text DEFAULT NULL,
  _channel text DEFAULT NULL,
  _limit int DEFAULT 40,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  video_id text,
  title text,
  channel_title text,
  category text,
  thumbnail_url text,
  halal_score integer,
  published_at timestamptz,
  is_trusted_channel boolean,
  rank real,
  match_type text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  q text := lower(trim(coalesce(_query, '')));
  ts tsquery;
BEGIN
  IF q = '' THEN
    RETURN QUERY
      SELECT v.video_id, v.title, v.channel_title, v.category, v.thumbnail_url,
             v.halal_score, v.published_at, v.is_trusted_channel,
             0.0::real, 'browse'::text
      FROM public.curated_videos v
      WHERE (_category IS NULL OR v.category = _category)
        AND (_channel  IS NULL OR v.channel_title = _channel)
        AND v.moderation_state IN ('approved','auto_approved')
      ORDER BY v.is_trusted_channel DESC NULLS LAST, v.published_at DESC NULLS LAST
      LIMIT _limit OFFSET _offset;
    RETURN;
  END IF;

  ts := plainto_tsquery('simple', public.f_unaccent(q));

  RETURN QUERY
  WITH scored AS (
    SELECT
      v.video_id, v.title, v.channel_title, v.category, v.thumbnail_url,
      v.halal_score, v.published_at, v.is_trusted_channel,
      ts_rank(v.search_tsv, ts) AS ts_score,
      GREATEST(
        word_similarity(q, lower(public.f_unaccent(coalesce(v.title, '')))),
        word_similarity(q, lower(public.f_unaccent(coalesce(v.channel_title, ''))))
      ) AS trgm_score,
      CASE WHEN v.is_trusted_channel THEN 1.0 ELSE 0.0 END AS trust_boost,
      GREATEST(
        0.0,
        1.0 - EXTRACT(EPOCH FROM (now() - coalesce(v.published_at, now()))) / (86400.0 * 365.0 * 3.0)
      ) AS recency_boost,
      COALESCE(v.halal_score, 0)::numeric / 100.0 AS halal_boost
    FROM public.curated_videos v
    WHERE (_category IS NULL OR v.category = _category)
      AND (_channel  IS NULL OR v.channel_title = _channel)
      AND v.moderation_state IN ('approved','auto_approved')
      AND (v.search_tsv @@ ts OR v.title % q OR coalesce(v.channel_title,'') % q)
  )
  SELECT
    s.video_id, s.title, s.channel_title, s.category, s.thumbnail_url,
    s.halal_score, s.published_at, s.is_trusted_channel,
    (0.45 * s.ts_score
     + 0.25 * s.trgm_score
     + 0.15 * s.trust_boost
     + 0.10 * s.recency_boost
     + 0.05 * s.halal_boost)::real,
    CASE
      WHEN s.ts_score > 0.05 THEN 'fulltext'
      WHEN s.trgm_score > 0.4 THEN 'fuzzy'
      ELSE 'related'
    END::text
  FROM scored s
  ORDER BY rank DESC
  LIMIT _limit OFFSET _offset;
END;
$$;
GRANT EXECUTE ON FUNCTION public.search_videos(text, text, text, int, int) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.search_autocomplete(_prefix text, _limit int DEFAULT 8)
RETURNS TABLE (suggestion text, kind text)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH p AS (SELECT lower(trim(_prefix)) AS q)
  (
    SELECT DISTINCT lower(title) AS suggestion, 'title'::text AS kind
    FROM public.curated_videos, p
    WHERE p.q <> '' AND title ILIKE p.q || '%'
      AND moderation_state IN ('approved','auto_approved')
    LIMIT _limit
  )
  UNION ALL
  (
    SELECT DISTINCT lower(channel_title) AS suggestion, 'channel'::text AS kind
    FROM public.curated_videos, p
    WHERE p.q <> '' AND channel_title ILIKE p.q || '%'
      AND is_trusted_channel = true
    LIMIT _limit
  )
  UNION ALL
  (
    SELECT normalized_query AS suggestion, 'history'::text AS kind
    FROM public.search_queries, p
    WHERE p.q <> '' AND normalized_query ILIKE p.q || '%'
    GROUP BY normalized_query
    ORDER BY count(*) DESC
    LIMIT _limit
  );
$$;
GRANT EXECUTE ON FUNCTION public.search_autocomplete(text, int) TO anon, authenticated;
