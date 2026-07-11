-- Scaling: add covering composite index matching the feed's order clause
-- (published_at desc nulls last, halal_score desc, ingested_at desc) so
-- pagination stays index-only as curated_videos grows past 1M rows.
CREATE INDEX IF NOT EXISTS idx_curated_videos_feed_order
  ON public.curated_videos (published_at DESC NULLS LAST, halal_score DESC, ingested_at DESC)
  WHERE moderation_state = 'approved';