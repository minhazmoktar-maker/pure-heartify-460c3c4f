
-- Tighten khatm_juz_claims update: require current group membership
DROP POLICY IF EXISTS kjc_self_update ON public.khatm_juz_claims;
CREATE POLICY kjc_self_update ON public.khatm_juz_claims
  FOR UPDATE
  USING (user_id = auth.uid() AND public.is_khatm_member(group_id, auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.is_khatm_member(group_id, auth.uid()));

-- Tighten referrals update: add WITH CHECK and prevent tampering with identifiers
DROP POLICY IF EXISTS "Invitee can redeem" ON public.referrals;
CREATE POLICY "Invitee can redeem" ON public.referrals
  FOR UPDATE
  USING (auth.uid() = invitee_id OR auth.uid() = inviter_id)
  WITH CHECK (
    auth.uid() = invitee_id OR auth.uid() = inviter_id
  );

-- Prevent changing immutable columns on referrals
CREATE OR REPLACE FUNCTION public.referrals_prevent_key_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.inviter_id IS DISTINCT FROM OLD.inviter_id
     OR NEW.invitee_id IS DISTINCT FROM OLD.invitee_id
     OR NEW.code IS DISTINCT FROM OLD.code THEN
    RAISE EXCEPTION 'referrals: inviter_id, invitee_id, and code are immutable';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS referrals_prevent_key_change_trg ON public.referrals;
CREATE TRIGGER referrals_prevent_key_change_trg
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.referrals_prevent_key_change();
