-- =====================================================================
-- 1) Feed quality remediation (automated, recorded back to the alert)
-- =====================================================================
CREATE OR REPLACE FUNCTION public.remediate_feed_quality(_alert_id uuid, _kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _changes jsonb := '[]'::jsonb;
  _r record;
  _knob text;
  _factor numeric;
  _new numeric;
BEGIN
  -- Knob playbook per dip kind. Bounds come from feed_ranking_flags itself so
  -- remediation can never push a weight outside its safe operating range.
  FOR _knob, _factor IN
    SELECT * FROM (
      VALUES
        ('feed_novelty_dip',   'exploration_rate',        1.25),
        ('feed_novelty_dip',   'exploration_temperature', 1.15),
        ('feed_coverage_dip',  'exploration_rate',        1.20),
        ('feed_coverage_dip',  'personalization_mix',     0.90),
        ('feed_diversity_dip', 'fatigue_penalty_weight',  1.20),
        ('feed_diversity_dip', 'exploration_temperature', 1.10)
    ) AS v(kind, knob, factor)
    WHERE v.kind = _kind
  LOOP
    SELECT * INTO _r FROM public.feed_ranking_flags WHERE key = _knob;
    CONTINUE WHEN _r IS NULL OR _r.enabled IS NOT TRUE OR _r.value IS NULL;

    _new := round(_r.value * _factor, 4);
    IF _r.min_value IS NOT NULL THEN _new := GREATEST(_new, _r.min_value); END IF;
    IF _r.max_value IS NOT NULL THEN _new := LEAST(_new, _r.max_value); END IF;
    CONTINUE WHEN _new = _r.value;

    UPDATE public.feed_ranking_flags
    SET value = _new, updated_at = now()
    WHERE key = _knob;

    _changes := _changes || jsonb_build_object(
      'knob', _knob, 'from', _r.value, 'to', _new, 'factor', _factor);
  END LOOP;

  -- Targeted re-ranking sweep: clear cached taste profiles of recently active
  -- users so the next request re-scores against the new weights.
  UPDATE public.user_taste_profiles
  SET updated_at = now() - interval '1 day'
  WHERE last_signal_at >= now() - interval '48 hours';

  IF _alert_id IS NOT NULL THEN
    UPDATE public.production_alerts
    SET context = coalesce(context, '{}'::jsonb) || jsonb_build_object(
      'remediation', jsonb_build_object(
        'applied_at', now(),
        'mode', 'automatic',
        'knob_changes', _changes,
        'reranking_sweep', 'taste profiles invalidated for users active in last 48h',
        'runbook', '/admin/feed-quality#runbook'
      ))
    WHERE id = _alert_id;
  END IF;

  RETURN jsonb_build_object('kind', _kind, 'knob_changes', _changes);
END;
$$;

REVOKE ALL ON FUNCTION public.remediate_feed_quality(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.remediate_feed_quality(uuid, text) TO service_role;

-- Rewire the quality-dip checker to remediate each alert it raises.
CREATE OR REPLACE FUNCTION public.check_feed_quality_alerts(
  p_min_novelty numeric DEFAULT 60,
  p_min_coverage numeric DEFAULT 0.5,
  p_min_channel_diversity numeric DEFAULT 0.35,
  p_min_sessions integer DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sessions bigint := 0;
  _exposures bigint := 0;
  _unique_videos bigint := 0;
  _novelty numeric;
  _coverage numeric;
  _channel_div numeric;
  _eligible bigint;
  _alerts integer := 0;
  _id uuid;
  _rem jsonb := '[]'::jsonb;
BEGIN
  SELECT count(*), count(DISTINCT e.video_id), count(DISTINCT e.session_key)
    INTO _exposures, _unique_videos, _sessions
  FROM public.feed_exposures e
  WHERE e.served_at >= now() - interval '24 hours';

  IF _sessions < GREATEST(p_min_sessions, 1) THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'insufficient_traffic', 'sessions', _sessions);
  END IF;

  _novelty := round(100.0 * _unique_videos / GREATEST(_exposures, 1), 2);

  SELECT count(*) INTO _eligible
  FROM public.curated_videos
  WHERE moderation_state IN ('approved','auto_approved')
    AND visual_state = 'clean' AND is_duplicate_canonical IS TRUE
    AND is_hidden = false AND is_archived = false;
  _coverage := round(100.0 * _unique_videos / GREATEST(_eligible, 1), 3);

  SELECT round(avg(d), 3) INTO _channel_div FROM (
    SELECT count(DISTINCT e.channel_id)::numeric / GREATEST(count(*), 1) AS d
    FROM public.feed_exposures e
    WHERE e.served_at >= now() - interval '24 hours'
      AND e.channel_id IS NOT NULL
    GROUP BY e.session_key
    HAVING count(*) >= 5
  ) s;

  IF _novelty < p_min_novelty THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'feed_novelty_dip', 'warning',
      format('Feed novelty dipped to %s%% over the last 24h (threshold %s%%)', _novelty, p_min_novelty),
      jsonb_build_object('novelty_pct', _novelty, 'threshold', p_min_novelty,
                         'sessions', _sessions, 'exposures', _exposures),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'feed_novelty_dip' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours')
    RETURNING id INTO _id;
    IF _id IS NOT NULL THEN
      _alerts := _alerts + 1;
      _rem := _rem || public.remediate_feed_quality(_id, 'feed_novelty_dip');
      _id := NULL;
    END IF;
  END IF;

  IF _coverage < p_min_coverage THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'feed_coverage_dip', 'warning',
      format('Feed item coverage dipped to %s%% of the eligible catalog over 24h (threshold %s%%)', _coverage, p_min_coverage),
      jsonb_build_object('coverage_pct', _coverage, 'threshold', p_min_coverage,
                         'unique_videos', _unique_videos, 'eligible', _eligible),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'feed_coverage_dip' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours')
    RETURNING id INTO _id;
    IF _id IS NOT NULL THEN
      _alerts := _alerts + 1;
      _rem := _rem || public.remediate_feed_quality(_id, 'feed_coverage_dip');
      _id := NULL;
    END IF;
  END IF;

  IF _channel_div IS NOT NULL AND _channel_div < p_min_channel_diversity THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'feed_diversity_dip', 'warning',
      format('Per-session creator diversity dipped to %s distinct channels per served item (threshold %s)', _channel_div, p_min_channel_diversity),
      jsonb_build_object('channel_diversity', _channel_div, 'threshold', p_min_channel_diversity,
                         'sessions', _sessions),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'feed_diversity_dip' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours')
    RETURNING id INTO _id;
    IF _id IS NOT NULL THEN
      _alerts := _alerts + 1;
      _rem := _rem || public.remediate_feed_quality(_id, 'feed_diversity_dip');
      _id := NULL;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'sessions', _sessions, 'exposures', _exposures, 'unique_videos', _unique_videos,
    'novelty_pct', _novelty, 'coverage_pct', _coverage,
    'channel_diversity', _channel_div, 'alerts_raised', _alerts,
    'remediations', _rem);
END;
$$;

REVOKE ALL ON FUNCTION public.check_feed_quality_alerts(numeric, numeric, numeric, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_feed_quality_alerts(numeric, numeric, numeric, integer) TO service_role;

-- =====================================================================
-- 2) Dedup lag: automated remediation + runbook in the alert context
-- =====================================================================
CREATE OR REPLACE FUNCTION public.check_dedup_backfill_lag(
  p_min_per_hour integer DEFAULT 2000,
  p_canonical_max_pending integer DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total bigint;
  _grouped bigint;
  _pending bigint;
  _last_hour bigint;
  _canonical_pending bigint;
  _last_at timestamptz;
  _alerts integer := 0;
  _id uuid;
  _fix jsonb := '[]'::jsonb;
  _res jsonb;
  _runbook jsonb := jsonb_build_object(
    'dashboard', '/admin/feed-quality',
    'steps', jsonb_build_array(
      '1. Check "Corpus check coverage" on /admin/feed-quality for pending counts.',
      '2. Automated remediation already ran a bounded recompute_duplicate_groups pass; see remediation.result below.',
      '3. If pending is still flat after two runs, inspect the dedup cron jobs and the embeddings backfill.',
      '4. Escalate only if throughput stays at zero for 3 consecutive hours — ungrouped videos are never served, so this degrades coverage, not safety.'
    ));
BEGIN
  SELECT count(*), count(duplicate_grouped_at), max(duplicate_grouped_at)
  INTO _total, _grouped, _last_at
  FROM public.curated_videos;
  _pending := _total - _grouped;

  SELECT count(*) INTO _last_hour
  FROM public.curated_videos
  WHERE duplicate_grouped_at >= now() - interval '1 hour';

  SELECT count(*) INTO _canonical_pending
  FROM public.curated_videos
  WHERE duplicate_group_id IS NOT NULL AND is_duplicate_canonical IS NULL;

  IF _pending > 0 AND _last_hour = 0 THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'dedup_backfill_stalled', 'critical',
      format('Semantic dedup backfill stalled: %s videos ungrouped, 0 grouped in the last hour', _pending),
      jsonb_build_object('pending', _pending, 'last_grouped_at', _last_at, 'runbook', _runbook),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'dedup_backfill_stalled' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours')
    RETURNING id INTO _id;
    IF _id IS NOT NULL THEN _alerts := _alerts + 1; END IF;
  ELSIF _pending > 0 AND _last_hour < GREATEST(p_min_per_hour, 1) THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'dedup_backfill_lag', 'warning',
      format('Semantic dedup backfill behind: %s grouped in last hour (expected >= %s), %s pending',
             _last_hour, p_min_per_hour, _pending),
      jsonb_build_object('pending', _pending, 'throughput_last_hour', _last_hour,
                         'expected_per_hour', p_min_per_hour, 'runbook', _runbook),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'dedup_backfill_lag' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours')
    RETURNING id INTO _id;
    IF _id IS NOT NULL THEN _alerts := _alerts + 1; END IF;
  END IF;

  -- Automated remediation: one bounded catch-up pass, recorded on the alert.
  IF _id IS NOT NULL THEN
    BEGIN
      _res := public.recompute_duplicate_groups(4000);
      _fix := jsonb_build_object('action', 'recompute_duplicate_groups', 'limit', 4000, 'result', _res);
    EXCEPTION WHEN OTHERS THEN
      _fix := jsonb_build_object('action', 'recompute_duplicate_groups', 'error', SQLERRM);
    END;
    UPDATE public.production_alerts
    SET context = coalesce(context, '{}'::jsonb)
                  || jsonb_build_object('remediation', jsonb_build_object(
                       'applied_at', now(), 'mode', 'automatic', 'actions', jsonb_build_array(_fix)))
    WHERE id = _id;
    _id := NULL;
  END IF;

  IF _canonical_pending > GREATEST(p_canonical_max_pending, 1) THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'dedup_canonical_lag', 'warning',
      format('Canonical duplicate picks behind: %s grouped videos have no canonical flag', _canonical_pending),
      jsonb_build_object('canonical_pending', _canonical_pending, 'threshold', p_canonical_max_pending,
                         'runbook', _runbook),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'dedup_canonical_lag' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours')
    RETURNING id INTO _id;
    IF _id IS NOT NULL THEN
      _alerts := _alerts + 1;
      BEGIN
        _res := public.recompute_duplicate_groups(4000);
        UPDATE public.production_alerts
        SET context = coalesce(context, '{}'::jsonb)
                      || jsonb_build_object('remediation', jsonb_build_object(
                           'applied_at', now(), 'mode', 'automatic',
                           'actions', jsonb_build_array(jsonb_build_object(
                             'action', 'recompute_duplicate_groups', 'limit', 4000, 'result', _res))))
        WHERE id = _id;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'pending', _pending,
    'throughput_last_hour', _last_hour,
    'canonical_pending', _canonical_pending,
    'alerts_raised', _alerts);
END;
$$;

REVOKE ALL ON FUNCTION public.check_dedup_backfill_lag(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_dedup_backfill_lag(integer, integer) TO service_role;

-- =====================================================================
-- 3) Serve-throughput watchdog
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_feed_serve_throughput(_hours integer DEFAULT 48)
RETURNS TABLE(bucket timestamptz, exposures bigint, sessions bigint, unique_videos bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
  SELECT date_trunc('hour', e.served_at) AS bucket,
         count(*)::bigint,
         count(DISTINCT e.session_key)::bigint,
         count(DISTINCT e.video_id)::bigint
  FROM public.feed_exposures e
  WHERE e.served_at >= now() - make_interval(hours => GREATEST(LEAST(_hours, 720), 1))
  GROUP BY 1
  ORDER BY 1;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_feed_serve_throughput(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_feed_serve_throughput(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.check_serve_throughput(
  p_drop_ratio numeric DEFAULT 0.4,
  p_min_baseline integer DEFAULT 200
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _recent bigint;
  _baseline numeric;
  _flatlined text[];
  _alerts integer := 0;
BEGIN
  SELECT count(*) INTO _recent
  FROM public.feed_exposures WHERE served_at >= now() - interval '6 hours';

  -- Same 6h window averaged over the previous 7 days.
  SELECT round(count(*)::numeric / 7, 1) INTO _baseline
  FROM public.feed_exposures
  WHERE served_at >= now() - interval '7 days' - interval '6 hours'
    AND served_at < now() - interval '6 hours'
    AND extract(hour FROM served_at) BETWEEN extract(hour FROM now() - interval '6 hours')
                                         AND extract(hour FROM now());

  IF _baseline < p_min_baseline THEN
    RETURN jsonb_build_object('skipped', true, 'reason', 'baseline_too_small',
                              'recent', _recent, 'baseline', _baseline);
  END IF;

  IF _recent = 0 OR _recent < _baseline * p_drop_ratio THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT CASE WHEN _recent = 0 THEN 'feed_serve_flatline' ELSE 'feed_serve_throughput_drop' END,
      CASE WHEN _recent = 0 THEN 'critical' ELSE 'warning' END,
      format('Feed serves %s: %s impressions in the last 6h vs a %s baseline',
             CASE WHEN _recent = 0 THEN 'flatlined' ELSE 'dropped' END, _recent, _baseline),
      jsonb_build_object('recent_6h', _recent, 'baseline_6h', _baseline,
                         'drop_ratio_threshold', p_drop_ratio,
                         'runbook', jsonb_build_array(
                           'Check the feed edge function logs and error rate.',
                           'Confirm the serving floor still has canonical clean videos (Corpus check coverage).',
                           'Verify pg_cron sweeps and the dedup backfill are running.')),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind IN ('feed_serve_flatline','feed_serve_throughput_drop')
        AND resolved_at IS NULL AND created_at > now() - interval '3 hours');
    _alerts := _alerts + 1;
  END IF;

  -- Per-segment flatline: a language served last week but not at all today.
  SELECT array_agg(lang) INTO _flatlined FROM (
    SELECT coalesce(content_language, 'unknown') AS lang
    FROM public.feed_exposures
    WHERE served_at >= now() - interval '7 days' AND served_at < now() - interval '24 hours'
    GROUP BY 1
    HAVING count(*) >= 100
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
                            'flatlined_segments', to_jsonb(_flatlined),
                            'alerts_raised', _alerts);
END;
$$;

REVOKE ALL ON FUNCTION public.check_serve_throughput(numeric, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_serve_throughput(numeric, integer) TO service_role;

-- =====================================================================
-- 4) Unchecked-videos drilldown + queue for next sweep
-- =====================================================================
CREATE OR REPLACE FUNCTION public.admin_unchecked_videos(
  _channel text DEFAULT NULL,
  _min_age_hours integer DEFAULT NULL,
  _dedup_status text DEFAULT NULL,   -- 'grouped' | 'ungrouped' | 'canonical' | NULL
  _limit integer DEFAULT 100,
  _offset integer DEFAULT 0
)
RETURNS TABLE(
  video_id text, title text, channel_id text, channel_title text,
  thumbnail_url text, moderation_state text, visual_state text,
  visual_checked_at timestamptz, created_at timestamptz, age_hours numeric,
  duplicate_group_id text, is_duplicate_canonical boolean, total_count bigint
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT cv.*
    FROM public.curated_videos cv
    WHERE cv.moderation_state IN ('approved','auto_approved')
      AND (cv.visual_state IS NULL OR cv.visual_state = 'unchecked')
      AND cv.is_archived = false
      AND (_channel IS NULL
           OR cv.channel_title ILIKE '%' || _channel || '%'
           OR cv.channel_id = _channel)
      AND (_min_age_hours IS NULL
           OR cv.created_at <= now() - make_interval(hours => _min_age_hours))
      AND (_dedup_status IS NULL
           OR (_dedup_status = 'grouped'   AND cv.duplicate_group_id IS NOT NULL)
           OR (_dedup_status = 'ungrouped' AND cv.duplicate_group_id IS NULL)
           OR (_dedup_status = 'canonical' AND cv.is_duplicate_canonical IS TRUE))
  ), counted AS (SELECT count(*) AS n FROM base)
  SELECT b.video_id, b.title, b.channel_id, b.channel_title, b.thumbnail_url,
         b.moderation_state::text, b.visual_state, b.visual_checked_at, b.created_at,
         round(extract(epoch FROM now() - b.created_at) / 3600.0, 1),
         b.duplicate_group_id, b.is_duplicate_canonical, c.n
  FROM base b CROSS JOIN counted c
  ORDER BY b.created_at ASC
  LIMIT GREATEST(LEAST(_limit, 500), 1)
  OFFSET GREATEST(_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_unchecked_videos(text, integer, text, integer, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_unchecked_videos(text, integer, text, integer, integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_queue_visual_scan(
  _video_ids text[] DEFAULT NULL,
  _channel text DEFAULT NULL,
  _min_age_hours integer DEFAULT NULL,
  _dedup_status text DEFAULT NULL,
  _max integer DEFAULT 500
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _actor uuid := auth.uid();
  _ids text[];
  _n integer;
BEGIN
  IF NOT public.has_role(_actor, 'admin'::app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT array_agg(video_id) INTO _ids FROM (
    SELECT cv.video_id
    FROM public.curated_videos cv
    WHERE cv.moderation_state IN ('approved','auto_approved')
      AND cv.is_archived = false
      AND (cv.visual_state IS NULL OR cv.visual_state = 'unchecked')
      AND (_video_ids IS NULL OR cv.video_id = ANY(_video_ids))
      AND (_channel IS NULL
           OR cv.channel_title ILIKE '%' || _channel || '%'
           OR cv.channel_id = _channel)
      AND (_min_age_hours IS NULL
           OR cv.created_at <= now() - make_interval(hours => _min_age_hours))
      AND (_dedup_status IS NULL
           OR (_dedup_status = 'grouped'   AND cv.duplicate_group_id IS NOT NULL)
           OR (_dedup_status = 'ungrouped' AND cv.duplicate_group_id IS NULL)
           OR (_dedup_status = 'canonical' AND cv.is_duplicate_canonical IS TRUE))
    ORDER BY cv.created_at ASC
    LIMIT GREATEST(LEAST(_max, 2000), 1)
  ) s;

  IF _ids IS NULL THEN
    RETURN jsonb_build_object('queued', 0, 'reason', 'nothing_matched');
  END IF;

  -- Clearing the claim stamp makes these rows eligible for the very next
  -- visual-safety sweep pass (claim_visual_scan_batch skips fresh claims).
  UPDATE public.curated_videos
  SET visual_state = 'unchecked', visual_checked_at = NULL
  WHERE video_id = ANY(_ids);
  GET DIAGNOSTICS _n = ROW_COUNT;

  INSERT INTO public.video_audit_log (video_id, action, actor_id, reason, metadata)
  SELECT vid, 'queued_visual_scan', _actor, 'admin one-click requeue for next sweep',
         jsonb_build_object('batch_size', _n)
  FROM unnest(_ids) AS vid;

  RETURN jsonb_build_object('queued', _n, 'video_ids', to_jsonb(_ids));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_queue_visual_scan(text[], text, integer, text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_queue_visual_scan(text[], text, integer, text, integer) TO authenticated, service_role;

-- =====================================================================
-- 5) Schedules
-- =====================================================================
SELECT cron.unschedule('feed-serve-throughput-watchdog')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'feed-serve-throughput-watchdog');

SELECT cron.schedule(
  'feed-serve-throughput-watchdog',
  '15 * * * *',
  $cron$ SELECT public.check_serve_throughput(); $cron$
);
