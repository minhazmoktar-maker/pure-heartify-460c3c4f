-- 1. notification bookkeeping on alerts
ALTER TABLE public.production_alerts
  ADD COLUMN IF NOT EXISTS notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS notify_result jsonb;

CREATE INDEX IF NOT EXISTS production_alerts_notify_idx
  ON public.production_alerts (created_at DESC) WHERE notified_at IS NULL;

-- 2. severity-based routing config
CREATE TABLE IF NOT EXISTS public.alert_routing_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text,
  min_severity text NOT NULL DEFAULT 'warning',
  slack boolean NOT NULL DEFAULT true,
  email boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS alert_routing_config_kind_uidx
  ON public.alert_routing_config (COALESCE(kind, '*'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.alert_routing_config TO authenticated;
GRANT ALL ON public.alert_routing_config TO service_role;
ALTER TABLE public.alert_routing_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage alert routing" ON public.alert_routing_config;
CREATE POLICY "Admins manage alert routing" ON public.alert_routing_config
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.alert_routing_config (kind, min_severity, slack, email)
VALUES (NULL, 'warning', true, false)
ON CONFLICT DO NOTHING;
INSERT INTO public.alert_routing_config (kind, min_severity, slack, email)
SELECT k, 'warning', true, true FROM unnest(ARRAY[
  'dedup_backfill_stalled','dedup_backfill_lag','dedup_canonical_lag',
  'feed_novelty_dip','feed_coverage_dip','feed_diversity_dip',
  'feed_serve_flatline','feed_serve_throughput_drop','feed_segment_flatline',
  'worker_drain_below_sla']) AS k
WHERE NOT EXISTS (SELECT 1 FROM public.alert_routing_config c WHERE c.kind = k);

CREATE OR REPLACE FUNCTION public.touch_updated_at_generic()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS alert_routing_config_touch ON public.alert_routing_config;
CREATE TRIGGER alert_routing_config_touch BEFORE UPDATE ON public.alert_routing_config
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();

-- 3. configurable serve-throughput thresholds (global + per segment)
CREATE TABLE IF NOT EXISTS public.serve_throughput_thresholds (
  segment text PRIMARY KEY,
  min_baseline integer NOT NULL DEFAULT 200,
  drop_ratio numeric NOT NULL DEFAULT 0.4,
  min_weekly_impressions integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.serve_throughput_thresholds TO authenticated;
GRANT ALL ON public.serve_throughput_thresholds TO service_role;
ALTER TABLE public.serve_throughput_thresholds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage serve thresholds" ON public.serve_throughput_thresholds;
CREATE POLICY "Admins manage serve thresholds" ON public.serve_throughput_thresholds
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS serve_thresholds_touch ON public.serve_throughput_thresholds;
CREATE TRIGGER serve_thresholds_touch BEFORE UPDATE ON public.serve_throughput_thresholds
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();

INSERT INTO public.serve_throughput_thresholds (segment, min_baseline, drop_ratio, min_weekly_impressions)
VALUES ('global', 200, 0.4, 100)
ON CONFLICT (segment) DO NOTHING;

-- 3b. watchdog now reads the config table
CREATE OR REPLACE FUNCTION public.check_serve_throughput(
  p_drop_ratio numeric DEFAULT NULL,
  p_min_baseline integer DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _recent bigint;
  _baseline numeric;
  _flatlined text[];
  _alerts integer := 0;
  _g record;
  _drop numeric;
  _minbase integer;
BEGIN
  SELECT * INTO _g FROM public.serve_throughput_thresholds WHERE segment = 'global';
  _drop := COALESCE(p_drop_ratio, _g.drop_ratio, 0.4);
  _minbase := COALESCE(p_min_baseline, _g.min_baseline, 200);

  IF _g.enabled IS FALSE THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'global_disabled');
  END IF;

  SELECT count(*) INTO _recent
  FROM public.feed_exposures WHERE served_at >= now() - interval '6 hours';

  SELECT round(count(*)::numeric / 7, 1) INTO _baseline
  FROM public.feed_exposures
  WHERE served_at >= now() - interval '7 days' - interval '6 hours'
    AND served_at < now() - interval '6 hours'
    AND extract(hour FROM served_at) BETWEEN extract(hour FROM now() - interval '6 hours')
                                         AND extract(hour FROM now());

  IF _baseline < _minbase THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'baseline_too_small',
                              'recent', _recent, 'baseline', _baseline,
                              'min_baseline', _minbase);
  END IF;

  IF _recent = 0 OR _recent < _baseline * _drop THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT CASE WHEN _recent = 0 THEN 'feed_serve_flatline' ELSE 'feed_serve_throughput_drop' END,
      CASE WHEN _recent = 0 THEN 'critical' ELSE 'warning' END,
      format('Feed serves %s: %s impressions in the last 6h vs a %s baseline',
             CASE WHEN _recent = 0 THEN 'flatlined' ELSE 'dropped' END, _recent, _baseline),
      jsonb_build_object('recent_6h', _recent, 'baseline_6h', _baseline,
                         'drop_ratio_threshold', _drop, 'min_baseline', _minbase,
                         'runbook', jsonb_build_array(
                           'Check the feed edge function logs and error rate.',
                           'Confirm the serving floor still has canonical clean videos (Corpus check coverage).',
                           'Verify pg_cron sweeps and the dedup backfill are running.',
                           'Tune sensitivity at /admin/reliability if this is expected traffic.')),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind IN ('feed_serve_flatline','feed_serve_throughput_drop')
        AND resolved_at IS NULL AND created_at > now() - interval '3 hours');
    _alerts := _alerts + 1;
  END IF;

  -- Per-segment flatline, per-segment configurable minimum weekly volume.
  SELECT array_agg(lang) INTO _flatlined FROM (
    SELECT lang FROM (
      SELECT coalesce(fe.content_language, 'unknown') AS lang, count(*) AS n
      FROM public.feed_exposures fe
      WHERE fe.served_at >= now() - interval '7 days' AND fe.served_at < now() - interval '24 hours'
      GROUP BY 1
    ) w
    LEFT JOIN public.serve_throughput_thresholds t ON t.segment = w.lang
    WHERE COALESCE(t.enabled, true)
      AND w.n >= COALESCE(t.min_weekly_impressions, _g.min_weekly_impressions, 100)
    EXCEPT
    SELECT coalesce(content_language, 'unknown')
    FROM public.feed_exposures
    WHERE served_at >= now() - interval '24 hours'
    GROUP BY 1
  ) s;

  IF _flatlined IS NOT NULL AND array_length(_flatlined, 1) > 0 THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'feed_segment_flatline', 'warning',
      format('Language segments served last week got zero impressions today: %s',
             array_to_string(_flatlined, ', ')),
      jsonb_build_object('segments', to_jsonb(_flatlined)),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'feed_segment_flatline' AND resolved_at IS NULL
        AND created_at > now() - interval '12 hours');
    _alerts := _alerts + 1;
  END IF;

  RETURN jsonb_build_object('recent_6h', _recent, 'baseline_6h', _baseline,
                            'drop_ratio', _drop, 'min_baseline', _minbase,
                            'flatlined_segments', to_jsonb(_flatlined),
                            'alerts_raised', _alerts);
