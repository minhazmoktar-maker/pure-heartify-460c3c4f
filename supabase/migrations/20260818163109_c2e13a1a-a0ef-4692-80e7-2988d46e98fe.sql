-- ============ 1. Transcript pipeline: missing grants (segments never persisted) ============
GRANT SELECT ON public.video_transcripts TO anon, authenticated;
GRANT ALL ON public.video_transcripts TO service_role;
GRANT SELECT ON public.transcript_segments TO anon, authenticated;
GRANT ALL ON public.transcript_segments TO service_role;
GRANT ALL ON public.transcript_jobs TO service_role;

CREATE OR REPLACE FUNCTION public.requeue_stale_transcript_jobs(_minutes integer DEFAULT 20)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE n integer;
BEGIN
  UPDATE public.transcript_jobs
     SET status = 'queued',
         next_attempt_at = now(),
         updated_at = now()
   WHERE status = 'running'
     AND updated_at < now() - make_interval(mins => GREATEST(1, _minutes));
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

-- ============ 2. Institutional co-signed attestations ============
CREATE TABLE IF NOT EXISTS public.signing_institutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  org_type text,
  country text,
  website text,
  logo_url text,
  contact_email text,
  public_statement text,
  status text NOT NULL DEFAULT 'pending',
  key_hash text,
  key_prefix text,
  key_issued_at timestamptz,
  cosign_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.signing_institutions TO service_role;
ALTER TABLE public.signing_institutions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "institutions admin manage" ON public.signing_institutions;
CREATE POLICY "institutions admin manage" ON public.signing_institutions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE IF NOT EXISTS public.attestation_cosignatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id uuid NOT NULL REFERENCES public.signing_institutions(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  attestation_id uuid REFERENCES public.attestations(id) ON DELETE SET NULL,
  chain_digest text NOT NULL,
  algorithm text NOT NULL DEFAULT 'hmac-sha256',
  signature text NOT NULL,
  statement text,
  signed_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  revoke_reason text,
  UNIQUE (institution_id, video_id)
);
CREATE INDEX IF NOT EXISTS attestation_cosign_video_idx ON public.attestation_cosignatures (video_id) WHERE revoked_at IS NULL;
GRANT ALL ON public.attestation_cosignatures TO service_role;
GRANT SELECT ON public.attestation_cosignatures TO anon, authenticated;
ALTER TABLE public.attestation_cosignatures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cosignatures public read" ON public.attestation_cosignatures;
CREATE POLICY "cosignatures public read" ON public.attestation_cosignatures
  FOR SELECT TO anon, authenticated
  USING (revoked_at IS NULL);
