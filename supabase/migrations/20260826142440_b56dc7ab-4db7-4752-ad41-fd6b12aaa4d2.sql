-- 1. Per-user caption display settings (cross-device persistence)
CREATE TABLE IF NOT EXISTS public.user_caption_settings (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_caption_settings TO authenticated;
GRANT ALL ON public.user_caption_settings TO service_role;
ALTER TABLE public.user_caption_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own caption settings" ON public.user_caption_settings;
CREATE POLICY "own caption settings"
ON public.user_caption_settings FOR ALL TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 2. Caption track version history (autosave snapshots + rollback)
CREATE TABLE IF NOT EXISTS public.caption_track_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.creator_uploads(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  segment_count INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'auto',
  quality_score INTEGER,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS caption_track_versions_lookup_idx
  ON public.caption_track_versions (upload_id, language, created_at DESC);
GRANT SELECT ON public.caption_track_versions TO authenticated;
GRANT ALL ON public.caption_track_versions TO service_role;
ALTER TABLE public.caption_track_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creators and moderators read caption versions" ON public.caption_track_versions;
CREATE POLICY "creators and moderators read caption versions"
ON public.caption_track_versions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.creator_uploads u
    WHERE u.id = caption_track_versions.upload_id
      AND (u.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'moderator')
           OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Snapshots are written by a trigger only, never by clients.
CREATE OR REPLACE FUNCTION public.snapshot_caption_track_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.segments IS DISTINCT FROM NEW.segments THEN
    INSERT INTO public.caption_track_versions
      (upload_id, language, segments, segment_count, source, created_by, note)
    VALUES
      (OLD.upload_id, OLD.language, OLD.segments, OLD.segment_count, OLD.source, auth.uid(),
       'auto-snapshot before edit');
    -- Keep history bounded: retain the 20 most recent snapshots per track.
    DELETE FROM public.caption_track_versions v
    WHERE v.upload_id = OLD.upload_id
      AND v.language = OLD.language
      AND v.id NOT IN (
        SELECT id FROM public.caption_track_versions
        WHERE upload_id = OLD.upload_id AND language = OLD.language
        ORDER BY created_at DESC
        LIMIT 20
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS snapshot_caption_track_version_trg ON public.creator_upload_captions;
CREATE TRIGGER snapshot_caption_track_version_trg
AFTER UPDATE OF segments ON public.creator_upload_captions
FOR EACH ROW EXECUTE FUNCTION public.snapshot_caption_track_version();

-- 3. Caption quality audit trail
CREATE TABLE IF NOT EXISTS public.caption_quality_audits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.creator_uploads(id) ON DELETE CASCADE,
  language TEXT NOT NULL,
  action TEXT NOT NULL,
  score INTEGER,
  segment_count INTEGER,
  issues JSONB NOT NULL DEFAULT '[]'::jsonb,
  thresholds JSONB NOT NULL DEFAULT '{}'::jsonb,
  actor_id UUID,
  actor_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS caption_quality_audits_lookup_idx
  ON public.caption_quality_audits (upload_id, language, created_at DESC);
GRANT SELECT, INSERT ON public.caption_quality_audits TO authenticated;
GRANT ALL ON public.caption_quality_audits TO service_role;
ALTER TABLE public.caption_quality_audits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "creators and moderators read caption audits" ON public.caption_quality_audits;
CREATE POLICY "creators and moderators read caption audits"
ON public.caption_quality_audits FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.creator_uploads u
    WHERE u.id = caption_quality_audits.upload_id
      AND (u.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'moderator')
           OR public.has_role(auth.uid(), 'admin'))
  )
);

DROP POLICY IF EXISTS "creators and moderators write caption audits" ON public.caption_quality_audits;
CREATE POLICY "creators and moderators write caption audits"
ON public.caption_quality_audits FOR INSERT TO authenticated
WITH CHECK (
  actor_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.creator_uploads u
    WHERE u.id = caption_quality_audits.upload_id
      AND (u.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'moderator')
           OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Conflict-safe rollback: restore a snapshot only if the caller still holds the
-- expected updated_at, so two editors can never silently clobber each other.
CREATE OR REPLACE FUNCTION public.restore_caption_version(
  p_version_id UUID,
  p_expected_updated_at TIMESTAMPTZ
)
RETURNS TIMESTAMPTZ
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  allowed BOOLEAN;
  new_ts TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v FROM public.caption_track_versions WHERE id = p_version_id;
  IF v IS NULL THEN
    RAISE EXCEPTION 'version not found';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.creator_uploads u
    WHERE u.id = v.upload_id
      AND (u.user_id = auth.uid()
           OR public.has_role(auth.uid(), 'moderator')
           OR public.has_role(auth.uid(), 'admin'))
  ) INTO allowed;
  IF NOT allowed THEN
    RAISE EXCEPTION 'not authorised';
  END IF;

  UPDATE public.creator_upload_captions
  SET segments = v.segments,
      segment_count = v.segment_count,
      source = 'manual',
      updated_at = new_ts
  WHERE upload_id = v.upload_id
    AND language = v.language
    AND (p_expected_updated_at IS NULL OR updated_at = p_expected_updated_at);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'caption_conflict';
  END IF;

  RETURN new_ts;
END;
$$;

REVOKE ALL ON FUNCTION public.restore_caption_version(UUID, TIMESTAMPTZ) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_caption_version(UUID, TIMESTAMPTZ) TO authenticated;