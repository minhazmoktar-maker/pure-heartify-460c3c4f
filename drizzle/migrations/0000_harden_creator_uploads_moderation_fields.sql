-- 1. Moderators can actually moderate uploads (was admin-only despite read access).
DROP POLICY IF EXISTS creator_uploads_moderator_update ON public.creator_uploads;
CREATE POLICY creator_uploads_moderator_update
ON public.creator_uploads FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'moderator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'moderator'::app_role) OR public.has_role(auth.uid(), 'admin'::app_role));

-- 2. Creators must never be able to self-approve or edit moderation verdicts.
--    RLS WITH CHECK cannot compare to OLD, so enforce with a trigger.
CREATE OR REPLACE FUNCTION public.guard_creator_upload_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Privileged reviewers may change anything.
  IF public.has_role(auth.uid(), 'admin'::app_role)
     OR public.has_role(auth.uid(), 'moderator'::app_role)
     OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  -- Owner edits: pin every moderation-controlled column back to its old value.
  NEW.status            := OLD.status;
  NEW.visual_state      := OLD.visual_state;
  NEW.halal_score       := OLD.halal_score;
  NEW.moderation_reason := OLD.moderation_reason;
  NEW.reviewed_by       := OLD.reviewed_by;
  NEW.reviewed_at       := OLD.reviewed_at;
  NEW.user_id           := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_creator_upload_moderation_fields ON public.creator_uploads;
CREATE TRIGGER trg_guard_creator_upload_moderation_fields
BEFORE UPDATE ON public.creator_uploads
FOR EACH ROW EXECUTE FUNCTION public.guard_creator_upload_moderation_fields();