-- RLS policies on publicly readable tables (reciter_audio_sources, playlists,
-- playlist_items, regional_language_mix, curated_videos) call these helpers.
-- Anonymous visitors had no EXECUTE privilege, so every such policy failed with
-- "permission denied for function" and the whole query was rejected — the Listen
-- library, public playlists and deep-linked watch pages were unreadable while
-- signed out.
--
-- Granting anon EXECUTE alone would let an anonymous caller probe an arbitrary
-- user id as a boolean oracle, so each helper now hard-returns false whenever
-- the request's JWT role is `anon` and a user id is supplied. Anonymous callers
-- always evaluate to "no role / no entitlement", which is the correct answer,
-- while authenticated users, definer callers and service_role keep full
-- behaviour (their JWT role is never `anon`).

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _user_id IS NOT NULL
     AND NULLIF(current_setting('request.jwt.claim.role', true), '') = 'anon'
    THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.is_owner(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _user_id IS NOT NULL
     AND NULLIF(current_setting('request.jwt.claim.role', true), '') = 'anon'
    THEN false
    ELSE EXISTS (SELECT 1 FROM public.platform_owners WHERE user_id = _user_id)
  END
$$;

CREATE OR REPLACE FUNCTION public.has_active_premium(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _user_id IS NOT NULL
     AND NULLIF(current_setting('request.jwt.claim.role', true), '') = 'anon'
    THEN false
    ELSE EXISTS (
      SELECT 1 FROM public.entitlements
      WHERE user_id = _user_id
        AND plan <> 'free'
        AND (expires_at IS NULL OR expires_at > now())
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.has_active_entitlement(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE
    WHEN _user_id IS NOT NULL
     AND NULLIF(current_setting('request.jwt.claim.role', true), '') = 'anon'
    THEN false
    ELSE EXISTS (
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
  END
$$;

CREATE OR REPLACE FUNCTION public.has_min_role(_user_id uuid, _min_tier text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  effective_rank INT := 0;
  required_rank INT;
  tier TEXT := lower(coalesce(_min_tier, ''));
BEGIN
  required_rank := CASE tier
    WHEN 'anon'      THEN 0
    WHEN 'owner'     THEN 4
    WHEN 'admin'     THEN 3
    WHEN 'moderator' THEN 2
    ELSE 1
  END;

  -- Anonymous requests never satisfy any tier above 'anon'.
  IF _user_id IS NULL
     OR NULLIF(current_setting('request.jwt.claim.role', true), '') = 'anon' THEN
    RETURN tier = 'anon';
  END IF;

  IF public.is_owner(_user_id) THEN
    effective_rank := 4;
  ELSIF public.has_role(_user_id, 'admin'::app_role) THEN
    effective_rank := 3;
  ELSE
    effective_rank := 1;
  END IF;

  RETURN effective_rank >= required_rank;
END;
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_active_entitlement(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.has_min_role(uuid, text) TO anon;