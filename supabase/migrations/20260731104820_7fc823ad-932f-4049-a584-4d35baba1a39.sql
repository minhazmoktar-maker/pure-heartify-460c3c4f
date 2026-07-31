-- =====================================================================
-- TRUST LAYER: append-only, hash-chained attestation ledger
-- Blueprint MVP-1/MVP-2: every surfaced video is a claim traceable to a
-- named reviewer chain, with a verifiable digest.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.attestations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seq bigserial NOT NULL,
  ledger_version text NOT NULL DEFAULT 'v1',
  subject_kind text NOT NULL DEFAULT 'video',
  video_id text NOT NULL,
  channel_id text,
  channel_title text,
  tier text NOT NULL,
  reviewer_chain text NOT NULL,
  issuer text NOT NULL DEFAULT 'heartify.moderation.v1',
  claims jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload text NOT NULL,
  digest text NOT NULL,
  prev_digest text,
  chain_digest text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  superseded_at timestamptz,
  revoked_at timestamptz,
  revocation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.attestations TO anon, authenticated;
GRANT ALL ON public.attestations TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.attestations_seq_seq TO service_role;

ALTER TABLE public.attestations ENABLE ROW LEVEL SECURITY;

-- Public verifiability: unrevoked records are world-readable. No client
-- write path exists at all (no INSERT/UPDATE/DELETE policy).
CREATE POLICY "Attestations are publicly verifiable"
  ON public.attestations FOR SELECT
  TO anon, authenticated
  USING (revoked_at IS NULL);

CREATE UNIQUE INDEX IF NOT EXISTS attestations_seq_key ON public.attestations (seq);
CREATE INDEX IF NOT EXISTS attestations_video_idx ON public.attestations (video_id, issued_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS attestations_current_video_idx
  ON public.attestations (video_id) WHERE superseded_at IS NULL AND revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS attestations_channel_idx ON public.attestations (channel_id);
CREATE INDEX IF NOT EXISTS attestations_digest_idx ON public.attestations (digest);

-- --------------------------------------------------------------
-- Append-only enforcement: history can never be rewritten.
-- Only lifecycle columns (superseded_at / revoked_at / reason /
-- updated_at) may change, and only forward from NULL.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attestations_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'attestations is append-only: deletes are not permitted';
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.seq IS DISTINCT FROM OLD.seq
     OR NEW.video_id IS DISTINCT FROM OLD.video_id
     OR NEW.payload IS DISTINCT FROM OLD.payload
     OR NEW.digest IS DISTINCT FROM OLD.digest
     OR NEW.prev_digest IS DISTINCT FROM OLD.prev_digest
     OR NEW.chain_digest IS DISTINCT FROM OLD.chain_digest
     OR NEW.claims IS DISTINCT FROM OLD.claims
     OR NEW.tier IS DISTINCT FROM OLD.tier
     OR NEW.reviewer_chain IS DISTINCT FROM OLD.reviewer_chain
     OR NEW.issuer IS DISTINCT FROM OLD.issuer
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at THEN
    RAISE EXCEPTION 'attestations is append-only: issue a superseding record instead';
  END IF;

  IF OLD.superseded_at IS NOT NULL AND NEW.superseded_at IS DISTINCT FROM OLD.superseded_at THEN
    RAISE EXCEPTION 'attestation supersede timestamp is immutable once set';
  END IF;
  IF OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at THEN
    RAISE EXCEPTION 'attestation revocation is immutable once set';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_attestations_append_only
  BEFORE UPDATE OR DELETE ON public.attestations
  FOR EACH ROW EXECUTE FUNCTION public.attestations_append_only();

-- --------------------------------------------------------------
-- Canonical payload + tier + reviewer chain derivation.
-- Pure function of the video row so staleness is detectable by
-- recomputing and comparing to the stored payload.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attestation_payload(_video_id text)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'video_id', v.video_id,
    'channel_id', v.channel_id,
    'channel_title', v.channel_title,
    'tier', CASE
      WHEN v.is_trusted_channel THEN 'A'
      WHEN COALESCE(v.moderation_confidence, 0) >= 0.9 THEN 'B'
      WHEN COALESCE(v.moderation_confidence, 0) >= 0.7 THEN 'C'
      ELSE 'D'
    END,
    'reviewer_chain', CASE
      WHEN v.is_trusted_channel THEN 'Heartify moderation · Trusted institution endorsement'
      ELSE 'Heartify moderation'
    END,
    'claims', jsonb_build_object(
      'moderation_state', v.moderation_state,
      'moderation_stage', v.moderation_stage,
      'confidence', v.moderation_confidence,
      'risk', v.moderation_risk,
      'provider', v.moderation_provider,
      'is_trusted_channel', COALESCE(v.is_trusted_channel, false),
      'content_language', v.content_language,
      'category', v.category,
      'visual_state', v.visual_state,
      'reviewed_at', COALESCE(v.moderation_updated_at, v.ingested_at)
    ),
    'canonical', concat_ws('|',
      'heartify.attestation.v1',
      v.video_id,
      COALESCE(v.channel_id, ''),
      v.moderation_state::text,
      COALESCE(v.moderation_stage::text, ''),
      COALESCE(v.moderation_provider, ''),
      COALESCE(v.moderation_confidence::text, ''),
      COALESCE(v.moderation_risk::text, ''),
      COALESCE(v.visual_state::text, ''),
      COALESCE(v.is_trusted_channel::text, 'false'),
      COALESCE(v.moderation_updated_at::text, v.ingested_at::text),
      CASE
        WHEN v.is_trusted_channel THEN 'A'
        WHEN COALESCE(v.moderation_confidence, 0) >= 0.9 THEN 'B'
        WHEN COALESCE(v.moderation_confidence, 0) >= 0.7 THEN 'C'
        ELSE 'D'
      END
    )
  )
  FROM public.curated_videos v
  WHERE v.video_id = _video_id
  LIMIT 1;
