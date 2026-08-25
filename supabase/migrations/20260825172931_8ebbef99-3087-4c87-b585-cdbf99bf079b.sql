-- ---------------------------------------------------------------------------
-- 1. Upload record additions
-- ---------------------------------------------------------------------------
ALTER TABLE public.creator_uploads
  ADD COLUMN IF NOT EXISTS flag_reason_code text,
  ADD COLUMN IF NOT EXISTS uploaded_bytes bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resume_token text,
  ADD COLUMN IF NOT EXISTS detected_language text,
  ADD COLUMN IF NOT EXISTS language_confidence numeric,
  ADD COLUMN IF NOT EXISTS thumbnail_auto boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS duration_auto boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 2. Standardized flag reasons
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_flag_reasons (
  code text PRIMARY KEY,
  label text NOT NULL,
  guidance text NOT NULL,
  severity text NOT NULL DEFAULT 'major',
  appealable boolean NOT NULL DEFAULT true,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_flag_reasons_severity_chk CHECK (severity IN ('minor','major','critical'))
);

GRANT SELECT ON public.creator_flag_reasons TO anon, authenticated;
GRANT ALL ON public.creator_flag_reasons TO service_role;
ALTER TABLE public.creator_flag_reasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_flag_reasons_public_read" ON public.creator_flag_reasons
  FOR SELECT TO anon, authenticated USING (active);

INSERT INTO public.creator_flag_reasons (code, label, guidance, severity, appealable) VALUES
  ('female_presence',    'Female appearance or voice', 'Heartify serves no content featuring women on screen or as narrators. Re-record with a male presenter or audio-only.', 'critical', false),
  ('music',              'Music or instrumentation', 'Remove all background music, jingles and instrumentation. Voice-only audio is required.', 'critical', false),
  ('inappropriate_image','Inappropriate imagery', 'Thumbnails and footage must contain no immodest imagery, dancing, or entertainment visuals.', 'critical', false),
  ('halal_text_pattern', 'Title or description conflicts with policy', 'Rewrite the title and description without clickbait, entertainment framing, or blocked terms.', 'major', true),
  ('not_beneficial',     'Not beneficial knowledge', 'Heartify publishes educational and spiritually beneficial content only.', 'major', true),
  ('unverified_claim',   'Unverified religious claim', 'Cite the Qur''an, hadith or a named scholar for religious rulings stated in the video.', 'major', true),
  ('sectarian_attack',   'Sectarian attack or takfir', 'Disagreement is welcome; attacking or excommunicating other Muslims is not.', 'critical', true),
  ('poor_audio_video',   'Technical quality too low', 'Audio must be clear and video at least 480p, steady, and correctly oriented.', 'minor', true),
  ('metadata_incomplete','Metadata incomplete', 'Provide an accurate title, description, category and language before resubmitting.', 'minor', true),
  ('duplicate',          'Duplicate of existing content', 'This video already exists on Heartify.', 'minor', true),
  ('copyright',          'Rights not held', 'Upload only content you produced or hold explicit permission to publish.', 'major', true),
  ('monetization_spam',  'Promotional or fundraising spam', 'Heartify carries no advertising. Remove promotional calls to action.', 'major', true)
ON CONFLICT (code) DO NOTHING;

ALTER TABLE public.creator_uploads
  DROP CONSTRAINT IF EXISTS creator_uploads_flag_reason_fk;
ALTER TABLE public.creator_uploads
  ADD CONSTRAINT creator_uploads_flag_reason_fk
  FOREIGN KEY (flag_reason_code) REFERENCES public.creator_flag_reasons(code);

-- ---------------------------------------------------------------------------
-- 3. Subscriptions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, user_id)
);

CREATE INDEX IF NOT EXISTS creator_subscriptions_creator_idx ON public.creator_subscriptions (creator_id);
CREATE INDEX IF NOT EXISTS creator_subscriptions_user_idx ON public.creator_subscriptions (user_id, created_at DESC);

GRANT SELECT, INSERT, DELETE ON public.creator_subscriptions TO authenticated;
GRANT ALL ON public.creator_subscriptions TO service_role;
ALTER TABLE public.creator_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_subscriptions_self_read" ON public.creator_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "creator_subscriptions_self_insert" ON public.creator_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "creator_subscriptions_self_delete" ON public.creator_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "creator_subscriptions_owner_read" ON public.creator_subscriptions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.creator_accounts a
    WHERE a.id = creator_subscriptions.creator_id AND a.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- 4. Appeals
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.creator_uploads(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creator_accounts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reason_code text REFERENCES public.creator_flag_reasons(code),
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  resolution_notes text,
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_appeals_status_chk CHECK (status IN ('open','reviewing','upheld','declined')),
  CONSTRAINT creator_appeals_message_chk CHECK (char_length(message) BETWEEN 10 AND 2000)
);

