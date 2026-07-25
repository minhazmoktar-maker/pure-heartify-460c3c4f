
-- Tighten RLS policy role scope from public to authenticated (defense-in-depth)

-- audio_playback_positions
DROP POLICY "Users manage their own playback positions" ON public.audio_playback_positions;
CREATE POLICY "Users manage their own playback positions" ON public.audio_playback_positions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- device_tokens
DROP POLICY "Users manage own device tokens" ON public.device_tokens;
CREATE POLICY "Users manage own device tokens" ON public.device_tokens
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- favorite_categories
DROP POLICY "Users manage own favorite categories" ON public.favorite_categories;
CREATE POLICY "Users manage own favorite categories" ON public.favorite_categories
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notification_preferences
DROP POLICY "Users manage own notif prefs" ON public.notification_preferences;
CREATE POLICY "Users manage own notif prefs" ON public.notification_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- user_locale_preferences
DROP POLICY "Users manage own locale prefs" ON public.user_locale_preferences;
CREATE POLICY "Users manage own locale prefs" ON public.user_locale_preferences
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- web_push_subscriptions
DROP POLICY "Users manage own web-push subs" ON public.web_push_subscriptions;
CREATE POLICY "Users manage own web-push subs" ON public.web_push_subscriptions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- khatm_juz_claims: kjc_self_update
DROP POLICY "kjc_self_update" ON public.khatm_juz_claims;
CREATE POLICY "kjc_self_update" ON public.khatm_juz_claims
  FOR UPDATE TO authenticated
  USING ((user_id = auth.uid()) AND is_khatm_member(group_id, auth.uid()))
  WITH CHECK ((user_id = auth.uid()) AND is_khatm_member(group_id, auth.uid()));

-- watch_history
DROP POLICY "Users can add to history" ON public.watch_history;
CREATE POLICY "Users can add to history" ON public.watch_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can clear history" ON public.watch_history;
CREATE POLICY "Users can clear history" ON public.watch_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Users can view their own history" ON public.watch_history;
CREATE POLICY "Users can view their own history" ON public.watch_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- favorites
DROP POLICY "Users can add favorites" ON public.favorites;
CREATE POLICY "Users can add favorites" ON public.favorites
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY "Users can remove favorites" ON public.favorites;
CREATE POLICY "Users can remove favorites" ON public.favorites
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY "Users can view their own favorites" ON public.favorites;
CREATE POLICY "Users can view their own favorites" ON public.favorites
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
