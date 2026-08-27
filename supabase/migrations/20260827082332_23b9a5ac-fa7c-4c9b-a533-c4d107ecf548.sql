-- ============ 1. FEED SESSIONS ============
CREATE TABLE public.feed_sessions (
  session_key text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  request_count integer NOT NULL DEFAULT 0,
  item_count integer NOT NULL DEFAULT 0,
  country text,
  primary_language text,
  surfaces jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.feed_sessions TO service_role;
GRANT SELECT ON public.feed_sessions TO authenticated;
ALTER TABLE public.feed_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_sessions_admin_read" ON public.feed_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
CREATE INDEX idx_feed_sessions_user ON public.feed_sessions(user_id, last_seen_at DESC);
CREATE INDEX idx_feed_sessions_last_seen ON public.feed_sessions(last_seen_at DESC);
CREATE TRIGGER trg_feed_sessions_updated BEFORE UPDATE ON public.feed_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. FEED EXPOSURES ============
CREATE TABLE public.feed_exposures (
  id bigserial PRIMARY KEY,
  session_key text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  video_id text NOT NULL,
  position integer NOT NULL,
  surface text NOT NULL DEFAULT 'home',
  sort text,
  page_index integer,
  variant text,
  duplicate_group_id text,
  content_language text,
  channel_id text,
  served_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.feed_exposures TO service_role;
GRANT SELECT ON public.feed_exposures TO authenticated;
ALTER TABLE public.feed_exposures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_exposures_own_read" ON public.feed_exposures
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
CREATE INDEX idx_feed_exposures_session ON public.feed_exposures(session_key, served_at DESC);
CREATE INDEX idx_feed_exposures_user_video ON public.feed_exposures(user_id, video_id, served_at DESC);
CREATE INDEX idx_feed_exposures_video ON public.feed_exposures(video_id, served_at DESC);
CREATE INDEX idx_feed_exposures_served_at ON public.feed_exposures(served_at DESC);

-- Atomic session upsert used by the feed edge function (service role only).
CREATE OR REPLACE FUNCTION public.touch_feed_session(
  _session_key text,
  _user_id uuid DEFAULT NULL,
  _country text DEFAULT NULL,
  _primary_language text DEFAULT NULL,
  _surface text DEFAULT 'home',
  _item_count integer DEFAULT 0
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _session_key IS NULL OR length(_session_key) = 0 THEN RETURN; END IF;
  INSERT INTO public.feed_sessions AS fs (
    session_key, user_id, country, primary_language, request_count, item_count, surfaces
  ) VALUES (
    _session_key, _user_id, _country, _primary_language, 1, GREATEST(_item_count, 0),
    jsonb_build_object(COALESCE(_surface, 'home'), 1)
  )
  ON CONFLICT (session_key) DO UPDATE SET
    last_seen_at = now(),
    user_id = COALESCE(fs.user_id, EXCLUDED.user_id),
    country = COALESCE(fs.country, EXCLUDED.country),
    primary_language = COALESCE(EXCLUDED.primary_language, fs.primary_language),
    request_count = fs.request_count + 1,
    item_count = fs.item_count + GREATEST(_item_count, 0),
    surfaces = fs.surfaces || jsonb_build_object(
      COALESCE(_surface, 'home'),
      COALESCE((fs.surfaces ->> COALESCE(_surface, 'home'))::int, 0) + 1
    );
END;
$$;
REVOKE ALL ON FUNCTION public.touch_feed_session(text, uuid, text, text, text, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.touch_feed_session(text, uuid, text, text, text, integer) FROM anon;
REVOKE ALL ON FUNCTION public.touch_feed_session(text, uuid, text, text, text, integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.touch_feed_session(text, uuid, text, text, text, integer) TO service_role;

-- ============ 3. SEMANTIC NEAR-DUPLICATE GROUPING ============
-- Normalized signature of a video title: lowercased, punctuation and common
-- upload-noise tokens removed, tokens sorted and truncated. Two re-uploads of
-- the same lecture (different channels, "| Full Lecture", "[HD]", part markers)
-- collapse to the same key.
CREATE OR REPLACE FUNCTION public.feed_dup_key(_title text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE WHEN t IS NULL OR t = '' THEN NULL ELSE md5(t) END
  FROM (
    SELECT array_to_string(
      (SELECT array_agg(w ORDER BY w)
         FROM (
           SELECT DISTINCT w
           FROM unnest(
             string_to_array(
               regexp_replace(
                 regexp_replace(lower(COALESCE(_title, '')), '[^a-z0-9\s]', ' ', 'g'),
                 '\y(official|full|hd|hq|new|latest|video|audio|part|ep|episode|lecture|bayan|complete|english|arabic|urdu|bangla|subtitles|subtitle|shorts|live|the|a|an|of|and|in|to|with|by|on|for)\y',
                 ' ', 'g'
               ),
               ' '
             )
           ) AS w
           WHERE length(w) > 2
         ) d
         LIMIT 1
      )[1:10],
      '-'
    ) AS t
  ) s;
$$;

ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS duplicate_group_id text,
  ADD COLUMN IF NOT EXISTS is_duplicate_canonical boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS duplicate_grouped_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_curated_dup_group ON public.curated_videos(duplicate_group_id)
  WHERE duplicate_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_curated_dup_pending ON public.curated_videos(ingested_at DESC)
  WHERE duplicate_grouped_at IS NULL;

-- Batch worker: assigns duplicate groups then elects the single canonical row
-- per group (highest halal score, trusted channel, most viewed, earliest).
CREATE OR REPLACE FUNCTION public.recompute_duplicate_groups(_limit integer DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _grouped integer := 0;
  _demoted integer := 0;
  _groups text[];
BEGIN
  WITH batch AS (
    SELECT video_id FROM public.curated_videos
    WHERE duplicate_grouped_at IS NULL
    ORDER BY ingested_at DESC
    LIMIT GREATEST(_limit, 1)
  ), upd AS (
    UPDATE public.curated_videos cv
    SET duplicate_group_id = public.feed_dup_key(cv.title),
        duplicate_grouped_at = now()
    FROM batch b
    WHERE cv.video_id = b.video_id
    RETURNING cv.duplicate_group_id
  )
  SELECT count(*)::int, array_agg(DISTINCT duplicate_group_id) FILTER (WHERE duplicate_group_id IS NOT NULL)
  INTO _grouped, _groups
  FROM upd;

  IF _groups IS NULL OR array_length(_groups, 1) IS NULL THEN
    RETURN jsonb_build_object('grouped', COALESCE(_grouped, 0), 'demoted', 0);
  END IF;

  WITH ranked AS (
    SELECT cv.video_id, cv.duplicate_group_id,
      ROW_NUMBER() OVER (
        PARTITION BY cv.duplicate_group_id
        ORDER BY
          cv.is_trusted_channel DESC NULLS LAST,
          cv.halal_score DESC NULLS LAST,
          cv.view_count DESC NULLS LAST,
          cv.published_at ASC NULLS LAST,
          cv.video_id
      ) AS rn
    FROM public.curated_videos cv
    WHERE cv.duplicate_group_id = ANY(_groups)
  ), applied AS (
    UPDATE public.curated_videos cv
    SET is_duplicate_canonical = (r.rn = 1)
    FROM ranked r
    WHERE cv.video_id = r.video_id
      AND cv.is_duplicate_canonical <> (r.rn = 1)
    RETURNING 1
  )
  SELECT count(*)::int INTO _demoted FROM applied;

  RETURN jsonb_build_object('grouped', COALESCE(_grouped, 0), 'demoted', COALESCE(_demoted, 0));
END;
$$;
REVOKE ALL ON FUNCTION public.recompute_duplicate_groups(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recompute_duplicate_groups(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.recompute_duplicate_groups(integer) TO service_role;

-- ============ 4. RUNTIME FEED-RANKING FLAGS ============
CREATE TABLE public.feed_ranking_flags (
  key text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT true,
  value numeric NOT NULL DEFAULT 0,
  min_value numeric NOT NULL DEFAULT 0,
  max_value numeric NOT NULL DEFAULT 1,
  description text,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT feed_ranking_flags_value_range CHECK (value >= min_value AND value <= max_value)
);
GRANT SELECT ON public.feed_ranking_flags TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.feed_ranking_flags TO authenticated;
GRANT ALL ON public.feed_ranking_flags TO service_role;
ALTER TABLE public.feed_ranking_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feed_ranking_flags_read" ON public.feed_ranking_flags FOR SELECT USING (true);
CREATE POLICY "feed_ranking_flags_admin_write" ON public.feed_ranking_flags
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_owner(auth.uid()));
CREATE TRIGGER trg_feed_ranking_flags_updated BEFORE UPDATE ON public.feed_ranking_flags
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.feed_ranking_flags (key, enabled, value, min_value, max_value, description) VALUES
  ('exploration_rate', true, 0.20, 0, 0.6, 'Share of each page reserved for exploratory / long-tail picks.'),
  ('exploration_temperature', true, 0.85, 0.1, 2.0, 'Base sampling temperature for stochastic ranking (higher = more rotation).'),
  ('fatigue_detection', true, 1, 0, 1, 'Penalize videos already shown to this user/session (repetition fatigue).'),
  ('fatigue_penalty_weight', true, 1.0, 0, 3.0, 'Multiplier on the repeat-impression penalty.'),
  ('personalization_mix', true, 1.0, 0, 2.0, 'Weight applied to affinity/interest signals vs. freshness.'),
  ('semantic_dedup', true, 1, 0, 1, 'Serve only the canonical version of each near-duplicate group.')
ON CONFLICT (key) DO NOTHING;

-- ============ 5. CANDIDATE SELECTION: canonical-only + group id ============
DROP FUNCTION IF EXISTS public.get_feed_candidates_diversified(integer, integer, text, text, text[], timestamptz, boolean, text, text[]);
CREATE OR REPLACE FUNCTION public.get_feed_candidates_diversified(
  _limit integer DEFAULT 400,
  _per_channel integer DEFAULT 4,
  _category text DEFAULT NULL,
  _section_id text DEFAULT NULL,
  _section_aliases text[] DEFAULT NULL,
  _cursor timestamptz DEFAULT NULL,
  _exclude_premium boolean DEFAULT true,
  _order text DEFAULT 'fresh',
  _languages text[] DEFAULT NULL,
  _semantic_dedup boolean DEFAULT true
)
RETURNS TABLE(
  video_id text, title text, channel_id text, channel_title text, thumbnail_url text,
  category text, section_id text, published_at timestamptz, ingested_at timestamptz,
  halal_score numeric, view_count bigint, is_trusted_channel boolean, is_premium_only boolean,
  content_language text, visual_state text, duplicate_group_id text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      cv.video_id, cv.title, cv.channel_id, cv.channel_title, cv.thumbnail_url,
      cv.category, cv.section_id, cv.published_at, cv.ingested_at,
      cv.halal_score, cv.view_count, cv.is_trusted_channel, cv.is_premium_only,
      cv.content_language, cv.visual_state, cv.duplicate_group_id,
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
      AND (NOT _semantic_dedup OR cv.is_duplicate_canonical = true)
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
    halal_score, view_count, is_trusted_channel, is_premium_only, content_language,
    visual_state, duplicate_group_id
  FROM base
  WHERE rn_channel <= GREATEST(_per_channel, 1)
  ORDER BY
    CASE WHEN _order = 'recent' THEN ingested_at ELSE published_at END DESC NULLS LAST,
    halal_score DESC NULLS LAST,
    ingested_at DESC NULLS LAST
  LIMIT GREATEST(_limit, 1);
$$;
REVOKE ALL ON FUNCTION public.get_feed_candidates_diversified(integer, integer, text, text, text[], timestamptz, boolean, text, text[], boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_feed_candidates_diversified(integer, integer, text, text, text[], timestamptz, boolean, text, text[], boolean) TO service_role, authenticated;