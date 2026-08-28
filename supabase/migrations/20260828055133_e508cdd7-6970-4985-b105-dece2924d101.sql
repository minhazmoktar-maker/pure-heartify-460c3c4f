-- ========================================================================
-- 1. CORPUS TRUST: un-reject videos that were only rejected because the
--    AI moderation provider was unavailable (confidence 0 / risk 80, with
--    "No rule violations detected"). They return to pending_review so the
--    moderation worker re-runs them with a healthy provider. The visual
--    serving floor keeps them hidden until thumbnail-verified, so nothing
--    becomes servable without passing the full gate.
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
        AND moderation_reasoning LIKE '%AI providers unavailable%'
        AND moderation_reasoning LIKE '%No rule violations detected%'
        AND moderation_reasoning NOT LIKE '%|%policy%'
        AND moderation_reasoning NOT LIKE '%auto%'
        AND COALESCE(is_archived, false) = false
        AND visual_state IS DISTINCT FROM 'flagged'
      LIMIT 5000
      FOR UPDATE SKIP LOCKED
    ), upd AS (
      UPDATE public.curated_videos cv
      SET moderation_state = 'pending_review',
          moderation_stage = 'recheck',
          moderation_claimed_at = NULL,
          moderation_reasoning = 'Requeued: prior rejection was an AI provider outage, not a policy signal.'
      FROM pick p
      WHERE cv.video_id = p.video_id
      RETURNING 1
    )
    SELECT count(*) INTO v_batch FROM upd;
    v_total := v_total + v_batch;
    EXIT WHEN v_batch = 0;
  END LOOP;

  INSERT INTO public.ops_metrics (metric, value, tags)
  VALUES ('corpus_outage_requeue', v_total,
          jsonb_build_object('requeued', v_total, 'ran_at', now(),
                             'cause', 'ai_provider_outage_false_reject'));
END $$;

-- ========================================================================
-- 2. BENEFIT VISIBILITY (public aggregate, k-anonymous)
-- ========================================================================
CREATE OR REPLACE FUNCTION public.video_benefit_signal(_video_ids text[])
RETURNS TABLE(video_id text, responses int, worth_it_rate numeric, acted_on_rate numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT b.video_id,
         count(*)::int AS responses,
         round(count(*) FILTER (WHERE b.worth_it IN ('yes','clearly_yes','somewhat'))::numeric
               / count(*), 3) AS worth_it_rate,
         round(count(*) FILTER (WHERE b.acted_on)::numeric / count(*), 3) AS acted_on_rate
  FROM public.benefit_labels b
  WHERE b.video_id = ANY (COALESCE(_video_ids, ARRAY[]::text[]))
    AND b.responded_at IS NOT NULL
    AND b.worth_it IS NOT NULL
  GROUP BY b.video_id
  -- k-anonymity: never expose a signal that could be traced to one person.
  HAVING count(*) >= 5;
$$;

REVOKE ALL ON FUNCTION public.video_benefit_signal(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.video_benefit_signal(text[]) TO anon, authenticated, service_role;

-- ========================================================================
-- 3. PERSONAL BENEFIT SUMMARY (own rows only)
-- ========================================================================
CREATE OR REPLACE FUNCTION public.my_benefit_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_out jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  SELECT jsonb_build_object(
    'answered', count(*) FILTER (WHERE responded_at IS NOT NULL AND worth_it IS NOT NULL),
    'worth_it', count(*) FILTER (WHERE worth_it IN ('yes','clearly_yes')),
    'somewhat', count(*) FILTER (WHERE worth_it = 'somewhat'),
    'not_beneficial', count(*) FILTER (WHERE worth_it IN ('not_really','regret')),
    'acted_on', count(*) FILTER (WHERE acted_on),
    'pending', count(*) FILTER (WHERE responded_at IS NULL AND due_at <= now()),
    'scheduled', count(*) FILTER (WHERE responded_at IS NULL AND due_at > now()),
    'recent', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'video_id', r.video_id,
               'video_title', r.video_title,
               'worth_it', r.worth_it,
               'acted_on', r.acted_on,
               'horizon_days', r.horizon_days,
               'responded_at', r.responded_at))
      FROM (
        SELECT video_id, video_title, worth_it, acted_on, horizon_days, responded_at
        FROM public.benefit_labels
        WHERE user_id = v_uid AND responded_at IS NOT NULL AND worth_it IS NOT NULL
        ORDER BY responded_at DESC
        LIMIT 10
      ) r), '[]'::jsonb)
  )
  INTO v_out
  FROM public.benefit_labels
  WHERE user_id = v_uid;

  RETURN COALESCE(v_out, '{}'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.my_benefit_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_benefit_summary() TO authenticated, service_role;