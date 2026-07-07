
CREATE OR REPLACE FUNCTION public.check_channel_duplicate(
  _yt_id text, _title text, _handle text
)
RETURNS TABLE(match_type text, matched_channel_id uuid, matched_title text, score real)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  _owner_key text := public.compute_owner_key(coalesce(_handle, _title));
BEGIN
  RETURN QUERY
  SELECT 'exact_id'::text, id, title, 1.0::real
  FROM public.approved_channels
  WHERE youtube_channel_id = _yt_id
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT 'owner_key'::text, id, title, 0.95::real
  FROM public.approved_channels
  WHERE owner_key = _owner_key AND _owner_key <> ''
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  RETURN QUERY
  SELECT 'title_similarity'::text, id, title, similarity(title, _title)
  FROM public.approved_channels
  WHERE similarity(title, _title) > 0.7
  ORDER BY similarity(title, _title) DESC
  LIMIT 1;
END;
$$;
