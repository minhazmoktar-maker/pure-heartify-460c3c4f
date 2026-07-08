
-- Ensure one entitlement row per user
CREATE UNIQUE INDEX IF NOT EXISTS entitlements_user_id_unique ON public.entitlements(user_id);

-- Grants (RLS still enforced)
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL ON public.entitlements TO service_role;

-- updated_at trigger
DROP TRIGGER IF EXISTS trg_entitlements_updated_at ON public.entitlements;
CREATE TRIGGER trg_entitlements_updated_at
BEFORE UPDATE ON public.entitlements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Admin/owner management policies
DROP POLICY IF EXISTS "Admins manage entitlements" ON public.entitlements;
CREATE POLICY "Admins manage entitlements" ON public.entitlements
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid()));

-- Server-side premium check (used by RLS, RPCs, and edge functions)
CREATE OR REPLACE FUNCTION public.has_active_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.entitlements
    WHERE user_id = _user_id
      AND plan <> 'free'
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid) TO authenticated, anon, service_role;

-- Admin grant / revoke with audit trail into privileged_actions_log
CREATE OR REPLACE FUNCTION public.grant_entitlement(
  _user_id uuid,
  _plan text DEFAULT 'premium',
  _expires_at timestamptz DEFAULT NULL,
  _features jsonb DEFAULT '{}'::jsonb,
  _reason text DEFAULT NULL
)
RETURNS public.entitlements
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row public.entitlements;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid())) THEN
    RAISE EXCEPTION 'grant_entitlement: forbidden';
  END IF;
  IF _plan IS NULL OR btrim(_plan) = '' THEN
    RAISE EXCEPTION 'grant_entitlement: plan required';
  END IF;

  INSERT INTO public.entitlements (user_id, plan, features, expires_at)
  VALUES (_user_id, _plan, COALESCE(_features, '{}'::jsonb), _expires_at)
  ON CONFLICT (user_id) DO UPDATE
    SET plan       = EXCLUDED.plan,
        features   = EXCLUDED.features,
        expires_at = EXCLUDED.expires_at,
        updated_at = now()
  RETURNING * INTO row;

  INSERT INTO public.privileged_actions_log (actor_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'entitlement.grant',
    'user',
    _user_id::text,
    jsonb_build_object('plan', _plan, 'expires_at', _expires_at, 'reason', _reason)
  );

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_entitlement(uuid, text, timestamptz, jsonb, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.revoke_entitlement(
  _user_id uuid,
  _reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_owner(auth.uid())) THEN
    RAISE EXCEPTION 'revoke_entitlement: forbidden';
  END IF;

  UPDATE public.entitlements
     SET plan = 'free', expires_at = now(), updated_at = now()
   WHERE user_id = _user_id;

  INSERT INTO public.privileged_actions_log (actor_id, action, target_type, target_id, metadata)
  VALUES (
    auth.uid(),
    'entitlement.revoke',
    'user',
    _user_id::text,
    jsonb_build_object('reason', _reason)
  );

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.revoke_entitlement(uuid, text) TO authenticated;
