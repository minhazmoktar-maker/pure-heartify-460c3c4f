CREATE INDEX IF NOT EXISTS idx_curated_videos_safe_fresh
  ON public.curated_videos (published_at DESC NULLS LAST, halal_score DESC, ingested_at DESC)
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_hidden = false
    AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_curated_videos_safe_recent
  ON public.curated_videos (ingested_at DESC, published_at DESC NULLS LAST, halal_score DESC)
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_hidden = false
    AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_curated_videos_safe_trending
  ON public.curated_videos (view_count DESC NULLS LAST, published_at DESC NULLS LAST, halal_score DESC)
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_hidden = false
    AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_curated_videos_safe_section_fresh
  ON public.curated_videos (section_id, published_at DESC NULLS LAST, halal_score DESC, ingested_at DESC)
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_hidden = false
    AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_curated_videos_safe_section_recent
  ON public.curated_videos (section_id, ingested_at DESC, published_at DESC NULLS LAST, halal_score DESC)
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_hidden = false
    AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_curated_videos_safe_category_fresh
  ON public.curated_videos (category, published_at DESC NULLS LAST, halal_score DESC, ingested_at DESC)
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_hidden = false
    AND is_archived = false;

CREATE INDEX IF NOT EXISTS idx_curated_videos_safe_channel_fresh
  ON public.curated_videos (channel_title, published_at DESC NULLS LAST, halal_score DESC, ingested_at DESC)
  WHERE moderation_state IN ('approved','auto_approved')
    AND is_hidden = false
    AND is_archived = false;