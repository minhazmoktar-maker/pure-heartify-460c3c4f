
-- Gift codes for redemption
CREATE TABLE IF NOT EXISTS public.gift_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  months integer NOT NULL DEFAULT 1 CHECK (months BETWEEN 1 AND 60),
  issued_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  expires_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS gift_codes_code_idx ON public.gift_codes (upper(code));
CREATE INDEX IF NOT EXISTS gift_codes_redeemed_by_idx ON public.gift_codes (redeemed_by);

GRANT SELECT ON public.gift_codes TO authenticated;
GRANT ALL ON public.gift_codes TO service_role;

ALTER TABLE public.gift_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_redeemed_codes_read" ON public.gift_codes;
CREATE POLICY "own_redeemed_codes_read" ON public.gift_codes
  FOR SELECT TO authenticated
  USING (redeemed_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Server-side redemption: atomically marks the code and grants entitlement months.
CREATE OR REPLACE FUNCTION public.redeem_gift_code(p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_row public.gift_codes%ROWTYPE;
  v_new_expires timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;
  IF p_code IS NULL OR length(btrim(p_code)) < 4 THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  SELECT * INTO v_row FROM public.gift_codes
    WHERE upper(code) = upper(btrim(p_code))
    FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_row.redeemed_by IS NOT NULL THEN RAISE EXCEPTION 'already_redeemed'; END IF;
  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RAISE EXCEPTION 'expired';
  END IF;

  UPDATE public.gift_codes
    SET redeemed_by = v_uid, redeemed_at = now()
    WHERE id = v_row.id;

  v_new_expires := now() + make_interval(months => v_row.months);

  INSERT INTO public.entitlements (user_id, kind, status, expires_at)
  VALUES (v_uid, 'plus', 'active', v_new_expires)
  ON CONFLICT (user_id, kind) DO UPDATE
    SET status = 'active',
        expires_at = GREATEST(
          COALESCE(public.entitlements.expires_at, now()),
          now()
        ) + make_interval(months => v_row.months);

  RETURN jsonb_build_object('ok', true, 'months', v_row.months);
END;
$$;

REVOKE ALL ON FUNCTION public.redeem_gift_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.redeem_gift_code(text) TO authenticated;
