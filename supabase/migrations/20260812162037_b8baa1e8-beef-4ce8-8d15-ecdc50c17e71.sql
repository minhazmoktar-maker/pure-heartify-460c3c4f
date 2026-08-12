CREATE OR REPLACE FUNCTION public.detect_content_language(_title text, _fallback text DEFAULT NULL)
RETURNS text LANGUAGE plpgsql IMMUTABLE SET search_path TO 'public' AS $$
DECLARE
  t text := COALESCE(_title,'');
  lt text := lower(COALESCE(_title,''));
  weak int := 0;
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

  -- Uzbek (Latin): distinctive orthography + high-frequency words.
  IF lt ~ '(oʻ|o‘|gʻ|g‘)' OR lt ~ '(^|[^a-z])(surasi|tafsiri|karim|haqida|qanday|nima|ustoz|shayx|hadis|namoz|dars|savol|javob|hayoti|kitob|uchun|bilan|degan)($|[^a-z])' THEN
    RETURN 'uz';
  END IF;

  IF t ~ '[ığşĞİŞ]' OR lt ~ '(^|[^a-z])(nedir|nasil|icin|hakkinda|sohbet|dersleri|olsun|belli)($|[^a-z])' THEN RETURN 'tr'; END IF;

  IF lt ~ '(^|[^a-z])(yang|dengan|untuk|adalah|tidak|bukan|kajian|ceramah|ustadz|ustaz|sholat|shalat|solat|kisah|jangan|apakah|mengapa|bagaimana|kenapa|terbaru|kepada|tentang|sebagai|karena|kerana|sudah|belum|harus|boleh|bisa|banyak|seperti|dalam|orang|hidup|akan|saja|juga|kalau|kita|saya|kamu|lebih|tanpa|setiap|selalu|semua|hanya|masih|dosa|surga|neraka|rezeki|hukumnya)($|[^a-z])' THEN
    RETURN 'id';
  END IF;
  IF lt ~ '(^|[^a-z])di [a-z]{3,}' THEN weak := weak + 1; END IF;
  IF lt ~ '(^|[^a-z])ke [a-z]{3,}' THEN weak := weak + 1; END IF;
  IF lt ~ '[a-z]{3,}(nya|kan|lah|kah)($|[^a-z])' THEN weak := weak + 1; END IF;
  IF lt ~ '(^|[^a-z])(me|ber|pe|ter)[a-z]{4,}(an|i)($|[^a-z])' THEN weak := weak + 1; END IF;
  IF weak >= 2 THEN RETURN 'id'; END IF;

  IF lt ~ '(^|[^a-z])(que|para|como|porque|nuestro|nuestra|hermano|espanol|conferencia|sobre|dios|oracion)($|[^a-z])' THEN RETURN 'es'; END IF;
  IF lt ~ '(^|[^a-z])(pour|avec|comment|pourquoi|dieu|priere|conference|musulman|musulmans|grand|grande|mosquee|cheick|cheikh|imam de|les|des|une|dans|sur le|sur la|ville)($|[^a-z])'
     OR t ~ '(É|È|Ê|Ç|Œ|é la |mosquée|prière)' THEN RETURN 'fr'; END IF;
  IF lt ~ '(^|[^a-z])(nao|voce|sobre o|oracao|muculmano|palestra|licao)($|[^a-z])' THEN RETURN 'pt'; END IF;
  IF lt ~ '(^|[^a-z])(und|nicht|warum|ueber|vortrag|deutsch)($|[^a-z])' THEN RETURN 'de'; END IF;
  RETURN COALESCE(_fallback, 'en');
END;
$$;

UPDATE public.curated_videos v
SET content_language = public.detect_content_language(v.title, v.content_language)
WHERE public.detect_content_language(v.title, v.content_language) <> COALESCE(v.content_language, '');