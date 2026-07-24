
-- Wave M1: Trust Spine — public per-video attestation RPC.
-- Returns a verifiable JSON attestation derived from curated_videos and moderation_decisions.
-- SECURITY DEFINER: safe because it only exposes already-public, aggregated moderation facts
-- (no reviewer identities, no user data). Digest is a sha256 over stable fields so anyone
-- fetching the RPC can independently compare it to the stored one.

CREATE OR REPLACE FUNCTION public.get_public_attestation(_video_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v curated_videos%ROWTYPE;
  decision_count int := 0;
  latest_decision jsonb := NULL;
  timeline jsonb := '[]'::jsonb;
  tier text;
  reviewer_chain text;
  payload text;
  digest_hex text;
BEGIN
  SELECT * INTO v FROM public.curated_videos WHERE video_id = _video_id LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false, 'video_id', _video_id);
  END IF;

  -- Timeline of moderation decisions (public-safe fields only).
  SELECT count(*) INTO decision_count FROM public.moderation_decisions WHERE video_id = _video_id;
  IF decision_count > 0 THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'stage', stage,
        'state', state,
        'confidence', confidence,
        'risk', risk,
        'provider', provider,
        'actor_kind', actor_kind,
        'reasoning', reasoning,
        'rule_hits', rule_hits,
        'created_at', created_at
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

  tier := CASE
    WHEN v.is_trusted_channel THEN 'A'
    WHEN COALESCE(v.moderation_confidence, 0) >= 0.9 THEN 'B'
    WHEN COALESCE(v.moderation_confidence, 0) >= 0.7 THEN 'C'
    ELSE 'D'
  END;

  reviewer_chain := CASE
    WHEN v.is_trusted_channel THEN 'Heartify moderation · Trusted institution endorsement'
    ELSE 'Heartify moderation'
  END;

  -- Deterministic public digest over stable fields (sha256).
  payload := concat_ws('|',
    v.video_id,
    v.channel_id,
    v.moderation_state::text,
    COALESCE(v.moderation_provider,''),
    COALESCE(v.moderation_confidence::text,''),
    COALESCE(v.moderation_updated_at::text, v.ingested_at::text),
    tier
  );
  digest_hex := encode(extensions.digest(payload, 'sha256'), 'hex');

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
    'attestation', jsonb_build_object(
      'algorithm', 'sha256',
      'digest', digest_hex,
      'issued_at', now(),
      'issuer', 'heartify.moderation.v1'
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_attestation(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_attestation(text) TO anon, authenticated, service_role;
