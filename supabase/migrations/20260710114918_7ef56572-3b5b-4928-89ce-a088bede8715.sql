
-- 1) Reciter catalog premium fields
ALTER TABLE public.reciters
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_plan text NOT NULL DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS sample_seconds integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS download_allowed boolean NOT NULL DEFAULT true;

ALTER TABLE public.reciters
  DROP CONSTRAINT IF EXISTS reciters_min_plan_check;
ALTER TABLE public.reciters
  ADD CONSTRAINT reciters_min_plan_check
  CHECK (min_plan IN ('free','plus','family','lifetime'));

ALTER TABLE public.reciters
  DROP CONSTRAINT IF EXISTS reciters_sample_seconds_check;
ALTER TABLE public.reciters
  ADD CONSTRAINT reciters_sample_seconds_check
  CHECK (sample_seconds BETWEEN 0 AND 600);

-- 2) Male-only enforcement for verified reciters (trigger, not CHECK, so we can update policy later)
CREATE OR REPLACE FUNCTION public.enforce_male_only_reciter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_verified = true AND lower(coalesce(NEW.gender,'')) <> 'male' THEN
    RAISE EXCEPTION 'Only male reciters may be marked verified (policy)';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reciters_male_only ON public.reciters;
CREATE TRIGGER trg_reciters_male_only
BEFORE INSERT OR UPDATE ON public.reciters
FOR EACH ROW EXECUTE FUNCTION public.enforce_male_only_reciter();

-- 3) Audio source quality + premium flags
ALTER TABLE public.reciter_audio_sources
  ADD COLUMN IF NOT EXISTS quality_tier text NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS bitrate_kbps integer,
  ADD COLUMN IF NOT EXISTS is_premium boolean NOT NULL DEFAULT false;

ALTER TABLE public.reciter_audio_sources
  DROP CONSTRAINT IF EXISTS reciter_audio_sources_quality_tier_check;
ALTER TABLE public.reciter_audio_sources
  ADD CONSTRAINT reciter_audio_sources_quality_tier_check
  CHECK (quality_tier IN ('standard','hd','lossless'));

CREATE INDEX IF NOT EXISTS idx_reciters_min_plan ON public.reciters(min_plan) WHERE is_premium;
CREATE INDEX IF NOT EXISTS idx_audio_sources_premium ON public.reciter_audio_sources(reciter_id) WHERE is_premium;

-- 4) Accessibility helper
CREATE OR REPLACE FUNCTION public.reciter_is_accessible(_reciter_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
BEGIN
  SELECT is_premium, min_plan INTO r FROM public.reciters WHERE id = _reciter_id;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOT r.is_premium OR r.min_plan = 'free' THEN RETURN true; END IF;
  IF _user_id IS NULL THEN RETURN false; END IF;
  RETURN public.has_active_premium(_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.reciter_is_accessible(uuid, uuid) TO anon, authenticated;
