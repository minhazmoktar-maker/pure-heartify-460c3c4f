CREATE OR REPLACE FUNCTION public.issue_video_attestation(_video_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  p jsonb;
  canonical text;
  dig text;
  prev text;
  chain text;
  existing public.attestations;
  new_id uuid;
BEGIN
  p := public.attestation_payload(_video_id);
  IF p IS NULL THEN
    RETURN NULL;
  END IF;

  canonical := p->>'canonical';
  dig := encode(extensions.digest(canonical, 'sha256'), 'hex');

  -- Per-video lock: concurrent backfills (cron + manual) can never race to
  -- create two current records for the same subject.
  PERFORM pg_advisory_xact_lock(hashtext('heartify.attestation.video'), hashtext(_video_id));

  SELECT * INTO existing
  FROM public.attestations
  WHERE video_id = _video_id AND superseded_at IS NULL AND revoked_at IS NULL
  LIMIT 1;

  IF existing.id IS NOT NULL AND existing.digest = dig THEN
    RETURN existing.id;
  END IF;

  -- Serialize chain head reads/writes.
  PERFORM pg_advisory_xact_lock(hashtext('heartify.attestation.chain'));

  SELECT chain_digest INTO prev
  FROM public.attestations
  ORDER BY seq DESC
  LIMIT 1;

  chain := encode(extensions.digest(concat_ws('|', COALESCE(prev, 'genesis'), dig), 'sha256'), 'hex');

  IF existing.id IS NOT NULL THEN
    UPDATE public.attestations SET superseded_at = now() WHERE id = existing.id;
  END IF;

  INSERT INTO public.attestations (
    video_id, channel_id, channel_title, tier, reviewer_chain,
    claims, payload, digest, prev_digest, chain_digest
  ) VALUES (
    _video_id, p->>'channel_id', p->>'channel_title', p->>'tier', p->>'reviewer_chain',
    p->'claims', canonical, dig, prev, chain
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_video_attestation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_video_attestation(text) TO service_role;