CREATE OR REPLACE FUNCTION public.sitemap_watch_urls(p_limit integer DEFAULT 5000)
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
  ORDER BY cv.view_count DESC NULLS LAST
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 5000), 0), 20000)
$$;

REVOKE ALL ON FUNCTION public.sitemap_watch_urls(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sitemap_watch_urls(integer) TO anon, authenticated, service_role;