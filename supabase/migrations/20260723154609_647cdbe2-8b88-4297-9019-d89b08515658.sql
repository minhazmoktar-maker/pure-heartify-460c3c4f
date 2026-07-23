
CREATE OR REPLACE FUNCTION public.enforce_blocked_creators()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hay text := lower(coalesce(NEW.channel_title,'') || ' ' || coalesce(NEW.title,''));
BEGIN
  -- Allow updates that are archiving/hiding (moderation actions)
  IF TG_OP = 'UPDATE' AND NEW.is_archived = true THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.blocked_creators
    WHERE hay LIKE '%' || lower(pattern) || '%'
  ) THEN
    RAISE EXCEPTION 'Blocked creator content rejected: %', NEW.channel_title;
  END IF;
  RETURN NEW;
END;
$$;
