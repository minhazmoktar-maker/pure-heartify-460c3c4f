
-- Fix SECURITY DEFINER view finding: enforce security_invoker on v_ingestion_health
ALTER VIEW public.v_ingestion_health SET (security_invoker = true);

-- Speed up section feed queries: WHERE section_id=? AND is_premium_only=false
-- ORDER BY published_at DESC NULLS LAST, halal_score DESC, ingested_at DESC.
-- The existing idx_curated_section_score leads with halal_score so PG has to
-- sort every matching row; this composite matches the ORDER BY exactly and
-- lets LIMIT terminate early.
CREATE INDEX IF NOT EXISTS idx_curated_section_feed_order
  ON public.curated_videos (section_id, published_at DESC NULLS LAST, halal_score DESC, ingested_at DESC)
  WHERE is_premium_only = false
    AND is_hidden = false
    AND is_archived = false;
