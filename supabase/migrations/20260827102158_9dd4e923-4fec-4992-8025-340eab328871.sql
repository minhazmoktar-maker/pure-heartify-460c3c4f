-- 1. Audit report storage -----------------------------------------------------
CREATE TABLE IF NOT EXISTS public.serving_audit_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  total_videos bigint NOT NULL DEFAULT 0,
  served_recent bigint NOT NULL DEFAULT 0,
  servable bigint NOT NULL DEFAULT 0,
  unserved bigint NOT NULL DEFAULT 0,
  gates jsonb NOT NULL DEFAULT '{}'::jsonb,
  rates jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.serving_audit_reports TO authenticated;
GRANT ALL ON public.serving_audit_reports TO service_role;
ALTER TABLE public.serving_audit_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read serving audit reports" ON public.serving_audit_reports;
CREATE POLICY "Admins read serving audit reports"
  ON public.serving_audit_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS trg_serving_audit_reports_updated_at ON public.serving_audit_reports;
CREATE TRIGGER trg_serving_audit_reports_updated_at
  BEFORE UPDATE ON public.serving_audit_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_serving_audit_reports_ran_at
  ON public.serving_audit_reports (ran_at DESC);

-- 2. Shared gate classifier ---------------------------------------------------
-- Returns the single first failing serving condition for a video row, or
-- 'served'/'eligible_never_served' when nothing gates it.
CREATE OR REPLACE FUNCTION public.serving_gate_for(
  _moderation_state text,
  _visual_state text,
  _title text,
  _channel_title text,
  _duplicate_group_id text,
  _is_duplicate_canonical boolean,
  _is_hidden boolean,
  _is_archived boolean,
  _served boolean
) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN COALESCE(_is_archived, false) THEN 'archived'
    WHEN _moderation_state IN ('rejected','blocked') THEN 'moderation_rejected'
    WHEN _moderation_state NOT IN ('approved','auto_approved') THEN 'moderation_pending'
    WHEN _visual_state IS NULL OR _visual_state = 'unchecked' THEN 'unchecked'
    WHEN _visual_state <> 'clean' THEN 'visual_state'
    WHEN (SELECT tier1 OR tier2 FROM public.halal_text_flags(_title, _channel_title)) THEN 'halal_filter'
    WHEN _duplicate_group_id IS NULL THEN 'dedup_lag'
    WHEN _is_duplicate_canonical IS NULL THEN 'canonical_lag'
    WHEN _is_duplicate_canonical IS FALSE THEN 'duplicate_non_canonical'
    WHEN COALESCE(_is_hidden, false) THEN 'hidden'
    WHEN COALESCE(_served, false) THEN 'served'
    ELSE 'eligible_never_served'
  END
$$;

