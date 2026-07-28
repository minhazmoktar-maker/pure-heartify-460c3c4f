ALTER TABLE public.curated_videos
  ADD COLUMN IF NOT EXISTS visual_state text NOT NULL DEFAULT 'unchecked',
  ADD COLUMN IF NOT EXISTS visual_flags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS visual_confidence numeric,
  ADD COLUMN IF NOT EXISTS visual_checked_at timestamptz;

ALTER TABLE public.curated_videos DROP CONSTRAINT IF EXISTS curated_videos_visual_state_chk;
ALTER TABLE public.curated_videos ADD CONSTRAINT curated_videos_visual_state_chk
  CHECK (visual_state IN ('unchecked','clean','flagged','error'));

CREATE INDEX IF NOT EXISTS curated_videos_visual_state_idx
  ON public.curated_videos (visual_state) WHERE is_hidden = false AND is_archived = false;
CREATE INDEX IF NOT EXISTS curated_videos_lang_state_idx
  ON public.curated_videos (content_language, moderation_state) WHERE is_hidden = false AND is_archived = false;

ALTER TABLE public.user_locale_preferences
  ADD COLUMN IF NOT EXISTS strict_halal boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.halal_deny_tier1_pattern()
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '(^|[^a-z])(female|females|woman|women|womens|girl|girls|actress|actresses|ustadha|shaykha|singer|singers|karaoke|rapper|hiphop|kpop|k-pop|kdrama|k-drama|twerk|belly ?dance|dancer|dancing|choreography|makeup artist|grwm|ootd|skincare|lookbook|cosmetics|celebrity|celebrities|gossip|dating|boyfriend|girlfriend|flirt|nude|nudity|sexy|porn|pornstar|onlyfans|bikini|lingerie|swimsuit|escort|stripper|casino|gambling|betting|lottery|tiktok|netflix|hollywood|bollywood|lollywood|music video|official music|official audio|official video|lyric video)($|[^a-z])'
$$;

CREATE OR REPLACE FUNCTION public.halal_deny_tier2_pattern()
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT '(^|[^a-z])(lady|ladies|sister|sisters|aunty|song|songs|music|musical|musician|musicians|band|concert|album|lyrics|remix|soundtrack|nasheed|nasheeds|anasheed|qaseeda|dance|fashion|beauty|makeup|hairstyle|outfit|jewellery|jewelry|drama|anime|manga|cartoon|movie|movies|trailer|romance|romantic|kiss|kissing|crush|prank|vlog|vlogs|vlogger|funny|comedy|standup|meme|memes|gaming|gameplay|fortnite|pubg|minecraft|reaction video|talk show)($|[^a-z])'
$$;

CREATE OR REPLACE FUNCTION public.halal_text_flags(_title text, _channel text)
RETURNS TABLE (tier1 boolean, tier2 boolean)
LANGUAGE sql IMMUTABLE AS $$
  SELECT
    (lower(coalesce(_title,'')) ~ public.halal_deny_tier1_pattern()
       OR lower(coalesce(_channel,'')) ~ public.halal_deny_tier1_pattern()),
    (lower(coalesce(_title,'')) ~ public.halal_deny_tier2_pattern()
       OR lower(coalesce(_channel,'')) ~ public.halal_deny_tier2_pattern())
$$;

CREATE OR REPLACE FUNCTION public.infer_content_language(_title text, _channel text)
RETURNS text LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  s text := coalesce(_title,'') || ' ' || coalesce(_channel,'');
  l text := lower(s);
BEGIN
  IF s ~ ('[' || chr(2432) || '-' || chr(2559) || ']') THEN RETURN 'bn'; END IF;
  IF s ~ ('[' || chr(2304) || '-' || chr(2431) || ']') THEN RETURN 'hi'; END IF;
  IF s ~ ('[' || chr(2944) || '-' || chr(3071) || ']') THEN RETURN 'ta'; END IF;
  IF s ~ ('[' || chr(44032) || '-' || chr(55203) || ']') THEN RETURN 'ko'; END IF;
  IF s ~ ('[' || chr(12352) || '-' || chr(12543) || ']') THEN RETURN 'ja'; END IF;
  IF s ~ ('[' || chr(19968) || '-' || chr(40959) || ']') THEN RETURN 'zh'; END IF;
  IF s ~ ('[' || chr(1024) || '-' || chr(1279) || ']') THEN RETURN 'ru'; END IF;
  IF s ~ ('[' || chr(3585) || '-' || chr(3675) || ']') THEN RETURN 'th'; END IF;
  IF s ~ ('[' || chr(1600) || '-' || chr(1791) || ']') THEN
    IF s ~ ('[' || chr(1657) || chr(1672) || chr(1681) || chr(1722) || chr(1729) || chr(1746) || ']') THEN
      RETURN 'ur';
    END IF;
    RETURN 'ar';
  END IF;
  IF l ~ '(^| )(yang|dan|untuk|dengan|tentang|kajian|ustadz|ustad|adalah|tidak|kita|bersama|kepada|dalam)( |$)' THEN RETURN 'id'; END IF;
  IF l ~ '(^| )(adakah|ialah|kepada|bersama)( |$)' THEN RETURN 'ms'; END IF;
  IF l ~ '(^| )(icin|için|nedir|hakkında|hakkinda|nasıl|nasil|sohbet|hoca)( |$)' THEN RETURN 'tr'; END IF;
  IF l ~ '(^| )(les|des|pour|avec|dans|une|comment)( |$)' THEN RETURN 'fr'; END IF;
  IF l ~ '(^| )(para|como|los|las|con|una|del)( |$)' THEN RETURN 'es'; END IF;
  IF l ~ '(^| )(und|der|die|das|mit|für|fur|ist|nicht)( |$)' THEN RETURN 'de'; END IF;
  RETURN 'en';
END;
$$;

CREATE OR REPLACE FUNCTION public._curated_videos_fill_language()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.content_language IS NULL OR btrim(NEW.content_language) = '' THEN
    NEW.content_language := public.infer_content_language(NEW.title, NEW.channel_title);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS curated_videos_fill_language ON public.curated_videos;
CREATE TRIGGER curated_videos_fill_language
  BEFORE INSERT ON public.curated_videos
  FOR EACH ROW EXECUTE FUNCTION public._curated_videos_fill_language();