-- Continuous corpus / serving coverage monitor.
-- Answers two questions on every tick:
--   1. Is anything permanently stuck in pending_review / *_review_required?
--   2. Has servable feed coverage diverged from its recent expected level?
CREATE OR REPLACE FUNCTION public.check_corpus_coverage_health(
  p_stall_hours integer DEFAULT 6,
  p_pending_warn integer DEFAULT 2000,
  p_unchecked_warn integer DEFAULT 2000,
  p_coverage_drop_pct numeric DEFAULT 2.0,
  p_coverage_drop_critical_pct numeric DEFAULT 5.0
) RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _total bigint; _servable bigint; _pending bigint; _unchecked bigint;
  _oldest_pending_hours numeric; _oldest_unchecked_hours numeric;
  _decided_last_hour bigint;
  _servable_pct numeric; _baseline_pct numeric; _drop numeric;
  _alerts jsonb := '[]'::jsonb;

  FUNCTION_MARKER text := 'corpus_coverage';
BEGIN
  SELECT count(*),
         count(*) FILTER (
           WHERE moderation_state IN ('approved','auto_approved')
             AND visual_state = 'clean'
             AND is_duplicate_canonical IS TRUE
             AND is_hidden = false
             AND is_archived = false),
         count(*) FILTER (
           WHERE moderation_state IN ('pending_review','ai_review_required','human_review_required')
             AND is_archived = false),
         count(*) FILTER (
           WHERE moderation_state IN ('approved','auto_approved')
             AND is_archived = false
             AND (visual_state IS NULL OR visual_state NOT IN ('clean','flagged','rejected')))
    INTO _total, _servable, _pending, _unchecked
  FROM public.curated_videos;

  _servable_pct := round(100.0 * _servable / GREATEST(_total, 1), 3);

  SELECT round(EXTRACT(epoch FROM now() - min(created_at)) / 3600.0, 2)
    INTO _oldest_pending_hours
  FROM public.curated_videos
  WHERE moderation_state IN ('pending_review','ai_review_required','human_review_required')
    AND is_archived = false;

  SELECT round(EXTRACT(epoch FROM now() - min(created_at)) / 3600.0, 2)
    INTO _oldest_unchecked_hours
  FROM public.curated_videos
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_archived = false
    AND (visual_state IS NULL OR visual_state NOT IN ('clean','flagged','rejected'));

  SELECT count(*) INTO _decided_last_hour
  FROM public.moderation_decisions
  WHERE created_at >= now() - interval '1 hour';

  -- Expected level = best coverage seen in the last 7 days. A real corpus only
  -- grows its servable share, so a drop is a regression worth paging about.
  SELECT round(max(value)::numeric, 3) INTO _baseline_pct
  FROM public.ops_metrics
  WHERE metric = 'corpus_servable_pct'
    AND ts >= now() - interval '7 days'
    AND ts < now() - interval '30 minutes';

  INSERT INTO public.ops_metrics (metric, value, tags)
  VALUES ('corpus_servable_pct', _servable_pct,
          jsonb_build_object('total', _total, 'servable', _servable,
                             'pending', _pending, 'unchecked', _unchecked));

  -- 1. Backlog exists, is old, and NOTHING is draining it.
  IF _pending >= p_pending_warn
     AND COALESCE(_oldest_pending_hours, 0) >= p_stall_hours
     AND _decided_last_hour = 0
     AND NOT EXISTS (
       SELECT 1 FROM public.production_alerts
       WHERE kind = 'moderation_backlog_stalled'
         AND resolved_at IS NULL
         AND created_at >= now() - interval '3 hours')
  THEN
    INSERT INTO public.production_alerts (kind, severity, message, route, context)
    VALUES ('moderation_backlog_stalled', 'critical',
      format('%s videos awaiting moderation (oldest %s h) and zero decisions in the last hour — the backlog worker is not running',
             _pending, COALESCE(_oldest_pending_hours, 0)),
      '/admin/launch-gate',
      jsonb_build_object('pending', _pending, 'oldest_pending_hours', _oldest_pending_hours,
                         'decided_last_hour', _decided_last_hour, 'total', _total));
    _alerts := _alerts || jsonb_build_object('kind','moderation_backlog_stalled','pending',_pending);
  END IF;

  -- 2. Approved videos that can never be served because the visual sweep never
  --    reached them.
  IF _unchecked >= p_unchecked_warn
     AND COALESCE(_oldest_unchecked_hours, 0) >= p_stall_hours * 4
     AND NOT EXISTS (
       SELECT 1 FROM public.production_alerts
       WHERE kind = 'visual_sweep_backlog_stalled'
         AND resolved_at IS NULL
         AND created_at >= now() - interval '6 hours')
  THEN
    INSERT INTO public.production_alerts (kind, severity, message, route, context)
    VALUES ('visual_sweep_backlog_stalled', 'error',
      format('%s approved videos still lack a visual verdict (oldest %s h) and cannot be served',
             _unchecked, COALESCE(_oldest_unchecked_hours, 0)),
      '/admin/unserved-videos',
      jsonb_build_object('unchecked', _unchecked,
                         'oldest_unchecked_hours', _oldest_unchecked_hours, 'total', _total));
    _alerts := _alerts || jsonb_build_object('kind','visual_sweep_backlog_stalled','unchecked',_unchecked);
  END IF;

  -- 3. Servable coverage diverged downward from the expected total.
  _drop := CASE WHEN _baseline_pct IS NULL THEN NULL ELSE round(_baseline_pct - _servable_pct, 3) END;
  IF _drop IS NOT NULL AND _drop >= p_coverage_drop_pct
     AND NOT EXISTS (
       SELECT 1 FROM public.production_alerts
       WHERE kind = 'servable_coverage_divergence'
         AND resolved_at IS NULL
         AND created_at >= now() - interval '3 hours')
  THEN
    INSERT INTO public.production_alerts (kind, severity, message, route, context)
    VALUES ('servable_coverage_divergence',
      CASE WHEN _drop >= p_coverage_drop_critical_pct THEN 'critical' ELSE 'error' END,
      format('Servable feed coverage fell to %s%% of the corpus (7-day best %s%%, drop %s pts; %s of %s videos servable)',
             _servable_pct, _baseline_pct, _drop, _servable, _total),
      '/admin/feed-quality',
      jsonb_build_object('servable_pct', _servable_pct, 'baseline_pct', _baseline_pct,
                         'drop_pct', _drop, 'servable', _servable, 'total', _total,
                         'pending', _pending, 'unchecked', _unchecked));
    _alerts := _alerts || jsonb_build_object('kind','servable_coverage_divergence',
      'servable_pct',_servable_pct,'baseline_pct',_baseline_pct,'drop_pct',_drop);
  END IF;

  RETURN jsonb_build_object(
    'checked_at', now(),
    'total', _total,
    'servable', _servable,
    'servable_pct', _servable_pct,
    'baseline_pct', _baseline_pct,
    'coverage_drop_pct', _drop,
    'pending', _pending,
    'oldest_pending_hours', _oldest_pending_hours,
    'decided_last_hour', _decided_last_hour,
    'unchecked_approved', _unchecked,
    'oldest_unchecked_hours', _oldest_unchecked_hours,
    'alerts', _alerts,
    'raised', jsonb_array_length(_alerts));
END; $$;

REVOKE ALL ON FUNCTION public.check_corpus_coverage_health(integer, integer, integer, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_corpus_coverage_health(integer, integer, integer, numeric, numeric) TO service_role;

SELECT cron.unschedule('corpus-coverage-health-check')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'corpus-coverage-health-check');

SELECT cron.schedule('corpus-coverage-health-check', '*/20 * * * *',
  $$ SELECT public.check_corpus_coverage_health(); $$);
