-- 1) Atomic batch claim for the pending_review moderation backlog.
CREATE OR REPLACE FUNCTION public.claim_moderation_backlog(p_limit int DEFAULT 40)
RETURNS TABLE (
  video_id text,
  title text,
  description text,
  channel_id text,
  channel_title text,
  category text,
  tags text[],
  language text,
  duration_seconds int,
  published_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_limit int := LEAST(GREATEST(COALESCE(p_limit, 40), 1), 200);
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT cv.video_id
    FROM public.curated_videos cv
    WHERE cv.moderation_state = 'pending_review'
      AND cv.is_archived = false
      -- Re-claimable after 30 minutes: covers a crashed / timed-out worker.
      AND (cv.moderation_claimed_at IS NULL OR cv.moderation_claimed_at < now() - interval '30 minutes')
    ORDER BY cv.moderation_claimed_at NULLS FIRST, cv.ingested_at
    LIMIT v_limit
    FOR UPDATE SKIP LOCKED
  ), stamped AS (
    UPDATE public.curated_videos cv
    SET moderation_claimed_at = now()
    WHERE cv.video_id IN (SELECT c.video_id FROM claimed c)
    RETURNING cv.video_id, cv.title, cv.description, cv.channel_id, cv.channel_title,
              cv.category, cv.tags, cv.language, cv.duration_seconds, cv.published_at
  )
  SELECT s.video_id, s.title, s.description, s.channel_id, s.channel_title,
         s.category, s.tags, s.language, s.duration_seconds, s.published_at
  FROM stamped s;
END;
$$;

-- Claim bookkeeping column + supporting index for the queue scan.
ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS moderation_claimed_at timestamptz;

CREATE INDEX IF NOT EXISTS curated_videos_pending_claim_idx
  ON public.curated_videos (moderation_claimed_at NULLS FIRST, ingested_at)
  WHERE moderation_state = 'pending_review' AND is_archived = false;

