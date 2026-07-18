
CREATE TABLE public.admin_review_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  purpose text NOT NULL DEFAULT 'channel_pipeline',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  uses integer NOT NULL DEFAULT 0,
  last_used_at timestamptz,
  last_used_ip text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_review_tokens TO authenticated;
GRANT ALL ON public.admin_review_tokens TO service_role;

ALTER TABLE public.admin_review_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage review tokens"
ON public.admin_review_tokens
FOR ALL TO authenticated
USING (public.is_owner(auth.uid()))
WITH CHECK (public.is_owner(auth.uid()));

CREATE INDEX admin_review_tokens_active_idx
  ON public.admin_review_tokens (expires_at)
  WHERE revoked_at IS NULL;

-- Owner-only mint (SECURITY DEFINER so caller doesn't need service role;
-- bypasses AAL2 by design — owner check is the sole gate).
CREATE OR REPLACE FUNCTION public.mint_admin_review_token(
  _purpose text DEFAULT 'channel_pipeline',
  _ttl_hours integer DEFAULT 720
)
RETURNS TABLE (id uuid, token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  raw text;
  hashed text;
  new_id uuid;
  exp timestamptz;
BEGIN
  IF NOT public.is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  raw := encode(extensions.gen_random_bytes(32), 'hex');
  hashed := encode(extensions.digest(raw, 'sha256'), 'hex');
  exp := now() + make_interval(hours => GREATEST(1, LEAST(_ttl_hours, 24*90)));

  INSERT INTO public.admin_review_tokens (token_hash, purpose, created_by, expires_at)
  VALUES (hashed, COALESCE(_purpose, 'channel_pipeline'), auth.uid(), exp)
  RETURNING admin_review_tokens.id INTO new_id;

  RETURN QUERY SELECT new_id, raw, exp;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mint_admin_review_token(text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mint_admin_review_token(text, integer) TO authenticated;

-- Service-role helper the edge function uses to validate a token.
CREATE OR REPLACE FUNCTION public.verify_admin_review_token(_token text)
RETURNS TABLE (id uuid, purpose text, created_by uuid, expires_at timestamptz)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.purpose, t.created_by, t.expires_at
  FROM public.admin_review_tokens t
  WHERE t.token_hash = encode(extensions.digest(_token, 'sha256'), 'hex')
    AND t.revoked_at IS NULL
    AND t.expires_at > now()
  LIMIT 1;
$$;
REVOKE EXECUTE ON FUNCTION public.verify_admin_review_token(text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_admin_review_token(text) TO service_role;

CREATE OR REPLACE FUNCTION public.log_admin_review_use(_id uuid, _ip text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.admin_review_tokens
  SET uses = uses + 1, last_used_at = now(), last_used_ip = _ip
  WHERE id = _id;
$$;
REVOKE EXECUTE ON FUNCTION public.log_admin_review_use(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_admin_review_use(uuid, text) TO service_role;
