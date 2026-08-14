-- Adaptive throughput config for the channel pipeline
INSERT INTO public.autonomy_config (key, value, description)
VALUES ('channel_pipeline',
        jsonb_build_object('sample_batch', 6, 'min', 2, 'max', 24, 'stale_minutes', 90, 'classify_backlog', 100),
        'Autonomous new-channel pipeline throughput (candidates sampled per tick).')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.channel_pipeline_tick()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_batch int;
  v_min int;
  v_max int;
  v_stale_min int;
  v_backlog_trigger int;
  v_target_channels int;
  v_channels_24h int;
  v_requeued int := 0;
  v_dispatched int := 0;
  v_backlog int;
  v_classified_nudge boolean := false;
  v_next_batch int;
  v_anon text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE';
  v_token text := 'P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ';
  v_base text := 'https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/';
  r record;
BEGIN
  SELECT COALESCE((value->>'sample_batch')::int, 6),
         COALESCE((value->>'min')::int, 2),
         COALESCE((value->>'max')::int, 24),
         COALESCE((value->>'stale_minutes')::int, 90),
         COALESCE((value->>'classify_backlog')::int, 100)
    INTO v_batch, v_min, v_max, v_stale_min, v_backlog_trigger
  FROM public.autonomy_config WHERE key = 'channel_pipeline';

  v_batch := COALESCE(v_batch, 6);
  v_min := COALESCE(v_min, 2);
  v_max := COALESCE(v_max, 24);
  v_stale_min := COALESCE(v_stale_min, 90);
  v_backlog_trigger := COALESCE(v_backlog_trigger, 100);

  SELECT COALESCE((value->>'channels_per_day')::int, 40)
    INTO v_target_channels
  FROM public.autonomy_config WHERE key = 'growth_targets';
  v_target_channels := COALESCE(v_target_channels, 40);

  -- 1. Re-queue candidates whose sampling run stalled (edge failure / quota).
  WITH stale AS (
    UPDATE public.channel_candidates
       SET status = 'pre_approved', updated_at = now()
     WHERE status = 'sampling'
       AND failed_samples = 0
       AND COALESCE(last_sampled_at, updated_at, created_at) < now() - make_interval(mins => v_stale_min)
    RETURNING 1
  )
  SELECT count(*) INTO v_requeued FROM stale;

  -- 2. Dispatch the next batch of safety sampling runs.
  FOR r IN
    SELECT id
      FROM public.channel_candidates
     WHERE status IN ('pre_approved', 'sampling')
       AND tier IN ('S', 'A')
       AND failed_samples = 0
     ORDER BY tier ASC,
              COALESCE(last_sampled_at, 'epoch'::timestamptz) ASC,
              COALESCE(priority_score, 0) DESC
     LIMIT GREATEST(v_batch, 1)
  LOOP
    BEGIN
      PERFORM net.http_post(
        url := v_base || 'sample-channel-videos',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon,
          'x-cron-token', v_token),
        body := jsonb_build_object('candidate_id', r.id),
        timeout_milliseconds := 60000);
      v_dispatched := v_dispatched + 1;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;

  -- 3. Nudge the classifier when unclassified candidates pile up.
  SELECT count(*) INTO v_backlog
    FROM public.channel_candidates
   WHERE status = 'pending' AND tier IS NULL;

  IF v_backlog >= v_backlog_trigger THEN
    BEGIN
      PERFORM net.http_post(
        url := v_base || 'batch-classify-candidates',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || v_anon,
          'x-cron-token', v_token),
        body := '{"dry_run": false}'::jsonb,
        timeout_milliseconds := 120000);
      v_classified_nudge := true;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  -- 4. Adapt throughput against the daily new-channel target.
  SELECT count(*) INTO v_channels_24h
    FROM public.approved_channels
   WHERE created_at > now() - interval '24 hours';

  IF v_channels_24h < v_target_channels THEN
    v_next_batch := LEAST(v_max, GREATEST(v_min, CEIL(v_batch * 1.5)::int));
  ELSE
    v_next_batch := GREATEST(v_min, FLOOR(v_batch * 0.75)::int);
  END IF;

  IF v_next_batch <> v_batch THEN
    UPDATE public.autonomy_config
       SET value = jsonb_set(value, '{sample_batch}', to_jsonb(v_next_batch)),
           updated_at = now()
     WHERE key = 'channel_pipeline';
  END IF;

  BEGIN
    INSERT INTO public.autonomy_log (action, detail)
    VALUES ('channel_pipeline_tick', jsonb_build_object(
      'requeued', v_requeued,
      'dispatched', v_dispatched,
      'unclassified_backlog', v_backlog,
      'classify_nudged', v_classified_nudge,
      'channels_24h', v_channels_24h,
      'target_channels', v_target_channels,
      'batch', v_batch,
      'next_batch', v_next_batch));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('channel_pipeline_tick', v_dispatched, jsonb_build_object(
      'requeued', v_requeued,
      'channels_24h', v_channels_24h,
      'unclassified_backlog', v_backlog,
      'next_batch', v_next_batch));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'requeued', v_requeued,
    'dispatched', v_dispatched,
    'unclassified_backlog', v_backlog,
    'classify_nudged', v_classified_nudge,
    'channels_24h', v_channels_24h,
    'next_batch', v_next_batch);
END;
$function$;

REVOKE ALL ON FUNCTION public.channel_pipeline_tick() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.channel_pipeline_tick() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.channel_pipeline_tick() TO service_role;

SELECT cron.unschedule('channel-pipeline-10min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'channel-pipeline-10min');

SELECT cron.schedule('channel-pipeline-10min', '*/10 * * * *', $$SELECT public.channel_pipeline_tick();$$);