END; $$;

-- 4. worker health SLA
CREATE TABLE IF NOT EXISTS public.worker_health_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captured_at timestamptz NOT NULL DEFAULT now(),
  dedup_pending bigint NOT NULL DEFAULT 0,
  canonical_pending bigint NOT NULL DEFAULT 0,
  visual_unchecked bigint NOT NULL DEFAULT 0,
  visual_unchecked_approved bigint NOT NULL DEFAULT 0,
  dedup_grouped_last_hour bigint NOT NULL DEFAULT 0,
  visual_checked_last_hour bigint NOT NULL DEFAULT 0,
  dlq_open bigint NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS worker_health_snapshots_at_idx
  ON public.worker_health_snapshots (captured_at DESC);
GRANT SELECT ON public.worker_health_snapshots TO authenticated;
GRANT ALL ON public.worker_health_snapshots TO service_role;
ALTER TABLE public.worker_health_snapshots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins read worker health" ON public.worker_health_snapshots;
CREATE POLICY "Admins read worker health" ON public.worker_health_snapshots
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.worker_sla_targets (
  worker text PRIMARY KEY,
  min_per_hour integer NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_sla_targets TO authenticated;
GRANT ALL ON public.worker_sla_targets TO service_role;
ALTER TABLE public.worker_sla_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage worker SLA" ON public.worker_sla_targets;
CREATE POLICY "Admins manage worker SLA" ON public.worker_sla_targets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
DROP TRIGGER IF EXISTS worker_sla_touch ON public.worker_sla_targets;
CREATE TRIGGER worker_sla_touch BEFORE UPDATE ON public.worker_sla_targets
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_generic();

INSERT INTO public.worker_sla_targets (worker, min_per_hour) VALUES
  ('dedup_backfill', 2000), ('visual_sweep', 400)
ON CONFLICT (worker) DO NOTHING;

CREATE OR REPLACE FUNCTION public.snapshot_worker_health()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _row public.worker_health_snapshots;
BEGIN
  INSERT INTO public.worker_health_snapshots (
    dedup_pending, canonical_pending, visual_unchecked, visual_unchecked_approved,
    dedup_grouped_last_hour, visual_checked_last_hour, dlq_open)
  SELECT
    (SELECT count(*) FROM public.curated_videos WHERE duplicate_grouped_at IS NULL),
    (SELECT count(*) FROM public.curated_videos
      WHERE duplicate_group_id IS NOT NULL AND is_duplicate_canonical IS NULL),
    (SELECT count(*) FROM public.curated_videos
      WHERE visual_state IS NULL OR visual_state = 'unchecked'),
    (SELECT count(*) FROM public.curated_videos
      WHERE moderation_state IN ('approved','auto_approved') AND is_archived = false
        AND (visual_state IS NULL OR visual_state = 'unchecked')),
    (SELECT count(*) FROM public.curated_videos
      WHERE duplicate_grouped_at >= now() - interval '1 hour'),
    (SELECT count(*) FROM public.curated_videos
      WHERE visual_checked_at >= now() - interval '1 hour'),
    (SELECT count(*) FROM public.dead_letter_queue WHERE resolved_at IS NULL)
  RETURNING * INTO _row;
  RETURN to_jsonb(_row);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_worker_health(p_hours integer DEFAULT 48)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _h integer := LEAST(GREATEST(COALESCE(p_hours, 48), 1), 720);
  _series jsonb;
  _latest jsonb;
  _dedup_target integer;
  _visual_target integer;
  _dedup_rate numeric;
  _visual_rate numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT min_per_hour INTO _dedup_target FROM public.worker_sla_targets WHERE worker = 'dedup_backfill';
  SELECT min_per_hour INTO _visual_target FROM public.worker_sla_targets WHERE worker = 'visual_sweep';

  SELECT coalesce(jsonb_agg(t ORDER BY t.captured_at), '[]'::jsonb) INTO _series
  FROM (
    SELECT captured_at, dedup_pending, canonical_pending, visual_unchecked,
           visual_unchecked_approved, dedup_grouped_last_hour, visual_checked_last_hour, dlq_open
    FROM public.worker_health_snapshots
    WHERE captured_at >= now() - make_interval(hours => _h)
    ORDER BY captured_at
  ) t;

  SELECT to_jsonb(s) INTO _latest FROM public.worker_health_snapshots s
  ORDER BY captured_at DESC LIMIT 1;

  SELECT round(avg(dedup_grouped_last_hour), 1), round(avg(visual_checked_last_hour), 1)
  INTO _dedup_rate, _visual_rate
  FROM public.worker_health_snapshots
  WHERE captured_at >= now() - interval '6 hours';

  RETURN jsonb_build_object(
    'series', _series,
    'latest', _latest,
    'targets', jsonb_build_object('dedup_backfill', _dedup_target, 'visual_sweep', _visual_target),
    'drain_rate_6h', jsonb_build_object('dedup_backfill', _dedup_rate, 'visual_sweep', _visual_rate),
    'sla_ok', jsonb_build_object(
      'dedup_backfill', COALESCE(_dedup_rate, 0) >= COALESCE(_dedup_target, 0)
                        OR COALESCE((_latest->>'dedup_pending')::bigint, 0) = 0,
      'visual_sweep', COALESCE(_visual_rate, 0) >= COALESCE(_visual_target, 0)
                        OR COALESCE((_latest->>'visual_unchecked_approved')::bigint, 0) = 0),
    'computed_at', now());
END; $$;

CREATE OR REPLACE FUNCTION public.check_worker_health_sla()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _t record;
  _rate numeric;
  _pending bigint;
  _alerts integer := 0;
  _id uuid;
  _fix jsonb;
BEGIN
  PERFORM public.snapshot_worker_health();

  FOR _t IN SELECT * FROM public.worker_sla_targets WHERE enabled LOOP
    IF _t.worker = 'dedup_backfill' THEN
      SELECT round(avg(dedup_grouped_last_hour), 1), max(dedup_pending)
        INTO _rate, _pending
      FROM public.worker_health_snapshots WHERE captured_at >= now() - interval '3 hours';
    ELSE
      SELECT round(avg(visual_checked_last_hour), 1), max(visual_unchecked_approved)
        INTO _rate, _pending
      FROM public.worker_health_snapshots WHERE captured_at >= now() - interval '3 hours';
    END IF;

    IF _rate IS NULL OR COALESCE(_pending, 0) = 0 THEN CONTINUE; END IF;

    IF _rate < _t.min_per_hour THEN
      INSERT INTO public.production_alerts (kind, severity, message, context, route)
      SELECT 'worker_drain_below_sla',
        CASE WHEN _rate = 0 THEN 'critical' ELSE 'warning' END,
        format('%s drain rate %s/h is below the %s/h target with %s items queued',
               _t.worker, _rate, _t.min_per_hour, _pending),
        jsonb_build_object('worker', _t.worker, 'drain_per_hour', _rate,
          'target_per_hour', _t.min_per_hour, 'queue_depth', _pending,
          'runbook', jsonb_build_array(
            'Open /admin/reliability → Worker health SLA for the drain trend.',
            'Confirm the pg_cron workers for this queue are firing and authenticated.',
            'Automated remediation fires extra sweep passes; re-check after 30 minutes.',
            'Unchecked videos are never served, so this degrades coverage, not safety.')),
        '/admin/reliability'
      WHERE NOT EXISTS (
        SELECT 1 FROM public.production_alerts
        WHERE kind = 'worker_drain_below_sla' AND resolved_at IS NULL
          AND context->>'worker' = _t.worker
          AND created_at > now() - interval '6 hours')
      RETURNING id INTO _id;

      IF _id IS NOT NULL THEN
        _alerts := _alerts + 1;
        IF _t.worker = 'visual_sweep' THEN
          BEGIN
            PERFORM net.http_post(
              url := 'https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/visual-safety-sweep',
              headers := jsonb_build_object('Content-Type','application/json',
                'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
              body := '{"batch":300}'::jsonb,
              timeout_milliseconds := 120000)
            FROM generate_series(1, 3);
            _fix := jsonb_build_object('action', 'extra_visual_sweep_passes', 'count', 3);
          EXCEPTION WHEN OTHERS THEN
            _fix := jsonb_build_object('action', 'extra_visual_sweep_passes', 'error', SQLERRM);
          END;
        ELSE
          BEGIN
            _fix := jsonb_build_object('action', 'recompute_duplicate_groups',
                                       'result', public.recompute_duplicate_groups(4000));
          EXCEPTION WHEN OTHERS THEN
            _fix := jsonb_build_object('action', 'recompute_duplicate_groups', 'error', SQLERRM);
          END;
        END IF;
        UPDATE public.production_alerts
        SET context = coalesce(context, '{}'::jsonb)
          || jsonb_build_object('remediation', jsonb_build_object(
               'applied_at', now(), 'mode', 'automatic', 'actions', jsonb_build_array(_fix)))
        WHERE id = _id;
        _id := NULL;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('alerts_raised', _alerts);
END; $$;

-- 5. read-only replay of the last N hours
CREATE OR REPLACE FUNCTION public.admin_replay_quality_checks(p_hours integer DEFAULT 24)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _h integer := LEAST(GREATEST(COALESCE(p_hours, 24), 1), 168);
  _sessions bigint; _exposures bigint; _unique bigint; _eligible bigint;
  _novelty numeric; _coverage numeric; _diversity numeric;
  _pending bigint; _grouped_1h bigint; _canonical_pending bigint;
  _recent bigint; _baseline numeric;
  _g record; _findings jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT count(*), count(DISTINCT video_id), count(DISTINCT session_key)
    INTO _exposures, _unique, _sessions
  FROM public.feed_exposures WHERE served_at >= now() - make_interval(hours => _h);

  SELECT count(*) INTO _eligible FROM public.curated_videos
  WHERE moderation_state IN ('approved','auto_approved') AND visual_state = 'clean'
    AND is_duplicate_canonical IS TRUE AND is_hidden = false AND is_archived = false;

  _novelty := round(100.0 * _unique / GREATEST(_exposures, 1), 2);
  _coverage := round(100.0 * _unique / GREATEST(_eligible, 1), 3);

  SELECT round(avg(d), 3) INTO _diversity FROM (
    SELECT count(DISTINCT channel_id)::numeric / GREATEST(count(*), 1) AS d
    FROM public.feed_exposures
    WHERE served_at >= now() - make_interval(hours => _h) AND channel_id IS NOT NULL
    GROUP BY session_key HAVING count(*) >= 5) s;

  SELECT count(*) FILTER (WHERE duplicate_grouped_at IS NULL),
         count(*) FILTER (WHERE duplicate_grouped_at >= now() - interval '1 hour'),
         count(*) FILTER (WHERE duplicate_group_id IS NOT NULL AND is_duplicate_canonical IS NULL)
    INTO _pending, _grouped_1h, _canonical_pending
  FROM public.curated_videos;

  SELECT * INTO _g FROM public.serve_throughput_thresholds WHERE segment = 'global';
  SELECT count(*) INTO _recent FROM public.feed_exposures
   WHERE served_at >= now() - interval '6 hours';
  SELECT round(count(*)::numeric / 7, 1) INTO _baseline FROM public.feed_exposures
   WHERE served_at >= now() - interval '7 days' - interval '6 hours'
     AND served_at < now() - interval '6 hours';

  IF _novelty < 60 THEN _findings := _findings ||
    jsonb_build_object('check','feed_novelty_dip','would_alert',true,'value',_novelty,'threshold',60); END IF;
  IF _coverage < 0.5 THEN _findings := _findings ||
    jsonb_build_object('check','feed_coverage_dip','would_alert',true,'value',_coverage,'threshold',0.5); END IF;
  IF _diversity IS NOT NULL AND _diversity < 0.35 THEN _findings := _findings ||
    jsonb_build_object('check','feed_diversity_dip','would_alert',true,'value',_diversity,'threshold',0.35); END IF;
  IF _pending > 0 AND _grouped_1h = 0 THEN _findings := _findings ||
    jsonb_build_object('check','dedup_backfill_stalled','would_alert',true,'value',_grouped_1h,'pending',_pending); END IF;
  IF _canonical_pending > 5000 THEN _findings := _findings ||
    jsonb_build_object('check','dedup_canonical_lag','would_alert',true,'value',_canonical_pending,'threshold',5000); END IF;
  IF COALESCE(_baseline,0) >= COALESCE(_g.min_baseline,200)
     AND _recent < _baseline * COALESCE(_g.drop_ratio, 0.4) THEN
    _findings := _findings || jsonb_build_object('check','feed_serve_throughput_drop','would_alert',true,
      'value',_recent,'baseline',_baseline); END IF;

  RETURN jsonb_build_object(
    'mode','dry_run','hours',_h,
    'metrics', jsonb_build_object(
      'sessions',_sessions,'exposures',_exposures,'unique_videos',_unique,
      'eligible_pool',_eligible,'novelty_pct',_novelty,'coverage_pct',_coverage,
      'channel_diversity',_diversity,'dedup_pending',_pending,
      'dedup_grouped_last_hour',_grouped_1h,'canonical_pending',_canonical_pending,
      'serves_6h',_recent,'serves_6h_baseline',_baseline),
    'findings', _findings,
    'would_alert_count', jsonb_array_length(_findings),
    'computed_at', now());
END; $$;

-- 6. crons: snapshots, SLA check, and fixing the untokenised sweep workers
SELECT cron.unschedule(jobname) FROM cron.job
 WHERE jobname IN ('worker-health-snapshot-10min','worker-health-sla-hourly','alert-fanout-5min',
                   'visual-safety-sweep-par-6','visual-safety-sweep-par-7','visual-safety-sweep-par-8',
                   'visual-safety-sweep-par-9','visual-safety-sweep-par-10','visual-safety-sweep-par-11');

SELECT cron.schedule('worker-health-snapshot-10min', '*/10 * * * *',
  $$SELECT public.snapshot_worker_health();$$);
SELECT cron.schedule('worker-health-sla-hourly', '35 * * * *',
  $$SELECT public.check_worker_health_sla();$$);

SELECT cron.schedule('visual-safety-sweep-par-' || i, '* * * * *', format($f$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/visual-safety-sweep',
    headers:=jsonb_build_object('Content-Type','application/json',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{"batch":300,"worker":%s}'::jsonb,
    timeout_milliseconds:=120000);
$f$, i))
FROM generate_series(6, 11) AS i;

SELECT cron.schedule('alert-fanout-5min', '*/5 * * * *', $$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/alert-fanout',
    headers:=jsonb_build_object('Content-Type','application/json',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{}'::jsonb,
    timeout_milliseconds:=60000);
$$);

SELECT public.snapshot_worker_health();