INSERT INTO public.approved_channels (youtube_channel_id, title, handle, owner_key, category, status, trust_tier, auto_approve_uploads, consistency_score)
VALUES ('UCJJBtUqjm-QjJ7Cvtz0yqbQ', '2 Cents Podcast', '@2centspodcast', '2centspodcast', 'Business', 'active', 'A', true, 90)
ON CONFLICT (youtube_channel_id) DO UPDATE
SET status = 'active', category = 'Business', trust_tier = 'A', auto_approve_uploads = true, updated_at = now();

CREATE OR REPLACE FUNCTION public.detect_content_language(_title text, _fallback text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE t text := COALESCE(_title,''); lt text := lower(COALESCE(_title,''));
BEGIN
  IF t ~ '[\u0980-\u09FF]' THEN RETURN 'bn'; END IF;
  IF t ~ '[\u0900-\u097F]' THEN RETURN 'hi'; END IF;
  IF t ~ '[\u0E00-\u0E7F]' THEN RETURN 'th'; END IF;
  IF t ~ '[\u0780-\u07BF]' THEN RETURN 'dv'; END IF;
  IF t ~ '[\u3040-\u30FF]' THEN RETURN 'ja'; END IF;
  IF t ~ '[\uAC00-\uD7AF]' THEN RETURN 'ko'; END IF;
  IF t ~ '[\u4E00-\u9FFF]' THEN RETURN 'zh'; END IF;
  IF t ~ '[\u0400-\u04FF]' THEN RETURN 'ru'; END IF;
  IF t ~ '[\u0600-\u06FF]' THEN
    IF t ~ '[ٹڈڑںھےگچپژکۓی]' AND t ~ '(کے|کی|کا|ہے|ہیں|نہیں|اور)' THEN RETURN 'ur'; END IF;
    RETURN 'ar';
  END IF;
  IF t ~ '[əƏ]' THEN RETURN 'az'; END IF;
  IF t ~ '[ığşĞİŞ]' OR lt ~ '(^|[^a-z])(nedir|nasil|icin|hakkinda|sohbet|dersleri|olsun|belli)($|[^a-z])' THEN RETURN 'tr'; END IF;
  IF lt ~ '(^|[^a-z])(yang|dengan|untuk|adalah|tidak|kajian|ceramah|ustadz|sholat|shalat|kisah|jangan|apakah|mengapa|bagaimana|hidupmu|terbaru|kepada|sudah|akan|orang|dalam)($|[^a-z])' THEN RETURN 'id'; END IF;
  IF lt ~ '(^|[^a-z])(que|para|como|porque|nuestro|nuestra|hermano|espanol|conferencia|sobre)($|[^a-z])' THEN RETURN 'es'; END IF;
  IF lt ~ '(^|[^a-z])(pour|avec|comment|pourquoi|dieu|priere|conference|musulman|musulmans)($|[^a-z])' THEN RETURN 'fr'; END IF;
  IF lt ~ '(^|[^a-z])(und|nicht|warum|ueber|vortrag|deutsch)($|[^a-z])' THEN RETURN 'de'; END IF;
  RETURN COALESCE(_fallback, 'en');
END;
$$;

UPDATE public.curated_videos v
SET content_language = public.detect_content_language(v.title, v.content_language)
WHERE public.detect_content_language(v.title, v.content_language) <> COALESCE(v.content_language, '');