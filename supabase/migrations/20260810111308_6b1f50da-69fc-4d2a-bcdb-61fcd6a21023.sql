CREATE OR REPLACE FUNCTION public.social_notify(
  _user_id uuid,
  _kind text,
  _title text,
  _body text,
  _data jsonb DEFAULT '{}'::jsonb,
  _max_per_day int DEFAULT 10
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE allowed boolean; sent int; pref_kind text;
BEGIN
  IF _user_id IS NULL THEN RETURN false; END IF;

  -- Social events share one umbrella preference row ("Social & mentions"),
  -- while rate limits stay per event kind.
  pref_kind := CASE
    WHEN _kind LIKE 'connection\_%' OR _kind LIKE 'challenge\_%' OR _kind = 'nudge' THEN 'social'
    ELSE _kind END;

  SELECT COALESCE(np.in_app_enabled, true) INTO allowed
    FROM public.notification_preferences np
   WHERE np.user_id = _user_id AND np.kind = pref_kind
   LIMIT 1;
  IF allowed IS NULL THEN allowed := true; END IF;
  IF NOT allowed THEN RETURN false; END IF;

  SELECT count(*)::int INTO sent
    FROM public.user_notifications n
   WHERE n.user_id = _user_id AND n.kind = _kind
     AND n.created_at > now() - interval '24 hours';
  IF sent >= GREATEST(_max_per_day, 1) THEN RETURN false; END IF;

  INSERT INTO public.user_notifications (user_id, kind, title, body, data)
  VALUES (_user_id, _kind, _title, _body, COALESCE(_data, '{}'::jsonb));
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.social_notify(uuid, text, text, text, jsonb, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.social_notify(uuid, text, text, text, jsonb, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.social_notify(uuid, text, text, text, jsonb, int) TO service_role;