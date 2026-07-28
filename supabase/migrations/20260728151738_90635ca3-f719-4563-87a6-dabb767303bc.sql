CREATE OR REPLACE FUNCTION public.list_active_categories()
RETURNS TABLE(category text, video_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cv.category, count(*)::bigint
  FROM public.curated_videos cv
  WHERE cv.moderation_state IN ('approved','auto_approved')
    AND cv.is_hidden = false
    AND cv.is_archived = false
    AND cv.category IS NOT NULL
  GROUP BY cv.category
  ORDER BY 2 DESC
$$;

REVOKE ALL ON FUNCTION public.list_active_categories() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_active_categories() TO anon, authenticated, service_role;