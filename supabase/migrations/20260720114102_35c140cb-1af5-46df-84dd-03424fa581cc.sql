
-- Zero-female / zero-music content sweep + prevention

WITH pat AS (
  SELECT '(^|[^a-z])(female|females|woman|women|girl|girls|actress|actresses|singer|singers|song|songs|music|musical|musician|musicians|band|bands|concert|concerts|nasheed|nasheeds|anasheed|sister|sisters|ustadha|shaykha|dance|dancer|dancing|kpop|k-pop|kdrama|k-drama|anime|manga|movie|movies|film|films|netflix|hollywood|bollywood|celebrity|celebrities|gossip|dating|romance|romantic|kiss|kissing|nude|nudity|sexy|sex|sexual|porn|pornstar|onlyfans)($|[^a-z])' AS p
)
UPDATE public.curated_videos v
SET is_hidden = true,
    is_archived = true,
    moderation_state = 'rejected',
    moderation_reasoning = COALESCE(v.moderation_reasoning,'') || ' | auto-purge: female/music policy'
FROM pat
WHERE (lower(v.title) ~* pat.p OR lower(v.channel_title) ~* pat.p)
  AND (COALESCE(v.is_hidden,false)=false OR COALESCE(v.is_archived,false)=false);

INSERT INTO public.blocked_creators (pattern, reason)
SELECT DISTINCT v.channel_title, 'auto-blocked: female/music policy sweep'
FROM public.curated_videos v
WHERE lower(v.channel_title) ~*
      '(^|[^a-z])(female|females|woman|women|girl|girls|actress|singer|singers|song|songs|music|musical|musician|nasheed|nasheeds|anasheed|sister|sisters|ustadha|shaykha|dance|kpop|kdrama|anime|manga|movie|films|netflix|hollywood|bollywood|celebrity|gossip|dating|romance|kiss|nude|sexy|sex|sexual|porn|onlyfans)($|[^a-z])'
  AND NOT EXISTS (
    SELECT 1 FROM public.blocked_creators bc
    WHERE lower(bc.pattern) = lower(v.channel_title)
  );

CREATE OR REPLACE FUNCTION public._enforce_no_female_no_music()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pat text := '(^|[^a-z])(female|females|woman|women|girl|girls|actress|actresses|singer|singers|song|songs|music|musical|musician|musicians|band|bands|concert|concerts|nasheed|nasheeds|anasheed|sister|sisters|ustadha|shaykha|dance|dancer|dancing|kpop|k-pop|kdrama|k-drama|anime|manga|movie|movies|film|films|netflix|hollywood|bollywood|celebrity|celebrities|gossip|dating|romance|romantic|kiss|kissing|nude|nudity|sexy|sex|sexual|porn|pornstar|onlyfans)($|[^a-z])';
BEGIN
  IF lower(COALESCE(NEW.title,'')) ~* pat OR lower(COALESCE(NEW.channel_title,'')) ~* pat THEN
    NEW.is_hidden := true;
    NEW.is_archived := true;
    NEW.moderation_state := 'rejected';
    NEW.moderation_reasoning := COALESCE(NEW.moderation_reasoning,'') || ' | policy: no female / no music';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_no_female_no_music ON public.curated_videos;
CREATE TRIGGER trg_enforce_no_female_no_music
BEFORE INSERT OR UPDATE OF title, channel_title
ON public.curated_videos
FOR EACH ROW EXECUTE FUNCTION public._enforce_no_female_no_music();
