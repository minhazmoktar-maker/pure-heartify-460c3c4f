CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
GRANT EXECUTE ON FUNCTION extensions.unaccent(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION extensions.unaccent(regdictionary, text) TO anon, authenticated, service_role;
-- Provide a public.unaccent wrapper so callers using public.unaccent(...) resolve correctly
CREATE OR REPLACE FUNCTION public.unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = extensions, public
AS $$ SELECT extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;
GRANT EXECUTE ON FUNCTION public.unaccent(text) TO anon, authenticated, service_role;