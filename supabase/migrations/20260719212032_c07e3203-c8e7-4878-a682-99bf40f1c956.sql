
CREATE OR REPLACE FUNCTION public.get_feed_candidates_diversified(
  _limit int DEFAULT 400,
  _per_channel int DEFAULT 4,
  _category text DEFAULT NULL,
  _section_id text DEFAULT NULL,
  _section_aliases text[] DEFAULT NULL,
  _cursor timestamptz DEFAULT NULL,
  _exclude_premium boolean DEFAULT true,
  _order text DEFAULT 'fresh'  -- 'fresh' | 'recent'
)
RETURNS TABLE (
  video_id text,
  title text,
  channel_id text,
  channel_title text,
  thumbnail_url text,
  category text,
  section_id text,
  published_at timestamptz,
  ingested_at timestamptz,
  halal_score numeric,
  view_count bigint,
  is_trusted_channel boolean,
  is_premium_only boolean,
  content_language text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      cv.video_id, cv.title, cv.channel_id, cv.channel_title, cv.thumbnail_url,
      cv.category, cv.section_id, cv.published_at, cv.ingested_at,
      cv.halal_score, cv.view_count, cv.is_trusted_channel, cv.is_premium_only,
      cv.content_language,
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
      AND (NOT _exclude_premium OR cv.is_premium_only = false)
      AND (_category IS NULL OR cv.category = _category)
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
    halal_score, view_count, is_trusted_channel, is_premium_only, content_language
  FROM base
  WHERE rn_channel <= GREATEST(_per_channel, 1)
  ORDER BY
    CASE WHEN _order = 'recent' THEN ingested_at ELSE published_at END DESC NULLS LAST,
    halal_score DESC NULLS LAST,
    ingested_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_feed_candidates_diversified(
  int, int, text, text, text[], timestamptz, boolean, text
) TO anon, authenticated, service_role;
