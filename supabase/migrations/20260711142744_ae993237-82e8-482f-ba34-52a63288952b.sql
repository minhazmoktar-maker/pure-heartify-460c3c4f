
-- Fix: has_active_entitlement must exclude 'free' plan (premium bypass)
CREATE OR REPLACE FUNCTION public.has_active_entitlement(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.entitlements e
    WHERE e.user_id = _user_id
      AND COALESCE(e.plan, 'free') <> 'free'
      AND (e.expires_at IS NULL OR e.expires_at > now())
      AND (
        (to_jsonb(e) ? 'status'    AND (to_jsonb(e)->>'status')    IN ('active','trialing','grace')) OR
        (to_jsonb(e) ? 'is_active' AND (to_jsonb(e)->>'is_active')::boolean = true) OR
        (NOT (to_jsonb(e) ? 'status') AND NOT (to_jsonb(e) ? 'is_active'))
      )
  )
$$;

-- Country code on profiles (unblocks geo features)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country_code text,
  ADD COLUMN IF NOT EXISTS timezone text;

-- Loose validation (ISO-3166-1 alpha-2, uppercase, 2 chars) via trigger (not CHECK, per rules)
CREATE OR REPLACE FUNCTION public.validate_profile_locale_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.country_code IS NOT NULL THEN
    NEW.country_code := upper(NEW.country_code);
    IF NEW.country_code !~ '^[A-Z]{2}$' THEN
      RAISE EXCEPTION 'country_code must be ISO-3166-1 alpha-2 (2 letters)';
    END IF;
  END IF;
  IF NEW.timezone IS NOT NULL AND length(NEW.timezone) > 64 THEN
    RAISE EXCEPTION 'timezone too long';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_profile_locale ON public.profiles;
CREATE TRIGGER trg_validate_profile_locale
BEFORE INSERT OR UPDATE OF country_code, timezone ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_locale_fields();
