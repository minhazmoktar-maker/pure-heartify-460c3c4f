-- 1. Sweep run ledger
CREATE TABLE IF NOT EXISTS public.video_sweep_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  newly_marked integer NOT NULL DEFAULT 0,
  eligible_unchecked integer NOT NULL DEFAULT 0,
  checked_last_hour integer NOT NULL DEFAULT 0,
  alerted boolean NOT NULL DEFAULT false,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.video_sweep_runs TO authenticated;
GRANT ALL ON public.video_sweep_runs TO service_role;

ALTER TABLE public.video_sweep_runs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read sweep runs" ON public.video_sweep_runs;
CREATE POLICY "Admins can read sweep runs"
  ON public.video_sweep_runs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS video_sweep_runs_ran_at_idx
  ON public.video_sweep_runs (ran_at DESC);

DROP TRIGGER IF EXISTS video_sweep_runs_updated_at ON public.video_sweep_runs;
CREATE TRIGGER video_sweep_runs_updated_at
  BEFORE UPDATE ON public.video_sweep_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Automated sweep: keep the unchecked serving queue at zero, alert when it rises
CREATE OR REPLACE FUNCTION public.sweep_unchecked_serving_queue(p_max integer DEFAULT 20000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_marked integer := 0;
  v_backlog integer := 0;
  v_checked integer := 0;
  v_alerted boolean := false;
  v_stuck integer := 0;
  v_threshold integer := 1000;
BEGIN
  -- Newly ingested servable rows with no visual verdict yet enter the queue explicitly.
  WITH pick AS (
    SELECT video_id
    FROM public.curated_videos
    WHERE moderation_state IN ('approved','auto_approved')
      AND is_archived = false
      AND visual_state IS NULL
    ORDER BY ingested_at ASC NULLS FIRST
    LIMIT GREATEST(LEAST(p_max, 100000), 1)
  )
  UPDATE public.curated_videos cv
  SET visual_state = 'unchecked', visual_checked_at = NULL
  FROM pick
  WHERE cv.video_id = pick.video_id;
  GET DIAGNOSTICS v_marked = ROW_COUNT;

  SELECT count(*) INTO v_backlog
  FROM public.curated_videos
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_archived = false
    AND (visual_state IS NULL OR visual_state = 'unchecked');

  SELECT count(*) INTO v_checked
  FROM public.curated_videos
  WHERE visual_checked_at > now() - interval '1 hour';

  IF v_backlog > v_threshold THEN
    -- stuck = backlog present but the scan worker made no progress this hour
    IF v_checked = 0 THEN v_stuck := 1; END IF;

    INSERT INTO public.production_alerts (kind, severity, message, context)
    SELECT 'unchecked_serving_queue',
           CASE WHEN v_stuck = 1 OR v_backlog > 25000 THEN 'error' ELSE 'warn' END,
           'Unchecked serving queue at ' || v_backlog || ' videos'
             || CASE WHEN v_stuck = 1 THEN ' with no scan progress in the last hour' ELSE '' END,
           jsonb_build_object('backlog', v_backlog, 'newly_marked', v_marked,
                              'checked_last_hour', v_checked, 'threshold', v_threshold)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'unchecked_serving_queue'
        AND created_at > now() - interval '2 hours'
        AND resolved_at IS NULL
    );
    v_alerted := true;
  ELSE
    UPDATE public.production_alerts
    SET resolved_at = now()
    WHERE kind = 'unchecked_serving_queue' AND resolved_at IS NULL;
  END IF;

  INSERT INTO public.video_sweep_runs (newly_marked, eligible_unchecked, checked_last_hour, alerted, details)
  VALUES (v_marked, v_backlog, v_checked, v_alerted,
          jsonb_build_object('threshold', v_threshold, 'stuck', v_stuck = 1));

  RETURN jsonb_build_object('newly_marked', v_marked, 'eligible_unchecked', v_backlog,
                            'checked_last_hour', v_checked, 'alerted', v_alerted);
END;
$function$;

