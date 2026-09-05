-- Feed / recommendations read path: category + language + clean visual state,
-- ranked by halal score then freshness. Previously a 420 ms average scan.
CREATE INDEX IF NOT EXISTS idx_curated_lang_category_rank
  ON public.curated_videos (content_language, category, halal_score DESC NULLS LAST, ingested_at DESC)
  WHERE moderation_state = ANY (ARRAY['approved'::moderation_state, 'auto_approved'::moderation_state])
    AND is_hidden = false
    AND is_archived = false
    AND visual_state = 'clean';

CREATE INDEX IF NOT EXISTS idx_curated_lang_rank
  ON public.curated_videos (content_language, halal_score DESC NULLS LAST, ingested_at DESC)
  WHERE moderation_state = ANY (ARRAY['approved'::moderation_state, 'auto_approved'::moderation_state])
    AND is_hidden = false
    AND is_archived = false
    AND visual_state = 'clean';

ANALYZE public.curated_videos;