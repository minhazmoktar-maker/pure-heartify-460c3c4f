
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'channel_trust_tier') THEN
    CREATE TYPE public.channel_trust_tier AS ENUM ('S','A','B','C');
  END IF;
END $$;

ALTER TABLE public.approved_channels
  ADD COLUMN IF NOT EXISTS trust_tier public.channel_trust_tier NOT NULL DEFAULT 'A',
  ADD COLUMN IF NOT EXISTS auto_approve_uploads BOOLEAN NOT NULL DEFAULT true;

CREATE INDEX IF NOT EXISTS approved_channels_trust_tier_idx
  ON public.approved_channels (trust_tier, status);

CREATE OR REPLACE FUNCTION public.auto_approve_trusted_uploads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NEW.moderation_state = 'pending_review' THEN
    IF EXISTS (
      SELECT 1 FROM public.approved_channels ac
      WHERE ac.status='active'
        AND ac.auto_approve_uploads = true
        AND (ac.youtube_channel_id = NEW.channel_id
             OR LOWER(TRIM(ac.title)) = LOWER(TRIM(NEW.channel_title)))
    ) THEN
      NEW.moderation_state := 'auto_approved';
      NEW.moderation_stage := 'channel_reputation';
      NEW.moderation_provider := 'institutional_trust_trigger';
      NEW.moderation_confidence := 98.00;
      NEW.moderation_risk := 2.00;
      NEW.moderation_reasoning := 'Uploader is on approved_channels allowlist with auto_approve_uploads=true.';
      NEW.moderation_updated_at := now();
      IF NEW.channel_id IS NULL THEN
        SELECT ac.youtube_channel_id INTO NEW.channel_id
        FROM public.approved_channels ac
        WHERE ac.status='active'
          AND LOWER(TRIM(ac.title)) = LOWER(TRIM(NEW.channel_title))
        LIMIT 1;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.auto_approve_trusted_uploads() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_curated_videos_auto_approve ON public.curated_videos;
CREATE TRIGGER trg_curated_videos_auto_approve
  BEFORE INSERT ON public.curated_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_approve_trusted_uploads();

CREATE OR REPLACE FUNCTION public.revoke_auto_approval(_video_id UUID, _reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF NOT has_role(auth.uid(),'admin') AND NOT is_owner(auth.uid()) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;
  UPDATE public.curated_videos
  SET moderation_state = 'pending_review',
      moderation_reasoning = COALESCE(_reason,'Admin-triggered re-review'),
      moderation_updated_at = now()
  WHERE id = _video_id;
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.revoke_auto_approval(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_auto_approval(UUID, TEXT) TO authenticated;
