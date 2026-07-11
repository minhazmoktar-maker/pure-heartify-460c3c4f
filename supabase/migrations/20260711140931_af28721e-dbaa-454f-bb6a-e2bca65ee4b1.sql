-- Perf indexes for hot query paths (feed/history/dose/dua)
CREATE INDEX IF NOT EXISTS idx_watch_history_user_watched
  ON public.watch_history (user_id, watched_at DESC);
CREATE INDEX IF NOT EXISTS idx_dose_completions_user_completed
  ON public.dose_completions (user_id, completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_dua_ameens_user_created
  ON public.dua_ameens (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dua_ameens_dua
  ON public.dua_ameens (dua_id);
CREATE INDEX IF NOT EXISTS idx_dua_anon_ameens_dua
  ON public.dua_anon_ameens (dua_id);