DROP POLICY IF EXISTS "cosignatures admin manage" ON public.attestation_cosignatures;
CREATE POLICY "cosignatures admin manage" ON public.attestation_cosignatures
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin: register a partner institution and mint its signing key (returned once).
CREATE OR REPLACE FUNCTION public.admin_register_institution(
  _slug text, _name text, _org_type text DEFAULT NULL, _country text DEFAULT NULL,
  _website text DEFAULT NULL, _logo_url text DEFAULT NULL, _contact_email text DEFAULT NULL,
  _public_statement text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE _key text; _id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin role required'; END IF;
  IF _slug IS NULL OR length(btrim(_slug)) < 2 THEN RAISE EXCEPTION 'slug required'; END IF;
  _key := 'hfi_' || encode(extensions.gen_random_bytes(24), 'hex');

  INSERT INTO public.signing_institutions
    (slug, name, org_type, country, website, logo_url, contact_email, public_statement,
     status, key_hash, key_prefix, key_issued_at, created_by)
  VALUES (lower(btrim(_slug)), _name, _org_type, _country, _website, _logo_url, _contact_email,
          _public_statement, 'active',
          encode(extensions.digest(_key, 'sha256'), 'hex'), left(_key, 12), now(), auth.uid())
  ON CONFLICT (slug) DO UPDATE
    SET name = EXCLUDED.name, org_type = EXCLUDED.org_type, country = EXCLUDED.country,
        website = EXCLUDED.website, logo_url = EXCLUDED.logo_url,
        contact_email = EXCLUDED.contact_email, public_statement = EXCLUDED.public_statement,
        status = 'active', key_hash = EXCLUDED.key_hash, key_prefix = EXCLUDED.key_prefix,
        key_issued_at = now(), updated_at = now()
  RETURNING id INTO _id;

  RETURN jsonb_build_object('id', _id, 'slug', lower(btrim(_slug)), 'api_key', _key,
                            'note', 'Store this key now — it is never shown again.');
END;
$$;
REVOKE ALL ON FUNCTION public.admin_register_institution(text,text,text,text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_register_institution(text,text,text,text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_institution_status(_slug text, _status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'admin role required'; END IF;
  IF _status NOT IN ('pending','active','suspended') THEN RAISE EXCEPTION 'bad status'; END IF;
  UPDATE public.signing_institutions SET status = _status, updated_at = now() WHERE slug = lower(_slug);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_institution_status(text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_institution_status(text,text) TO authenticated;

-- Institution-facing: co-sign a video's attestation with the institution's key.
CREATE OR REPLACE FUNCTION public.institution_cosign(
  _slug text, _api_key text, _video_id text, _statement text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE inst public.signing_institutions; att public.attestations; sig text;
BEGIN
  IF _api_key IS NULL OR length(_api_key) < 24 THEN RAISE EXCEPTION 'invalid key'; END IF;

  SELECT * INTO inst FROM public.signing_institutions
   WHERE slug = lower(btrim(coalesce(_slug,''))) AND status = 'active' LIMIT 1;
  IF inst.id IS NULL OR inst.key_hash IS NULL
     OR inst.key_hash <> encode(extensions.digest(_api_key, 'sha256'), 'hex') THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  SELECT * INTO att FROM public.attestations
   WHERE video_id = _video_id AND superseded_at IS NULL AND revoked_at IS NULL LIMIT 1;
  IF att.id IS NULL THEN RAISE EXCEPTION 'no active attestation for %', _video_id; END IF;

  sig := encode(extensions.hmac(att.chain_digest, _api_key, 'sha256'), 'hex');

  INSERT INTO public.attestation_cosignatures
    (institution_id, video_id, attestation_id, chain_digest, signature, statement)
  VALUES (inst.id, _video_id, att.id, att.chain_digest, sig, left(coalesce(_statement,''), 400))
  ON CONFLICT (institution_id, video_id) DO UPDATE
    SET attestation_id = EXCLUDED.attestation_id, chain_digest = EXCLUDED.chain_digest,
        signature = EXCLUDED.signature, statement = EXCLUDED.statement,
        signed_at = now(), revoked_at = NULL, revoke_reason = NULL;

  UPDATE public.signing_institutions
     SET cosign_count = (SELECT count(*) FROM public.attestation_cosignatures c
                          WHERE c.institution_id = inst.id AND c.revoked_at IS NULL),
         updated_at = now()
   WHERE id = inst.id;

  RETURN jsonb_build_object('ok', true, 'institution', inst.name, 'video_id', _video_id,
                            'algorithm', 'hmac-sha256', 'signature', sig,
                            'chain_digest', att.chain_digest);
END;
$$;
REVOKE ALL ON FUNCTION public.institution_cosign(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.institution_cosign(text,text,text,text) TO anon, authenticated, service_role;

-- Public directory of co-signing partners (no secrets).
CREATE OR REPLACE FUNCTION public.list_cosigning_institutions()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'slug', slug, 'name', name, 'org_type', org_type, 'country', country,
    'website', website, 'logo_url', logo_url, 'statement', public_statement,
    'cosigned', cosign_count, 'since', key_issued_at
  ) ORDER BY cosign_count DESC, name), '[]'::jsonb)
  FROM public.signing_institutions WHERE status = 'active';
$$;
GRANT EXECUTE ON FUNCTION public.list_cosigning_institutions() TO anon, authenticated;

-- Public per-video co-signature list, with signature verification against the ledger.
CREATE OR REPLACE FUNCTION public.get_video_cosignatures(_video_id text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'institution', i.name, 'slug', i.slug, 'org_type', i.org_type, 'country', i.country,
    'website', i.website, 'logo_url', i.logo_url, 'statement', c.statement,
    'algorithm', c.algorithm, 'signature', c.signature, 'chain_digest', c.chain_digest,
    'signed_at', c.signed_at,
    'binds_current_ledger', EXISTS (
      SELECT 1 FROM public.attestations a
       WHERE a.video_id = c.video_id AND a.superseded_at IS NULL AND a.revoked_at IS NULL
         AND a.chain_digest = c.chain_digest)
  ) ORDER BY c.signed_at), '[]'::jsonb)
  FROM public.attestation_cosignatures c
  JOIN public.signing_institutions i ON i.id = c.institution_id
  WHERE c.video_id = _video_id AND c.revoked_at IS NULL AND i.status = 'active';
$$;
GRANT EXECUTE ON FUNCTION public.get_video_cosignatures(text) TO anon, authenticated;

-- ============ 3. Benefit ranker auto-ramp (10 -> 50 -> 100) ============
CREATE OR REPLACE FUNCTION public.benefit_arm_stats(_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH exposure AS (
    SELECT user_id,
           MAX(CASE WHEN trace->>'benefit_arm' = 'treatment' THEN 1 ELSE 0 END) AS treated
    FROM public.feed_diversity_metrics
    WHERE user_id IS NOT NULL
      AND created_at > now() - make_interval(days => GREATEST(1, _days))
      AND trace ? 'benefit_arm'
    GROUP BY user_id
  ),
  arms AS (SELECT CASE WHEN treated = 1 THEN 'treatment' ELSE 'control' END AS arm, user_id FROM exposure),
  labels AS (
    SELECT a.arm,
           COUNT(b.id) FILTER (WHERE b.responded_at IS NOT NULL) AS answered,
           COUNT(b.id) AS scheduled,
           COUNT(b.id) FILTER (WHERE b.worth_it IN ('yes','clearly_yes')) AS worth_it
    FROM arms a
    LEFT JOIN public.benefit_labels b
      ON b.user_id = a.user_id AND b.created_at > now() - make_interval(days => GREATEST(1, _days))
    GROUP BY a.arm
  )
  SELECT COALESCE(jsonb_object_agg(arm, jsonb_build_object(
    'scheduled', scheduled, 'answered', answered, 'worth_it', worth_it,
    'worth_it_rate', CASE WHEN answered > 0 THEN round(worth_it::numeric / answered, 4) ELSE NULL END,
    'response_rate', CASE WHEN scheduled > 0 THEN round(answered::numeric / scheduled, 4) ELSE 0 END
  )), '{}'::jsonb) FROM labels;
$$;
REVOKE ALL ON FUNCTION public.benefit_arm_stats(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.benefit_arm_stats(integer) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.benefit_ranker_autoramp(_min_answered integer DEFAULT 25)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s jsonb; t_ans int; c_ans int; t_rate numeric; c_rate numeric;
  cur int; nxt int; action text := 'hold'; reason text;
BEGIN
  SELECT rollout_percent INTO cur FROM public.feature_flags WHERE key = 'feed.benefit_ranked';
  IF cur IS NULL THEN RETURN jsonb_build_object('action','skip','reason','flag_missing'); END IF;

  s := public.benefit_arm_stats(30);
  t_ans := COALESCE((s->'treatment'->>'answered')::int, 0);
  c_ans := COALESCE((s->'control'->>'answered')::int, 0);
  t_rate := (s->'treatment'->>'worth_it_rate')::numeric;
  c_rate := (s->'control'->>'worth_it_rate')::numeric;

  IF t_ans < _min_answered OR c_ans < _min_answered THEN
    reason := 'insufficient_labels';
  ELSIF t_rate IS NULL OR c_rate IS NULL THEN
    reason := 'no_rates';
  ELSIF t_rate < c_rate - 0.05 THEN
    action := 'rollback'; nxt := 10; reason := 'treatment_worse';
  ELSIF t_rate >= c_rate THEN
    nxt := CASE WHEN cur < 50 THEN 50 WHEN cur < 100 THEN 100 ELSE 100 END;
    IF nxt > cur THEN action := 'ramp'; reason := 'treatment_ge_control';
    ELSE reason := 'already_full'; END IF;
  ELSE
    reason := 'treatment_below_control';
  END IF;

  IF action IN ('ramp','rollback') AND nxt IS DISTINCT FROM cur THEN
    UPDATE public.feature_flags
       SET rollout_percent = nxt, updated_at = now()
     WHERE key = 'feed.benefit_ranked';
  END IF;

  INSERT INTO public.autonomy_log (action, detail)
  VALUES ('benefit_autoramp',
          jsonb_build_object('action', action, 'reason', reason, 'from', cur, 'to', COALESCE(nxt, cur), 'stats', s));

  RETURN jsonb_build_object('action', action, 'reason', reason, 'from', cur, 'to', COALESCE(nxt, cur), 'stats', s);
END;
$$;
REVOKE ALL ON FUNCTION public.benefit_ranker_autoramp(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.benefit_ranker_autoramp(integer) TO authenticated, service_role;