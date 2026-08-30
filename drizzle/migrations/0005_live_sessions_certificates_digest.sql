-- ============ LIVE SOCIAL LOOPS ============
CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'study_circle',
  title text NOT NULL,
  description text,
  video_id text,
  language text NOT NULL DEFAULT 'en',
  status text NOT NULL DEFAULT 'scheduled',
  is_public boolean NOT NULL DEFAULT true,
  max_participants integer NOT NULL DEFAULT 50,
  scheduled_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  ended_at timestamptz,
  participant_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_sessions_kind_chk CHECK (kind IN ('study_circle','qa','watch_party')),
  CONSTRAINT live_sessions_status_chk CHECK (status IN ('scheduled','live','ended','cancelled'))
);
CREATE INDEX live_sessions_browse_idx ON public.live_sessions (is_public, status, scheduled_at DESC);
CREATE INDEX live_sessions_host_idx ON public.live_sessions (host_id, scheduled_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_sessions TO authenticated;
GRANT SELECT ON public.live_sessions TO anon;
GRANT ALL ON public.live_sessions TO service_role;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY live_sessions_public_read ON public.live_sessions FOR SELECT TO anon, authenticated
  USING (is_public = true OR host_id = auth.uid());
CREATE POLICY live_sessions_host_insert ON public.live_sessions FOR INSERT TO authenticated
  WITH CHECK (host_id = auth.uid());
CREATE POLICY live_sessions_host_update ON public.live_sessions FOR UPDATE TO authenticated
  USING (host_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (host_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));
CREATE POLICY live_sessions_host_delete ON public.live_sessions FOR DELETE TO authenticated
  USING (host_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.live_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'participant',
  joined_at timestamptz NOT NULL DEFAULT now(),
  left_at timestamptz,
  UNIQUE (session_id, user_id)
);
CREATE INDEX live_session_participants_session_idx ON public.live_session_participants (session_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_session_participants TO authenticated;
GRANT ALL ON public.live_session_participants TO service_role;
ALTER TABLE public.live_session_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY lsp_read ON public.live_session_participants FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = session_id AND (s.host_id = auth.uid() OR s.is_public = true)));
CREATE POLICY lsp_insert_own ON public.live_session_participants FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY lsp_update_own ON public.live_session_participants FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY lsp_delete_own ON public.live_session_participants FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.host_id = auth.uid()));

CREATE TABLE public.live_session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  body text NOT NULL,
  is_question boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT live_session_messages_body_chk CHECK (char_length(btrim(body)) BETWEEN 1 AND 1000)
);
CREATE INDEX live_session_messages_session_idx ON public.live_session_messages (session_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_session_messages TO authenticated;
GRANT ALL ON public.live_session_messages TO service_role;
ALTER TABLE public.live_session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY lsm_read ON public.live_session_messages FOR SELECT TO authenticated
  USING (is_hidden = false AND EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = session_id AND (s.is_public = true OR s.host_id = auth.uid())));
CREATE POLICY lsm_insert_own ON public.live_session_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.live_session_participants p
    WHERE p.session_id = live_session_messages.session_id AND p.user_id = auth.uid()));
CREATE POLICY lsm_moderate ON public.live_session_messages FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.host_id = auth.uid())
    OR has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (true);
CREATE POLICY lsm_delete ON public.live_session_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.live_sessions s WHERE s.id = session_id AND s.host_id = auth.uid()));

CREATE TRIGGER live_sessions_touch BEFORE UPDATE ON public.live_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_session_participants;

