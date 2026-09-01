CREATE OR REPLACE FUNCTION public.requeue_stale_channel_rejections(p_limit integer DEFAULT 2000)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $fn$
DECLARE
  v_count integer;
BEGIN
  WITH eligible AS (
    SELECT e.video_id
    FROM public.evidence_free_rejections e
    WHERE e.channel_id IS NOT NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.approved_channels a
          WHERE a.youtube_channel_id = e.channel_id
            AND a.status = 'active'
        )
        OR EXISTS (
          SELECT 1 FROM public.channel_candidates c
          WHERE c.youtube_channel_id = e.channel_id
            AND c.status IN ('approved', 'pre_approved')
        )
      )
    LIMIT GREATEST(1, LEAST(p_limit, 20000))
  ), updated AS (
    UPDATE public.curated_videos v
    SET moderation_state = 'pending_review',
        is_archived = false,
        is_hidden = true,
        hidden_reason = 'awaiting_recheck',
        moderation_confidence = NULL,
        moderation_risk = NULL,
        visual_state = 'unchecked',
        visual_flags = '{}'::text[],
        visual_confidence = NULL,
        visual_checked_at = NULL,
        moderation_claimed_at = NULL,
        moderation_reasoning = 'Requeued by rejection-recovery: prior rejection was channel-level only and that channel has since been reviewed and approved. Re-adjudicated from scratch.',
        moderation_signals = COALESCE(v.moderation_signals, '{}'::jsonb)
          || jsonb_build_object('rejection_recovery', jsonb_build_object(
               'policy', 'evidence_required_v1',
               'previous_reasoning', v.moderation_reasoning,
               'requeued_at', now()
             )),
        moderation_updated_at = now()
    FROM eligible el
    WHERE v.video_id = el.video_id
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM updated;
  RETURN v_count;
END;
$fn$;