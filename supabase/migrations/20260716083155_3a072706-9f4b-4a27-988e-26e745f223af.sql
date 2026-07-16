CREATE INDEX IF NOT EXISTS idx_curated_videos_trending
  ON public.curated_videos (view_count DESC, published_at DESC NULLS LAST)
  WHERE moderation_state IN ('approved','auto_approved') AND is_hidden = false AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_curated_videos_hidden_gems
  ON public.curated_videos (halal_score DESC, published_at DESC NULLS LAST)
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_hidden = false AND is_archived = false
    AND view_count < 50000 AND is_trusted_channel = true;