-- 3. Daily audit job ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_serving_audit(p_serve_window_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _d integer := LEAST(GREATEST(COALESCE(p_serve_window_days, 7), 1), 30);
  _gates jsonb;
  _total bigint; _served bigint; _servable bigint; _unserved bigint;
  _rates jsonb; _report_id uuid;
BEGIN
  WITH served AS (
    SELECT DISTINCT video_id FROM public.feed_exposures
    WHERE served_at >= now() - make_interval(days => _d)
  ), classified AS (
    SELECT public.serving_gate_for(
      cv.moderation_state::text, cv.visual_state, cv.title, cv.channel_title,
      cv.duplicate_group_id, cv.is_duplicate_canonical, cv.is_hidden, cv.is_archived,
      s.video_id IS NOT NULL
    ) AS gate
    FROM public.curated_videos cv
    LEFT JOIN served s ON s.video_id = cv.video_id
  )
  SELECT jsonb_object_agg(gate, n), sum(n)
    INTO _gates, _total
  FROM (SELECT gate, count(*) AS n FROM classified GROUP BY gate) g;

  _gates := COALESCE(_gates, '{}'::jsonb);
  _total := COALESCE(_total, 0);
  _served := COALESCE((_gates->>'served')::bigint, 0);
  _servable := _served + COALESCE((_gates->>'eligible_never_served')::bigint, 0);
  _unserved := _total - _served;

  _rates := jsonb_build_object(
    'served_pct', round(100.0 * _served / GREATEST(_total, 1), 3),
    'unchecked_pct', round(100.0 * COALESCE((_gates->>'unchecked')::bigint,0) / GREATEST(_total,1), 3),
    'visual_not_clean_pct', round(100.0 * (
        COALESCE((_gates->>'visual_state')::bigint,0) + COALESCE((_gates->>'unchecked')::bigint,0)
      ) / GREATEST(_total,1), 3),
    'halal_filter_pct', round(100.0 * COALESCE((_gates->>'halal_filter')::bigint,0) / GREATEST(_total,1), 3),
    'dedup_lag_pct', round(100.0 * (
        COALESCE((_gates->>'dedup_lag')::bigint,0) + COALESCE((_gates->>'canonical_lag')::bigint,0)
      ) / GREATEST(_total,1), 3),
    'eligible_never_served_pct', round(100.0 * COALESCE((_gates->>'eligible_never_served')::bigint,0) / GREATEST(_total,1), 3)
  );

  INSERT INTO public.serving_audit_reports
    (total_videos, served_recent, servable, unserved, gates, rates)
  VALUES (_total, _served, _servable, _unserved, _gates, _rates)
  RETURNING id INTO _report_id;

  -- Corpus-integrity alerts: nothing approved may sit unchecked, and no
  -- servable video should go a whole window without ever being served.
  IF COALESCE((_gates->>'unchecked')::bigint, 0) > 0 THEN
    INSERT INTO public.production_alerts (kind, severity, message, route, context)
    VALUES ('serving_audit_unchecked_remaining',
      CASE WHEN (_gates->>'unchecked')::bigint > 500 THEN 'error' ELSE 'warning' END,
      format('%s approved video(s) still unchecked by the visual sweep',
             (_gates->>'unchecked')::bigint),
      '/admin/unchecked-videos',
      jsonb_build_object('report_id', _report_id, 'gates', _gates, 'rates', _rates));
  END IF;

  IF COALESCE((_gates->>'eligible_never_served')::bigint, 0) > GREATEST(_servable / 20, 50) THEN
    INSERT INTO public.production_alerts (kind, severity, message, route, context)
    VALUES ('serving_audit_never_served', 'warning',
      format('%s servable video(s) were not served in the last %s day(s)',
             (_gates->>'eligible_never_served')::bigint, _d),
      '/admin/unserved-videos',
      jsonb_build_object('report_id', _report_id, 'window_days', _d, 'rates', _rates));
  END IF;

  RETURN jsonb_build_object('report_id', _report_id, 'window_days', _d,
    'total', _total, 'served', _served, 'servable', _servable,
    'unserved', _unserved, 'gates', _gates, 'rates', _rates, 'ran_at', now());
END; $$;

REVOKE ALL ON FUNCTION public.run_serving_audit(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.run_serving_audit(integer) TO service_role;

-- Admin-triggered manual run of the same audit.
CREATE OR REPLACE FUNCTION public.admin_run_serving_audit(p_serve_window_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN public.run_serving_audit(p_serve_window_days);
END; $$;

-- 4. Unserved drilldown -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_unserved_videos(
  _gate text DEFAULT NULL,
  _channel text DEFAULT NULL,
  _serve_window_days integer DEFAULT 7,
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
) RETURNS TABLE(
  video_id text, title text, channel_id text, channel_title text, thumbnail_url text,
  gate text, moderation_state text, visual_state text, visual_flags text[],
  duplicate_group_id text, is_duplicate_canonical boolean, is_hidden boolean,
  hidden_reason text, ingested_at timestamptz, age_hours numeric, total_count bigint
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _d integer := LEAST(GREATEST(COALESCE(_serve_window_days, 7), 1), 30);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH served AS (
    SELECT DISTINCT fe.video_id FROM public.feed_exposures fe
    WHERE fe.served_at >= now() - make_interval(days => _d)
  ), base AS (
    SELECT cv.*, public.serving_gate_for(
        cv.moderation_state::text, cv.visual_state, cv.title, cv.channel_title,
        cv.duplicate_group_id, cv.is_duplicate_canonical, cv.is_hidden, cv.is_archived,
        s.video_id IS NOT NULL) AS gate
    FROM public.curated_videos cv
    LEFT JOIN served s ON s.video_id = cv.video_id
    WHERE (_channel IS NULL
           OR cv.channel_title ILIKE '%' || _channel || '%'
           OR cv.channel_id = _channel)
  ), filtered AS (
    SELECT * FROM base
    WHERE gate <> 'served'
      AND (_gate IS NULL OR gate = _gate)
  ), counted AS (SELECT count(*) AS n FROM filtered)
  SELECT f.video_id, f.title, f.channel_id, f.channel_title, f.thumbnail_url,
         f.gate, f.moderation_state::text, f.visual_state, f.visual_flags,
         f.duplicate_group_id, f.is_duplicate_canonical, f.is_hidden, f.hidden_reason,
         f.ingested_at,
         round(extract(epoch FROM now() - f.ingested_at) / 3600.0, 1),
         c.n
  FROM filtered f CROSS JOIN counted c
  ORDER BY f.ingested_at ASC NULLS FIRST
  LIMIT GREATEST(LEAST(_limit, 500), 1)
  OFFSET GREATEST(_offset, 0);
END; $$;

-- 5. Serving-predicate failure spike check ------------------------------------
CREATE OR REPLACE FUNCTION public.check_serving_predicate_failures(
  p_warn_delta numeric DEFAULT 1.0,
  p_error_delta numeric DEFAULT 3.0
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _total bigint; _not_clean bigint; _halal bigint;
  _cur_not_clean numeric; _cur_halal numeric;
  _base_not_clean numeric; _base_halal numeric;
  _alerts jsonb := '[]'::jsonb;

  PROCEDURE_PLACEHOLDER boolean;
BEGIN
  SELECT count(*),
         count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')
                            AND (visual_state IS NULL OR visual_state <> 'clean')),
         count(*) FILTER (WHERE moderation_state IN ('approved','auto_approved')
                            AND visual_state = 'clean'
                            AND (SELECT tier1 OR tier2 FROM public.halal_text_flags(title, channel_title)))
    INTO _total, _not_clean, _halal
  FROM public.curated_videos
  WHERE is_archived = false;

  _cur_not_clean := round(100.0 * _not_clean / GREATEST(_total, 1), 3);
  _cur_halal := round(100.0 * _halal / GREATEST(_total, 1), 3);

  SELECT round(avg((rates->>'visual_not_clean_pct')::numeric), 3),
         round(avg((rates->>'halal_filter_pct')::numeric), 3)
    INTO _base_not_clean, _base_halal
  FROM (SELECT rates FROM public.serving_audit_reports
        WHERE ran_at >= now() - interval '8 days' AND ran_at < now() - interval '12 hours'
        ORDER BY ran_at DESC LIMIT 7) r;

  IF _base_not_clean IS NOT NULL AND _cur_not_clean - _base_not_clean >= p_warn_delta THEN
    INSERT INTO public.production_alerts (kind, severity, message, route, context)
    VALUES ('serving_predicate_visual_spike',
      CASE WHEN _cur_not_clean - _base_not_clean >= p_error_delta THEN 'critical' ELSE 'error' END,
      format('Visual-state-not-clean exclusion rose to %s%% (7-day baseline %s%%)',
             _cur_not_clean, _base_not_clean),
      '/admin/unserved-videos',
      jsonb_build_object('metric','visual_not_clean_pct','value',_cur_not_clean,
        'baseline',_base_not_clean,'delta',round(_cur_not_clean - _base_not_clean,3),
        'affected',_not_clean,'total',_total));
    _alerts := _alerts || jsonb_build_object('kind','serving_predicate_visual_spike',
      'value',_cur_not_clean,'baseline',_base_not_clean);
  END IF;

  IF _base_halal IS NOT NULL AND _cur_halal - _base_halal >= p_warn_delta THEN
    INSERT INTO public.production_alerts (kind, severity, message, route, context)
    VALUES ('serving_predicate_halal_spike',
      CASE WHEN _cur_halal - _base_halal >= p_error_delta THEN 'critical' ELSE 'error' END,
      format('Halal-filter exclusion rose to %s%% (7-day baseline %s%%)',
             _cur_halal, _base_halal),
      '/admin/unserved-videos',
      jsonb_build_object('metric','halal_filter_pct','value',_cur_halal,
        'baseline',_base_halal,'delta',round(_cur_halal - _base_halal,3),
        'affected',_halal,'total',_total));
    _alerts := _alerts || jsonb_build_object('kind','serving_predicate_halal_spike',
      'value',_cur_halal,'baseline',_base_halal);
  END IF;

  RETURN jsonb_build_object('checked_at', now(), 'total', _total,
    'visual_not_clean_pct', _cur_not_clean, 'visual_baseline', _base_not_clean,
    'halal_filter_pct', _cur_halal, 'halal_baseline', _base_halal,
    'alerts', _alerts, 'raised', jsonb_array_length(_alerts));
END; $$;

REVOKE ALL ON FUNCTION public.check_serving_predicate_failures(numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_serving_predicate_failures(numeric, numeric) TO service_role;

-- Severity-based routing for the new alert kinds.
INSERT INTO public.alert_routing_config (kind, min_severity, slack, email, enabled)
SELECT k, 'error', true, true, true
FROM (VALUES ('serving_predicate_visual_spike'), ('serving_predicate_halal_spike')) v(k)
WHERE NOT EXISTS (SELECT 1 FROM public.alert_routing_config c WHERE c.kind = v.k);

INSERT INTO public.alert_routing_config (kind, min_severity, slack, email, enabled)
SELECT k, 'warning', true, false, true
FROM (VALUES ('serving_audit_unchecked_remaining'), ('serving_audit_never_served')) v(k)
WHERE NOT EXISTS (SELECT 1 FROM public.alert_routing_config c WHERE c.kind = v.k);

-- 6. Reliability incident timeline -------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_reliability_timeline(p_days integer DEFAULT 7)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _d integer := LEAST(GREATEST(COALESCE(p_days, 7), 1), 30);
  _since timestamptz;
  _alerts jsonb; _snaps jsonb; _remed jsonb; _audits jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  _since := now() - make_interval(days => _d);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'at', created_at, 'kind', kind, 'severity', severity, 'message', message,
      'route', route, 'notified_at', notified_at, 'notify_result', notify_result,
      'context', context) ORDER BY created_at DESC), '[]'::jsonb)
    INTO _alerts
  FROM public.production_alerts WHERE created_at >= _since;

  SELECT COALESCE(jsonb_agg(to_jsonb(w) ORDER BY w.captured_at DESC), '[]'::jsonb)
    INTO _snaps
  FROM public.worker_health_snapshots w WHERE w.captured_at >= _since;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'at', created_at, 'kind', kind, 'severity', severity,
      'remediation', context->'remediation') ORDER BY created_at DESC), '[]'::jsonb)
    INTO _remed
  FROM public.production_alerts
  WHERE created_at >= _since AND context ? 'remediation';

  SELECT COALESCE(jsonb_agg(to_jsonb(s) ORDER BY s.ran_at DESC), '[]'::jsonb)
    INTO _audits
  FROM public.serving_audit_reports s WHERE s.ran_at >= _since;

  RETURN jsonb_build_object(
    'window_days', _d, 'since', _since, 'generated_at', now(),
    'alerts', _alerts, 'worker_health', _snaps,
    'remediations', _remed, 'serving_audits', _audits,
    'replay', public.admin_replay_quality_checks(LEAST(_d * 24, 168)),
    'counts', jsonb_build_object(
      'alerts', jsonb_array_length(_alerts),
      'worker_health', jsonb_array_length(_snaps),
      'remediations', jsonb_array_length(_remed),
      'serving_audits', jsonb_array_length(_audits)));
END; $$;

-- 7. Schedules ----------------------------------------------------------------
SELECT cron.unschedule('serving-audit-daily')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'serving-audit-daily');
SELECT cron.schedule('serving-audit-daily', '10 2 * * *',
  $$ SELECT public.run_serving_audit(7); $$);

SELECT cron.unschedule('serving-predicate-spike-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'serving-predicate-spike-check');
SELECT cron.schedule('serving-predicate-spike-check', '35 * * * *',
  $$ SELECT public.check_serving_predicate_failures(); $$);
