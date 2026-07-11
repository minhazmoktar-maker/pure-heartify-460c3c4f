# Authorization Architecture

This document describes how authorization works across HalalTube / Heartify.
The system is built on **three enforcement layers**, all driven by a single
centralized permission matrix.

## TL;DR

1. **`src/lib/permissions.ts`** is the single source of truth for what each
   role can do.
2. **`src/hooks/usePermissions.ts`** binds the matrix to the current React
   user for UI checks.
3. **`supabase/functions/_shared/authz.ts`** mirrors the matrix for Edge
   Functions, verifying JWT + role + permission on every privileged call.
4. **Row-Level Security (RLS)** on Postgres tables is the *ultimate* gate.
   Even if UI and edge checks are bypassed, the database refuses the query.

The security model is **default deny**: a role has zero permissions unless
the matrix explicitly grants them.

## Roles

| Rank | Role       | Description                                     |
| ---- | ---------- | ----------------------------------------------- |
| 1    | user       | Signed-in end user.                             |
| 2    | moderator  | Can hide/approve/reject content, view reports. |
| 3    | admin      | Full moderation + user management.              |
| 4    | owner      | Unrestricted access. Protected from removal.    |

Roles inherit downward: `moderator ⊂ admin ⊂ owner`. Owner also holds every
permission by construction (see `OWNER_PERMISSIONS`).

## Permission matrix

Roles receive permissions from three additive groups:

- `MODERATOR_PLUS`: `hide_video`, `unhide_video`, `approve_content`,
  `reject_content`, `moderate_reports`, `view_moderation_history`.
- `ADMIN_PLUS`: adds `delete_video`, `restore_video`, `archive_video`,
  `unarchive_video`, `feature_video`, `pin_video`, `edit_video_metadata`,
  `edit_halal_score`, `override_ai_decision`, `remove_from_surface`,
  `manage_channels`, `ban_channel`, `manage_categories`, `manage_tags`,
  `manage_users`, `access_admin_dashboard`, `view_analytics`.
- `OWNER_ONLY`: adds `manage_roles`, `manage_owners`,
  `manage_platform_settings`, `manage_feature_flags`, `manage_api_keys`,
  `access_owner_dashboard`, `view_audit_logs`.

`PERMISSIONS` in `permissions.ts` is the authoritative list.

## Authorization flow

```
                 ┌─────────────────────┐
    UI action    │ usePermissions().can │───┐
                 └─────────────────────┘   │
                                            ▼
                 ┌─────────────────────┐  deny → hide control
Edge fn request  │ authorize(req, perm) │──┐
                 └─────────────────────┘  │
                                          ▼ deny → 401/403 JSON response
                 ┌─────────────────────┐
DB operation     │  RLS + is_owner() /  │  deny → PostgREST 401
                 │  has_min_role()      │
                 └─────────────────────┘
```

Every privileged operation must clear the layer(s) applicable to it. UI
checks are for UX only; they can be forged. Server checks and RLS are the
real security boundaries.

## Adding a new permission

1. Add the string to `PERMISSIONS` in `src/lib/permissions.ts`.
2. Add it to the appropriate role group (`MODERATOR_PLUS`, `ADMIN_PLUS`, or
   `OWNER_ONLY`, or leave it OWNER-only by default).
3. Mirror the change in `supabase/functions/_shared/authz.ts` (both the
   `Permission` union and the role sets).
4. Use `can("your_permission")` in components and
   `authorize(req, "your_permission")` in edge functions.
5. Update RLS policies on any affected tables so the database enforces the
   same rule.
6. Add matrix coverage in `src/lib/__tests__/permissions.test.ts`.

## Adding a new role

1. Add the role to the `ROLES` tuple in `permissions.ts` and give it a rank
   in `ROLE_RANK`.
2. Build its permission set in `ROLE_PERMISSIONS`, ideally as inheritance
   from a lower role plus a `_PLUS` array of additions.
3. Mirror in `supabase/functions/_shared/authz.ts`.
4. Extend the DB helper functions (`is_owner`, `has_min_role`, or a new
   equivalent) and add corresponding RLS policies.
5. Extend `useRole()` in `src/hooks/useRole.ts` to detect the role.

## Best practices

- **Never `if (isOwner)`**. Always `if (can("permission"))`.
- **Never trust the UI**. Every mutating edge function starts with
  `authorize(req, ...)`; every table has RLS.
- **Log privileged actions** via `logPrivilegedAction()` — writes go through
  the `log-privileged-action` edge function which captures IP/UA/session
  server-side.
- **Default deny in RLS**. When enabling RLS on a new table, do not create a
  permissive policy until the intended access rules are clear.
- **Keep the matrix flat**. Prefer many small permissions over role
  branches — new features then compose naturally.

## Role resolution (edge functions)

`authorize()` in `supabase/functions/_shared/authz.ts` resolves the caller's
role by querying two REST endpoints in parallel:

1. `platform_owners?user_id=eq.<uid>` — owner check.
2. `user_roles?user_id=eq.<uid>&role=in.(admin,moderator)` — privileged
   tiers.

The highest-ranked hit wins: `owner > admin > moderator > user`. On any
network or REST failure the function fails closed to `user`. All four roles
in `ROLES` are honored — a moderator token successfully authorizes any
permission in the moderator set (`hide_video`, `approve_content`, etc.).

## Testing

`src/lib/__tests__/permissions.test.ts` verifies:

- Owner holds every permission.
- User holds none.
- Moderator/Admin sets are correct.
- `admin ⊂ owner`, `moderator ⊂ admin`.
- Anonymous / null principals are always denied.
- Owner-only permissions are refused to admins.
- `requirePermission` throws `AuthorizationError` correctly.

`src/lib/__tests__/authz-parity.test.ts` mechanically compares the edge
matrix in `_shared/authz.ts` against the client matrix in `permissions.ts`.
Any drift (missing/extra permission, wrong role membership, dropped
moderator branch) fails the build.

Add regression tests here whenever the matrix changes.
