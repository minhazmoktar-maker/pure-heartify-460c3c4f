
-- Restrict public read of curated_videos to approved, visible content only
DROP POLICY IF EXISTS "Anyone can view curated videos" ON public.curated_videos;
CREATE POLICY "Anyone can view approved curated videos"
ON public.curated_videos
FOR SELECT
USING (
  moderation_state IN ('approved'::moderation_state, 'auto_approved'::moderation_state)
  AND COALESCE(is_hidden, false) = false
  AND COALESCE(is_archived, false) = false
);

-- Lock rate_limit_counters down to service_role only (was ALL USING(true))
DROP POLICY IF EXISTS "service role only" ON public.rate_limit_counters;
CREATE POLICY "service role only"
ON public.rate_limit_counters
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
