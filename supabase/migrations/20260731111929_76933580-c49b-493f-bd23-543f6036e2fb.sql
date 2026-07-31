CREATE TABLE public.benefit_labels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  video_id text NOT NULL,
  video_title text,
  horizon_days integer NOT NULL CHECK (horizon_days IN (7, 30, 90)),
  watched_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  asked_at timestamptz,
  responded_at timestamptz,
  worth_it text CHECK (worth_it IN ('clearly_yes', 'somewhat', 'not_really', 'regret')),
  remembered boolean,
  acted_on boolean,
  note text CHECK (note IS NULL OR length(note) <= 500),
  dismissed_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, video_id, horizon_days)
);

GRANT SELECT, UPDATE ON public.benefit_labels TO authenticated;
GRANT ALL ON public.benefit_labels TO service_role;

ALTER TABLE public.benefit_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own benefit labels"
  ON public.benefit_labels FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins read all benefit labels"
  ON public.benefit_labels FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users answer own benefit labels"
  ON public.benefit_labels FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_benefit_labels_due
  ON public.benefit_labels (user_id, due_at)
  WHERE responded_at IS NULL;

CREATE INDEX idx_benefit_labels_video
  ON public.benefit_labels (video_id, horizon_days)
  WHERE responded_at IS NOT NULL;

CREATE TRIGGER benefit_labels_touch
  BEFORE UPDATE ON public.benefit_labels
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Immutable fields: a user may only fill in their answer, never rewrite the subject.
CREATE OR REPLACE FUNCTION public.benefit_labels_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'admin') THEN
    NEW.user_id := OLD.user_id;
    NEW.video_id := OLD.video_id;
    NEW.video_title := OLD.video_title;
    NEW.horizon_days := OLD.horizon_days;
    NEW.watched_at := OLD.watched_at;
    NEW.due_at := OLD.due_at;
    NEW.created_at := OLD.created_at;
    -- answers are write-once
    IF OLD.responded_at IS NOT NULL THEN
      NEW.worth_it := OLD.worth_it;
      NEW.remembered := OLD.remembered;
      NEW.acted_on := OLD.acted_on;
      NEW.note := OLD.note;
      NEW.responded_at := OLD.responded_at;
    ELSIF NEW.worth_it IS NOT NULL AND NEW.responded_at IS NULL THEN
      NEW.responded_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER benefit_labels_guard_trg
  BEFORE UPDATE ON public.benefit_labels
  FOR EACH ROW EXECUTE FUNCTION public.benefit_labels_guard();

