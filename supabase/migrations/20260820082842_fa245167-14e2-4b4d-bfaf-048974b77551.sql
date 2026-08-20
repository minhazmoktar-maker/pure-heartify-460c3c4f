CREATE OR REPLACE FUNCTION public._visual_floor_backfill_chunk(p_limit int DEFAULT 25000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
SET statement_timeout TO '4min'
AS $function$
DECLARE
  v_music int := 0;
  v_await int := 0;
  v_flag  int := 0;
  v_left  int := 0;
BEGIN
  WITH t AS (
    SELECT id FROM public.curated_videos
    WHERE lower(coalesce(category,'')) IN ('nasheeds','nasheed','music','songs')
      AND coalesce(hidden_reason,'') <> 'music_policy'
    LIMIT p_limit
  ), u AS (
    UPDATE public.curated_videos cv SET is_hidden = true, hidden_reason = 'music_policy'
    FROM t WHERE cv.id = t.id RETURNING 1
  ) SELECT count(*) INTO v_music FROM u;

  WITH t AS (
    SELECT id FROM public.curated_videos
    WHERE is_hidden = false
      AND lower(coalesce(visual_state,'unchecked')) = 'unchecked'
    LIMIT p_limit
  ), u AS (
    UPDATE public.curated_videos cv SET is_hidden = true, hidden_reason = 'awaiting_visual_check'
    FROM t WHERE cv.id = t.id RETURNING 1
  ) SELECT count(*) INTO v_await FROM u;

  WITH t AS (
    SELECT id FROM public.curated_videos
    WHERE is_hidden = false
      AND lower(coalesce(visual_state,'unchecked')) NOT IN ('unchecked','clean')
    LIMIT p_limit
  ), u AS (
    UPDATE public.curated_videos cv SET is_hidden = true, hidden_reason = 'visual_flagged'
    FROM t WHERE cv.id = t.id RETURNING 1
  ) SELECT count(*) INTO v_flag FROM u;

  SELECT count(*) INTO v_left
  FROM public.curated_videos
  WHERE is_hidden = false
    AND (lower(coalesce(visual_state,'unchecked')) <> 'clean'
         OR lower(coalesce(category,'')) IN ('nasheeds','nasheed','music','songs'));

  BEGIN
    INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('visual_floor_backfill', v_music + v_await + v_flag,
            jsonb_build_object('music', v_music, 'awaiting', v_await, 'flagged', v_flag, 'remaining', v_left));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  IF v_left = 0 THEN
    BEGIN
      PERFORM cron.unschedule('visual-floor-backfill');
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN jsonb_build_object('music_blocked', v_music, 'awaiting_visual_check', v_await,
                            'visual_flagged', v_flag, 'remaining', v_left);
END;
$function$;

REVOKE ALL ON FUNCTION public._visual_floor_backfill_chunk(int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public._visual_floor_backfill_chunk(int) FROM anon;
REVOKE ALL ON FUNCTION public._visual_floor_backfill_chunk(int) FROM authenticated;

SELECT cron.schedule('visual-floor-backfill', '* * * * *',
  $$SELECT public._visual_floor_backfill_chunk(25000);$$);

-- Throughput: review 200 thumbnails per minute instead of 40 per 5 minutes.
SELECT cron.unschedule('visual-safety-sweep-5min');
SELECT cron.schedule('visual-safety-sweep-1min', '* * * * *', (
  SELECT format(
    $$SELECT net.http_post(
        url := %L,
        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret', %L),
        body := jsonb_build_object('batch', 200),
        timeout_milliseconds := 120000
      );$$,
    'https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/visual-safety-sweep',
    current_setting('app.settings.cron_secret', true)
  )
));