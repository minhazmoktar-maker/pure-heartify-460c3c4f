CREATE OR REPLACE FUNCTION public._suggestion_is_blocked(_text text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT lower(coalesce(_text, '')) ~*
    '(^|[^a-z])(female|females|woman|women|girl|girls|actress|actresses|singer|singers|song|songs|music|musical|musician|musicians|band|bands|concert|concerts|dance|dancer|dancing|kpop|k-pop|kdrama|k-drama|anime|manga|movie|movies|film|films|netflix|hollywood|bollywood|celebrity|celebrities|gossip|dating|romance|romantic|kiss|kissing|nude|nudity|sexy|sex|sexual|porn|pornstar|pussy|onlyfans|drake|beyonce|rihanna|kanye|selena|bieber|ariana|nicki|cardi|megan|kardashian|jenner)($|[^a-z])'
$$;

REVOKE ALL ON FUNCTION public._suggestion_is_blocked(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._suggestion_is_blocked(text) TO anon, authenticated, service_role;

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
  WITH prefix_ids AS (
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
      AND (lower(v.title) LIKE q || '%' OR lower(v.channel_title) LIKE q || '%' OR lower(coalesce(v.category,'')) LIKE q || '%')
    ORDER BY lower(v.title), v.published_at DESC NULLS LAST
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
$$;

REVOKE ALL ON FUNCTION public.search_videos(text,text,text,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_videos(text,text,text,integer,integer) TO anon, authenticated, service_role;