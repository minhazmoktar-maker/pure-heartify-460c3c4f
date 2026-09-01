-- Speeds up the public directory: per-channel counts and latest-thumbnail
-- lookups were timing out at 100 channels without a composite index.
CREATE INDEX IF NOT EXISTS idx_curated_videos_channel_published
  ON public.curated_videos (channel_id, published_at DESC)
  WHERE is_hidden = false AND is_archived = false;
