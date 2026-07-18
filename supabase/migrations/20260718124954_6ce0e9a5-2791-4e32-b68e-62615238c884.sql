CREATE OR REPLACE FUNCTION public.get_trending_searches(_limit integer DEFAULT 12, _window_hours integer DEFAULT 168)
RETURNS TABLE(query text, hits bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT normalized_query AS query, count(*) AS hits
  FROM public.search_queries
  WHERE created_at > now() - make_interval(hours => _window_hours)
    AND length(normalized_query) BETWEEN 2 AND 60
    AND NOT public._suggestion_is_blocked(normalized_query)
  GROUP BY normalized_query
  ORDER BY hits DESC, max(created_at) DESC
  LIMIT GREATEST(_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.get_trending_searches(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_searches(integer, integer) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_related_searches(_query text, _limit integer DEFAULT 8)
RETURNS TABLE(query text, hits bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
    AND NOT public._suggestion_is_blocked(sq.normalized_query)
  GROUP BY normalized_query
  ORDER BY hits DESC
  LIMIT GREATEST(_limit, 1);
$$;

REVOKE ALL ON FUNCTION public.get_related_searches(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_related_searches(text, integer) TO anon, authenticated, service_role;

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
BEGIN
  IF q = '' THEN
    RETURN QUERY
      SELECT v.video_id, v.title, v.channel_title, v.category, v.thumbnail_url,
             v.halal_score, v.published_at, v.is_trusted_channel,
             0.0::real, 'browse'::text
      FROM public.curated_videos v
      WHERE (_category IS NULL OR v.category = _category)
        AND (_channel  IS NULL OR v.channel_title = _channel)
        AND COALESCE(v.is_hidden,false) = false
        AND COALESCE(v.is_archived,false) = false
        AND v.is_trusted_channel = true
        AND COALESCE(v.halal_score,0) >= 85
        AND (
          v.moderation_state IN ('approved','auto_approved')
          OR COALESCE(v.halal_score,0) >= 85
        )
      ORDER BY v.published_at DESC NULLS LAST
      LIMIT _limit OFFSET _offset;
    RETURN;
  END IF;

  RETURN QUERY
  WITH candidate_ids AS (
    SELECT v.id
    FROM public.curated_videos v
    WHERE (_category IS NULL OR v.category = _category)
      AND (_channel  IS NULL OR v.channel_title = _channel)
      AND COALESCE(v.is_hidden,false) = false
      AND COALESCE(v.is_archived,false) = false
      AND v.is_trusted_channel = true
      AND COALESCE(v.halal_score,0) >= 85
      AND (
        v.moderation_state IN ('approved','auto_approved')
        OR COALESCE(v.halal_score,0) >= 85
      )
      AND lower(v.title) LIKE q || '%'
    ORDER BY lower(v.title)
    LIMIT 300
  ),
  channel_ids AS (
    SELECT v.id
    FROM public.curated_videos v
    WHERE (_category IS NULL OR v.category = _category)
      AND (_channel  IS NULL OR v.channel_title = _channel)
      AND COALESCE(v.is_hidden,false) = false
      AND COALESCE(v.is_archived,false) = false
      AND v.is_trusted_channel = true
      AND COALESCE(v.halal_score,0) >= 85
      AND (
        v.moderation_state IN ('approved','auto_approved')
        OR COALESCE(v.halal_score,0) >= 85
      )
      AND lower(v.channel_title) LIKE q || '%'
    ORDER BY lower(v.channel_title), v.published_at DESC NULLS LAST
    LIMIT 300
  ),
  contains_ids AS (
    SELECT v.id
    FROM public.curated_videos v
    WHERE (_category IS NULL OR v.category = _category)
      AND (_channel  IS NULL OR v.channel_title = _channel)
      AND COALESCE(v.is_hidden,false) = false
      AND COALESCE(v.is_archived,false) = false
      AND v.is_trusted_channel = true
      AND COALESCE(v.halal_score,0) >= 85
      AND (
        v.moderation_state IN ('approved','auto_approved')
        OR COALESCE(v.halal_score,0) >= 85
      )
      AND (
        lower(v.title) LIKE '%' || q || '%'
        OR lower(v.channel_title) LIKE '%' || q || '%'
        OR lower(coalesce(v.category,'')) LIKE q || '%'
      )
    ORDER BY v.published_at DESC NULLS LAST
    LIMIT 600
  ),
  ids AS (
    SELECT id FROM candidate_ids
    UNION
    SELECT id FROM channel_ids
    UNION
    SELECT id FROM contains_ids
  ),
  scored AS (
    SELECT
      v.video_id, v.title, v.channel_title, v.category, v.thumbnail_url,
      v.halal_score, v.published_at, v.is_trusted_channel,
      CASE
        WHEN lower(v.title) = q THEN 1.0
        WHEN lower(v.title) LIKE q || '%' THEN 0.86
        WHEN lower(v.channel_title) LIKE q || '%' THEN 0.80
        WHEN lower(coalesce(v.category,'')) LIKE q || '%' THEN 0.70
        WHEN lower(v.title) LIKE '%' || q || '%' THEN 0.62
        WHEN lower(v.channel_title) LIKE '%' || q || '%' THEN 0.55
        ELSE 0.25
      END::numeric AS lexical_score,
      CASE WHEN v.is_trusted_channel THEN 1.0 ELSE 0.0 END AS trust_boost,
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
    (0.58 * s.lexical_score
     + 0.16 * s.trust_boost
     + 0.16 * s.recency_boost
     + 0.10 * s.halal_boost)::real AS rank,
    CASE
      WHEN s.lexical_score >= 0.70 THEN 'fulltext'
      WHEN s.lexical_score >= 0.55 THEN 'related'
      ELSE 'fuzzy'
    END::text AS match_type
  FROM scored s
  ORDER BY rank DESC, s.published_at DESC NULLS LAST
  LIMIT _limit OFFSET _offset;
END;
$$;

REVOKE ALL ON FUNCTION public.search_videos(text,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_videos(text,text,text,integer,integer) TO anon, authenticated, service_role;