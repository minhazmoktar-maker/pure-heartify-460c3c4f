-- 1) Multilingual female / music / entertainment deny patterns ---------------
CREATE OR REPLACE FUNCTION public.halal_deny_female_intl_latin_pattern()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT '(^|[^a-z])(feminism|feminist|feminista|hermana|hermanas|mujer|mujeres|chica|chicas|senora|cantante|cantora|femme|femmes|fille|filles|soeur|chanson|chanteuse|musique|wanita|perempuan|muslimah|ustazah|ustadzah|penyanyi|nyanyian|nasyid|lagu|kadin|kiz|sarki|muzik|hanim|frau|frauen|maedchen|saengerin|lied|mulher|mulheres|menina|mwanamke|wanawake|wimbo|khawateen|aurat|aurton|larki|larkiyan|mahila|naari|ladki|gaana|sangeet|ashram|bhajan|kirtan|satsang|gurupurnima|bhagavad|mandir|diwali)($|[^a-z])'::text
$$;

CREATE OR REPLACE FUNCTION public.halal_deny_female_intl_script_pattern()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT '(মহিলা|নারী|মেয়ে|মেয়েদের|গায়িকা|গান|সঙ্গীত|খواتین|خواتین|عورت|عورتیں|لڑکی|لڑکیاں|گانا|گانے|موسیقی|نغمہ|महिला|नारी|लड़की|लड़कियों|गायिका|गाना|संगीत|गुरुपूर्णिमा)'::text
$$;

-- 2) Wire them into the ingest/update enforcement trigger --------------------
CREATE OR REPLACE FUNCTION public._enforce_no_female_no_music()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
  pat text := '(^|[^a-z])(female|females|woman|women|girl|girls|actress|actresses|singer|singers|song|songs|music|musical|musician|musicians|band|bands|concert|concerts|nasheed|nasheeds|anasheed|sister|sisters|ustadha|shaykha|dance|dancer|dancing|kpop|k-pop|kdrama|k-drama|anime|manga|movie|movies|film|films|netflix|hollywood|bollywood|celebrity|celebrities|gossip|dating|romance|romantic|kiss|kissing|nude|nudity|sexy|sex|sexual|porn|pornstar|onlyfans)($|[^a-z])';
  ar  text := public.halal_deny_female_ar_pattern();
  intl_latin text := public.halal_deny_female_intl_latin_pattern();
  intl_script text := public.halal_deny_female_intl_script_pattern();
BEGIN
  IF lower(COALESCE(NEW.title,'')) ~* pat OR lower(COALESCE(NEW.channel_title,'')) ~* pat
     OR COALESCE(NEW.title,'') ~ ar OR COALESCE(NEW.channel_title,'') ~ ar
     OR lower(COALESCE(NEW.title,'')) ~* intl_latin OR lower(COALESCE(NEW.channel_title,'')) ~* intl_latin
     OR COALESCE(NEW.title,'') ~ intl_script OR COALESCE(NEW.channel_title,'') ~ intl_script THEN
    NEW.is_hidden := true;
    NEW.is_archived := true;
    NEW.moderation_state := 'rejected';
    NEW.moderation_reasoning := COALESCE(NEW.moderation_reasoning,'') || ' | policy: no female / no music';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3) Channel blocks ---------------------------------------------------------
INSERT INTO public.blocked_creators (pattern, reason, match_mode)
VALUES
  ('kitsuna', 'off-policy: female-featured content', 'channel_exact'),
  ('Zayan My', 'off-policy: music / nasyid content', 'channel_exact'),
  ('Amma', 'off-policy: non-Islamic devotional content', 'channel_exact'),
  ('Academy of knowledge', 'off-policy: entertainment analysis', 'channel_exact'),
  ('Stanford Online', 'off-policy: female-featured secular course content', 'channel_exact'),
  ('Stanford Graduate School of Business', 'off-policy: female-featured secular content', 'channel_exact'),
  ('DeepLearningAI', 'off-policy: female-featured secular content', 'channel_exact'),
  ('Andrew Huberman', 'off-policy: female-featured secular content', 'channel_exact'),
  ('Huberman Lab Clips', 'off-policy: female-featured secular content', 'channel_exact'),
  ('Huberman Lab', 'off-policy: female-featured secular content', 'channel_exact'),
  ('Faithful Finance', 'off-policy: female-featured non-Islamic content', 'channel_exact')
ON CONFLICT DO NOTHING;

-- 4) Purge videos from newly blocked channels -------------------------------
UPDATE public.curated_videos v
SET is_hidden = true, is_archived = true, moderation_state = 'rejected',
    moderation_reasoning = COALESCE(v.moderation_reasoning,'') || ' | policy: blocked channel'
WHERE (v.is_archived = false OR v.is_hidden = false)
  AND lower(COALESCE(v.channel_title,'')) IN (
    'kitsuna','zayan my','amma','academy of knowledge','stanford online',
    'stanford graduate school of business','deeplearningai','andrew huberman',
    'huberman lab clips','huberman lab','faithful finance'
  );

-- 5) Retroactive sweep for the new multilingual patterns --------------------
UPDATE public.curated_videos v
SET is_hidden = true, is_archived = true, moderation_state = 'rejected',
    moderation_reasoning = COALESCE(v.moderation_reasoning,'') || ' | policy: no female / no music (intl)'
WHERE (v.is_archived = false OR v.is_hidden = false)
  AND (
    lower(COALESCE(v.title,'')) ~* public.halal_deny_female_intl_latin_pattern()
    OR lower(COALESCE(v.channel_title,'')) ~* public.halal_deny_female_intl_latin_pattern()
    OR COALESCE(v.title,'') ~ public.halal_deny_female_intl_script_pattern()
    OR COALESCE(v.channel_title,'') ~ public.halal_deny_female_intl_script_pattern()
  );