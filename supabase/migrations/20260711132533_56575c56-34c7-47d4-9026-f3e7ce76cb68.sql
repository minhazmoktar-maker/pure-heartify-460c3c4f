
-- =========================================================================
-- 1) P0: Premium reciter audio bypass
-- =========================================================================
DROP POLICY IF EXISTS "Public can view reciter audio sources" ON public.reciter_audio_sources;
DROP POLICY IF EXISTS "Anyone can view active reciter audio sources" ON public.reciter_audio_sources;

CREATE POLICY "View non-premium audio; premium requires entitlement"
  ON public.reciter_audio_sources
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND (
      COALESCE(is_premium, false) = false
      OR (auth.uid() IS NOT NULL AND public.has_active_premium(auth.uid()))
    )
  );

-- =========================================================================
-- 2) P1-4: search_path hardening on the one function missing it
-- =========================================================================
ALTER FUNCTION public.validate_seat_invite() SET search_path = public;

-- =========================================================================
-- 3) P1-2 + P2-3: Revoke PUBLIC EXECUTE on privileged / internal functions.
--    Then grant EXECUTE only to the roles that legitimately need it.
--    Trigger functions do not need any EXECUTE grants - triggers run as owner.
-- =========================================================================

-- --- Internal / server-only helpers (edge functions call these via service role) ---
REVOKE ALL ON FUNCTION public.get_internal_config(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_increment(text, text, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rate_limit_cleanup(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_leaderboards() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_channel_trust(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recompute_all_channel_trust(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.backfill_reciter_alias_variants() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.add_reciter_alias(uuid, text, text) FROM PUBLIC, anon, authenticated;

-- --- Trigger functions: no direct EXECUTE ever ---
REVOKE ALL ON FUNCTION public.dua_anon_ameens_bump() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_video_last_decision() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.reject_removed_video() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_blocked_creators() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.curated_videos_tsv_refresh() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_platform_owners() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_owner_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.prevent_last_owner_removal() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_seat_invite() FROM PUBLIC, anon, authenticated;

-- --- Admin-only functions (they assert admin internally, but block anon at the door) ---
REVOKE ALL ON FUNCTION public.grant_entitlement(uuid, text, timestamptz, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.grant_entitlement(uuid, text, timestamptz, jsonb, text) TO authenticated;

REVOKE ALL ON FUNCTION public.revoke_entitlement(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_entitlement(uuid, text) TO authenticated;

REVOKE ALL ON FUNCTION public.video_report_queue_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.video_report_queue_summary() TO authenticated;

REVOKE ALL ON FUNCTION public.analytics_performance(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_performance(timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.analytics_engagement(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_engagement(timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.analytics_favorites_stats(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_favorites_stats(timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.analytics_ai_confidence_histogram(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_ai_confidence_histogram(timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.analytics_geo_distribution(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_geo_distribution(timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.analytics_session_stats(timestamptz, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.analytics_session_stats(timestamptz, timestamptz) TO authenticated;

REVOKE ALL ON FUNCTION public.recent_video_report_count(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recent_video_report_count(uuid, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.get_channel_trust_history(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_channel_trust_history(uuid, integer) TO authenticated;

-- --- User-callable RPCs: authenticated only, no anon ---
REVOKE ALL ON FUNCTION public.redeem_referral(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_referral(text) TO authenticated;

REVOKE ALL ON FUNCTION public.gift_premium_month(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.gift_premium_month(uuid, integer, text) TO authenticated;

REVOKE ALL ON FUNCTION public.claim_juz(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_juz(uuid, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.contribute_to_dhikr_circle(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.contribute_to_dhikr_circle(uuid, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.end_dhikr_circle(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.end_dhikr_circle(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.settle_team_streaks() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.settle_team_streaks() TO authenticated;

REVOKE ALL ON FUNCTION public.get_referral_tier_progress() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_referral_tier_progress() TO authenticated;

REVOKE ALL ON FUNCTION public.get_related_searches(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_related_searches(text, integer) TO authenticated;

-- --- Anonymous but rate-limited by trigger + unique constraint ---
-- add_anon_ameen intentionally callable by anon (dua "say āmīn" for logged-out visitors).
REVOKE ALL ON FUNCTION public.add_anon_ameen(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_anon_ameen(uuid, text) TO anon, authenticated;

-- --- Policy helpers: must remain callable so RLS predicates work ---
--     Keep default PUBLIC EXECUTE on has_role, is_owner, has_min_role,
--     has_active_premium, is_household_owner, compute_owner_key,
--     search_reciters, f_unaccent, and the pg_trgm/unaccent operator functions.
--     RLS uses them; revoking would break every policy.

-- --- search_reciters: expose to anon+authenticated explicitly (was PUBLIC) ---
REVOKE ALL ON FUNCTION public.search_reciters(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_reciters(text, integer) TO anon, authenticated;
