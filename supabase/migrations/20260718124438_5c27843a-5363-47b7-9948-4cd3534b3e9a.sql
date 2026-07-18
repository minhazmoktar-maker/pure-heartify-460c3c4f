CREATE OR REPLACE FUNCTION public.search_videos(
  _query text,
  _category text DEFAULT NULL::text,
  _channel text DEFAULT NULL::text,
  _limit integer DEFAULT 40,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  video_id text,
  title text,
  channel_title text,
  category text,
  thumbnail_url text,
  halal_score integer,
  published_at timestamp with time zone,
  is_trusted_channel boolean,
  rank real,
  match_type text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
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
        AND COALESCE(v.is_hidden,false) = false
        AND COALESCE(v.is_archived,false) = false
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
        extensions.word_similarity(q, lower(public.f_unaccent(coalesce(v.title, '')))),
        extensions.word_similarity(q, lower(public.f_unaccent(coalesce(v.channel_title, ''))))
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
      AND COALESCE(v.is_hidden,false) = false
      AND COALESCE(v.is_archived,false) = false
      AND (v.search_tsv @@ ts OR v.title OPERATOR(extensions.%) q OR coalesce(v.channel_title,'') OPERATOR(extensions.%) q)
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

REVOKE ALL ON FUNCTION public.search_videos(text,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_videos(text,text,text,integer,integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.search_reciters(_query text, _limit integer DEFAULT 20)
RETURNS TABLE (
  id UUID,
  canonical_name_en TEXT,
  canonical_name_ar TEXT,
  country TEXT,
  primary_riwayah TEXT,
  image_url TEXT,
  popularity_score INTEGER,
  is_living BOOLEAN,
  match_type TEXT,
  rank REAL
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  q text := lower(trim(coalesce(_query, '')));
  ts tsquery;
BEGIN
  IF q = '' THEN
    RETURN QUERY
    SELECT r.id, r.canonical_name_en, r.canonical_name_ar, r.country,
           r.primary_riwayah, r.image_url, r.popularity_score, r.is_living,
           'browse'::text, 0.0::real
    FROM public.reciters r
    WHERE r.is_verified = true
    ORDER BY r.popularity_score DESC NULLS LAST, r.canonical_name_en
    LIMIT _limit;
    RETURN;
  END IF;

  ts := plainto_tsquery('simple', public.f_unaccent(q));

  RETURN QUERY
  WITH matches AS (
    SELECT r.*,
      ts_rank(r.search_tsv, ts) AS ts_score,
      GREATEST(
        extensions.similarity(lower(public.f_unaccent(r.canonical_name_en)), q),
        COALESCE((
          SELECT MAX(extensions.similarity(lower(public.f_unaccent(a.alias)), q))
          FROM public.reciter_aliases a WHERE a.reciter_id = r.id
        ), 0)
      ) AS trgm_score,
      CASE WHEN EXISTS (
        SELECT 1 FROM public.reciter_aliases a
        WHERE a.reciter_id = r.id AND a.alias_norm = regexp_replace(q, '[^a-z0-9]+', '', 'g')
      ) THEN 1.0 ELSE 0.0 END AS alias_hit
    FROM public.reciters r
    WHERE r.is_verified = true
      AND (
        r.search_tsv @@ ts
        OR r.canonical_name_en ILIKE '%' || q || '%'
        OR EXISTS (SELECT 1 FROM public.reciter_aliases a WHERE a.reciter_id = r.id AND a.alias ILIKE '%' || q || '%')
      )
  )
  SELECT m.id, m.canonical_name_en, m.canonical_name_ar, m.country,
         m.primary_riwayah, m.image_url, m.popularity_score, m.is_living,
         CASE WHEN m.alias_hit > 0 THEN 'alias'
              WHEN m.ts_score > 0.05 THEN 'fulltext'
              ELSE 'fuzzy' END::text,
         (0.5 * m.ts_score + 0.3 * m.trgm_score + 0.15 * m.alias_hit
          + 0.05 * LEAST(m.popularity_score::numeric / 100.0, 1.0))::real
  FROM matches m
  ORDER BY rank DESC, m.popularity_score DESC NULLS LAST
  LIMIT _limit;
END;
$$;

REVOKE ALL ON FUNCTION public.search_reciters(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_reciters(text, integer) TO anon, authenticated, service_role;

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
           25::numeric AS videos, 1::numeric AS source_weight
    FROM public.approved_channels ac, p
    WHERE p.q <> ''
      AND ac.title IS NOT NULL
      AND lower(ac.title) LIKE p.q_prefix
    ORDER BY lower(ac.title)
    LIMIT 40
  ),
  trusted_ch_seed AS (
    SELECT lower(cv.channel_title) AS suggestion
    FROM public.curated_videos cv, p
    WHERE p.q <> ''
      AND cv.is_trusted_channel = true
      AND cv.channel_title IS NOT NULL
      AND cv.moderation_state IN ('approved','auto_approved')
      AND COALESCE(cv.is_hidden,false) = false
      AND COALESCE(cv.is_archived,false) = false
      AND lower(cv.channel_title) LIKE p.q_prefix
    ORDER BY lower(cv.channel_title)
    LIMIT 300
  ),
  trusted_ch AS (
    SELECT suggestion, 'channel'::text AS kind, COUNT(*)::numeric AS videos, 0.95::numeric AS source_weight
    FROM trusted_ch_seed
    GROUP BY suggestion
    LIMIT 60
  ),
  categories AS (
    SELECT lower(cv.category) AS suggestion, 'category'::text AS kind,
           COUNT(*)::numeric AS videos, 0.75::numeric AS source_weight
    FROM public.curated_videos cv, p
    WHERE p.q <> ''
      AND cv.category IS NOT NULL
      AND cv.is_trusted_channel = true
      AND cv.moderation_state IN ('approved','auto_approved')
      AND COALESCE(cv.is_hidden,false) = false
      AND COALESCE(cv.is_archived,false) = false
      AND lower(cv.category) LIKE p.q_prefix
    GROUP BY lower(cv.category)
    LIMIT 20
  ),
  titles AS (
    SELECT lower(cv.title) AS suggestion, 'title'::text AS kind,
           1::numeric AS videos, 0.55::numeric AS source_weight
    FROM public.curated_videos cv, p
    WHERE p.q <> ''
      AND cv.is_trusted_channel = true
      AND cv.moderation_state IN ('approved','auto_approved')
      AND COALESCE(cv.is_hidden,false) = false
      AND COALESCE(cv.is_archived,false) = false
      AND lower(cv.title) LIKE p.q_prefix
    ORDER BY lower(cv.title)
    LIMIT 120
  ),
  history AS (
    SELECT lower(sq.normalized_query) AS suggestion, 'popular'::text AS kind,
           COUNT(*)::numeric AS videos, 0.70::numeric AS source_weight
    FROM public.search_queries sq, p
    WHERE p.q <> ''
      AND sq.normalized_query IS NOT NULL
      AND sq.normalized_query <> ''
      AND COALESCE(sq.result_count,0) > 0
      AND lower(sq.normalized_query) LIKE p.q_prefix
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
        source_weight +
        CASE kind
          WHEN 'channel'  THEN 0.25
          WHEN 'popular'  THEN 0.16
          WHEN 'category' THEN 0.12
          ELSE 0.04
        END +
        LEAST(ln(1 + videos) / 10.0, 0.25)
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
  FROM ranked, p
  WHERE rn = 1
  ORDER BY score DESC, suggestion ASC
  LIMIT (SELECT lim FROM p);
$$;

REVOKE ALL ON FUNCTION public.search_autocomplete(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_autocomplete(text, integer) TO anon, authenticated, service_role;