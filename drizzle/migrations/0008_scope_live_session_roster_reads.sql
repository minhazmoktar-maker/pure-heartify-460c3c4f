-- Restrict live-session roster and chat reads to actual members, the host, or admins.
CREATE OR REPLACE FUNCTION public.is_live_session_member(_session_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.live_session_participants p
    WHERE p.session_id = _session_id AND p.user_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_live_session_member(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_live_session_member(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS lsp_read ON public.live_session_participants;
CREATE POLICY lsp_read ON public.live_session_participants
FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.is_live_session_member(session_id, auth.uid())
  OR EXISTS (
    SELECT 1 FROM public.live_sessions s
    WHERE s.id = live_session_participants.session_id AND s.host_id = auth.uid()
  )
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

DROP POLICY IF EXISTS lsm_read ON public.live_session_messages;
CREATE POLICY lsm_read ON public.live_session_messages
FOR SELECT TO authenticated
USING (
  is_hidden = false
  AND (
    user_id = auth.uid()
    OR public.is_live_session_member(session_id, auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.live_sessions s
      WHERE s.id = live_session_messages.session_id AND s.host_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);