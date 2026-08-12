-- 1. Arabic female-indicator pattern (Latin-boundary regex cannot match Arabic).
CREATE OR REPLACE FUNCTION public.halal_deny_female_ar_pattern()
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT '(المتسابقة|متسابقة|المتسابقات|القارئة|قارئة|القارئات|المقرئة|مقرئة|الطالبة|طالبة|الطفلة|طفلة|الشيخة|شيخة|الأستاذة|أستاذة|الاستاذة|الدكتورة|دكتورة|الفتاة|فتاة|فتيات|البنت|بنات|امرأة|المرأة|نساء|النساء|سيدة|السيدة|سيدات|الأخت|الاخت|أخواتي|اخواتي|مغنية|راقصة|ممثلة|أغنية|اغنية|أغاني|اغاني|موسيقى|موسيقية)'::text
$function$;

-- 2. Enforce it on write, alongside the existing English policy.
CREATE OR REPLACE FUNCTION public._enforce_no_female_no_music()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  pat text := '(^|[^a-z])(female|females|woman|women|girl|girls|actress|actresses|singer|singers|song|songs|music|musical|musician|musicians|band|bands|concert|concerts|nasheed|nasheeds|anasheed|sister|sisters|ustadha|shaykha|dance|dancer|dancing|kpop|k-pop|kdrama|k-drama|anime|manga|movie|movies|film|films|netflix|hollywood|bollywood|celebrity|celebrities|gossip|dating|romance|romantic|kiss|kissing|nude|nudity|sexy|sex|sexual|porn|pornstar|onlyfans)($|[^a-z])';
  ar  text := public.halal_deny_female_ar_pattern();
BEGIN
  IF lower(COALESCE(NEW.title,'')) ~* pat OR lower(COALESCE(NEW.channel_title,'')) ~* pat
     OR COALESCE(NEW.title,'') ~ ar OR COALESCE(NEW.channel_title,'') ~ ar THEN
    NEW.is_hidden := true;
    NEW.is_archived := true;
    NEW.moderation_state := 'rejected';
    NEW.moderation_reasoning := COALESCE(NEW.moderation_reasoning,'') || ' | policy: no female / no music';
  END IF;
  RETURN NEW;
END;
$function$;

-- 3. Block the reported channel by exact name.
INSERT INTO public.blocked_creators (pattern, match_mode, reason)
VALUES ('مزامير ليبيا | Quran', 'channel_exact', 'Female-featured Quran competition content'),
       ('مزامير ليبيا', 'substring', 'Female-featured Quran competition content')
ON CONFLICT DO NOTHING;

-- 4. Purge existing matching content.
UPDATE public.curated_videos
SET is_archived = true, is_hidden = true, moderation_state = 'rejected',
    moderation_reasoning = COALESCE(moderation_reasoning,'') || ' | policy: no female (ar) / blocked channel'
WHERE (is_archived = false OR is_hidden = false OR moderation_state IN ('approved','auto_approved'))
  AND (
    channel_title ILIKE '%مزامير ليبيا%'
    OR title ~ public.halal_deny_female_ar_pattern()
    OR channel_title ~ public.halal_deny_female_ar_pattern()
  );
