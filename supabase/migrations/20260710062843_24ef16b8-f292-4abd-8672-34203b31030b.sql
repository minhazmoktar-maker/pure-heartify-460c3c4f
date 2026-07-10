
CREATE TABLE public.nudges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_nudges_sender_created ON public.nudges (sender_id, created_at DESC);
CREATE INDEX idx_nudges_recipient_created ON public.nudges (recipient_id, created_at DESC);

GRANT SELECT ON public.nudges TO authenticated;
GRANT ALL ON public.nudges TO service_role;

ALTER TABLE public.nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender and recipient can view their nudges"
  ON public.nudges FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- No direct INSERT: all writes go through send_nudge_by_handle RPC.

CREATE OR REPLACE FUNCTION public.send_nudge_by_handle(
  _handle TEXT,
  _kind TEXT,
  _message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  sender_id UUID := auth.uid();
  recipient_id UUID;
  today_count INT;
  today_to_recipient INT;
  new_id UUID;
  clean_message TEXT;
  clean_kind TEXT;
BEGIN
  IF sender_id IS NULL THEN
    RETURN jsonb_build_object('error','unauthenticated');
  END IF;

  clean_kind := lower(coalesce(_kind, 'general'));
  IF clean_kind NOT IN ('streak','dose','khatm','general') THEN
    RETURN jsonb_build_object('error','invalid_kind');
  END IF;

  clean_message := trim(coalesce(_message, ''));
  IF length(clean_message) = 0 OR length(clean_message) > 240 THEN
    RETURN jsonb_build_object('error','invalid_message');
  END IF;

  SELECT user_id INTO recipient_id
  FROM public.profiles
  WHERE lower(handle) = lower(trim(_handle))
  LIMIT 1;

  IF recipient_id IS NULL THEN
    RETURN jsonb_build_object('error','handle_not_found');
  END IF;

  IF recipient_id = sender_id THEN
    RETURN jsonb_build_object('error','cannot_nudge_self');
  END IF;

  SELECT count(*)::int INTO today_count
  FROM public.nudges
  WHERE sender_id = auth.uid() AND created_at > now() - interval '24 hours';

  IF today_count >= 5 THEN
    RETURN jsonb_build_object('error','daily_limit_reached');
  END IF;

  SELECT count(*)::int INTO today_to_recipient
  FROM public.nudges
  WHERE sender_id = auth.uid()
    AND nudges.recipient_id = send_nudge_by_handle.recipient_id
    AND created_at > now() - interval '24 hours';

  IF today_to_recipient >= 1 THEN
    RETURN jsonb_build_object('error','recipient_already_nudged_today');
  END IF;

  INSERT INTO public.nudges (sender_id, recipient_id, kind, message)
  VALUES (auth.uid(), recipient_id, clean_kind, clean_message)
  RETURNING id INTO new_id;

  INSERT INTO public.user_notifications (user_id, kind, title, body, data)
  VALUES (
    recipient_id,
    'nudge',
    'A friend sent you a nudge',
    clean_message,
    jsonb_build_object('nudge_id', new_id, 'kind', clean_kind, 'sender_id', auth.uid())
  );

  RETURN jsonb_build_object('ok', true, 'id', new_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_nudge_by_handle(TEXT, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_my_nudges_sent(_limit INT DEFAULT 20)
RETURNS TABLE (id UUID, recipient_id UUID, kind TEXT, message TEXT, created_at TIMESTAMPTZ)
LANGUAGE sql
STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, recipient_id, kind, message, created_at
  FROM public.nudges
  WHERE sender_id = auth.uid()
  ORDER BY created_at DESC
  LIMIT LEAST(coalesce(_limit, 20), 100);
$$;

GRANT EXECUTE ON FUNCTION public.list_my_nudges_sent(INT) TO authenticated;