$$;

-- --------------------------------------------------------------
-- Issue (or re-issue) the current attestation for one video.
-- Hash-chained: each record commits to the previous chain head.
-- --------------------------------------------------------------
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

  SELECT * INTO existing
  FROM public.attestations
  WHERE video_id = _video_id AND superseded_at IS NULL AND revoked_at IS NULL
  LIMIT 1;

  -- Already current: nothing to do.
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
    _video_id,
    p->>'channel_id',
    p->>'channel_title',
    p->>'tier',
    p->>'reviewer_chain',
    p->'claims',
    canonical,
    dig,
    prev,
    chain
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.issue_video_attestation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_video_attestation(text) TO service_role;

-- --------------------------------------------------------------
-- Batch backfill: attest every surfaced video that is missing a
-- current attestation or whose stored payload is stale.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.backfill_video_attestations(_limit int DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r record;
  issued int := 0;
  scanned int := 0;
BEGIN
  FOR r IN
    SELECT v.video_id
    FROM public.curated_videos v
    LEFT JOIN public.attestations a
      ON a.video_id = v.video_id AND a.superseded_at IS NULL AND a.revoked_at IS NULL
    WHERE v.moderation_state IN ('approved', 'auto_approved')
      AND (
        a.id IS NULL
        OR a.payload IS DISTINCT FROM (public.attestation_payload(v.video_id)->>'canonical')
      )
    ORDER BY v.ingested_at DESC NULLS LAST
    LIMIT GREATEST(1, LEAST(_limit, 5000))
  LOOP
    scanned := scanned + 1;
    IF public.issue_video_attestation(r.video_id) IS NOT NULL THEN
      issued := issued + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('scanned', scanned, 'issued', issued, 'at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.backfill_video_attestations(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_video_attestations(int) TO service_role;

-- --------------------------------------------------------------
-- Coverage telemetry (admin dashboard + MVP-2 acceptance metric).
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.attestation_coverage()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH surfaced AS (
    SELECT video_id FROM public.curated_videos
    WHERE moderation_state IN ('approved', 'auto_approved')
  ),
  cur AS (
    SELECT a.video_id, a.tier, a.payload
    FROM public.attestations a
    WHERE a.superseded_at IS NULL AND a.revoked_at IS NULL
  )
  SELECT jsonb_build_object(
    'surfaced_total', (SELECT count(*) FROM surfaced),
    'attested_total', (SELECT count(*) FROM surfaced s JOIN cur c ON c.video_id = s.video_id),
    'ledger_records', (SELECT count(*) FROM public.attestations),
    'revoked', (SELECT count(*) FROM public.attestations WHERE revoked_at IS NOT NULL),
    'chain_head', (SELECT chain_digest FROM public.attestations ORDER BY seq DESC LIMIT 1),
    'by_tier', COALESCE((
      SELECT jsonb_object_agg(tier, n) FROM (
        SELECT c.tier, count(*) n FROM surfaced s JOIN cur c ON c.video_id = s.video_id
        GROUP BY c.tier
      ) t
    ), '{}'::jsonb),
    'computed_at', now()
  );
$$;

REVOKE ALL ON FUNCTION public.attestation_coverage() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attestation_coverage() TO authenticated, service_role;

-- --------------------------------------------------------------
-- Public verification: ledger-backed, with derived fallback.
-- --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_public_attestation(_video_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v curated_videos%ROWTYPE;
  a public.attestations;
  p jsonb;
  decision_count int := 0;
  latest_decision jsonb := NULL;
  timeline jsonb := '[]'::jsonb;
  tier text;
  reviewer_chain text;
  recomputed text;
  ledger jsonb := NULL;
BEGIN
  SELECT * INTO v FROM public.curated_videos WHERE video_id = _video_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'video_id', _video_id);
  END IF;

  p := public.attestation_payload(_video_id);
  tier := p->>'tier';
  reviewer_chain := p->>'reviewer_chain';
  recomputed := encode(extensions.digest(p->>'canonical', 'sha256'), 'hex');

  SELECT * INTO a FROM public.attestations
  WHERE video_id = _video_id AND superseded_at IS NULL AND revoked_at IS NULL
  LIMIT 1;

  SELECT count(*) INTO decision_count FROM public.moderation_decisions WHERE video_id = _video_id;
  IF decision_count > 0 THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'stage', stage, 'state', state, 'confidence', confidence, 'risk', risk,
        'provider', provider, 'actor_kind', actor_kind, 'reasoning', reasoning,
        'rule_hits', rule_hits, 'created_at', created_at
      ) ORDER BY created_at ASC
    ) INTO timeline
    FROM public.moderation_decisions WHERE video_id = _video_id;

    SELECT jsonb_build_object(
      'stage', stage, 'state', state, 'confidence', confidence,
      'provider', provider, 'actor_kind', actor_kind, 'created_at', created_at
    ) INTO latest_decision
    FROM public.moderation_decisions WHERE video_id = _video_id
    ORDER BY created_at DESC LIMIT 1;
  END IF;

  IF a.id IS NOT NULL THEN
    ledger := jsonb_build_object(
      'record_id', a.id,
      'sequence', a.seq,
      'ledger_version', a.ledger_version,
      'issuer', a.issuer,
      'issued_at', a.issued_at,
      'digest', a.digest,
      'prev_digest', a.prev_digest,
      'chain_digest', a.chain_digest,
      'claims', a.claims,
      'verified', (a.digest = recomputed),
      'stale', (a.digest <> recomputed)
    );
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'video_id', v.video_id,
    'title', v.title,
    'channel_id', v.channel_id,
    'channel_title', v.channel_title,
    'thumbnail_url', v.thumbnail_url,
    'category', v.category,
    'content_language', v.content_language,
    'is_trusted_channel', v.is_trusted_channel,
    'moderation', jsonb_build_object(
      'state', v.moderation_state,
      'stage', v.moderation_stage,
      'confidence', v.moderation_confidence,
      'risk', v.moderation_risk,
      'provider', v.moderation_provider,
      'updated_at', COALESCE(v.moderation_updated_at, v.ingested_at)
    ),
    'tier', tier,
    'reviewer_chain', reviewer_chain,
    'decision_count', decision_count,
    'latest_decision', latest_decision,
    'timeline', timeline,
    'ledger', ledger,
    'attestation', jsonb_build_object(
      'algorithm', 'sha256',
      'digest', recomputed,
      'canonical_form', 'heartify.attestation.v1',
      'issued_at', COALESCE(a.issued_at, now()),
      'issuer', COALESCE(a.issuer, 'heartify.moderation.v1'),
      'ledger_backed', (a.id IS NOT NULL)
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_attestation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_attestation(text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.attestation_payload(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.attestation_payload(text) TO service_role;

-- Keep coverage topped up without blocking ingestion writes.
SELECT cron.schedule(
  'attestation-backfill-10min',
  '*/10 * * * *',
  $cron$ SELECT public.backfill_video_attestations(2000); $cron$
);