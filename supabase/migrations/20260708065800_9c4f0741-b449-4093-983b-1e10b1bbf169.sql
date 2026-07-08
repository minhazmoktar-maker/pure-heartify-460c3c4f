
-- =========================================================================
-- OWNER SYSTEM HARDENING
-- =========================================================================

-- 1. Last-owner protection ------------------------------------------------
-- Prevent removing the final Owner via platform_owners.
CREATE OR REPLACE FUNCTION public.prevent_last_owner_removal()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  remaining INT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT COUNT(*) INTO remaining
    FROM public.platform_owners
    WHERE user_id <> OLD.user_id;

    IF remaining = 0 THEN
      RAISE EXCEPTION 'Cannot remove the last remaining Owner';
    END IF;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_last_owner_removal ON public.platform_owners;
CREATE TRIGGER trg_prevent_last_owner_removal
BEFORE DELETE ON public.platform_owners
FOR EACH ROW EXECUTE FUNCTION public.prevent_last_owner_removal();

-- Also prevent removing the admin role of an owner whose removal would leave
-- zero admins-who-are-owners (belt-and-braces).
-- The existing protect_owner_role trigger already blocks per-row demotion;
-- this is intentional coverage duplication and remains safe.

-- 2. Content lifecycle state fields --------------------------------------
ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_curated_videos_lifecycle
  ON public.curated_videos(is_hidden, is_archived)
  WHERE is_hidden = false AND is_archived = false;

-- 3. Owner bypass on curated_videos --------------------------------------
-- Owner sees and mutates everything, regardless of lifecycle state.
DROP POLICY IF EXISTS "owner full access curated_videos" ON public.curated_videos;
CREATE POLICY "owner full access curated_videos"
ON public.curated_videos
FOR ALL
TO authenticated
USING (public.is_owner(auth.uid()))
WITH CHECK (public.is_owner(auth.uid()));

-- 4. Audit log: additional fields + controlled insert -------------------
ALTER TABLE public.privileged_actions_log
  ADD COLUMN IF NOT EXISTS success BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS failure_reason TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Allow the caller (owner or admin) to insert their own audit entries via
-- the client, but only tagged with THEIR user_id. Service role can still
-- insert anything via the edge function.
DROP POLICY IF EXISTS "self-insert audit entries" ON public.privileged_actions_log;
CREATE POLICY "self-insert audit entries"
ON public.privileged_actions_log
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND (public.is_owner(auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role))
);
