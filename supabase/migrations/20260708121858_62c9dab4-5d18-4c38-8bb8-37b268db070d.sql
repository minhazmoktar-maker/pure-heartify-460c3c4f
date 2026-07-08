
-- Restrict SELECT on moderation-internals tables to admins/owners only.

DROP POLICY IF EXISTS "Authenticated reads trust events" ON public.channel_trust_events;
CREATE POLICY "Admins read trust events"
  ON public.channel_trust_events FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR is_owner(auth.uid()));

DROP POLICY IF EXISTS "Anyone reads trust profiles" ON public.channel_trust_profiles;
CREATE POLICY "Admins read trust profiles"
  ON public.channel_trust_profiles FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR is_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read weights" ON public.channel_trust_weights;
CREATE POLICY "Admins read weights"
  ON public.channel_trust_weights FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR is_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read moderation decisions" ON public.moderation_decisions;
CREATE POLICY "Admins read moderation decisions"
  ON public.moderation_decisions FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR is_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read rules" ON public.moderation_rules;
CREATE POLICY "Admins read moderation rules"
  ON public.moderation_rules FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR is_owner(auth.uid()));

DROP POLICY IF EXISTS "Authenticated can read thresholds" ON public.moderation_thresholds;
CREATE POLICY "Admins read moderation thresholds"
  ON public.moderation_thresholds FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR is_owner(auth.uid()));
