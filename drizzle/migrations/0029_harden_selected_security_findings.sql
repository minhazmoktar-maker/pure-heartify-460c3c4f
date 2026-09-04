-- 1) channels_state: ingestion state is written exclusively by service_role
--    (edge functions). Remove the over-broad write grants so the fail-closed
--    posture is enforced at the privilege layer, not just by absent policies.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.channels_state FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.channels_state FROM authenticated;
REVOKE SELECT ON public.channels_state FROM anon;
GRANT SELECT ON public.channels_state TO authenticated; -- admin-only via RLS
GRANT ALL ON public.channels_state TO service_role;
COMMENT ON TABLE public.channels_state IS
  'Ingestion bookkeeping. Writes only via service_role edge functions; authenticated SELECT is admin-gated by RLS.';

-- 2) khatm_groups: the free-text spiritual "intention" must not be readable by
--    anonymous visitors of a public group.
REVOKE SELECT (intention) ON public.khatm_groups FROM anon;

-- 3) live_session_participants: a joining user must not be able to self-assign
--    a privileged role. Joins go through the join_live_session RPC; host rows
--    are created by the session-creation RPC (both SECURITY DEFINER).
DROP POLICY IF EXISTS lsp_insert_own ON public.live_session_participants;
CREATE POLICY lsp_insert_own
ON public.live_session_participants FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND COALESCE(role, 'participant') = 'participant'
);

DROP POLICY IF EXISTS lsp_update_own ON public.live_session_participants;
CREATE POLICY lsp_update_own
ON public.live_session_participants FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (
  user_id = auth.uid()
  AND COALESCE(role, 'participant') = 'participant'
);

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.live_session_participants FROM anon;
REVOKE SELECT ON public.live_session_participants FROM anon;

-- 4) video_unplayable_reports: reports are filed exclusively through the
--    SECURITY DEFINER report_video_unplayable() RPC, which pins
--    reporter_id = auth.uid(). Keep direct writes closed at the grant layer.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.video_unplayable_reports FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.video_unplayable_reports FROM authenticated;
REVOKE SELECT ON public.video_unplayable_reports FROM anon;
GRANT SELECT ON public.video_unplayable_reports TO authenticated; -- own rows / admin via RLS
GRANT ALL ON public.video_unplayable_reports TO service_role;
COMMENT ON TABLE public.video_unplayable_reports IS
  'Insert only via public.report_video_unplayable(), which pins reporter_id to auth.uid(). No direct INSERT grant or policy by design.';