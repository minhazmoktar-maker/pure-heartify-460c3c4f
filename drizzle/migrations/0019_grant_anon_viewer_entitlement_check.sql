-- Anonymous visitors must be able to read approved public videos. The read
-- policy on curated_videos evaluates viewer_has_active_entitlement(), so
-- revoking anon EXECUTE made every RLS check on that table fail outright with
-- "permission denied for function", which surfaced as "This video is no longer
-- available" on every deep-linked watch page for signed-out users.
--
-- The function leaks nothing to anon: auth.uid() is NULL there, so it always
-- returns false (i.e. no premium entitlement), which is the correct answer.
GRANT EXECUTE ON FUNCTION public.viewer_has_active_entitlement() TO anon;