CREATE OR REPLACE FUNCTION public.detect_content_language(_title text, _fallback text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE t text := COALESCE(_title,''); lt text := lower(COALESCE(_title,''));
BEGIN
  IF t ~ '[\u0980-\u09FF]' THEN RETURN 'bn'; END IF;
  IF t ~ '[\u0900-\u097F]' THEN RETURN 'hi'; END IF;
  IF t ~ '[\u0E00-\u0E7F]' THEN RETURN 'th'; END IF;
  IF t ~ '[\u3040-\u30FF]' THEN RETURN 'ja'; END IF;
  IF t ~ '[\uAC00-\uD7AF]' THEN RETURN 'ko'; END IF;
  IF t ~ '[\u4E00-\u9FFF]' THEN RETURN 'zh'; END IF;
  IF t ~ '[\u0400-\u04FF]' THEN RETURN 'ru'; END IF;
  IF t ~ '[\u0600-\u06FF]' THEN
    IF t ~ '[ٹڈڑںھےگچپژکۓی]' AND t ~ '(کے|کی|کا|ہے|ہیں|نہیں|اور)' THEN RETURN 'ur'; END IF;
    RETURN 'ar';
  END IF;
  IF lt ~ '(^|[^a-z])(yang|dengan|untuk|adalah|tidak|kajian|ceramah|ustadz|sholat|shalat|kisah|jangan|apakah|mengapa|bagaimana|hidupmu|terbaru|kepada|sudah|akan|orang|dalam)($|[^a-z])' THEN RETURN 'id'; END IF;
  IF lt ~ '(^|[^a-z])(que|para|como|porque|nuestro|nuestra|hermano|islam en espanol|espanol|conferencia|sobre)($|[^a-z])' THEN RETURN 'es'; END IF;
  IF lt ~ '(^|[^a-z])(pour|avec|comment|pourquoi|dieu|priere|conference|musulman|musulmans|est-il)($|[^a-z])' THEN RETURN 'fr'; END IF;
  IF lt ~ '(^|[^a-z])(nedir|nasil|icin|hakkinda|sohbet|dersleri|namaz kilma)($|[^a-z])' THEN RETURN 'tr'; END IF;
  IF lt ~ '(^|[^a-z])(und|nicht|warum|wie|ueber|vortrag|deutsch)($|[^a-z])' THEN RETURN 'de'; END IF;
  RETURN COALESCE(_fallback, 'en');
END;
$$;

-- Retro-fix wrong tags on every stored video.
UPDATE public.curated_videos v
SET content_language = public.detect_content_language(v.title, v.content_language)
WHERE public.detect_content_language(v.title, v.content_language) <> COALESCE(v.content_language, '');

-- Keep new rows correct automatically.
CREATE OR REPLACE FUNCTION public._set_content_language()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.content_language := public.detect_content_language(NEW.title, NEW.content_language);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tg_set_content_language ON public.curated_videos;
CREATE TRIGGER tg_set_content_language
BEFORE INSERT OR UPDATE OF title, content_language ON public.curated_videos
FOR EACH ROW EXECUTE FUNCTION public._set_content_language();