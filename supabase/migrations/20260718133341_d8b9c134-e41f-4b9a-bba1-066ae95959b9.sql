-- Fix 1: Widen channel_candidates constraints to include tier 'S' and auto_action 'queued_pre_approve'
ALTER TABLE public.channel_candidates
  DROP CONSTRAINT IF EXISTS channel_candidates_tier_check;
ALTER TABLE public.channel_candidates
  ADD CONSTRAINT channel_candidates_tier_check
  CHECK (tier IS NULL OR tier IN ('S','A','B','C','D'));

ALTER TABLE public.channel_candidates
  DROP CONSTRAINT IF EXISTS channel_candidates_auto_action_check;
ALTER TABLE public.channel_candidates
  ADD CONSTRAINT channel_candidates_auto_action_check
  CHECK (auto_action IS NULL OR auto_action IN (
    'auto_approved','queued_fast','queued_full','queued_pre_approve','auto_rejected','quarantined'
  ));

-- Fix 2: Restore EXECUTE on has_active_entitlement to authenticated (RLS predicate)
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'has_active_entitlement'
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.has_active_entitlement(%s) TO authenticated', r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.has_active_entitlement(%s) TO service_role', r.args);
  END LOOP;
END $$;