REVOKE ALL ON FUNCTION public.claim_moderation_backlog(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_moderation_backlog(int) TO service_role;

-- 2) Chunked, time-budgeted inappropriate-content sweep (no more statement timeouts).
CREATE OR REPLACE FUNCTION public.sweep_inappropriate_content(
  p_chunk int DEFAULT 5000,
  p_max_chunks int DEFAULT 20
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pattern text := public._inappropriate_pattern();
  v_video_count int := 0;
  v_channel_count int := 0;
  v_blocked_count int := 0;
  v_chunk int := LEAST(GREATEST(COALESCE(p_chunk, 5000), 500), 20000);
  v_max_chunks int := LEAST(GREATEST(COALESCE(p_max_chunks, 20), 1), 200);
  v_started timestamptz := clock_timestamp();
  v_n int;
  i int;
BEGIN
  -- Pass A: title / channel-title pattern matches, in bounded chunks.
  FOR i IN 1..v_max_chunks LOOP
    WITH target AS (
      SELECT cv.video_id
      FROM public.curated_videos cv
      WHERE cv.is_archived = false
        AND (
          lower(COALESCE(cv.title,'')) ~* v_pattern
          OR lower(COALESCE(cv.channel_title,'')) ~* v_pattern
        )
      LIMIT v_chunk
    ), upd AS (
      UPDATE public.curated_videos cv
      SET is_archived = true,
          is_hidden = true,
          moderation_state = 'rejected',
          moderation_reasoning = COALESCE(cv.moderation_reasoning,'') || ' | auto-sweep: inappropriate content policy'
      WHERE cv.video_id IN (SELECT t.video_id FROM target t)
      RETURNING 1
    )
    SELECT count(*) INTO v_n FROM upd;

    v_video_count := v_video_count + v_n;
    EXIT WHEN v_n < v_chunk;
    EXIT WHEN clock_timestamp() - v_started > interval '40 seconds';
  END LOOP;

  -- Pass B: remove offending channels and learn the block pattern.
  WITH ch AS (
    UPDATE public.approved_channels
    SET status = 'removed'
    WHERE status <> 'removed'
      AND lower(COALESCE(title,'')) ~* v_pattern
    RETURNING youtube_channel_id, title
  ), ins AS (
    INSERT INTO public.blocked_creators (pattern, reason)
    SELECT lower(title), 'auto-sweep: inappropriate content policy'
    FROM ch
    ON CONFLICT (pattern) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_channel_count FROM ch;

  -- Pass C: archive anything belonging to a blocked creator, chunked.
  FOR i IN 1..v_max_chunks LOOP
    WITH target AS (
      SELECT cv.video_id
      FROM public.curated_videos cv
      WHERE cv.is_archived = false
        AND EXISTS (
          SELECT 1 FROM public.blocked_creators bc
          WHERE lower(COALESCE(cv.channel_title,'') || ' ' || COALESCE(cv.title,''))
                LIKE '%' || lower(bc.pattern) || '%'
        )
      LIMIT v_chunk
    ), upd AS (
      UPDATE public.curated_videos cv
      SET is_archived = true,
          is_hidden = true,
          moderation_state = 'rejected',
          moderation_reasoning = COALESCE(cv.moderation_reasoning,'') || ' | auto-sweep: channel blocked'
      WHERE cv.video_id IN (SELECT t.video_id FROM target t)
      RETURNING 1
    )
    SELECT count(*) INTO v_n FROM upd;

    v_blocked_count := v_blocked_count + v_n;
    EXIT WHEN v_n < v_chunk;
    EXIT WHEN clock_timestamp() - v_started > interval '80 seconds';
  END LOOP;

  BEGIN
    INSERT INTO public.ops_metrics (metric, value, tags)
    VALUES ('inappropriate_sweep', v_video_count + v_blocked_count,
            jsonb_build_object(
              'videos_archived', v_video_count,
              'blocked_creator_videos_archived', v_blocked_count,
              'channels_blocked', v_channel_count,
              'elapsed_ms', extract(milliseconds from clock_timestamp() - v_started),
              'ran_at', now()));
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'videos_archived', v_video_count,
    'blocked_creator_videos_archived', v_blocked_count,
    'channels_blocked', v_channel_count
  );
END;
$$;

-- Keep the zero-arg entrypoint used by existing scheduled jobs.
CREATE OR REPLACE FUNCTION public.sweep_inappropriate_content()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.sweep_inappropriate_content(5000, 20);
$$;

REVOKE ALL ON FUNCTION public.sweep_inappropriate_content() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sweep_inappropriate_content(int, int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sweep_inappropriate_content() TO service_role;
GRANT EXECUTE ON FUNCTION public.sweep_inappropriate_content(int, int) TO service_role;

-- 3) Six parallel moderation-backlog workers, reusing the existing cron token.
DO $$
DECLARE
  v_cmd text;
  v_token text;
  i int;
BEGIN
  SELECT command INTO v_cmd FROM cron.job WHERE jobname = 'visual-safety-sweep-1min' LIMIT 1;
  IF v_cmd IS NULL THEN
    RAISE NOTICE 'no reference cron job found — skipping moderate-backlog schedule';
    RETURN;
  END IF;
  v_token := (regexp_match(v_cmd, $re$'x-cron-token'\s*,\s*'([^']+)'$re$))[1];
  IF v_token IS NULL THEN
    RAISE NOTICE 'could not derive cron token — skipping moderate-backlog schedule';
    RETURN;
  END IF;

  FOR i IN 1..6 LOOP
    BEGIN
      PERFORM cron.unschedule('moderate-backlog-' || i);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
    PERFORM cron.schedule(
      'moderate-backlog-' || i,
      '*/2 * * * *',
      format($j$
        SELECT net.http_post(
          url:='https://tbgxtwgliumqqtuppztu.supabase.co/functions/v1/moderate-backlog',
          headers:=jsonb_build_object('Content-Type','application/json','x-cron-token',%L),
          body:='{"batch":50,"concurrency":5}'::jsonb,
          timeout_milliseconds:=120000);
      $j$, v_token)
    );
  END LOOP;
END $$;