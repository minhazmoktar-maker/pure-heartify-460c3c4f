
CREATE OR REPLACE FUNCTION public.record_learned_signal(
  _actor UUID, _signal_type TEXT, _value TEXT, _action TEXT
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'actor required (human decisions only)';
  END IF;
  PERFORM set_config('app.actor', _actor::text, true);
  INSERT INTO public.moderation_learned_signals (signal_type, value, approved_count, rejected_count, last_actor, last_action_at)
  VALUES (
    _signal_type, _value,
    CASE WHEN _action = 'approve' THEN 1 ELSE 0 END,
    CASE WHEN _action = 'reject'  THEN 1 ELSE 0 END,
    _actor, now()
  )
  ON CONFLICT (signal_type, value) DO UPDATE
    SET approved_count = public.moderation_learned_signals.approved_count + EXCLUDED.approved_count,
        rejected_count = public.moderation_learned_signals.rejected_count + EXCLUDED.rejected_count,
        last_actor = EXCLUDED.last_actor,
        last_action_at = EXCLUDED.last_action_at;
END $$;
REVOKE ALL ON FUNCTION public.record_learned_signal(UUID,TEXT,TEXT,TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_learned_signal(UUID,TEXT,TEXT,TEXT) TO service_role;
