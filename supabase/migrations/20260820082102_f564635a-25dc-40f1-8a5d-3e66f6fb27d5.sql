-- 1. hidden_reason column ---------------------------------------------------
ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS hidden_reason text;

COMMENT ON COLUMN public.curated_videos.hidden_reason IS
  'Why the row is hidden. NULL = visible. awaiting_visual_check = not yet thumbnail-verified, visual_flagged = failed the vision review, music_policy = category blocked by the no-music rule, anything else = manual/moderator hide (never auto-cleared).';

-- 2. Serving-floor trigger --------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_visual_serving_floor()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_state text := lower(coalesce(NEW.visual_state, 'unchecked'));
  v_cat   text := lower(coalesce(NEW.category, ''));
  v_auto  constant text[] := ARRAY['awaiting_visual_check','visual_flagged','music_policy'];
BEGIN
  -- Music-style categories can never be served, verified or not.
  IF v_cat IN ('nasheeds', 'nasheed', 'music', 'songs') THEN
    NEW.is_hidden := true;
    NEW.hidden_reason := 'music_policy';
    RETURN NEW;
  END IF;

  IF v_state = 'clean' THEN
    -- Verified safe: release it, but never override a moderator's manual hide.
    IF NEW.is_hidden AND coalesce(NEW.hidden_reason, 'awaiting_visual_check') = ANY (v_auto) THEN
      NEW.is_hidden := false;
      NEW.hidden_reason := NULL;
    ELSIF NOT NEW.is_hidden THEN
      NEW.hidden_reason := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF v_state = 'unchecked' THEN
    -- Not yet visually verified: hold it back from every surface.
    IF NOT NEW.is_hidden OR NEW.hidden_reason = ANY (v_auto) THEN
      NEW.is_hidden := true;
      NEW.hidden_reason := 'awaiting_visual_check';
    END IF;
    RETURN NEW;
  END IF;

  -- flagged / female_detected / music / error / anything else: hard block.
  NEW.is_hidden := true;
  IF NEW.hidden_reason IS NULL OR NEW.hidden_reason = ANY (v_auto) THEN
    NEW.hidden_reason := 'visual_flagged';
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_enforce_visual_serving_floor ON public.curated_videos;
CREATE TRIGGER trg_enforce_visual_serving_floor
  BEFORE INSERT OR UPDATE ON public.curated_videos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_visual_serving_floor();

