
ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS is_premium_only boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS curated_videos_is_premium_only_idx
  ON public.curated_videos (is_premium_only)
  WHERE is_premium_only = true;
