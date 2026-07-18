CREATE OR REPLACE FUNCTION public.f_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, extensions
AS $$ SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;
GRANT EXECUTE ON FUNCTION public.f_unaccent(text) TO anon, authenticated, service_role;