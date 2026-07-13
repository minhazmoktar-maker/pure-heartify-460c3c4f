
-- comment_reactions: remove anonymous read access, keep authed read
DROP POLICY IF EXISTS "reactions read" ON public.comment_reactions;
DROP POLICY IF EXISTS "comment_reactions_public_read" ON public.comment_reactions;
REVOKE SELECT ON public.comment_reactions FROM anon;

CREATE POLICY "reactions read authed"
  ON public.comment_reactions FOR SELECT
  TO authenticated
  USING (true);

-- user_cohorts: restrict SELECT to admins only (targeting rules are sensitive)
DROP POLICY IF EXISTS "cohorts read authed" ON public.user_cohorts;

CREATE POLICY "cohorts read admin"
  ON public.user_cohorts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
