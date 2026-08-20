-- 1) channel_follows: remove the dead/incorrect owner_key comparison.
-- approved_channels.owner_key is a normalized channel-name key (see
-- compute_owner_key), NOT a stringified user uuid, so comparing it to
-- auth.uid()::text can never be a correct ownership test.
DROP POLICY IF EXISTS "Follows readable to self and channel owner" ON public.channel_follows;
CREATE POLICY "Follows readable to self and admins"
ON public.channel_follows
FOR SELECT
TO authenticated
USING (
  auth.uid() = follower_id
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 2) attestations: keep the ledger publicly verifiable (digest chain) but stop
-- exposing the internal moderation signals payload directly. Per-video public
-- verification continues through get_public_attestation().
REVOKE SELECT ON public.attestations FROM anon, authenticated;
GRANT SELECT (
  id, seq, ledger_version, subject_kind, video_id, channel_id, channel_title,
  tier, reviewer_chain, issuer, digest, prev_digest, chain_digest,
  issued_at, superseded_at, revoked_at, revocation_reason, created_at, updated_at
) ON public.attestations TO anon, authenticated;
GRANT ALL ON public.attestations TO service_role;