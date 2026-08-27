-- A referral row must always start unearned: the inviter may only create the
-- invite itself, never a row that already looks completed/redeemed. Status
-- transitions and invitee binding stay server-side (security definer RPCs /
-- service role), so reward logic can't be triggered by a forged insert.
DROP POLICY IF EXISTS "Inviter can create own referral" ON public.referrals;

CREATE POLICY "Inviter can create own pending referral"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = inviter_id
  AND status = 'pending'
  AND invitee_id IS NULL
  AND redeemed_at IS NULL
);