-- 3. Backfill helper (chunked so it never blows the statement timeout) ------
CREATE OR REPLACE FUNCTION public.apply_visual_serving_floor_backfill(p_limit int DEFAULT 50000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '9min'
AS $function$
DECLARE
  v_music int := 0;
  v_await int := 0;
  v_flag  int := 0;
  v_free  int := 0;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR auth.role() = 'service_role') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH t AS (
    SELECT id FROM public.curated_videos
    WHERE lower(coalesce(category,'')) IN ('nasheeds','nasheed','music','songs')
      AND coalesce(hidden_reason,'') <> 'music_policy'
    LIMIT p_limit
  ), u AS (
    UPDATE public.curated_videos cv SET is_hidden = true, hidden_reason = 'music_policy'
    FROM t WHERE cv.id = t.id RETURNING 1
  ) SELECT count(*) INTO v_music FROM u;

  WITH t AS (
    SELECT id FROM public.curated_videos
    WHERE is_hidden = false
      AND lower(coalesce(visual_state,'unchecked')) = 'unchecked'
    LIMIT p_limit
  ), u AS (
    UPDATE public.curated_videos cv SET is_hidden = true, hidden_reason = 'awaiting_visual_check'
    FROM t WHERE cv.id = t.id RETURNING 1
  ) SELECT count(*) INTO v_await FROM u;

  WITH t AS (
    SELECT id FROM public.curated_videos
    WHERE is_hidden = false
      AND lower(coalesce(visual_state,'unchecked')) NOT IN ('unchecked','clean')
    LIMIT p_limit
  ), u AS (
    UPDATE public.curated_videos cv SET is_hidden = true, hidden_reason = 'visual_flagged'
    FROM t WHERE cv.id = t.id RETURNING 1
  ) SELECT count(*) INTO v_flag FROM u;

  WITH t AS (
    SELECT id FROM public.curated_videos
    WHERE is_hidden = false AND hidden_reason IS NOT NULL
    LIMIT p_limit
  ), u AS (
    UPDATE public.curated_videos cv SET hidden_reason = NULL
    FROM t WHERE cv.id = t.id RETURNING 1
  ) SELECT count(*) INTO v_free FROM u;

  RETURN jsonb_build_object(
    'music_blocked', v_music,
    'awaiting_visual_check', v_await,
    'visual_flagged', v_flag,
    'reason_cleared', v_free,
    'remaining', (SELECT count(*) FROM public.curated_videos
                  WHERE is_hidden = false
                    AND (lower(coalesce(visual_state,'unchecked')) <> 'clean'
                         OR lower(coalesce(category,'')) IN ('nasheeds','nasheed','music','songs')))
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_visual_serving_floor_backfill(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apply_visual_serving_floor_backfill(int) FROM anon;
REVOKE ALL ON FUNCTION public.apply_visual_serving_floor_backfill(int) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apply_visual_serving_floor_backfill(int) TO service_role;

-- 4. Review queue must still see rows hidden only for awaiting review -------
CREATE OR REPLACE FUNCTION public.claim_visual_scan_batch(p_limit integer DEFAULT 40)
RETURNS TABLE(video_id text, title text, channel_title text, thumbnail_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT cv.video_id
    FROM public.curated_videos cv
    WHERE cv.is_archived = false
      AND (cv.is_hidden = false OR cv.hidden_reason = 'awaiting_visual_check')
      AND cv.moderation_state IN ('approved','auto_approved')
      AND cv.thumbnail_url IS NOT NULL
      AND lower(coalesce(cv.category,'')) NOT IN ('nasheeds','nasheed','music','songs')
      AND (cv.visual_state IS NULL OR cv.visual_state = 'unchecked')
      AND (cv.visual_checked_at IS NULL OR cv.visual_checked_at < now() - interval '1 hour')
    ORDER BY cv.view_count DESC NULLS LAST, cv.published_at DESC NULLS LAST
    LIMIT GREATEST(1, LEAST(p_limit, 300))
    FOR UPDATE SKIP LOCKED
  ), stamped AS (
    UPDATE public.curated_videos cv
    SET visual_checked_at = now()
    WHERE cv.video_id IN (SELECT p.video_id FROM picked p)
    RETURNING cv.video_id, cv.title, cv.channel_title, cv.thumbnail_url
  )
  SELECT s.video_id, s.title, s.channel_title, s.thumbnail_url FROM stamped s;
END;
$function$;

CREATE INDEX IF NOT EXISTS idx_curated_videos_awaiting_visual
  ON public.curated_videos (view_count DESC NULLS LAST, published_at DESC NULLS LAST)
  WHERE is_archived = false AND hidden_reason = 'awaiting_visual_check';

-- 5. Verdict application releases clean rows, keeps bad ones hidden ---------
CREATE OR REPLACE FUNCTION public.apply_visual_verdicts(p_verdicts jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_flagged int := 0;
  v_clean   int := 0;
BEGIN
  WITH raw AS (
    SELECT (e->>'video_id')::text AS video_id,
           lower(coalesce(e->>'state','unchecked')) AS raw_state,
           coalesce((e->>'confidence')::numeric, 0) AS confidence,
           COALESCE(
             ARRAY(SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(e->'flags') = 'array' THEN e->'flags' ELSE '[]'::jsonb END)),
             ARRAY[]::text[]
           ) AS flags
    FROM jsonb_array_elements(coalesce(p_verdicts,'[]'::jsonb)) e
    WHERE e->>'video_id' IS NOT NULL
  ), v AS (
    SELECT video_id, confidence,
           CASE
             WHEN raw_state IN ('female_detected','music','flagged','rejected','haram') THEN 'flagged'
             WHEN raw_state IN ('clean','safe','ok') THEN 'clean'
             WHEN raw_state = 'error' THEN 'error'
             ELSE 'unchecked'
           END AS state,
           CASE
             WHEN raw_state IN ('female_detected','music','rejected','haram')
               THEN array_append(flags, raw_state)
             ELSE flags
           END AS flags
    FROM raw
  ), upd AS (
    UPDATE public.curated_videos cv
    SET visual_state = v.state,
        visual_confidence = v.confidence,
        visual_flags = v.flags,
        visual_checked_at = now(),
        is_archived = CASE WHEN v.state = 'flagged' THEN true ELSE cv.is_archived END,
        moderation_state = CASE WHEN v.state = 'flagged' THEN 'rejected' ELSE cv.moderation_state END,
        moderation_reasoning = CASE WHEN v.state = 'flagged'
          THEN COALESCE(cv.moderation_reasoning,'') || ' | auto: visual sweep ' || array_to_string(v.flags, ',')
          ELSE cv.moderation_reasoning END
    FROM v
    WHERE cv.video_id = v.video_id
    RETURNING v.state
  )
  SELECT count(*) FILTER (WHERE state = 'flagged'),
         count(*) FILTER (WHERE state <> 'flagged')
  INTO v_flagged, v_clean FROM upd;

  BEGIN
    INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('visual_sweep_batch', v_flagged,
            jsonb_build_object('flagged', v_flagged, 'clean', v_clean, 'ran_at', now()));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('flagged', v_flagged, 'clean', v_clean);
END;
$function$;

-- 6. Close the two retrieval paths that skipped the visibility gate --------
CREATE OR REPLACE FUNCTION public.get_hidden_gem_ids(_limit integer DEFAULT 100, _max_impressions integer DEFAULT 300)
RETURNS TABLE(video_id text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH impressions AS (
    SELECT re.video_id, count(*) AS n
    FROM public.recommendation_events re
    WHERE re.event_type = 'impression'
      AND re.created_at > now() - interval '30 days'
    GROUP BY re.video_id
  )
  SELECT cv.video_id
  FROM public.curated_videos cv
  LEFT JOIN impressions i ON i.video_id = cv.video_id
  WHERE cv.moderation_state IN ('approved','auto_approved')
    AND cv.is_hidden = false
    AND cv.is_archived = false
    AND cv.visual_state = 'clean'
    AND cv.published_at > now() - interval '180 days'
    AND coalesce(cv.halal_score, 0) >= 80
    AND (cv.is_trusted_channel = true OR coalesce(cv.moderation_confidence, 0) >= 85)
    AND coalesce(i.n, 0) < _max_impressions
  ORDER BY cv.halal_score DESC NULLS LAST, cv.published_at DESC
  LIMIT _limit;
$function$;

CREATE OR REPLACE FUNCTION public.match_curated_videos(query_embedding vector, match_count integer DEFAULT 40, category_filter text DEFAULT NULL::text, exclude_premium boolean DEFAULT false)
RETURNS TABLE(video_id text, title text, channel_title text, category text, thumbnail_url text, halal_score integer, published_at timestamp with time zone, similarity double precision)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
  SELECT
    v.video_id,
    v.title,
    v.channel_title,
    v.category,
    v.thumbnail_url,
    v.halal_score,
    v.published_at,
    1 - (v.embedding <=> query_embedding) AS similarity
  FROM public.curated_videos v
  WHERE v.embedding IS NOT NULL
    AND v.moderation_state IN ('approved','auto_approved')
    AND v.is_hidden = false
    AND v.is_archived = false
    AND v.visual_state = 'clean'
    AND (category_filter IS NULL OR v.category = category_filter)
    AND (NOT exclude_premium OR COALESCE(v.is_premium_only, false) = false)
  ORDER BY v.embedding <=> query_embedding
  LIMIT match_count;
$function$;