
CREATE OR REPLACE FUNCTION public.get_internal_config(_key text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT value FROM public._internal_config WHERE key = _key;
$$;
REVOKE ALL ON FUNCTION public.get_internal_config(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_internal_config(text) TO service_role;
