-- Retroactively archive female-featured videos from approved channels.
UPDATE public.curated_videos
   SET is_archived = true,
       moderation_state = 'rejected'
 WHERE is_archived = false
   AND (
        title ~* '\y(woman|women|female|girl|sister|actress|hijabi|non-hijabi|non hijabi|niqabi|aurat|aurtain|mujeres|songstress|her story|she said|by women)\y'
     OR title ~* '(👩|💃|👗|💄|🧕)'
     OR channel_title ~* '\y(woman|women|female|hijabi|womenofquran)\y'
   );

-- Prevent future inserts/updates of the same pattern via a trigger.
CREATE OR REPLACE FUNCTION public.enforce_female_content_block()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.title ~* '\y(woman|women|female|girl|sister|actress|hijabi|non-hijabi|non hijabi|niqabi|aurat|aurtain|mujeres|songstress|her story|she said|by women)\y'
     OR NEW.title ~* '(👩|💃|👗|💄|🧕)'
     OR NEW.channel_title ~* '\y(woman|women|female|hijabi|womenofquran)\y'
  THEN
    RAISE EXCEPTION 'Blocked: title/channel matches female-content pattern (%, %)', NEW.channel_title, NEW.title;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.enforce_female_content_block() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_enforce_female_content_block ON public.curated_videos;
CREATE TRIGGER trg_enforce_female_content_block
BEFORE INSERT OR UPDATE OF title, channel_title ON public.curated_videos
FOR EACH ROW EXECUTE FUNCTION public.enforce_female_content_block();