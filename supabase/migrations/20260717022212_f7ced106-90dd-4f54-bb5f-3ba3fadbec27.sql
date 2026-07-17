
DROP FUNCTION IF EXISTS public.record_learned_signal(UUID,TEXT,TEXT,TEXT);
CREATE OR REPLACE FUNCTION public.record_learned_signal(
  _actor UUID, _feature_type TEXT, _feature_value TEXT, _action TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row RECORD;
  a INT; r INT; v INT; t INT; w NUMERIC;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'actor required (human decisions only)';
  END IF;
  IF _feature_value IS NULL OR _feature_value = '' THEN RETURN; END IF;
  PERFORM set_config('app.actor', _actor::text, true);

  SELECT * INTO row FROM public.moderation_learned_signals
   WHERE feature_type = _feature_type AND feature_value = _feature_value;

  a := COALESCE(row.approvals, 0)  + CASE WHEN _action = 'approve' THEN 1 ELSE 0 END;
  r := COALESCE(row.rejections, 0) + CASE WHEN _action = 'reject'  THEN 1 ELSE 0 END;
  v := COALESCE(row.reverts, 0)    + CASE WHEN _action = 'revert'  THEN 1 ELSE 0 END;
  t := a + r + v;
  w := LEAST(0.25, GREATEST(-0.25, CASE WHEN t = 0 THEN 0 ELSE ((a - r - v)::numeric / t) * 0.25 END));

  IF row.id IS NOT NULL THEN
    UPDATE public.moderation_learned_signals
       SET approvals = a, rejections = r, reverts = v, weight = w,
           version = COALESCE(row.version, 1) + 1, updated_at = now()
     WHERE id = row.id;
  ELSE
    INSERT INTO public.moderation_learned_signals
      (feature_type, feature_value, approvals, rejections, reverts, weight)
    VALUES (_feature_type, _feature_value, a, r, v, w);
  END IF;
END $$;
REVOKE ALL ON FUNCTION public.record_learned_signal(UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_learned_signal(UUID,TEXT,TEXT,TEXT) TO service_role;
