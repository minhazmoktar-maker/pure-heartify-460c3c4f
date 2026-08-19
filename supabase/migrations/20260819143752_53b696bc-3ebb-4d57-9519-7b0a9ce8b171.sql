-- 1. Server-only privileged / pipeline functions: revoke from PUBLIC, anon, authenticated.
DO $$
DECLARE r record; fns text[] := ARRAY[
  'export_user_data','scrub_user_data','refresh_user_taste_profile','refresh_leaderboards',
  'recompute_channel_trust','recompute_all_channel_trust','log_recommendation_event',
  'rate_limit_increment','_run_channel_id_backfill','annotate_concept_segments',
  'backfill_video_attestations','benefit_ranker_autoramp','enforce_retention_policies',
  'enqueue_benefit_labels','issue_video_attestation','requeue_stale_transcript_jobs'
];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = ANY(fns)
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 2. Trigger functions must never be directly executable.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prorettype = 'trigger'::regtype
  LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC, anon, authenticated', r.sig);
  END LOOP;
END $$;

-- 3. Self-scoped guards for client-called RPCs that take a user id.
CREATE OR REPLACE FUNCTION public.seed_default_notification_prefs(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND _user_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  INSERT INTO public.notification_prefs (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

REVOKE ALL ON FUNCTION public.seed_default_notification_prefs(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.seed_default_notification_prefs(uuid) TO authenticated, service_role;

-- compute_weekly_recap: keep body, add self/admin guard via wrapper rename-safe approach.
CREATE OR REPLACE FUNCTION public.assert_self_or_admin(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- service_role / cron run with auth.uid() = NULL and stay allowed.
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF _user_id = auth.uid() THEN RETURN; END IF;
  IF public.has_role(auth.uid(), 'admin') THEN RETURN; END IF;
  RAISE EXCEPTION 'forbidden';
END;
$function$;

REVOKE ALL ON FUNCTION public.assert_self_or_admin(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.assert_self_or_admin(uuid) TO authenticated, service_role;

-- 4. Admin-only maintenance sweep (called from the admin console with a user JWT).
CREATE OR REPLACE FUNCTION public.nightly_reaudit_sweep()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _res jsonb;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  _res := public.nightly_reaudit_sweep_impl();
  RETURN _res;
END;
$function$;

REVOKE ALL ON FUNCTION public.nightly_reaudit_sweep() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.nightly_reaudit_sweep() TO authenticated, service_role;

-- 5. Unplayable reports need corroboration instead of instant catalog-wide hiding.
CREATE TABLE IF NOT EXISTS public.video_unplayable_reports (
  video_id text NOT NULL,
  reporter_id uuid NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (video_id, reporter_id)
);

GRANT SELECT ON public.video_unplayable_reports TO authenticated;
GRANT ALL ON public.video_unplayable_reports TO service_role;
ALTER TABLE public.video_unplayable_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own unplayable reports readable" ON public.video_unplayable_reports;
CREATE POLICY "own unplayable reports readable"
ON public.video_unplayable_reports FOR SELECT TO authenticated
USING (reporter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_unplayable_reports_video_recent
  ON public.video_unplayable_reports (video_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.report_video_unplayable(_video_id text, _reason text DEFAULT 'embed_disabled'::text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _updated int := 0;
  _reporters int;
BEGIN
  IF _video_id IS NULL OR _video_id !~ '^[A-Za-z0-9_-]{11}$' THEN
    RETURN false;
  END IF;
  IF auth.uid() IS NULL THEN
    -- Guests cannot influence catalog visibility; the embeddability sweep is authoritative.
    RETURN false;
  END IF;

  INSERT INTO public.video_unplayable_reports (video_id, reporter_id, reason)
  VALUES (_video_id, auth.uid(), left(COALESCE(_reason, 'embed_disabled'), 120))
  ON CONFLICT (video_id, reporter_id)
    DO UPDATE SET created_at = now(), reason = excluded.reason;

  SELECT count(DISTINCT reporter_id) INTO _reporters
  FROM public.video_unplayable_reports
  WHERE video_id = _video_id AND created_at > now() - interval '30 days';

  IF _reporters >= 3 THEN
    UPDATE public.curated_videos
       SET embeddable = false,
           is_hidden = true,
           embed_checked_at = now(),
           moderation_reasoning = COALESCE(moderation_reasoning, '')
             || ' | unplayable: ' || COALESCE(_reason, 'embed_disabled')
             || ' (' || _reporters || ' reports)'
     WHERE video_id = _video_id
       AND embeddable = true;
    GET DIAGNOSTICS _updated = ROW_COUNT;
  END IF;

  RETURN _updated > 0;
END;
$function$;

REVOKE ALL ON FUNCTION public.report_video_unplayable(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_video_unplayable(text, text) TO authenticated, service_role;

-- 6. Anon has no business in personal benefit/learning RPCs (they already no-op).
REVOKE ALL ON FUNCTION public.get_due_benefit_label() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_due_benefit_label() TO authenticated, service_role;