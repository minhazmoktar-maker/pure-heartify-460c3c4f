# Owner Account — Emergency Recovery

This document describes the **only** supported way to recover Owner access on
Heartify / HalalTube if all Owner accounts lose access. It is intentionally
kept out of the user interface and cannot be invoked by Admins or Moderators.

## Guarantees baked into the database

The database enforces the following invariants (see the RBAC migrations):

1. `platform_owners` cannot be emptied — a trigger (`prevent_last_owner_removal`)
   blocks deletion of the last row.
2. The Owner's `admin` entry in `user_roles` cannot be updated or deleted from
   the client — a trigger (`protect_owner_role`) blocks it.
3. `is_owner(uuid)` reads from `platform_owners` first, and falls back to the
   canonical bootstrap email (`minhazmoktar@gmail.com`) only if no rows exist.
   This means that even if the owner's `platform_owners` row is somehow
   removed by a service-role script, the bootstrap email will still grant
   Owner permissions on the next login by that user.
4. The `handle_new_user` trigger re-seeds `platform_owners` if the canonical
   Owner email signs up again.

## Recovery scenarios

### A. The Owner's password / OAuth login is lost

Use the standard password reset flow at `/forgot-password`. This uses the
managed auth provider and does not require any Owner-side operation.

### B. The Owner user record is deleted from `auth.users`

1. Have the Owner sign up again with `minhazmoktar@gmail.com` (or any address
   that has been registered in `platform_owners`).
2. `handle_new_user` re-creates the `profiles` row, the `admin` role, and the
   `platform_owners` entry automatically.

### C. `platform_owners` is empty (should be impossible)

Because of the last-owner protection trigger, this can only happen if a
direct SQL statement was executed with the service role. To recover:

```sql
-- Run with service_role / database-owner privileges only.
INSERT INTO public.platform_owners (user_id, email)
SELECT id, email FROM auth.users WHERE lower(email) = '<owner-email>';

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role FROM auth.users WHERE lower(email) = '<owner-email>'
ON CONFLICT (user_id, role) DO NOTHING;
```

### D. Adding a new Owner (delegation)

Owners may add additional Owners. Because `platform_owners` INSERT is not
exposed via a public RLS policy, additions must be performed either:

- Directly against the database with the service role, or
- Through a future admin-only edge function that verifies the caller is a
  current Owner and inserts the new row using the service role.

The last-owner-removal trigger will then permit any single Owner to step
down as long as another Owner remains.

## What we deliberately do NOT do

- No self-serve UI for adding/removing Owners.
- No password-based "master key" or shared secret.
- No environment variable that grants Owner rights (defence-in-depth: an
  attacker who steals `.env` cannot become Owner).
- No Admin-visible endpoint that touches `platform_owners`.

## Audit

Every Owner change is captured in `privileged_actions_log` when performed
through the app. Manual SQL recovery bypasses that log; when doing manual
recovery, please add a note to the internal incident record.
