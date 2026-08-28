-- ========================================================================
-- 1. Visual scanner also claims videos sitting in review.
--    Uncertain videos are now escalated instead of rejected, so the visual
--    gate must see them — otherwise they would wait forever.
-- ========================================================================
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
      AND (cv.is_hidden = false
           OR cv.hidden_reason IS NULL
           OR cv.hidden_reason = 'awaiting_visual_check'
           OR cv.hidden_reason LIKE 'halal_gate:%')
      AND cv.moderation_state IN ('approved','auto_approved','human_review_required')
      AND cv.thumbnail_url IS NOT NULL
      AND lower(coalesce(cv.category,'')) NOT IN ('nasheeds','nasheed','music','songs')
      AND (cv.visual_state IS NULL OR cv.visual_state = 'unchecked')
      AND (cv.visual_checked_at IS NULL OR cv.visual_checked_at < now() - interval '1 hour')
    ORDER BY
      -- already-approved rows first (they unlock serving immediately),
      -- then the escalated backlog by popularity.
      (cv.moderation_state = 'human_review_required'),
      cv.view_count DESC NULLS LAST,
      cv.published_at DESC NULLS LAST
    LIMIT GREATEST(1, LEAST(p_limit, 300))
    FOR UPDATE SKIP LOCKED
  ), stamped AS (
    UPDATE public.curated_videos cv
    SET visual_checked_at = now()
    WHERE cv.video_id IN (SELECT p.video_id FROM picked p)
    RETURNING cv.video_id, cv.title, cv.channel_title, cv.thumbnail_url
  )
  SELECT s.video_id, s.title, s.channel_title, s.thumbnail_url FROM stamped s;
END; $function$;

-- ========================================================================
-- 2. A clean visual verdict resolves an escalated, evidence-free video.
--    Flagged handling is unchanged (archive + reject).
-- ========================================================================
CREATE OR REPLACE FUNCTION public.apply_visual_verdicts(p_verdicts jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_flagged int := 0;
  v_clean   int := 0;
  v_promoted int := 0;
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
        moderation_state = CASE
          WHEN v.state = 'flagged' THEN 'rejected'
          -- Escalated only because the reviewer was uncertain, and the
          -- thumbnail is clean: release it.
          WHEN v.state = 'clean'
               AND cv.moderation_state = 'human_review_required'
               AND coalesce(cv.moderation_reasoning,'') LIKE '%No rule violations detected%'
            THEN 'auto_approved'
          ELSE cv.moderation_state END,
        moderation_stage = CASE
          WHEN v.state = 'clean'
               AND cv.moderation_state = 'human_review_required'
               AND coalesce(cv.moderation_reasoning,'') LIKE '%No rule violations detected%'
            THEN 'recheck'
          ELSE cv.moderation_stage END,
        moderation_reasoning = CASE
          WHEN v.state = 'flagged'
            THEN COALESCE(cv.moderation_reasoning,'') || ' | auto: visual sweep ' || array_to_string(v.flags, ',')
          WHEN v.state = 'clean'
               AND cv.moderation_state = 'human_review_required'
               AND coalesce(cv.moderation_reasoning,'') LIKE '%No rule violations detected%'
            THEN COALESCE(cv.moderation_reasoning,'') || ' | auto: released — visual check clean, no rule violation'
          ELSE cv.moderation_reasoning END
    FROM v
    WHERE cv.video_id = v.video_id
    RETURNING v.state,
              (v.state = 'clean' AND cv.moderation_state = 'auto_approved'
               AND cv.moderation_stage = 'recheck') AS promoted
  )
  SELECT count(*) FILTER (WHERE state = 'flagged'),
         count(*) FILTER (WHERE state <> 'flagged'),
         count(*) FILTER (WHERE promoted)
  INTO v_flagged, v_clean, v_promoted FROM upd;

  BEGIN
    INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('visual_sweep_batch', v_flagged,
            jsonb_build_object('flagged', v_flagged, 'clean', v_clean,
                               'released', v_promoted, 'ran_at', now()));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('flagged', v_flagged, 'clean', v_clean, 'released', v_promoted);
END;
$function$;

-- ========================================================================
-- 3. Recover the rows already rejected on uncertainty alone
--    (no rule violation, risk below the evidence floor of 50).
-- ========================================================================
DO $$
DECLARE
  v_total int := 0;
  v_batch int;
BEGIN
  LOOP
    WITH pick AS (
      SELECT video_id
      FROM public.curated_videos
      WHERE moderation_state = 'rejected'
        AND moderation_reasoning LIKE '%No rule violations detected%'
        AND moderation_reasoning NOT LIKE '%|%'
        AND COALESCE(is_archived, false) = false
        AND visual_state IS DISTINCT FROM 'flagged'
        AND COALESCE((regexp_match(moderation_reasoning, 'risk ([0-9.]+)'))[1]::numeric, 100) < 50
      LIMIT 5000
      FOR UPDATE SKIP LOCKED
    ), upd AS (
      UPDATE public.curated_videos cv
      SET moderation_state = 'human_review_required',
          moderation_stage = 'recheck',
          moderation_claimed_at = NULL,
          visual_checked_at = NULL,
          moderation_reasoning = cv.moderation_reasoning
            || ' | auto: reopened — uncertainty is not evidence, awaiting visual check'
      FROM pick p
      WHERE cv.video_id = p.video_id
      RETURNING 1
    )
    SELECT count(*) INTO v_batch FROM upd;
    v_total := v_total + v_batch;
    EXIT WHEN v_batch = 0;
  END LOOP;

  INSERT INTO public.ops_metrics (metric, value, tags)
  VALUES ('corpus_uncertainty_reopen', v_total,
          jsonb_build_object('reopened', v_total, 'ran_at', now(),
                             'cause', 'low_confidence_no_evidence_false_reject'));
END $$;