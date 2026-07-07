
-- DELETE policies for user-owned progress tables
CREATE POLICY "Users can delete their own daily dose"
  ON public.daily_dose FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own dose completions"
  ON public.dose_completions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streaks"
  ON public.streaks FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- UPDATE policy for favorites (owner-scoped)
CREATE POLICY "Users can update their own favorites"
  ON public.favorites FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- UPDATE policy for watch_history (progress + completion writes)
CREATE POLICY "Users can update their own watch history"
  ON public.watch_history FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