CREATE UNIQUE INDEX IF NOT EXISTS creator_appeals_one_open_idx
  ON public.creator_appeals (upload_id) WHERE status IN ('open','reviewing');
CREATE INDEX IF NOT EXISTS creator_appeals_queue_idx ON public.creator_appeals (status, created_at);

GRANT SELECT ON public.creator_appeals TO authenticated;
GRANT ALL ON public.creator_appeals TO service_role;
ALTER TABLE public.creator_appeals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "creator_appeals_owner_read" ON public.creator_appeals
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "creator_appeals_moderator_read" ON public.creator_appeals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER creator_appeals_touch BEFORE UPDATE ON public.creator_appeals
  FOR EACH ROW EXECUTE FUNCTION public.creator_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 5. Playback telemetry
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.creator_watch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upload_id uuid NOT NULL REFERENCES public.creator_uploads(id) ON DELETE CASCADE,
  user_id uuid,
  session_id text,
  watched_seconds integer NOT NULL DEFAULT 0,
  position_seconds integer NOT NULL DEFAULT 0,
  duration_seconds integer,
  completed boolean NOT NULL DEFAULT false,
  autoplay_ok boolean,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT creator_watch_events_sane_chk CHECK (
    watched_seconds >= 0 AND watched_seconds <= 86400
    AND position_seconds >= 0 AND position_seconds <= 86400
  )
);

CREATE INDEX IF NOT EXISTS creator_watch_events_upload_idx ON public.creator_watch_events (upload_id, created_at DESC);

GRANT INSERT ON public.creator_watch_events TO anon, authenticated;
GRANT SELECT ON public.creator_watch_events TO authenticated;
GRANT ALL ON public.creator_watch_events TO service_role;
ALTER TABLE public.creator_watch_events ENABLE ROW LEVEL SECURITY;

-- Telemetry may only be written for published, halal-verified uploads, and a
-- signed-in writer may not attribute the event to another account.
CREATE POLICY "creator_watch_events_insert" ON public.creator_watch_events
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.creator_uploads u
      WHERE u.id = creator_watch_events.upload_id
        AND u.status = 'approved' AND u.visual_state = 'clean'
    )
  );
CREATE POLICY "creator_watch_events_creator_read" ON public.creator_watch_events
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.creator_uploads u
    WHERE u.id = creator_watch_events.upload_id AND u.user_id = auth.uid()
  ));
CREATE POLICY "creator_watch_events_moderator_read" ON public.creator_watch_events
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 6. Auto language detection on upload rows
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.creator_uploads_autodetect()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE detected text;
BEGIN
  BEGIN
    detected := public.detect_content_language(coalesce(NEW.title,'') || ' ' || coalesce(NEW.description,''));
  EXCEPTION WHEN OTHERS THEN
    detected := NULL;
  END;
  IF detected IS NOT NULL AND detected <> '' THEN
    NEW.detected_language := detected;
    NEW.language_confidence := CASE WHEN detected = NEW.language THEN 0.95 ELSE 0.6 END;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creator_uploads_autodetect_trg ON public.creator_uploads;
CREATE TRIGGER creator_uploads_autodetect_trg
  BEFORE INSERT OR UPDATE OF title, description, language ON public.creator_uploads
  FOR EACH ROW EXECUTE FUNCTION public.creator_uploads_autodetect();

