-- Feed quality timeseries (novelty %, duplicate-group avoidance %, item coverage)
CREATE OR REPLACE FUNCTION public.admin_feed_quality_timeseries(p_days integer DEFAULT 14)
RETURNS TABLE (
  day date,
  sessions integer,
  exposures integer,
  unique_videos integer,
  novelty_pct numeric,
  dup_group_avoidance_pct numeric,
  item_coverage_pct numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _days integer := LEAST(GREATEST(COALESCE(p_days, 14), 1), 90);
  _pool numeric;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT GREATEST(count(*), 1)::numeric INTO _pool
  FROM public.curated_videos
  WHERE moderation_state IN ('approved', 'auto_approved');

  RETURN QUERY
  WITH ex AS (
    SELECT
      (fe.served_at AT TIME ZONE 'UTC')::date AS d,
      fe.session_key,
      fe.video_id,
      fe.duplicate_group_id
    FROM public.feed_exposures fe
    WHERE fe.served_at >= (now() - make_interval(days => _days))
  ), per_session AS (
    SELECT
      d,
      session_key,
      count(*)::numeric AS served,
      count(DISTINCT video_id)::numeric AS distinct_videos,
      count(*) FILTER (WHERE duplicate_group_id IS NOT NULL)::numeric AS grouped_served,
      count(DISTINCT duplicate_group_id) FILTER (WHERE duplicate_group_id IS NOT NULL)::numeric AS distinct_groups
    FROM ex
    GROUP BY d, session_key
  )
  SELECT
    ps.d AS day,
    count(*)::integer AS sessions,
    SUM(ps.served)::integer AS exposures,
    (SELECT count(DISTINCT e2.video_id)::integer FROM ex e2 WHERE e2.d = ps.d) AS unique_videos,
    ROUND(100 * SUM(ps.distinct_videos) / NULLIF(SUM(ps.served), 0), 2) AS novelty_pct,
    ROUND(100 * SUM(ps.distinct_groups) / NULLIF(SUM(ps.grouped_served), 0), 2) AS dup_group_avoidance_pct,
    ROUND(100 * (SELECT count(DISTINCT e3.video_id) FROM ex e3 WHERE e3.d = ps.d)::numeric / _pool, 4) AS item_coverage_pct
  FROM per_session ps
  GROUP BY ps.d
  ORDER BY ps.d;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_feed_quality_timeseries(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_feed_quality_timeseries(integer) TO authenticated;

-- Dedup backfill health
CREATE OR REPLACE FUNCTION public.admin_dedup_backfill_health()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total bigint;
  _grouped bigint;
  _pending bigint;
  _canonical_pending bigint;
  _last_hour bigint;
  _last_6h bigint;
  _last_at timestamptz;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin role required';
  END IF;

  SELECT count(*), count(duplicate_grouped_at), max(duplicate_grouped_at)
  INTO _total, _grouped, _last_at
  FROM public.curated_videos;

  _pending := _total - _grouped;

  SELECT count(*) INTO _canonical_pending
  FROM public.curated_videos
  WHERE duplicate_group_id IS NOT NULL AND is_duplicate_canonical IS NULL;

  SELECT count(*) INTO _last_hour
  FROM public.curated_videos
  WHERE duplicate_grouped_at >= now() - interval '1 hour';

  SELECT count(*) INTO _last_6h
  FROM public.curated_videos
  WHERE duplicate_grouped_at >= now() - interval '6 hours';

  RETURN jsonb_build_object(
    'total', _total,
    'grouped', _grouped,
    'pending', _pending,
    'grouped_pct', ROUND(100 * _grouped::numeric / GREATEST(_total, 1), 2),
    'canonical_pending', _canonical_pending,
    'throughput_last_hour', _last_hour,
    'throughput_per_hour_6h', ROUND(_last_6h::numeric / 6, 1),
    'last_grouped_at', _last_at,
    'eta_hours', CASE WHEN _last_6h > 0 THEN ROUND(_pending::numeric / GREATEST(_last_6h::numeric / 6, 1), 1) ELSE NULL END
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_dedup_backfill_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dedup_backfill_health() TO authenticated;

-- Alerting: dedup backfill lag
CREATE OR REPLACE FUNCTION public.check_dedup_backfill_lag(
  p_min_per_hour integer DEFAULT 2000,
  p_canonical_max_pending integer DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total bigint;
  _grouped bigint;
  _pending bigint;
  _last_hour bigint;
  _canonical_pending bigint;
  _last_at timestamptz;
  _alerts integer := 0;
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

  -- Stalled: pending work but nothing grouped in the last hour
  IF _pending > 0 AND _last_hour = 0 THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'dedup_backfill_stalled', 'critical',
      format('Semantic dedup backfill stalled: %s videos ungrouped, 0 grouped in the last hour', _pending),
      jsonb_build_object('pending', _pending, 'last_grouped_at', _last_at),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'dedup_backfill_stalled' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours'
    );
    _alerts := _alerts + 1;
  -- Behind expected throughput
  ELSIF _pending > 0 AND _last_hour < GREATEST(p_min_per_hour, 1) THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'dedup_backfill_lag', 'warning',
      format('Semantic dedup backfill behind: %s grouped in last hour (expected >= %s), %s pending',
             _last_hour, p_min_per_hour, _pending),
      jsonb_build_object('pending', _pending, 'throughput_last_hour', _last_hour, 'expected_per_hour', p_min_per_hour),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'dedup_backfill_lag' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours'
    );
    _alerts := _alerts + 1;
  END IF;

  -- Canonical collapsing behind
  IF _canonical_pending > GREATEST(p_canonical_max_pending, 1) THEN
    INSERT INTO public.production_alerts (kind, severity, message, context, route)
    SELECT 'dedup_canonical_lag', 'warning',
      format('Canonical duplicate picks behind: %s grouped videos have no canonical flag', _canonical_pending),
      jsonb_build_object('canonical_pending', _canonical_pending, 'threshold', p_canonical_max_pending),
      '/admin/feed-quality'
    WHERE NOT EXISTS (
      SELECT 1 FROM public.production_alerts
      WHERE kind = 'dedup_canonical_lag' AND resolved_at IS NULL
        AND created_at > now() - interval '6 hours'
    );
    _alerts := _alerts + 1;
  END IF;

  RETURN jsonb_build_object(
    'pending', _pending,
    'throughput_last_hour', _last_hour,
    'canonical_pending', _canonical_pending,
    'alerts_raised', _alerts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_dedup_backfill_lag(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_dedup_backfill_lag(integer, integer) TO service_role;

SELECT cron.schedule(
  'dedup-backfill-lag-check',
  '*/30 * * * *',
  $$SELECT public.check_dedup_backfill_lag();$$
);