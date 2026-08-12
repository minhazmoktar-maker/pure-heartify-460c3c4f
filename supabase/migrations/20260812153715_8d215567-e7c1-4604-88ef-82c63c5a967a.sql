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
  WITH v AS (
    SELECT (e->>'video_id')::text AS video_id,
           lower(coalesce(e->>'state','unchecked')) AS state,
           coalesce((e->>'confidence')::numeric, 0) AS confidence,
           COALESCE(
             ARRAY(SELECT jsonb_array_elements_text(CASE WHEN jsonb_typeof(e->'flags') = 'array' THEN e->'flags' ELSE '[]'::jsonb END)),
             ARRAY[]::text[]
           ) AS flags
    FROM jsonb_array_elements(coalesce(p_verdicts,'[]'::jsonb)) e
    WHERE e->>'video_id' IS NOT NULL
  ), upd AS (
    UPDATE public.curated_videos cv
    SET visual_state = v.state,
        visual_confidence = v.confidence,
        visual_flags = v.flags,
        visual_checked_at = now(),
        is_archived = CASE WHEN v.state IN ('female_detected','music','flagged') THEN true ELSE cv.is_archived END,
        is_hidden   = CASE WHEN v.state IN ('female_detected','music','flagged') THEN true ELSE cv.is_hidden END,
        moderation_state = CASE WHEN v.state IN ('female_detected','music','flagged') THEN 'rejected' ELSE cv.moderation_state END,
        moderation_reasoning = CASE WHEN v.state IN ('female_detected','music','flagged')
          THEN COALESCE(cv.moderation_reasoning,'') || ' | auto: visual sweep ' || v.state
          ELSE cv.moderation_reasoning END
    FROM v
    WHERE cv.video_id = v.video_id
    RETURNING v.state
  )
  SELECT count(*) FILTER (WHERE state IN ('female_detected','music','flagged')),
         count(*) FILTER (WHERE state NOT IN ('female_detected','music','flagged'))
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

REVOKE ALL ON FUNCTION public.apply_visual_verdicts(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_visual_verdicts(jsonb) TO service_role;