CREATE OR REPLACE FUNCTION public.list_live_sessions(_kind text DEFAULT NULL, _limit integer DEFAULT 30)
RETURNS TABLE (
  id uuid, kind text, title text, description text, video_id text, language text,
  status text, scheduled_at timestamptz, participant_count integer,
  max_participants integer, host_id uuid, host_name text, host_avatar text, is_joined boolean
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.kind, s.title, s.description, s.video_id, s.language, s.status,
         s.scheduled_at, s.participant_count, s.max_participants, s.host_id,
         p.display_name, p.avatar_url,
         EXISTS (SELECT 1 FROM live_session_participants lp
                 WHERE lp.session_id = s.id AND lp.user_id = auth.uid() AND lp.left_at IS NULL)
  FROM live_sessions s
  LEFT JOIN profiles p ON p.id = s.host_id
  WHERE s.is_public = true
    AND s.status IN ('scheduled','live')
    AND (_kind IS NULL OR s.kind = _kind)
    AND s.scheduled_at > now() - interval '6 hours'
  ORDER BY (s.status = 'live') DESC, s.scheduled_at ASC
  LIMIT LEAST(COALESCE(_limit, 30), 100)
$$;
REVOKE ALL ON FUNCTION public.list_live_sessions(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_live_sessions(text, integer) TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.join_live_session(_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_count integer; v_max integer; v_public boolean;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT participant_count, max_participants, is_public INTO v_count, v_max, v_public
  FROM live_sessions WHERE id = _session_id AND status IN ('scheduled','live') FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'not_found'); END IF;
  IF v_public IS NOT TRUE THEN RETURN jsonb_build_object('ok', false, 'error', 'private'); END IF;
  IF v_count >= v_max THEN RETURN jsonb_build_object('ok', false, 'error', 'full'); END IF;
  INSERT INTO live_session_participants (session_id, user_id)
  VALUES (_session_id, v_uid)
  ON CONFLICT (session_id, user_id) DO UPDATE SET left_at = NULL;
  UPDATE live_sessions SET participant_count = (
    SELECT count(*) FROM live_session_participants
    WHERE session_id = _session_id AND left_at IS NULL) WHERE id = _session_id;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.join_live_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.join_live_session(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.leave_live_session(_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  UPDATE live_session_participants SET left_at = now()
  WHERE session_id = _session_id AND user_id = v_uid;
  UPDATE live_sessions SET participant_count = (
    SELECT count(*) FROM live_session_participants
    WHERE session_id = _session_id AND left_at IS NULL) WHERE id = _session_id;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.leave_live_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.leave_live_session(uuid) TO authenticated;

-- ============ LEARNING CERTIFICATES ============
CREATE TABLE public.learning_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  path_id uuid NOT NULL REFERENCES public.learning_paths(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  recipient_name text,
  concepts_completed integer NOT NULL DEFAULT 0,
  issued_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, path_id)
);
CREATE INDEX learning_certificates_user_idx ON public.learning_certificates (user_id, issued_at DESC);

GRANT SELECT ON public.learning_certificates TO authenticated;
GRANT ALL ON public.learning_certificates TO service_role;
ALTER TABLE public.learning_certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY learning_certificates_select_own ON public.learning_certificates FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.issue_learning_certificate(_path_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid(); v_total integer; v_done integer; v_code text; v_name text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  SELECT count(*) INTO v_total FROM learning_path_steps WHERE path_id = _path_id;
  IF COALESCE(v_total,0) = 0 THEN RETURN jsonb_build_object('ok', false, 'error', 'empty_path'); END IF;
  SELECT count(*) INTO v_done FROM learning_path_progress
   WHERE path_id = _path_id AND user_id = v_uid
     AND concept_id IN (SELECT concept_id FROM learning_path_steps WHERE path_id = _path_id);
  IF v_done < v_total THEN
    RETURN jsonb_build_object('ok', false, 'error', 'incomplete', 'completed', v_done, 'total', v_total);
  END IF;
  SELECT display_name INTO v_name FROM profiles WHERE id = v_uid;
  v_code := 'HFY-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10));
  INSERT INTO learning_certificates (user_id, path_id, code, recipient_name, concepts_completed)
  VALUES (v_uid, _path_id, v_code, v_name, v_total)
  ON CONFLICT (user_id, path_id) DO UPDATE SET concepts_completed = EXCLUDED.concepts_completed
  RETURNING code INTO v_code;
  RETURN jsonb_build_object('ok', true, 'code', v_code, 'total', v_total);
END $$;
REVOKE ALL ON FUNCTION public.issue_learning_certificate(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_learning_certificate(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_certificate(_code text)
RETURNS TABLE (code text, recipient_name text, path_title text, concepts_completed integer, issued_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.code, c.recipient_name, p.title, c.concepts_completed, c.issued_at
  FROM learning_certificates c
  JOIN learning_paths p ON p.id = c.path_id
  WHERE upper(btrim(c.code)) = upper(btrim(_code))
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_certificate(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_certificate(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_learning_certificates()
RETURNS TABLE (code text, path_id uuid, path_title text, path_slug text, concepts_completed integer, issued_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.code, c.path_id, p.title, p.slug, c.concepts_completed, c.issued_at
  FROM learning_certificates c
  JOIN learning_paths p ON p.id = c.path_id
  WHERE c.user_id = auth.uid()
  ORDER BY c.issued_at DESC
$$;
REVOKE ALL ON FUNCTION public.my_learning_certificates() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_learning_certificates() TO authenticated;

-- ============ WEEKLY BENEFIT DIGEST ============
CREATE OR REPLACE FUNCTION public.my_weekly_digest()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_since timestamptz := now() - interval '7 days';
  v_videos integer; v_minutes integer; v_completed integer; v_doses integer;
  v_streak integer; v_longest integer; v_concepts jsonb; v_prev_minutes integer;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT count(*), COALESCE(sum(progress_seconds),0)/60, count(*) FILTER (WHERE completed)
    INTO v_videos, v_minutes, v_completed
  FROM watch_history WHERE user_id = v_uid AND watched_at >= v_since;

  SELECT COALESCE(sum(progress_seconds),0)/60 INTO v_prev_minutes
  FROM watch_history
  WHERE user_id = v_uid AND watched_at >= v_since - interval '7 days' AND watched_at < v_since;

  SELECT count(*) INTO v_doses FROM dose_completions
  WHERE user_id = v_uid AND completed_at >= v_since;

  SELECT current_streak, longest_streak INTO v_streak, v_longest
  FROM streaks WHERE user_id = v_uid;

  SELECT COALESCE(jsonb_agg(jsonb_build_object('title', t.title, 'domain', t.domain) ORDER BY t.completed_at DESC), '[]'::jsonb)
    INTO v_concepts
  FROM (
    SELECT c.title, c.domain, lpp.completed_at
    FROM learning_path_progress lpp
    JOIN concepts c ON c.id = lpp.concept_id
    WHERE lpp.user_id = v_uid AND lpp.completed_at >= v_since
    ORDER BY lpp.completed_at DESC
    LIMIT 5
  ) t;

  RETURN jsonb_build_object(
    'since', v_since,
    'videos_watched', COALESCE(v_videos,0),
    'minutes_watched', COALESCE(v_minutes,0),
    'prev_minutes_watched', COALESCE(v_prev_minutes,0),
    'videos_completed', COALESCE(v_completed,0),
    'doses_completed', COALESCE(v_doses,0),
    'current_streak', COALESCE(v_streak,0),
    'longest_streak', COALESCE(v_longest,0),
    'concepts_learned', COALESCE(v_concepts,'[]'::jsonb)
  );
END $$;
REVOKE ALL ON FUNCTION public.my_weekly_digest() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_weekly_digest() TO authenticated;

-- ============ CORPUS DEPTH: BN/UR/HI SEED QUERIES ============
INSERT INTO public.discovery_topic_queries (language, topic, query, priority, origin)
VALUES
 ('bn','tafsir','বাংলা তাফসীর সূরা',95,'depth_seed'),
 ('bn','tafsir','কুরআনের তাফসীর বাংলা',95,'depth_seed'),
 ('bn','hadith','সহীহ হাদিস বাংলা ব্যাখ্যা',92,'depth_seed'),
 ('bn','hadith','বুখারী শরীফ বাংলা',90,'depth_seed'),
 ('bn','seerah','নবীজীর জীবনী সীরাহ বাংলা',92,'depth_seed'),
 ('bn','fiqh','ইসলামিক ফিকহ মাসআলা বাংলা',88,'depth_seed'),
 ('bn','aqeedah','ইসলামী আকীদা বাংলা',88,'depth_seed'),
 ('bn','productivity','সময় ব্যবস্থাপনা ইসলামিক',80,'depth_seed'),
 ('bn','science','বিজ্ঞান শিক্ষা বাংলা',75,'depth_seed'),
 ('bn','history','ইসলামের ইতিহাস বাংলা',85,'depth_seed'),
 ('bn','quran','কুরআন শিক্ষা তাজবীদ বাংলা',90,'depth_seed'),
 ('bn','dawah','ইসলামিক আলোচনা বাংলা ওয়াজ',85,'depth_seed'),
 ('bn','youth','তরুণদের জন্য ইসলামিক উপদেশ',82,'depth_seed'),
 ('bn','family','ইসলামে পারিবারিক জীবন বাংলা',80,'depth_seed'),
 ('bn','language','আরবি ভাষা শিক্ষা বাংলা',78,'depth_seed'),
 ('ur','tafsir','اردو تفسیر قرآن',95,'depth_seed'),
 ('ur','tafsir','سورہ کی تفسیر اردو',93,'depth_seed'),
 ('ur','hadith','صحیح حدیث اردو تشریح',92,'depth_seed'),
 ('ur','hadith','بخاری شریف اردو',90,'depth_seed'),
 ('ur','seerah','سیرت النبی اردو',92,'depth_seed'),
 ('ur','fiqh','فقہ مسائل اردو',88,'depth_seed'),
 ('ur','aqeedah','اسلامی عقیدہ اردو',88,'depth_seed'),
 ('ur','history','اسلامی تاریخ اردو',85,'depth_seed'),
 ('ur','quran','قرآن تجوید سیکھیں اردو',90,'depth_seed'),
 ('ur','productivity','وقت کا انتظام اسلامی اردو',80,'depth_seed'),
 ('ur','science','سائنس تعلیم اردو',75,'depth_seed'),
 ('ur','youth','نوجوانوں کے لیے اسلامی نصیحت',82,'depth_seed'),
 ('ur','family','اسلام میں خاندانی زندگی',80,'depth_seed'),
 ('ur','language','عربی زبان سیکھیں اردو',78,'depth_seed'),
 ('ur','dawah','اسلامی بیان اردو',85,'depth_seed'),
 ('hi','tafsir','कुरान तफ़सीर हिंदी',93,'depth_seed'),
 ('hi','hadith','सहीह हदीस हिंदी',90,'depth_seed'),
 ('hi','seerah','नबी की जीवनी हिंदी',90,'depth_seed'),
 ('hi','fiqh','इस्लामी फ़िक़्ह मसाइल हिंदी',86,'depth_seed'),
 ('hi','aqeedah','इस्लामी अक़ीदा हिंदी',86,'depth_seed'),
 ('hi','history','इस्लाम का इतिहास हिंदी',84,'depth_seed'),
 ('hi','quran','कुरान तजवीद सीखें हिंदी',88,'depth_seed'),
 ('hi','productivity','समय प्रबंधन इस्लामी हिंदी',78,'depth_seed'),
 ('hi','science','विज्ञान शिक्षा हिंदी',74,'depth_seed'),
 ('hi','youth','युवाओं के लिए इस्लामी नसीहत',80,'depth_seed'),
 ('hi','family','इस्लाम में पारिवारिक जीवन हिंदी',78,'depth_seed'),
 ('hi','language','अरबी भाषा सीखें हिंदी',76,'depth_seed'),
 ('hi','dawah','इस्लामी बयान हिंदी',82,'depth_seed'),
 ('hi','tafsir','सूरह की तफ़सीर हिंदी',88,'depth_seed'),
 ('hi','hadith','बुखारी शरीफ हिंदी',85,'depth_seed')
ON CONFLICT (language, query) DO NOTHING;