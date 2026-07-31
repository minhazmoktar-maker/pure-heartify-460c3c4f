CREATE OR REPLACE FUNCTION public.enqueue_benefit_labels(_limit integer DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created integer := 0;
BEGIN
  WITH eligible AS (
    SELECT DISTINCT ON (w.user_id, w.video_id)
           w.user_id, w.video_id, w.video_title, w.watched_at
    FROM public.watch_history w
    WHERE w.user_id IS NOT NULL
      AND (
        w.completed
        OR (COALESCE(w.duration_seconds, 0) > 0
            AND w.progress_seconds >= GREATEST(120, w.duration_seconds / 2))
      )
    ORDER BY w.user_id, w.video_id, w.watched_at DESC
    LIMIT GREATEST(_limit, 0)
  ), horizons AS (
    SELECT e.*, h.d AS horizon
    FROM eligible e
    CROSS JOIN (VALUES (7), (30), (90)) AS h(d)
  ), ins AS (
    INSERT INTO public.benefit_labels
      (user_id, video_id, video_title, horizon_days, watched_at, due_at)
    SELECT user_id, video_id, video_title, horizon, watched_at,
           watched_at + (horizon || ' days')::interval
    FROM horizons
    ON CONFLICT (user_id, video_id, horizon_days) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO created FROM ins;

  RETURN jsonb_build_object('scheduled', created, 'at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_benefit_labels(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_benefit_labels(integer) TO service_role;