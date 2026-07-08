
-- Let signed-in users submit suggestions to the moderation candidate queues.

CREATE POLICY "Users can suggest videos"
  ON public.video_candidates FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND status = 'pending');

CREATE POLICY "Users can view their own video suggestions"
  ON public.video_candidates FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR is_owner(auth.uid()));

CREATE POLICY "Users can suggest channels"
  ON public.channel_candidates FOR INSERT TO authenticated
  WITH CHECK (submitted_by = auth.uid() AND status = 'pending');

CREATE POLICY "Users can view their own channel suggestions"
  ON public.channel_candidates FOR SELECT TO authenticated
  USING (submitted_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role) OR is_owner(auth.uid()));
