
-- Dhikr circles: shared live counters
CREATE TABLE public.dhikr_circles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  phrase TEXT NOT NULL,
  target_count INTEGER NOT NULL CHECK (target_count > 0 AND target_count <= 1000000),
  current_count BIGINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.dhikr_circles TO authenticated;
GRANT ALL ON public.dhikr_circles TO service_role;
ALTER TABLE public.dhikr_circles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can view active circles"
  ON public.dhikr_circles FOR SELECT TO authenticated
  USING (is_active = true OR host_user_id = auth.uid());

CREATE POLICY "Users create their own circles"
  ON public.dhikr_circles FOR INSERT TO authenticated
  WITH CHECK (host_user_id = auth.uid());

CREATE POLICY "Host can update own circle"
  ON public.dhikr_circles FOR UPDATE TO authenticated
  USING (host_user_id = auth.uid())
  WITH CHECK (host_user_id = auth.uid());

CREATE TRIGGER update_dhikr_circles_updated_at
  BEFORE UPDATE ON public.dhikr_circles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Members
CREATE TABLE public.dhikr_circle_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circle_id UUID NOT NULL REFERENCES public.dhikr_circles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contribution BIGINT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (circle_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.dhikr_circle_members TO authenticated;
GRANT ALL ON public.dhikr_circle_members TO service_role;
ALTER TABLE public.dhikr_circle_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view co-members of joined circles"
  ON public.dhikr_circle_members FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dhikr_circle_members m2
      WHERE m2.circle_id = dhikr_circle_members.circle_id
        AND m2.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.dhikr_circles c
      WHERE c.id = dhikr_circle_members.circle_id
        AND c.host_user_id = auth.uid()
    )
  );

CREATE POLICY "Users join circles as themselves"
  ON public.dhikr_circle_members FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_dhikr_circle_members_circle ON public.dhikr_circle_members(circle_id);
CREATE INDEX idx_dhikr_circles_active ON public.dhikr_circles(is_active, created_at DESC);

-- RPC: contribute to a circle atomically
CREATE OR REPLACE FUNCTION public.contribute_to_dhikr_circle(
  _circle_id UUID,
  _count INTEGER
)
RETURNS TABLE (current_count BIGINT, my_contribution BIGINT, target_count INTEGER, is_active BOOLEAN)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid UUID := auth.uid();
  _row public.dhikr_circles%ROWTYPE;
  _mine BIGINT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _count IS NULL OR _count < 1 OR _count > 500 THEN
    RAISE EXCEPTION 'count must be between 1 and 500';
  END IF;

  SELECT * INTO _row FROM public.dhikr_circles WHERE id = _circle_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'circle not found'; END IF;
  IF NOT _row.is_active THEN RAISE EXCEPTION 'circle is closed'; END IF;
  IF _row.ends_at IS NOT NULL AND _row.ends_at < now() THEN
    UPDATE public.dhikr_circles SET is_active = false WHERE id = _circle_id;
    RAISE EXCEPTION 'circle has ended';
  END IF;

  INSERT INTO public.dhikr_circle_members(circle_id, user_id, contribution)
  VALUES (_circle_id, _uid, _count)
  ON CONFLICT (circle_id, user_id)
  DO UPDATE SET contribution = public.dhikr_circle_members.contribution + EXCLUDED.contribution
  RETURNING contribution INTO _mine;

  UPDATE public.dhikr_circles
     SET current_count = current_count + _count,
         is_active = CASE WHEN current_count + _count >= target_count THEN false ELSE is_active END
   WHERE id = _circle_id
  RETURNING dhikr_circles.current_count, dhikr_circles.target_count, dhikr_circles.is_active
       INTO _row.current_count, _row.target_count, _row.is_active;

  RETURN QUERY SELECT _row.current_count, _mine, _row.target_count, _row.is_active;
END;
$$;

REVOKE ALL ON FUNCTION public.contribute_to_dhikr_circle(UUID, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contribute_to_dhikr_circle(UUID, INTEGER) TO authenticated;

-- RPC: end a circle (host only)
CREATE OR REPLACE FUNCTION public.end_dhikr_circle(_circle_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  UPDATE public.dhikr_circles
     SET is_active = false
   WHERE id = _circle_id AND host_user_id = auth.uid();
  IF NOT FOUND THEN RAISE EXCEPTION 'not host or circle missing'; END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.end_dhikr_circle(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_dhikr_circle(UUID) TO authenticated;
