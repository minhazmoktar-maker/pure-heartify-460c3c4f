
-- 1. Khatm group members: require public group OR owner for direct insert;
--    provide join_khatm_group RPC for invite-code-gated private joins.
DROP POLICY IF EXISTS "kgm_self_join" ON public.khatm_group_members;
CREATE POLICY "kgm_self_join" ON public.khatm_group_members
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.khatm_groups g
      WHERE g.id = group_id
        AND (g.is_public = true OR g.owner_id = auth.uid())
    )
  );

CREATE OR REPLACE FUNCTION public.join_khatm_group(_group_id uuid, _invite_code text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _g public.khatm_groups%ROWTYPE;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;
  SELECT * INTO _g FROM public.khatm_groups WHERE id = _group_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'group_not_found';
  END IF;
  IF NOT _g.is_public
     AND _g.owner_id <> _uid
     AND (_invite_code IS NULL OR lower(_invite_code) <> lower(_g.invite_code)) THEN
    RAISE EXCEPTION 'invalid_invite_code';
  END IF;
  INSERT INTO public.khatm_group_members (group_id, user_id, role)
  VALUES (_group_id, _uid, 'member')
  ON CONFLICT (group_id, user_id) DO NOTHING;
  INSERT INTO public.khatm_events (group_id, user_id, kind, data)
  VALUES (_group_id, _uid, 'member_joined', jsonb_build_object('via','rpc'));
END;
$$;

-- 2. Referrals: only invitee can flip pending -> redeemed, and only once.
CREATE OR REPLACE FUNCTION public.referrals_guard_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- immutable identifiers (defense in depth with existing trigger)
  IF NEW.inviter_id IS DISTINCT FROM OLD.inviter_id
     OR NEW.invitee_id IS DISTINCT FROM OLD.invitee_id
     OR NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'referrals: inviter_id, invitee_id, and code are immutable';
  END IF;
  -- only invitee may transition status, only pending -> redeemed
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status <> 'pending' OR NEW.status <> 'redeemed' THEN
      RAISE EXCEPTION 'referrals: invalid status transition % -> %', OLD.status, NEW.status;
    END IF;
    IF auth.uid() IS DISTINCT FROM NEW.invitee_id THEN
      RAISE EXCEPTION 'referrals: only invitee can redeem';
    END IF;
    IF NEW.redeemed_at IS NULL THEN
      NEW.redeemed_at := now();
    END IF;
  ELSE
    -- when status unchanged, redeemed_at is immutable
    IF NEW.redeemed_at IS DISTINCT FROM OLD.redeemed_at THEN
      RAISE EXCEPTION 'referrals: redeemed_at is immutable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS referrals_guard_update_trg ON public.referrals;
CREATE TRIGGER referrals_guard_update_trg
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.referrals_guard_update();

-- 3. Least-privilege on all SECURITY DEFINER functions in public.
--    Revoke default PUBLIC EXECUTE, then grant only to authenticated/service_role,
--    and re-grant anon on the small set of intentionally public functions.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prosecdef = true AND n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC', r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon', r.proname, r.args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated, service_role', r.proname, r.args);
  END LOOP;
END $$;

-- Re-grant anon EXECUTE only on intentionally public functions
DO $$
DECLARE
  fn text;
  anon_fns text[] := ARRAY[
    'get_public_dhikr_circle','get_public_dua','get_public_khatm_group',
    'get_public_profile','get_public_team_streak','get_public_weekly_recap',
    'get_transparency_appeals','get_transparency_report','get_trending_searches',
    'get_trending_video_ids','list_dua_wall','search_autocomplete',
    'search_reciters','search_videos','dua_ameens_bump','dua_anon_ameens_bump',
    'add_anon_ameen','is_khatm_member','is_owner','has_role','has_active_premium',
    'has_active_entitlement','reciter_is_accessible','is_in_cohort',
    'evaluate_feature_flag','assign_experiment_variant'
  ];
  r record;
BEGIN
  FOREACH fn IN ARRAY anon_fns LOOP
    FOR r IN
      SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.prosecdef = true AND n.nspname = 'public' AND p.proname = fn
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO anon', r.proname, r.args);
    END LOOP;
  END LOOP;
END $$;
