
-- Phase 7: SLA + freshness reporting, device consolidation link

-- 1. Link device_tokens to device_registrations via optional device_id
ALTER TABLE public.device_tokens
  ADD COLUMN IF NOT EXISTS device_id text,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS device_tokens_device_id_idx ON public.device_tokens(device_id);
CREATE INDEX IF NOT EXISTS device_tokens_user_last_seen_idx ON public.device_tokens(user_id, last_seen_at DESC);

-- 2. Moderation SLA metrics (admins only)
CREATE OR REPLACE FUNCTION public.admin_moderation_sla()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reports_pending int;
  reports_oldest_hours numeric;
  reports_ttd_hours numeric;
  reports_reversal_rate numeric;
  candidates_pending int;
  candidates_oldest_hours numeric;
  candidates_ttd_hours numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator') OR EXISTS (SELECT 1 FROM public.platform_owners WHERE user_id = auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*)::int,
         COALESCE(EXTRACT(EPOCH FROM (now() - MIN(created_at)))/3600, 0)::numeric(10,2)
    INTO reports_pending, reports_oldest_hours
    FROM public.video_reports
   WHERE status IN ('pending','open');

  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)))/3600, 0)::numeric(10,2)
    INTO reports_ttd_hours
    FROM public.video_reports
   WHERE status NOT IN ('pending','open')
     AND created_at > now() - interval '7 days';

  SELECT CASE WHEN COUNT(*) = 0 THEN 0
              ELSE ROUND(100.0 * SUM(CASE WHEN action IN ('reversed','overridden') THEN 1 ELSE 0 END) / COUNT(*), 2)
         END
    INTO reports_reversal_rate
    FROM public.moderation_overrides
   WHERE created_at > now() - interval '7 days';

  SELECT COUNT(*)::int,
         COALESCE(EXTRACT(EPOCH FROM (now() - MIN(created_at)))/3600, 0)::numeric(10,2)
    INTO candidates_pending, candidates_oldest_hours
    FROM public.channel_candidates
   WHERE status = 'pending';

  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (created_at - (SELECT c2.created_at FROM public.channel_candidates c2 WHERE c2.id = channel_audit_log.candidate_id))))/3600, 0)::numeric(10,2)
    INTO candidates_ttd_hours
    FROM public.channel_audit_log
   WHERE action IN ('approved','rejected')
     AND created_at > now() - interval '7 days';

  RETURN jsonb_build_object(
    'reports', jsonb_build_object(
      'pending', reports_pending,
      'oldest_hours', reports_oldest_hours,
      'avg_time_to_decision_hours', reports_ttd_hours,
      'reversal_rate_pct', COALESCE(reports_reversal_rate, 0)
    ),
    'candidates', jsonb_build_object(
      'pending', candidates_pending,
      'oldest_hours', candidates_oldest_hours,
      'avg_time_to_decision_hours', candidates_ttd_hours
    ),
    'computed_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_moderation_sla() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_moderation_sla() TO authenticated;

-- 3. Content freshness metrics
CREATE OR REPLACE FUNCTION public.admin_content_freshness()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_approved int;
  never_rechecked int;
  oldest_hours numeric;
  avg_age_hours numeric;
  flagged int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR EXISTS (SELECT 1 FROM public.platform_owners WHERE user_id = auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT COUNT(*)::int,
         SUM(CASE WHEN last_rechecked_at IS NULL THEN 1 ELSE 0 END)::int,
         COALESCE(EXTRACT(EPOCH FROM (now() - MIN(last_rechecked_at)))/3600, 0)::numeric(10,2),
         COALESCE(AVG(EXTRACT(EPOCH FROM (now() - last_rechecked_at)))/3600, 0)::numeric(10,2),
         SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END)::int
    INTO total_approved, never_rechecked, oldest_hours, avg_age_hours, flagged
    FROM public.approved_channels;

  RETURN jsonb_build_object(
    'total_approved', COALESCE(total_approved, 0),
    'never_rechecked', COALESCE(never_rechecked, 0),
    'oldest_recheck_hours', COALESCE(oldest_hours, 0),
    'avg_recheck_age_hours', COALESCE(avg_age_hours, 0),
    'flagged', COALESCE(flagged, 0),
    'slo_target_hours', 168,
    'computed_at', now()
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_content_freshness() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_content_freshness() TO authenticated;
