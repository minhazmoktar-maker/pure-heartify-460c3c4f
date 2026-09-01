CREATE OR REPLACE FUNCTION public.enqueue_rejection_backlog_channels(p_limit integer DEFAULT 200)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_count integer;
BEGIN
  WITH ranked AS (
    SELECT e.channel_id AS channel_id,
           max(e.channel_title) AS title,
           mode() WITHIN GROUP (ORDER BY e.content_language) AS language,
           count(*) AS backlog
    FROM public.evidence_free_rejections e
    WHERE e.channel_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.approved_channels a
        WHERE a.youtube_channel_id = e.channel_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.channel_candidates c
        WHERE c.youtube_channel_id = e.channel_id
      )
    GROUP BY e.channel_id
    ORDER BY count(*) DESC
    LIMIT GREATEST(1, LEAST(p_limit, 1000))
  ), inserted AS (
    INSERT INTO public.channel_candidates
      (youtube_channel_id, title, language_detected, source, discovery_method,
       status, priority_score, evidence)
    SELECT r.channel_id,
           COALESCE(r.title, r.channel_id),
           r.language,
           'import',
           'rejection_backlog',
           'pending',
           LEAST(99, 60 + (r.backlog / 100)),
           jsonb_build_object('rejection_backlog', r.backlog,
                              'source_detail', 'rejection_recovery',
                              'reason', 'channel-level-only rejections pending evidence-based review')
    FROM ranked r
    ON CONFLICT (youtube_channel_id) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM inserted;
  RETURN v_count;
END;
$fn$;