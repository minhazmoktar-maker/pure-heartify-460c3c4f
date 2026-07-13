
-- 1. report_moderation_actions: allow admins/owners to update & delete
DROP POLICY IF EXISTS "Admins update moderation actions" ON public.report_moderation_actions;
CREATE POLICY "Admins update moderation actions"
  ON public.report_moderation_actions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "Admins delete moderation actions" ON public.report_moderation_actions;
CREATE POLICY "Admins delete moderation actions"
  ON public.report_moderation_actions FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_owner(auth.uid()));

-- 2. analytics_events & recommendation_events: require authenticated user
DROP POLICY IF EXISTS "Anyone can insert events" ON public.analytics_events;
CREATE POLICY "Authenticated users insert their own events"
  ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

REVOKE INSERT ON public.analytics_events FROM anon;

DROP POLICY IF EXISTS "Anyone can log recommendation events they saw" ON public.recommendation_events;
CREATE POLICY "Authenticated users log their own recommendation events"
  ON public.recommendation_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NOT NULL AND auth.uid() = user_id);

REVOKE INSERT ON public.recommendation_events FROM anon;

-- 3. Move extensions out of public
CREATE SCHEMA IF NOT EXISTS extensions;
GRANT USAGE ON SCHEMA extensions TO anon, authenticated, service_role;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
ALTER EXTENSION unaccent SET SCHEMA extensions;
ALTER EXTENSION vector SET SCHEMA extensions;

-- Ensure search_path includes extensions so unqualified references keep working
ALTER DATABASE postgres SET search_path TO "$user", public, extensions;

-- 4. Revoke EXECUTE on SECURITY DEFINER functions that shouldn't be public/user-callable.
-- First revoke broadly from anon on ALL public SECURITY DEFINER functions, then re-grant to the
-- small set that legitimately needs anonymous access.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname='public' AND p.prosecdef=true
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', r.sig);
  END LOOP;
END $$;

-- Revoke authenticated EXECUTE on admin/internal-only functions
DO $$
DECLARE
  fn text;
  admin_fns text[] := ARRAY[
    '_analytics_assert_admin','_user_scoped_columns','admin_retention_cohorts',
    'analytics_active_users','analytics_ai_confidence_histogram','analytics_category_popularity',
    'analytics_channel_growth','analytics_device_stats','analytics_dose_stats',
    'analytics_engagement','analytics_favorites_stats','analytics_geo_distribution',
    'analytics_moderation_stats','analytics_performance','analytics_recommendation_stats',
    'analytics_retention','analytics_search_stats','analytics_session_stats',
    'analytics_watch_stats','backfill_reciter_alias_variants','enforce_blocked_creators',
    'enforce_retention_policies','get_channel_trust_history','get_retention_cohorts',
    'grant_entitlement','revoke_entitlement','settle_team_streaks',
    'video_report_queue_summary','recent_video_report_count','add_reciter_alias'
  ];
  r record;
BEGIN
  FOREACH fn IN ARRAY admin_fns LOOP
    FOR r IN
      SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
      WHERE n.nspname='public' AND p.proname=fn
    LOOP
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated, anon, PUBLIC', r.sig);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
    END LOOP;
  END LOOP;
END $$;

-- Re-grant anon EXECUTE for functions genuinely needed by unauthenticated users
DO $$
DECLARE
  fn text;
  public_fns text[] := ARRAY[
    'has_role','has_min_role','is_owner','is_khatm_member','is_team_streak_member',
    'is_in_cohort','has_active_entitlement','has_active_premium','reciter_is_accessible',
    'get_public_dua','get_public_dhikr_circle','get_public_khatm_group','get_public_profile',
    'get_public_team_streak','get_public_weekly_recap','list_dua_wall',
    'get_transparency_report','get_transparency_appeals',
    'search_videos','search_autocomplete','search_reciters',
    'get_trending_searches','get_trending_video_ids',
    'add_anon_ameen','dua_ameens_bump','dua_anon_ameens_bump',
    'evaluate_feature_flag','assign_experiment_variant'
  ];
  r record;
BEGIN
  FOREACH fn IN ARRAY public_fns LOOP
    FOR r IN
      SELECT p.oid::regprocedure AS sig
      FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid
      WHERE n.nspname='public' AND p.proname=fn
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO anon, authenticated', r.sig);
    END LOOP;
  END LOOP;
END $$;
