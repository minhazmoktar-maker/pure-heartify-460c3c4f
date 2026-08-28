-- 1. Feed quality auto-remediation: the loop read three columns into two
--    variables, so the knob name landed in the numeric factor variable.
CREATE OR REPLACE FUNCTION public.remediate_feed_quality(_alert_id uuid, _kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _changes jsonb := '[]'::jsonb;
  _r record;
  _knob text;
  _factor numeric;
  _new numeric;
BEGIN
  FOR _knob, _factor IN
    SELECT v.knob, v.factor FROM (
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
$function$;

-- 2. Safety sweep: disambiguate the overloaded call.
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'sweep-inappropriate-content'),
  command := 'SELECT public.sweep_inappropriate_content(500, 20);'
);

-- 3. Real durations: run the embeddability+duration sweep every 15 minutes with
--    a bigger batch. 50 batches x 1 quota unit = 200 units/hour (~4.8k/day),
--    inside the 10k/day YouTube budget, and covers the serving corpus in ~1 day.
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'sweep-embeddable-hourly'),
  schedule := '*/15 * * * *',
  command := $cmd$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/sweep-embeddable?batches=50',
    headers:=jsonb_build_object('Content-Type','application/json',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{}'::jsonb,
    timeout_milliseconds:=180000);
  $cmd$
);