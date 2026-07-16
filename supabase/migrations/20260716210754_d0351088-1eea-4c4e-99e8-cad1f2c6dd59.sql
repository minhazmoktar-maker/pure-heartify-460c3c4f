CREATE OR REPLACE FUNCTION public.unaccent(text, text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = extensions, public
AS $$ SELECT extensions.unaccent($1::regdictionary, $2) $$;
GRANT EXECUTE ON FUNCTION public.unaccent(text, text) TO anon, authenticated, service_role;