-- Schedule questions for completed watches at T+7 / T+30 / T+90.
CREATE OR REPLACE FUNCTION public.enqueue_benefit_labels(_limit integer DEFAULT 5000)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  created integer := 0;
BEGIN
  WITH eligible AS (
    SELECT DISTINCT ON (w.user_id, w.video_id)
           w.user_id, w.video_id, w.video_title, w.watched_at
    FROM public.watch_history w
    WHERE w.user_id IS NOT NULL
      AND (
        w.completed
        OR (COALESCE(w.duration_seconds, 0) > 0
            AND w.progress_seconds >= GREATEST(120, w.duration_seconds / 2))
      )
    ORDER BY w.user_id, w.video_id, w.watched_at DESC
    LIMIT GREATEST(_limit, 0)
  ), horizons AS (
    SELECT e.*, h.d AS horizon
    FROM eligible e
    CROSS JOIN (VALUES (7), (30), (90)) AS h(d)
  ), ins AS (
    INSERT INTO public.benefit_labels
      (user_id, video_id, video_title, horizon_days, watched_at, due_at)
    SELECT user_id, video_id, video_title, horizon,
           watched_at + (horizon || ' days')::interval
    FROM horizons
    ON CONFLICT (user_id, video_id, horizon_days) DO NOTHING
    RETURNING 1
  )
  SELECT COUNT(*) INTO created FROM ins;

  RETURN jsonb_build_object('scheduled', created, 'at', now());
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_benefit_labels(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.enqueue_benefit_labels(integer) TO service_role;

-- Next due question for the signed-in user (at most one at a time).
CREATE OR REPLACE FUNCTION public.get_due_benefit_label()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  row_out jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  UPDATE public.benefit_labels b
  SET asked_at = COALESCE(b.asked_at, now())
  WHERE b.id = (
    SELECT id FROM public.benefit_labels
    WHERE user_id = auth.uid()
      AND responded_at IS NULL
      AND due_at <= now()
      AND dismissed_count < 3
    ORDER BY horizon_days DESC, due_at
    LIMIT 1
  )
  RETURNING jsonb_build_object(
    'id', b.id,
    'video_id', b.video_id,
    'video_title', b.video_title,
    'horizon_days', b.horizon_days,
    'watched_at', b.watched_at
  ) INTO row_out;

  RETURN row_out;
END;
$$;

REVOKE ALL ON FUNCTION public.get_due_benefit_label() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_due_benefit_label() TO authenticated;

-- Record an answer (or a dismissal).
CREATE OR REPLACE FUNCTION public.submit_benefit_label(
  _id uuid,
  _worth_it text DEFAULT NULL,
  _remembered boolean DEFAULT NULL,
  _acted_on boolean DEFAULT NULL,
  _note text DEFAULT NULL,
  _dismiss boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  IF _dismiss THEN
    UPDATE public.benefit_labels
    SET dismissed_count = dismissed_count + 1,
        due_at = now() + interval '3 days'
    WHERE id = _id AND user_id = auth.uid() AND responded_at IS NULL;
    RETURN FOUND;
  END IF;

  IF _worth_it IS NULL OR _worth_it NOT IN ('clearly_yes','somewhat','not_really','regret') THEN
    RAISE EXCEPTION 'invalid worth_it value';
  END IF;

  UPDATE public.benefit_labels
  SET worth_it = _worth_it,
      remembered = _remembered,
      acted_on = _acted_on,
      note = NULLIF(left(COALESCE(_note, ''), 500), ''),
      responded_at = now()
  WHERE id = _id AND user_id = auth.uid() AND responded_at IS NULL;

  ok := FOUND;
  RETURN ok;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_benefit_label(uuid, text, boolean, boolean, text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_benefit_label(uuid, text, boolean, boolean, text, boolean) TO authenticated;

-- Admin reporting.
CREATE OR REPLACE FUNCTION public.benefit_label_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'admin only';
  END IF;

  RETURN jsonb_build_object(
    'computed_at', now(),
    'total_scheduled', (SELECT COUNT(*) FROM public.benefit_labels),
    'total_due', (SELECT COUNT(*) FROM public.benefit_labels WHERE due_at <= now() AND responded_at IS NULL),
    'total_responded', (SELECT COUNT(*) FROM public.benefit_labels WHERE responded_at IS NOT NULL),
    'unique_respondents', (SELECT COUNT(DISTINCT user_id) FROM public.benefit_labels WHERE responded_at IS NOT NULL),
    'by_horizon', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'horizon_days')
      FROM (
        SELECT jsonb_build_object(
          'horizon_days', horizon_days,
          'scheduled', COUNT(*),
          'asked', COUNT(*) FILTER (WHERE asked_at IS NOT NULL),
          'responded', COUNT(*) FILTER (WHERE responded_at IS NOT NULL),
          'worth_it_rate', ROUND(
            COALESCE(
              COUNT(*) FILTER (WHERE worth_it IN ('clearly_yes','somewhat'))::numeric
              / NULLIF(COUNT(*) FILTER (WHERE responded_at IS NOT NULL), 0), 0), 3),
          'clearly_yes_rate', ROUND(
            COALESCE(
              COUNT(*) FILTER (WHERE worth_it = 'clearly_yes')::numeric
              / NULLIF(COUNT(*) FILTER (WHERE responded_at IS NOT NULL), 0), 0), 3)
        ) AS x
        FROM public.benefit_labels
        GROUP BY horizon_days
      ) s
    ), '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.benefit_label_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.benefit_label_stats() TO authenticated;