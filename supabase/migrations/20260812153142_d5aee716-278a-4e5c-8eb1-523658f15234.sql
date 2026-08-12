-- 1. Channel-exact block mode -------------------------------------------------
ALTER TABLE public.blocked_creators
  ADD COLUMN IF NOT EXISTS match_mode text NOT NULL DEFAULT 'substring';

ALTER TABLE public.blocked_creators
  DROP CONSTRAINT IF EXISTS blocked_creators_match_mode_chk;
ALTER TABLE public.blocked_creators
  ADD CONSTRAINT blocked_creators_match_mode_chk
  CHECK (match_mode IN ('substring','channel_exact'));

CREATE OR REPLACE FUNCTION public.enforce_blocked_creators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  hay text := lower(coalesce(NEW.channel_title,'') || ' ' || coalesce(NEW.title,''));
  ch  text := lower(trim(coalesce(NEW.channel_title,'')));
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.is_archived = true THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.blocked_creators
    WHERE (match_mode = 'substring' AND hay LIKE '%' || lower(pattern) || '%')
       OR (match_mode = 'channel_exact' AND ch = lower(trim(pattern)))
  ) THEN
    RAISE EXCEPTION 'Blocked creator content rejected: %', NEW.channel_title;
  END IF;
  RETURN NEW;
END;
$function$;

INSERT INTO public.blocked_creators (pattern, reason, match_mode) VALUES
  ('TED',        'policy: mixed-gender secular talks, female speakers', 'channel_exact'),
  ('TED-Ed',     'policy: mixed-gender secular talks, female speakers', 'channel_exact'),
  ('TEDx Talks', 'policy: mixed-gender secular talks, female speakers', 'channel_exact'),
  ('TEDx',       'policy: mixed-gender secular talks, female speakers', 'channel_exact')
ON CONFLICT (pattern) DO UPDATE SET match_mode = EXCLUDED.match_mode, reason = EXCLUDED.reason;

UPDATE public.curated_videos
SET is_archived = true, is_hidden = true, moderation_state = 'rejected',
    moderation_reasoning = COALESCE(moderation_reasoning,'') || ' | blocked channel: TED family'
WHERE is_archived = false
  AND lower(trim(coalesce(channel_title,''))) IN ('ted','ted-ed','tedx talks','tedx','ted ed','tedx talk');

UPDATE public.approved_channels SET status = 'removed'
WHERE lower(trim(coalesce(title,''))) IN ('ted','ted-ed','tedx talks','tedx','ted ed');

