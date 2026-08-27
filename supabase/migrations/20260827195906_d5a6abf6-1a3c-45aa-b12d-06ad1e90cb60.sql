-- 1. Adjustable visual-scan worker settings (admin-managed, service-role consumed)
CREATE TABLE IF NOT EXISTS public.visual_scan_worker_config (
  id text PRIMARY KEY DEFAULT 'default',
  enabled boolean NOT NULL DEFAULT true,
  batch_size integer NOT NULL DEFAULT 40 CHECK (batch_size BETWEEN 1 AND 300),
  concurrency integer NOT NULL DEFAULT 16 CHECK (concurrency BETWEEN 1 AND 64),
  max_retries integer NOT NULL DEFAULT 2 CHECK (max_retries BETWEEN 0 AND 5),
  backoff_ms integer NOT NULL DEFAULT 750 CHECK (backoff_ms BETWEEN 100 AND 10000),
  call_timeout_ms integer NOT NULL DEFAULT 20000 CHECK (call_timeout_ms BETWEEN 2000 AND 60000),
  budget_ms integer NOT NULL DEFAULT 90000 CHECK (budget_ms BETWEEN 10000 AND 240000),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.visual_scan_worker_config TO authenticated;
GRANT ALL ON public.visual_scan_worker_config TO service_role;

ALTER TABLE public.visual_scan_worker_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read worker config" ON public.visual_scan_worker_config;
CREATE POLICY "Admins can read worker config"
  ON public.visual_scan_worker_config FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can update worker config" ON public.visual_scan_worker_config;
CREATE POLICY "Admins can update worker config"
  ON public.visual_scan_worker_config FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS visual_scan_worker_config_updated_at ON public.visual_scan_worker_config;
CREATE TRIGGER visual_scan_worker_config_updated_at
  BEFORE UPDATE ON public.visual_scan_worker_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.visual_scan_worker_config (id) VALUES ('default')
ON CONFLICT (id) DO NOTHING;

-- 2. Admin-triggered immediate sweep
CREATE OR REPLACE FUNCTION public.admin_run_unchecked_sweep(p_max integer DEFAULT 20000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_started timestamptz := clock_timestamp();
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_result := public.sweep_unchecked_serving_queue(GREATEST(LEAST(coalesce(p_max, 20000), 100000), 1));

  INSERT INTO public.privileged_actions_log (actor_id, action, target_type, target_id, metadata)
  VALUES (auth.uid(), 'run_unchecked_sweep', 'curated_videos', 'manual', v_result);

  RETURN v_result || jsonb_build_object(
    'ran_at', now(),
    'duration_ms', round(extract(epoch FROM clock_timestamp() - v_started) * 1000)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_run_unchecked_sweep(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_run_unchecked_sweep(integer) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_run_unchecked_sweep(integer) TO authenticated, service_role;

-- 3. Throughput + ETA forecast toward the serving target
CREATE OR REPLACE FUNCTION public.admin_launch_forecast(p_target bigint DEFAULT 1000000)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_servable bigint;
  v_backlog bigint;
  v_h1 bigint;
  v_h24 bigint;
  v_d7 bigint;
  v_rate numeric;
  v_remaining bigint;
  v_eta_hours numeric;
  v_drain_hours numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')
                            AND is_archived = false AND visual_state = 'clean'),
         count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')
                            AND is_archived = false
                            AND (visual_state IS NULL OR visual_state = 'unchecked'))
    INTO v_servable, v_backlog
  FROM public.curated_videos;

  SELECT count(*) FILTER (WHERE visual_checked_at > now() - interval '1 hour'),
         count(*) FILTER (WHERE visual_checked_at > now() - interval '24 hours'),
         count(*) FILTER (WHERE visual_checked_at > now() - interval '7 days')
    INTO v_h1, v_h24, v_d7
  FROM public.curated_videos
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_archived = false
    AND visual_state = 'clean'
    AND visual_checked_at > now() - interval '7 days';

  -- Blended hourly clear-rate: recent hour weighted highest, longer windows
  -- stabilise it against a single idle or bursty tick.
  v_rate := GREATEST(
    (v_h1 * 0.5) + ((v_h24 / 24.0) * 0.3) + ((v_d7 / 168.0) * 0.2),
    0
  );

  v_remaining := GREATEST(p_target - v_servable, 0);
  v_eta_hours := CASE WHEN v_rate > 0 AND v_remaining > 0 THEN v_remaining / v_rate END;
  v_drain_hours := CASE WHEN v_rate > 0 AND v_backlog > 0 THEN v_backlog / v_rate END;

  RETURN jsonb_build_object(
    'generated_at', now(),
    'target_servable', p_target,
    'servable_halal', v_servable,
    'awaiting_check', v_backlog,
    'cleared_last_hour', v_h1,
    'cleared_last_24h', v_h24,
    'cleared_last_7d', v_d7,
    'rate_per_hour', round(v_rate, 1),
    'rate_per_day', round(v_rate * 24, 0),
    'remaining_to_target', v_remaining,
    'eta_hours', CASE WHEN v_eta_hours IS NULL THEN NULL ELSE round(v_eta_hours, 1) END,
    'eta_days', CASE WHEN v_eta_hours IS NULL THEN NULL ELSE round(v_eta_hours / 24, 1) END,
    'eta_at', CASE WHEN v_eta_hours IS NULL THEN NULL
                   ELSE now() + make_interval(mins => (v_eta_hours * 60)::int) END,
    'queue_drain_hours', CASE WHEN v_drain_hours IS NULL THEN NULL ELSE round(v_drain_hours, 1) END,
    'stalled', v_rate <= 0
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_launch_forecast(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_launch_forecast(bigint) FROM anon;
GRANT EXECUTE ON FUNCTION public.admin_launch_forecast(bigint) TO authenticated, service_role;