REVOKE ALL ON FUNCTION public.sweep_unchecked_serving_queue(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sweep_unchecked_serving_queue(integer) FROM anon;
REVOKE ALL ON FUNCTION public.sweep_unchecked_serving_queue(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_unchecked_serving_queue(integer) TO service_role;

-- 3. Status breakdown for pre-launch export
CREATE OR REPLACE FUNCTION public.admin_video_status_breakdown()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_moderation jsonb;
  v_visual jsonb;
  v_serving jsonb;
  v_matrix jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT coalesce(jsonb_object_agg(state, c), '{}'::jsonb) INTO v_moderation
  FROM (SELECT coalesce(moderation_state::text,'unknown') state, count(*) c
        FROM public.curated_videos GROUP BY 1) t;

  SELECT coalesce(jsonb_object_agg(state, c), '{}'::jsonb) INTO v_visual
  FROM (SELECT coalesce(visual_state,'unchecked') state, count(*) c
        FROM public.curated_videos GROUP BY 1) t;

  SELECT jsonb_build_object(
           'total', count(*),
           'archived', count(*) FILTER (WHERE is_archived),
           'servable', count(*) FILTER (
             WHERE moderation_state IN ('approved','auto_approved')
               AND is_archived = false AND visual_state = 'clean'),
           'approved_awaiting_check', count(*) FILTER (
             WHERE moderation_state IN ('approved','auto_approved')
               AND is_archived = false
               AND (visual_state IS NULL OR visual_state = 'unchecked')),
           'approved_flagged', count(*) FILTER (
             WHERE moderation_state IN ('approved','auto_approved')
               AND visual_state = 'flagged')
         ) INTO v_serving
  FROM public.curated_videos;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'moderation_state', x->>'visual_state'), '[]'::jsonb)
    INTO v_matrix
  FROM (
    SELECT jsonb_build_object(
             'moderation_state', coalesce(moderation_state::text,'unknown'),
             'visual_state', coalesce(visual_state,'unchecked'),
             'is_archived', is_archived,
             'videos', count(*)
           ) x
    FROM public.curated_videos
    GROUP BY 1, 2, 3
  ) s;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'moderation', v_moderation,
    'visual', v_visual,
    'serving', v_serving,
    'matrix', v_matrix
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_video_status_breakdown() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_video_status_breakdown() FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_video_status_breakdown() TO authenticated, service_role;

-- 4. Launch gate
CREATE OR REPLACE FUNCTION public.admin_launch_gate(p_target bigint DEFAULT 1000000)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total bigint;
  v_servable bigint;
  v_approved bigint;
  v_rejected bigint;
  v_blocked bigint;
  v_flagged bigint;
  v_backlog bigint;
  v_archived bigint;
  v_sweep record;
  v_open_alerts bigint;
  v_ready boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*),
         count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')),
         count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')
                            AND is_archived = false AND visual_state = 'clean'),
         count(*) FILTER (WHERE moderation_state = 'rejected'),
         count(*) FILTER (WHERE moderation_state = 'blocked'),
         count(*) FILTER (WHERE visual_state = 'flagged'),
         count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')
                            AND is_archived = false
                            AND (visual_state IS NULL OR visual_state = 'unchecked')),
         count(*) FILTER (WHERE is_archived)
    INTO v_total, v_approved, v_servable, v_rejected, v_blocked, v_flagged, v_backlog, v_archived
  FROM public.curated_videos;

  SELECT ran_at, eligible_unchecked, checked_last_hour, newly_marked, alerted
    INTO v_sweep
  FROM public.video_sweep_runs ORDER BY ran_at DESC LIMIT 1;

  SELECT count(*) INTO v_open_alerts
  FROM public.production_alerts
  WHERE resolved_at IS NULL AND severity IN ('error','critical');

  v_ready := v_servable >= p_target AND v_backlog = 0 AND v_open_alerts = 0;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'target_servable', p_target,
    'corpus_total', v_total,
    'approved_total', v_approved,
    'servable_halal', v_servable,
    'rejected', v_rejected,
    'blocked', v_blocked,
    'flagged', v_flagged,
    'archived', v_archived,
    'awaiting_check', v_backlog,
    'progress_pct', round((v_servable::numeric * 100) / GREATEST(p_target, 1), 2),
    'remaining_to_target', GREATEST(p_target - v_servable, 0),
    'open_critical_alerts', v_open_alerts,
    'last_sweep', CASE WHEN v_sweep.ran_at IS NULL THEN NULL ELSE jsonb_build_object(
        'ran_at', v_sweep.ran_at,
        'eligible_unchecked', v_sweep.eligible_unchecked,
        'checked_last_hour', v_sweep.checked_last_hour,
        'newly_marked', v_sweep.newly_marked,
        'alerted', v_sweep.alerted) END,
    'checks', jsonb_build_array(
      jsonb_build_object('id','corpus_target','label','Servable strict-halal videos at or above target',
                         'ok', v_servable >= p_target,
                         'detail', v_servable || ' / ' || p_target),
      jsonb_build_object('id','queue_zero','label','Unchecked serving queue at zero',
                         'ok', v_backlog = 0, 'detail', v_backlog || ' awaiting check'),
      jsonb_build_object('id','sweep_fresh','label','Automated sweep ran in the last hour',
                         'ok', v_sweep.ran_at IS NOT NULL AND v_sweep.ran_at > now() - interval '1 hour',
                         'detail', coalesce(to_char(v_sweep.ran_at,'YYYY-MM-DD HH24:MI:SS UTC'),'never')),
      jsonb_build_object('id','no_alerts','label','No open critical alerts',
                         'ok', v_open_alerts = 0, 'detail', v_open_alerts || ' open')
    ),
    'ready', v_ready
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_launch_gate(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_launch_gate(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_launch_gate(bigint) TO authenticated, service_role;

-- 5. Schedule the sweep every 15 minutes
SELECT cron.unschedule('unchecked-serving-queue-sweep-15min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'unchecked-serving-queue-sweep-15min');

SELECT cron.schedule('unchecked-serving-queue-sweep-15min', '*/15 * * * *',
  $$SELECT public.sweep_unchecked_serving_queue(20000);$$);