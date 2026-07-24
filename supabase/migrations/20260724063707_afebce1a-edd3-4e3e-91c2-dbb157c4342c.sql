-- Remove the overly-broad anon UPDATE policy on attributions.
-- First-touch attribution rows are now insert-only for anon (client uses
-- upsert with ignoreDuplicates=true), so anonymous callers can no longer
-- overwrite another session's UTM/referrer data.
DROP POLICY IF EXISTS "attribution anon session upsert" ON public.attributions;

-- Revoke the UPDATE table grant from anon; INSERT remains for first-touch capture.
REVOKE UPDATE ON public.attributions FROM anon;