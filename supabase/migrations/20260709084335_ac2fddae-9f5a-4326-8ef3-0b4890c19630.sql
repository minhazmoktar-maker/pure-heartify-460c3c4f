
CREATE TABLE public.dua_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 3 and 1000),
  is_anonymous boolean not null default false,
  ameen_count integer not null default 0,
  created_at timestamptz not null default now()
);
CREATE INDEX dua_requests_created_at_idx ON public.dua_requests (created_at desc);

GRANT SELECT ON public.dua_requests TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.dua_requests TO authenticated;
GRANT ALL ON public.dua_requests TO service_role;
ALTER TABLE public.dua_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read dua requests" ON public.dua_requests FOR SELECT USING (true);
CREATE POLICY "Users can post their own dua" ON public.dua_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own dua" ON public.dua_requests FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.dua_ameens (
  dua_id uuid not null references public.dua_requests(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (dua_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.dua_ameens TO authenticated;
GRANT SELECT ON public.dua_ameens TO anon;
GRANT ALL ON public.dua_ameens TO service_role;
ALTER TABLE public.dua_ameens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ameens" ON public.dua_ameens FOR SELECT USING (true);
CREATE POLICY "Users add own ameen" ON public.dua_ameens FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own ameen" ON public.dua_ameens FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.dua_ameens_bump() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.dua_requests SET ameen_count = ameen_count + 1 WHERE id = NEW.dua_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.dua_requests SET ameen_count = GREATEST(0, ameen_count - 1) WHERE id = OLD.dua_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER dua_ameens_bump_ins AFTER INSERT ON public.dua_ameens FOR EACH ROW EXECUTE FUNCTION public.dua_ameens_bump();
CREATE TRIGGER dua_ameens_bump_del AFTER DELETE ON public.dua_ameens FOR EACH ROW EXECUTE FUNCTION public.dua_ameens_bump();
