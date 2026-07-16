-- Phase 1: revoke default EXECUTE from PUBLIC/anon/authenticated on ALL
-- SECURITY DEFINER functions in the public schema.
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef
  LOOP
    EXECUTE format(
      'REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC, anon, authenticated',
      r.proname, r.args
    );
    -- service_role always keeps execute
    EXECUTE format(
      'GRANT EXECUTE ON FUNCTION public.%I(%s) TO service_role',
      r.proname, r.args
    );
  END LOOP;
END $$;

-- Phase 2: re-grant EXECUTE to `authenticated` on RPCs the app calls.
-- These are the only definer functions reachable via PostgREST/RPC.
DO $$
DECLARE
  fn text;
  authenticated_rpcs text[] := ARRAY[
    'admin_content_freshness',
    'admin_moderation_sla',
    'claim_juz',
    'complete_juz',
    'compute_weekly_recap',
    'contribute_to_dhikr_circle',
    'create_team_streak',
    'end_dhikr_circle',
    'enforce_retention_policies',
    'export_user_data',
    'get_or_create_referral_code',
    'get_referral_tier_progress',
    'get_retention_cohorts',
    'get_transparency_appeals',
    'get_transparency_report',
    'gift_premium_month',
    'gift_streak_freeze',
    'grant_entitlement',
    'grant_referral_tier_rewards',
    'has_active_premium',
    'has_min_role',
    'has_role',
    'is_owner',
    'join_khatm_group',
    'join_team_streak',
    'list_my_team_streaks',
    'nightly_reaudit_sweep',
    'recompute_all_channel_trust',
    'recompute_channel_trust',
    'record_streak_activity',
    'redeem_gift_code',
    'redeem_referral',
    'refresh_leaderboards',
    'revoke_entitlement',
    'scrub_user_data',
    'seed_default_notification_prefs',
    'send_nudge_by_handle',
    'set_profile_handle',
    'settle_team_streaks',
    -- authenticated read helpers
    'get_public_dhikr_circle',
    'get_public_dua',
    'get_public_khatm_group',
    'get_public_profile',
    'get_public_team_streak',
    'get_public_weekly_recap',
    'get_related_searches',
    'get_trending_searches',
    'get_trending_video_ids',
    'list_dua_wall',
    'match_curated_videos',
    'search_autocomplete',
    'search_reciters',
    'search_videos',
    'check_channel_duplicate',
    'compute_owner_key',
    'evaluate_feature_flag',
    'assign_experiment_variant',
    'add_anon_ameen',
    'rate_limit_increment'
  ];
  r RECORD;
BEGIN
  FOREACH fn IN ARRAY authenticated_rpcs LOOP
    FOR r IN
      SELECT p.proname,
             pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prosecdef
        AND p.proname = fn
    LOOP
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated',
        r.proname, r.args
      );
    END LOOP;
  END LOOP;
END $$;

-- Phase 3: additionally grant `anon` execute on the small set of RPCs that
-- must work for signed-out visitors (public reads, feature flags, experiment
-- assignment before login, anonymous ameen counter, rate-limit counter).
DO $$
DECLARE
  fn text;
  anon_rpcs text[] := ARRAY[
    'add_anon_ameen',
    'assign_experiment_variant',
    'check_channel_duplicate',
    'compute_owner_key',
    'evaluate_feature_flag',
    'get_public_dhikr_circle',
    'get_public_dua',
    'get_public_khatm_group',
    'get_public_profile',
    'get_public_team_streak',
    'get_public_weekly_recap',
    'get_related_searches',
    'get_trending_searches',
    'get_trending_video_ids',
    'list_dua_wall',
    'match_curated_videos',
    'rate_limit_increment',
    'search_autocomplete',
    'search_reciters',
    'search_videos'
  ];
  r RECORD;
BEGIN
  FOREACH fn IN ARRAY anon_rpcs LOOP
    FOR r IN
      SELECT p.proname,
             pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.prosecdef
        AND p.proname = fn
    LOOP
      EXECUTE format(
        'GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon',
        r.proname, r.args
      );
    END LOOP;
  END LOOP;
END $$;