-- ---------------------------------------------------------------------------
-- 7. Public creator profile
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.creator_public_profile(p_handle text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  acct public.creator_accounts;
  is_owner boolean;
  result jsonb;
BEGIN
  SELECT * INTO acct FROM public.creator_accounts
  WHERE handle = lower(trim(p_handle)) LIMIT 1;
  IF acct.id IS NULL THEN RETURN NULL; END IF;

  is_owner := auth.uid() IS NOT NULL AND acct.user_id = auth.uid();
  IF acct.status <> 'active' AND NOT is_owner
     AND NOT (public.has_role(auth.uid(), 'moderator') OR public.has_role(auth.uid(), 'admin')) THEN
    RETURN NULL;
  END IF;

  SELECT jsonb_build_object(
    'id', acct.id,
    'handle', acct.handle,
    'display_name', acct.display_name,
    'bio', acct.bio,
    'country', acct.country,
    'languages', acct.languages,
    'status', acct.status,
    'is_owner', is_owner,
    'joined_at', acct.created_at,
    'subscriber_count', (SELECT count(*) FROM public.creator_subscriptions s WHERE s.creator_id = acct.id),
    'viewer_subscribed', (
      SELECT EXISTS (
        SELECT 1 FROM public.creator_subscriptions s
        WHERE s.creator_id = acct.id AND s.user_id = auth.uid()
      )
    ),
    'published_count', (
      SELECT count(*) FROM public.creator_uploads u
      WHERE u.creator_id = acct.id AND u.status = 'approved' AND u.visual_state = 'clean'
    ),
    'total_views', (
      SELECT coalesce(sum(u.view_count), 0) FROM public.creator_uploads u
      WHERE u.creator_id = acct.id AND u.status = 'approved' AND u.visual_state = 'clean'
    ),
    'uploads', coalesce((
      SELECT jsonb_agg(item ORDER BY item->>'sort_at' DESC)
      FROM (
        SELECT jsonb_build_object(
          'id', u.id,
          'title', u.title,
          'description', u.description,
          'language', u.language,
          'category', u.category,
          'duration_seconds', u.duration_seconds,
          'view_count', u.view_count,
          'published_at', u.published_at,
          'sort_at', coalesce(u.published_at, u.created_at),
          'status', CASE WHEN is_owner THEN u.status ELSE 'approved' END,
          'visual_state', CASE WHEN is_owner THEN u.visual_state ELSE 'clean' END,
          'flag_reason_code', CASE WHEN is_owner THEN u.flag_reason_code ELSE NULL END,
          'review_notes', CASE WHEN is_owner THEN u.review_notes ELSE NULL END
        ) AS item
        FROM public.creator_uploads u
        WHERE u.creator_id = acct.id
          AND (is_owner OR (u.status = 'approved' AND u.visual_state = 'clean'))
        ORDER BY coalesce(u.published_at, u.created_at) DESC
        LIMIT 60
      ) rows
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.creator_public_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.creator_public_profile(text) TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 8. Subscribe toggle
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_creator_subscription(p_creator_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing uuid;
  now_subscribed boolean;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.creator_accounts WHERE id = p_creator_id AND status = 'active') THEN
    RAISE EXCEPTION 'creator not available';
  END IF;

  SELECT id INTO existing FROM public.creator_subscriptions
  WHERE creator_id = p_creator_id AND user_id = uid;

  IF existing IS NULL THEN
    INSERT INTO public.creator_subscriptions (creator_id, user_id) VALUES (p_creator_id, uid);
    now_subscribed := true;
  ELSE
    DELETE FROM public.creator_subscriptions WHERE id = existing;
    now_subscribed := false;
  END IF;

  RETURN jsonb_build_object(
    'subscribed', now_subscribed,
    'subscriber_count', (SELECT count(*) FROM public.creator_subscriptions WHERE creator_id = p_creator_id)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_creator_subscription(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.toggle_creator_subscription(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 9. Creator analytics
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.creator_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  acct_id uuid;
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 365)));
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT id INTO acct_id FROM public.creator_accounts WHERE user_id = uid;
  IF acct_id IS NULL THEN RAISE EXCEPTION 'no creator account'; END IF;

  WITH mine AS (
    SELECT id, title, language, category, status, duration_seconds, view_count,
           published_at, created_at
    FROM public.creator_uploads WHERE creator_id = acct_id
  ),
  ev AS (
    SELECT e.upload_id,
           count(*) AS plays,
           coalesce(sum(e.watched_seconds), 0) AS watch_seconds,
           count(*) FILTER (WHERE e.completed) AS completions,
           count(*) FILTER (WHERE e.autoplay_ok IS TRUE) AS autoplay_ok,
           count(*) FILTER (WHERE e.autoplay_ok IS NOT NULL) AS autoplay_attempts,
           max(e.created_at) AS last_play
    FROM public.creator_watch_events e
    JOIN mine m ON m.id = e.upload_id
    WHERE e.created_at >= since
    GROUP BY e.upload_id
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'window_days', greatest(1, least(coalesce(p_days, 30), 365)),
    'totals', jsonb_build_object(
      'uploads', (SELECT count(*) FROM mine),
      'published', (SELECT count(*) FROM mine WHERE status = 'approved'),
      'views', (SELECT coalesce(sum(view_count), 0) FROM mine),
      'plays', (SELECT coalesce(sum(plays), 0) FROM ev),
      'watch_seconds', (SELECT coalesce(sum(watch_seconds), 0) FROM ev),
      'completion_rate', (
        SELECT CASE WHEN coalesce(sum(plays), 0) = 0 THEN 0
               ELSE round(sum(completions)::numeric / sum(plays) * 100, 1) END FROM ev
      ),
      'autoplay_pass_rate', (
        SELECT CASE WHEN coalesce(sum(autoplay_attempts), 0) = 0 THEN NULL
               ELSE round(sum(autoplay_ok)::numeric / sum(autoplay_attempts) * 100, 1) END FROM ev
      ),
      'subscribers', (SELECT count(*) FROM public.creator_subscriptions WHERE creator_id = acct_id)
    ),
    'videos', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', m.id,
        'title', m.title,
        'status', m.status,
        'language', m.language,
        'category', m.category,
        'duration_seconds', m.duration_seconds,
        'views', m.view_count,
        'plays', coalesce(e.plays, 0),
        'watch_seconds', coalesce(e.watch_seconds, 0),
        'avg_watch_seconds', CASE WHEN coalesce(e.plays, 0) = 0 THEN 0
             ELSE round(e.watch_seconds::numeric / e.plays, 1) END,
        'completion_rate', CASE WHEN coalesce(e.plays, 0) = 0 THEN 0
             ELSE round(e.completions::numeric / e.plays * 100, 1) END,
        'autoplay_pass_rate', CASE WHEN coalesce(e.autoplay_attempts, 0) = 0 THEN NULL
             ELSE round(e.autoplay_ok::numeric / e.autoplay_attempts * 100, 1) END,
        'avg_view_pct', CASE WHEN coalesce(e.plays, 0) = 0 OR coalesce(m.duration_seconds, 0) = 0 THEN NULL
             ELSE round(least(e.watch_seconds::numeric / e.plays / m.duration_seconds, 1) * 100, 1) END,
        'last_play', e.last_play,
        'published_at', m.published_at
      ) ORDER BY coalesce(e.watch_seconds, 0) DESC, m.created_at DESC)
      FROM mine m LEFT JOIN ev e ON e.upload_id = m.id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.creator_analytics(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_analytics(integer) TO authenticated, service_role;

-- Per-video drop-off curve: share of plays that reached each 10% bucket.
CREATE OR REPLACE FUNCTION public.creator_upload_retention(p_upload_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  dur integer;
  owned boolean;
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT duration_seconds, (user_id = uid) INTO dur, owned
  FROM public.creator_uploads WHERE id = p_upload_id;
  IF dur IS NULL AND owned IS NULL THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT coalesce(owned, false)
     AND NOT (public.has_role(uid, 'moderator') OR public.has_role(uid, 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  WITH plays AS (
    SELECT position_seconds, coalesce(nullif(duration_seconds, 0), nullif(dur, 0)) AS d
    FROM public.creator_watch_events WHERE upload_id = p_upload_id
  ),
  total AS (SELECT count(*) AS n FROM plays WHERE d IS NOT NULL),
  buckets AS (SELECT generate_series(1, 10) AS b)
  SELECT jsonb_build_object(
    'upload_id', p_upload_id,
    'plays', (SELECT n FROM total),
    'curve', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'bucket', b.b,
        'pct_of_video', b.b * 10,
        'reached', (SELECT count(*) FROM plays p WHERE p.d IS NOT NULL AND p.position_seconds >= p.d * b.b / 10.0),
        'reached_pct', CASE WHEN (SELECT n FROM total) = 0 THEN 0 ELSE round(
          (SELECT count(*) FROM plays p WHERE p.d IS NOT NULL AND p.position_seconds >= p.d * b.b / 10.0)::numeric
          / (SELECT n FROM total) * 100, 1) END
      ) ORDER BY b.b) FROM buckets b
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.creator_upload_retention(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_upload_retention(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 10. Moderation trail + appeal workflow
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.creator_moderation_trail(p_upload_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  u public.creator_uploads;
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO u FROM public.creator_uploads WHERE id = p_upload_id;
  IF u.id IS NULL THEN RETURN NULL; END IF;
  IF u.user_id <> uid
     AND NOT (public.has_role(uid, 'moderator') OR public.has_role(uid, 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'upload', jsonb_build_object(
      'id', u.id,
      'title', u.title,
      'status', u.status,
      'visual_state', u.visual_state,
      'language', u.language,
      'detected_language', u.detected_language,
      'language_confidence', u.language_confidence,
      'flag_reason_code', u.flag_reason_code,
      'moderation_reason', u.moderation_reason,
      'review_notes', u.review_notes,
      'reviewed_at', u.reviewed_at,
      'published_at', u.published_at,
      'created_at', u.created_at
    ),
    'reason', (
      SELECT jsonb_build_object('code', r.code, 'label', r.label, 'guidance', r.guidance,
                                'severity', r.severity, 'appealable', r.appealable)
      FROM public.creator_flag_reasons r WHERE r.code = u.flag_reason_code
    ),
    'events', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id, 'event', e.event, 'actor_kind', e.actor_kind,
        'detail', e.detail, 'created_at', e.created_at
      ) ORDER BY e.created_at DESC)
      FROM public.creator_upload_events e WHERE e.upload_id = u.id
    ), '[]'::jsonb),
    'appeals', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
        'id', a.id, 'status', a.status, 'message', a.message,
        'resolution_notes', a.resolution_notes, 'created_at', a.created_at,
        'resolved_at', a.resolved_at
      ) ORDER BY a.created_at DESC)
      FROM public.creator_appeals a WHERE a.upload_id = u.id
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.creator_moderation_trail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_moderation_trail(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.submit_creator_appeal(p_upload_id uuid, p_message text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  u public.creator_uploads;
  reason public.creator_flag_reasons;
  msg text := trim(coalesce(p_message, ''));
  appeal_id uuid;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT * INTO u FROM public.creator_uploads WHERE id = p_upload_id;
  IF u.id IS NULL OR u.user_id <> uid THEN RAISE EXCEPTION 'not found'; END IF;
  IF u.status NOT IN ('rejected','removed') THEN
    RAISE EXCEPTION 'only rejected uploads can be appealed';
  END IF;
  IF char_length(msg) < 10 THEN
    msg := 'The creator requests a second review of this decision.';
  END IF;
  IF char_length(msg) > 2000 THEN msg := left(msg, 2000); END IF;

  IF u.flag_reason_code IS NOT NULL THEN
    SELECT * INTO reason FROM public.creator_flag_reasons WHERE code = u.flag_reason_code;
    IF reason.code IS NOT NULL AND NOT reason.appealable THEN
      RAISE EXCEPTION 'this decision is final under the halal content policy';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM public.creator_appeals
             WHERE upload_id = p_upload_id AND status IN ('open','reviewing')) THEN
    RAISE EXCEPTION 'an appeal is already open for this upload';
  END IF;

  INSERT INTO public.creator_appeals (upload_id, creator_id, user_id, reason_code, message)
  VALUES (p_upload_id, u.creator_id, uid, u.flag_reason_code, msg)
  RETURNING id INTO appeal_id;

  INSERT INTO public.creator_upload_events (upload_id, actor_id, actor_kind, event, detail)
  VALUES (p_upload_id, uid, 'creator', 'appeal_opened',
          jsonb_build_object('appeal_id', appeal_id, 'reason_code', u.flag_reason_code));

  RETURN jsonb_build_object('ok', true, 'appeal_id', appeal_id, 'status', 'open');
END;
$$;

REVOKE ALL ON FUNCTION public.submit_creator_appeal(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_creator_appeal(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resolve_creator_appeal(
  p_appeal_id uuid, p_decision text, p_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  a public.creator_appeals;
BEGIN
  IF uid IS NULL OR NOT (public.has_role(uid, 'moderator') OR public.has_role(uid, 'admin')) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_decision NOT IN ('upheld','declined','reviewing') THEN
    RAISE EXCEPTION 'decision must be upheld, declined or reviewing';
  END IF;

  SELECT * INTO a FROM public.creator_appeals WHERE id = p_appeal_id;
  IF a.id IS NULL THEN RAISE EXCEPTION 'not found'; END IF;

  UPDATE public.creator_appeals
  SET status = p_decision,
      resolution_notes = coalesce(p_notes, resolution_notes),
      resolved_by = CASE WHEN p_decision = 'reviewing' THEN resolved_by ELSE uid END,
      resolved_at = CASE WHEN p_decision = 'reviewing' THEN NULL ELSE now() END
  WHERE id = p_appeal_id;

  -- An upheld appeal returns the upload to the review queue; it still cannot
  -- go live without a fresh visual verification by a moderator.
  IF p_decision = 'upheld' THEN
    UPDATE public.creator_uploads
    SET status = 'pending_review', visual_state = 'unchecked',
        moderation_reason = NULL, flag_reason_code = NULL
    WHERE id = a.upload_id;
  END IF;

  INSERT INTO public.creator_upload_events (upload_id, actor_id, actor_kind, event, detail)
  VALUES (a.upload_id, uid, 'moderator', 'appeal_' || p_decision,
          jsonb_build_object('appeal_id', p_appeal_id, 'notes', p_notes));

  RETURN jsonb_build_object('ok', true, 'status', p_decision);
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_creator_appeal(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_creator_appeal(uuid, text, text) TO authenticated, service_role;