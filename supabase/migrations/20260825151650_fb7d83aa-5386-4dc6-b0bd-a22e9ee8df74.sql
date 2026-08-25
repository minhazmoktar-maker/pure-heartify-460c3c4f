DROP FUNCTION IF EXISTS public.sitemap_watch_urls(integer);

CREATE OR REPLACE FUNCTION public.sitemap_watch_urls(p_limit integer DEFAULT 1000, p_offset integer DEFAULT 0)
RETURNS TABLE(video_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cv.video_id
  FROM public.curated_videos cv
  WHERE cv.visual_state = 'clean'
    AND cv.moderation_state IN ('approved','auto_approved')
    AND COALESCE(cv.is_hidden, false) = false
    AND COALESCE(cv.is_archived, false) = false
    AND COALESCE(cv.is_premium_only, false) = false
  ORDER BY cv.view_count DESC NULLS LAST, cv.video_id
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 1000), 0), 1000)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0)
$$;

REVOKE ALL ON FUNCTION public.sitemap_watch_urls(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sitemap_watch_urls(integer, integer) TO anon, authenticated, service_role;