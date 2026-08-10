DROP POLICY IF EXISTS "Sender and recipient can view their nudges" ON public.nudges;
CREATE POLICY "Sender and recipient can view their nudges" ON public.nudges
FOR SELECT TO authenticated
USING ((auth.uid() = sender_id) OR (auth.uid() = recipient_id));

DROP POLICY IF EXISTS "Owners can manage referral tiers" ON public.referral_tiers;
CREATE POLICY "Owners can manage referral tiers" ON public.referral_tiers
FOR ALL TO authenticated
USING (public.is_owner(auth.uid()))
WITH CHECK (public.is_owner(auth.uid()));

DROP POLICY IF EXISTS "Users read their own search history" ON public.search_queries;
CREATE POLICY "Users read their own search history" ON public.search_queries
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all search history" ON public.search_queries;
CREATE POLICY "Admins read all search history" ON public.search_queries
FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(), 'admin'::text));

DROP POLICY IF EXISTS "Users read their own recommendation events" ON public.recommendation_events;
CREATE POLICY "Users read their own recommendation events" ON public.recommendation_events
FOR SELECT TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all recommendation events" ON public.recommendation_events;
CREATE POLICY "Admins read all recommendation events" ON public.recommendation_events
FOR SELECT TO authenticated USING (public.has_min_role(auth.uid(), 'admin'::text));

DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);