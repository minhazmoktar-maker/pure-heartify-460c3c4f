-- 1. Drop duplicate / never-used indexes on the hottest table (frees ~350 MB of disk
--    and removes write amplification on every ingest insert/update).
DROP INDEX IF EXISTS public.idx_curated_title_trgm;              -- exact duplicate of curated_videos_title_trgm_idx
DROP INDEX IF EXISTS public.idx_curated_channel_trgm;            -- exact duplicate of curated_videos_channel_trgm_idx
DROP INDEX IF EXISTS public.idx_curated_videos_title_lower;
DROP INDEX IF EXISTS public.idx_curated_section_feed_order;
DROP INDEX IF EXISTS public.idx_curated_videos_safe_channel_fresh;
DROP INDEX IF EXISTS public.curated_videos_trusted_pub_idx;
DROP INDEX IF EXISTS public.idx_curated_videos_feed_order;
DROP INDEX IF EXISTS public.idx_curated_videos_hidden_gems;
DROP INDEX IF EXISTS public.idx_curated_videos_category_lower;
DROP INDEX IF EXISTS public.idx_curated_videos_lifecycle;
DROP INDEX IF EXISTS public.idx_moderation_log_reason;
DROP INDEX IF EXISTS public.channel_moderation_decisions_action_idx;

-- 2. Index the two background sweeps that dominate total execution time
--    (duration backfill and embeddability recheck currently seq-scan 627k rows).
CREATE INDEX IF NOT EXISTS idx_curated_duration_pending
  ON public.curated_videos (video_id)
  WHERE duration_checked_at IS NULL
    AND embeddable = true
    AND is_archived = false
    AND is_hidden = false;

CREATE INDEX IF NOT EXISTS idx_curated_embed_recheck
  ON public.curated_videos (embed_checked_at ASC NULLS FIRST)
  WHERE embeddable = true
    AND is_archived = false
    AND is_hidden = false;

-- 3. Keep planner statistics fresh on the hot table.
ALTER TABLE public.curated_videos SET (autovacuum_vacuum_scale_factor = 0.02,
                                       autovacuum_analyze_scale_factor = 0.01);
ANALYZE public.curated_videos;