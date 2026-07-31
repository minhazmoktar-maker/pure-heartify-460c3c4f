-- 1) gift_codes: never expose plaintext unredeemed code values, even to admins.
DROP POLICY IF EXISTS own_redeemed_codes_read ON public.gift_codes;
CREATE POLICY own_redeemed_codes_read
ON public.gift_codes
FOR SELECT
TO authenticated
USING (
  redeemed_by = auth.uid()
  OR (public.has_role(auth.uid(), 'admin'::app_role) AND redeemed_by IS NOT NULL)
);

REVOKE SELECT ON public.gift_codes FROM anon;
GRANT SELECT ON public.gift_codes TO authenticated;
GRANT ALL ON public.gift_codes TO service_role;

-- 2) khatm_groups: keep anonymous public-group discovery, but stop exposing owner_id
--    (and other internal columns) to unauthenticated visitors via column-level grants.
REVOKE ALL ON public.khatm_groups FROM anon;
GRANT SELECT (
  id, name, description, intention, invite_code, is_public,
  target_completion_at, completed_at, created_at
) ON public.khatm_groups TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.khatm_groups TO authenticated;
GRANT ALL ON public.khatm_groups TO service_role;

-- 3) video_reports: validate/normalize client-supplied report metadata so users can't
--    misattribute reports to arbitrary channels/videos or spoof titles.
CREATE OR REPLACE FUNCTION public.validate_video_report_metadata()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _v record;
  _ch_title text;
BEGIN
  NEW.video_id := NULLIF(btrim(coalesce(NEW.video_id, '')), '');
  NEW.channel_id := NULLIF(btrim(coalesce(NEW.channel_id, '')), '');

  IF NEW.video_id IS NOT NULL AND NEW.video_id !~ '^[A-Za-z0-9_-]{5,64}$' THEN
    RAISE EXCEPTION 'invalid_video_id';
  END IF;
  IF NEW.channel_id IS NOT NULL AND NEW.channel_id !~ '^[A-Za-z0-9_@.-]{2,128}$' THEN
    RAISE EXCEPTION 'invalid_channel_id';
  END IF;
  IF NEW.video_id IS NULL AND NEW.channel_id IS NULL THEN
    RAISE EXCEPTION 'video_id_or_channel_id_required';
  END IF;

  NEW.platform := lower(coalesce(NULLIF(btrim(coalesce(NEW.platform, '')), ''), 'web'));
  IF NEW.platform NOT IN ('web','ios','android','pwa','watchos') THEN
    NEW.platform := 'web';
  END IF;

  IF NEW.video_id IS NOT NULL THEN
    SELECT cv.title AS title, cv.channel_title AS channel_title, cv.youtube_channel_id AS youtube_channel_id
      INTO _v
      FROM public.curated_videos cv
     WHERE cv.youtube_id = NEW.video_id
     LIMIT 1;

    IF FOUND THEN
      NEW.video_title := _v.title;
      NEW.channel_title := _v.channel_title;
      NEW.channel_id := coalesce(_v.youtube_channel_id, NEW.channel_id);
      RETURN NEW;
    END IF;
  END IF;

  IF NEW.channel_id IS NOT NULL THEN
    SELECT ac.title INTO _ch_title
      FROM public.approved_channels ac
     WHERE ac.youtube_channel_id = NEW.channel_id
     LIMIT 1;
    IF _ch_title IS NOT NULL THEN
      NEW.channel_title := _ch_title;
      IF NEW.video_id IS NOT NULL THEN
        NEW.video_title := NULL;
      END IF;
      RETURN NEW;
    END IF;
  END IF;

  -- Fully unknown reference: keep the report (moderators still need it) but discard
  -- unverifiable, user-controlled display strings to prevent spoofing/misattribution.
  NEW.video_title := NULL;
  NEW.channel_title := NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_video_report_metadata ON public.video_reports;
CREATE TRIGGER trg_validate_video_report_metadata
BEFORE INSERT ON public.video_reports
FOR EACH ROW EXECUTE FUNCTION public.validate_video_report_metadata();

REVOKE ALL ON FUNCTION public.validate_video_report_metadata() FROM PUBLIC, anon, authenticated;