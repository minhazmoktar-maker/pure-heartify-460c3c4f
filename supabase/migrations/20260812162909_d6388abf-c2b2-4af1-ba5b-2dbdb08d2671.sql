CREATE OR REPLACE FUNCTION public.halal_deny_female_names_pattern()
RETURNS text LANGUAGE sql IMMUTABLE SET search_path TO 'public' AS $$
  SELECT '(^|[^a-z])(yvonne ridl[ae]y|yvonne ridley|haleh banani|mehreen|mia yilin|leila hormozi|layla hormozi|lauren booth|na[ai]ma b\.? robert|yasmin mogahed|nouran hussein)($|[^a-z])'::text
$$;

CREATE OR REPLACE FUNCTION public._enforce_no_female_no_music()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $function$
DECLARE
  pat text := '(^|[^a-z])(female|females|woman|women|girl|girls|actress|actresses|singer|singers|song|songs|music|musical|musician|musicians|band|bands|concert|concerts|nasheed|nasheeds|anasheed|sister|sisters|ustadha|shaykha|dance|dancer|dancing|kpop|k-pop|kdrama|k-drama|anime|manga|movie|movies|film|films|netflix|hollywood|bollywood|celebrity|celebrities|gossip|dating|romance|romantic|kiss|kissing|nude|nudity|sexy|sex|sexual|porn|pornstar|onlyfans)($|[^a-z])';
  ar  text := public.halal_deny_female_ar_pattern();
  intl_latin text := public.halal_deny_female_intl_latin_pattern();
  intl_script text := public.halal_deny_female_intl_script_pattern();
  names text := public.halal_deny_female_names_pattern();
BEGIN
  IF lower(COALESCE(NEW.title,'')) ~* pat OR lower(COALESCE(NEW.channel_title,'')) ~* pat
     OR COALESCE(NEW.title,'') ~ ar OR COALESCE(NEW.channel_title,'') ~ ar
     OR lower(COALESCE(NEW.title,'')) ~* intl_latin OR lower(COALESCE(NEW.channel_title,'')) ~* intl_latin
     OR COALESCE(NEW.title,'') ~ intl_script OR COALESCE(NEW.channel_title,'') ~ intl_script
     OR lower(COALESCE(NEW.title,'')) ~* names OR lower(COALESCE(NEW.channel_title,'')) ~* names THEN
    NEW.is_hidden := true;
    NEW.is_archived := true;
    NEW.moderation_state := 'rejected';
    NEW.moderation_reasoning := COALESCE(NEW.moderation_reasoning,'') || ' | policy: no female / no music';
  END IF;
  RETURN NEW;
END;
$function$;

INSERT INTO public.blocked_creators (pattern, reason, match_mode)
VALUES
  ('Islam On Demand', 'off-policy: female-featured content', 'channel_exact'),
  ('IQRA TV', 'off-policy: female-featured content', 'channel_exact')
ON CONFLICT DO NOTHING;

UPDATE public.curated_videos v
SET is_hidden = true, is_archived = true, moderation_state = 'rejected',
    moderation_reasoning = COALESCE(v.moderation_reasoning,'') || ' | policy: blocked channel'
WHERE (v.is_archived = false OR v.is_hidden = false)
  AND lower(COALESCE(v.channel_title,'')) IN ('islam on demand','iqra tv','iqraa tv');

UPDATE public.curated_videos v
SET is_hidden = true, is_archived = true, moderation_state = 'rejected',
    moderation_reasoning = COALESCE(v.moderation_reasoning,'') || ' | policy: no female (named presenter)'
WHERE (v.is_archived = false OR v.is_hidden = false)
  AND (
    lower(COALESCE(v.title,'')) ~* public.halal_deny_female_names_pattern()
    OR lower(COALESCE(v.channel_title,'')) ~* public.halal_deny_female_names_pattern()
  );