-- 2. Autonomous visual (thumbnail) safety sweep --------------------------------
CREATE OR REPLACE FUNCTION public.claim_visual_scan_batch(p_limit int DEFAULT 40)
RETURNS TABLE (video_id text, title text, channel_title text, thumbnail_url text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH picked AS (
    SELECT cv.video_id
    FROM public.curated_videos cv
    WHERE cv.is_archived = false
      AND cv.is_hidden = false
      AND cv.moderation_state IN ('approved','auto_approved')
      AND cv.thumbnail_url IS NOT NULL
      AND (cv.visual_state IS NULL OR cv.visual_state = 'unchecked')
      AND (cv.visual_checked_at IS NULL OR cv.visual_checked_at < now() - interval '1 hour')
    ORDER BY cv.view_count DESC NULLS LAST, cv.published_at DESC NULLS LAST
    LIMIT GREATEST(1, LEAST(p_limit, 100))
    FOR UPDATE SKIP LOCKED
  ), stamped AS (
    UPDATE public.curated_videos cv
    SET visual_checked_at = now()
    WHERE cv.video_id IN (SELECT p.video_id FROM picked p)
    RETURNING cv.video_id, cv.title, cv.channel_title, cv.thumbnail_url
  )
  SELECT s.video_id, s.title, s.channel_title, s.thumbnail_url FROM stamped s;
END;
$function$;

REVOKE ALL ON FUNCTION public.claim_visual_scan_batch(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_visual_scan_batch(int) TO service_role;

-- Escalate channels whose reviewed thumbnails are repeatedly flagged.
CREATE OR REPLACE FUNCTION public.escalate_visually_unsafe_channels()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_blocked int := 0;
  v_videos  int := 0;
BEGIN
  WITH stats AS (
    SELECT lower(trim(channel_title)) AS ch,
           count(*) FILTER (WHERE visual_state IN ('female_detected','music','flagged')) AS bad,
           count(*) FILTER (WHERE visual_state IS NOT NULL AND visual_state <> 'unchecked') AS checked
    FROM public.curated_videos
    WHERE channel_title IS NOT NULL AND trim(channel_title) <> ''
    GROUP BY 1
  ), offenders AS (
    SELECT ch FROM stats
    WHERE checked >= 5 AND bad::numeric / GREATEST(checked,1) >= 0.30
  ), ins AS (
    INSERT INTO public.blocked_creators (pattern, reason, match_mode)
    SELECT ch, 'auto: >=30% of reviewed thumbnails flagged (female/music)', 'channel_exact'
    FROM offenders
    ON CONFLICT (pattern) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_blocked FROM ins;

  WITH purged AS (
    UPDATE public.curated_videos cv
    SET is_archived = true, is_hidden = true, moderation_state = 'rejected',
        moderation_reasoning = COALESCE(cv.moderation_reasoning,'') || ' | auto: visually unsafe channel'
    WHERE cv.is_archived = false
      AND EXISTS (
        SELECT 1 FROM public.blocked_creators bc
        WHERE bc.match_mode = 'channel_exact'
          AND lower(trim(coalesce(cv.channel_title,''))) = lower(trim(bc.pattern))
      )
    RETURNING 1
  )
  SELECT count(*) INTO v_videos FROM purged;

  UPDATE public.approved_channels ac SET status = 'removed'
  WHERE ac.status <> 'removed'
    AND EXISTS (
      SELECT 1 FROM public.blocked_creators bc
      WHERE bc.match_mode = 'channel_exact'
        AND lower(trim(coalesce(ac.title,''))) = lower(trim(bc.pattern))
    );

  BEGIN
    INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('visual_channel_escalation', v_blocked,
            jsonb_build_object('channels_blocked', v_blocked, 'videos_archived', v_videos, 'ran_at', now()));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('channels_blocked', v_blocked, 'videos_archived', v_videos);
END;
$function$;

REVOKE ALL ON FUNCTION public.escalate_visually_unsafe_channels() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.escalate_visually_unsafe_channels() TO service_role;

-- Apply AI verdicts in one round-trip.
CREATE OR REPLACE FUNCTION public.apply_visual_verdicts(p_verdicts jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_flagged int := 0;
  v_clean   int := 0;
BEGIN
  WITH v AS (
    SELECT (e->>'video_id')::text AS video_id,
           lower(coalesce(e->>'state','unchecked')) AS state,
           coalesce((e->>'confidence')::numeric, 0) AS confidence,
           coalesce(e->'flags', '[]'::jsonb) AS flags
    FROM jsonb_array_elements(coalesce(p_verdicts,'[]'::jsonb)) e
    WHERE e->>'video_id' IS NOT NULL
  ), upd AS (
    UPDATE public.curated_videos cv
    SET visual_state = v.state,
        visual_confidence = v.confidence,
        visual_flags = v.flags,
        visual_checked_at = now(),
        is_archived = CASE WHEN v.state IN ('female_detected','music','flagged') THEN true ELSE cv.is_archived END,
        is_hidden   = CASE WHEN v.state IN ('female_detected','music','flagged') THEN true ELSE cv.is_hidden END,
        moderation_state = CASE WHEN v.state IN ('female_detected','music','flagged') THEN 'rejected' ELSE cv.moderation_state END,
        moderation_reasoning = CASE WHEN v.state IN ('female_detected','music','flagged')
          THEN COALESCE(cv.moderation_reasoning,'') || ' | auto: visual sweep ' || v.state
          ELSE cv.moderation_reasoning END
    FROM v
    WHERE cv.video_id = v.video_id
    RETURNING v.state
  )
  SELECT count(*) FILTER (WHERE state IN ('female_detected','music','flagged')),
         count(*) FILTER (WHERE state NOT IN ('female_detected','music','flagged'))
  INTO v_flagged, v_clean FROM upd;

  BEGIN
    INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('visual_sweep_batch', v_flagged,
            jsonb_build_object('flagged', v_flagged, 'clean', v_clean, 'ran_at', now()));
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('flagged', v_flagged, 'clean', v_clean);
END;
$function$;

REVOKE ALL ON FUNCTION public.apply_visual_verdicts(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_visual_verdicts(jsonb) TO service_role;

-- 3. Schedule the sweep every 5 minutes ---------------------------------------
SELECT cron.unschedule('visual-safety-sweep-5min')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'visual-safety-sweep-5min');

SELECT cron.schedule(
  'visual-safety-sweep-5min',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/visual-safety-sweep',
    headers:=jsonb_build_object('Content-Type','application/json',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRiZ3h0d2dsaXVtcXF0dXBwenR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwNDU1NDcsImV4cCI6MjA5MTYyMTU0N30.Ovo4AMspBuurQTUef_Ygr4rW-UQcv6lTHp3T_2YBfZE',
      'x-cron-token','P_Y40qWcEWvw9Ie2ciBnyckeSRNarURYOFyaqMgbAUQ'),
    body:='{"batch": 40}'::jsonb,
    timeout_milliseconds:=180000);
  $$
);
