# Entitlements — Developer Reference

The single source of truth for who has Premium.  Client UI and every
premium-gated edge function read from the same database row so a modified
browser cannot upgrade itself.

---

## 1. Schema (`public.entitlements`)

| Column       | Type                       | Notes                                                       |
| ------------ | -------------------------- | ----------------------------------------------------------- |
| `id`         | `uuid` PK                  | `gen_random_uuid()`                                         |
| `user_id`    | `uuid`, **unique**         | FK-conceptually to `auth.users(id)`                         |
| `plan`       | `text`                     | `'free'`, `'premium'`, `'premium_trial'`, `'premium_lifetime'` |
| `features`   | `jsonb`                    | Per-user feature flags. Default `{}`                        |
| `expires_at` | `timestamptz` **nullable** | `NULL` = open-ended. Any timestamp in the future = valid    |
| `created_at` | `timestamptz`              | default `now()`                                              |
| `updated_at` | `timestamptz`              | Bumped by trigger on update                                 |

**Active premium rule** (both DB and client apply this same rule):

```
plan <> 'free' AND (expires_at IS NULL OR expires_at > now())
```

### Related surfaces

- `public.curated_videos.is_premium_only boolean` — content flagged as
  premium-only. Non-premium viewers never see these rows.
- `public.privileged_actions_log` — every grant / revoke is appended here
  with `action = 'entitlement.grant' | 'entitlement.revoke'`.

### RPCs

| Function                                                                        | Callable by       | Purpose                             |
| ------------------------------------------------------------------------------- | ----------------- | ----------------------------------- |
| `has_active_premium(_user_id uuid) → boolean`                                   | Anyone (SD)       | The canonical "is premium?" check.  |
| `grant_entitlement(_user_id, _plan, _expires_at, _features, _reason)`           | Admin or Owner    | Creates or updates an entitlement.  |
| `revoke_entitlement(_user_id, _reason)`                                         | Admin or Owner    | Downgrades to `free`, expires `now()`. |

All three are `SECURITY DEFINER` with `search_path = public`.

---

## 2. Client: `useEntitlement()`

```ts
const { entitlement, isPremium, loading, refresh } = useEntitlement();
```

- `entitlement: { plan, expiresAt, features, isPremium }` — full record.
- `isPremium` — convenience mirror of `entitlement.isPremium`.
- `loading` — `true` until the first fetch resolves (or auth is still
  bootstrapping). Use it to render skeletons instead of flashing the
  "upgrade" CTA at logged-in premium users.
- `refresh()` — manual refetch. Rarely needed; the hook already subscribes
  to realtime changes on the caller's row.

### Behaviour

1. Waits for `useAuth().loading` to settle.
2. Anonymous → returns `FREE` immediately.
3. Signed-in → fetches the single row `where user_id = auth.uid()`.
4. Subscribes to `postgres_changes` on `public.entitlements` filtered by
   the caller's `user_id`, so an admin grant or revoke takes effect
   without a reload.
5. `isPremium` is `false` whenever `plan = 'free'` **or** `expires_at` is
   in the past.

### UI contract

- **loading** → show a neutral skeleton / status.
- **not premium** → show the upgrade CTA and hide premium-only chips.
- **premium** → show the "Premium Active" badge.

There is **no** client-side toggle. `PlayerContext.togglePremium` is a
deprecated no-op retained only so old call sites do not crash during the
migration window.

---

## 3. Server-side enforcement

All three read paths use the shared helpers in
`supabase/functions/_shared/entitlements.ts`:

```ts
const userId = await getCallerUserId(req);          // null if unauth
const isPremium = await hasActivePremium(userId);   // DB RPC
```

`getCallerUserId` validates the incoming `Authorization: Bearer <jwt>`
against the auth server — a forged JWT resolves to `null`.

### `feed`

`supabase/functions/feed/index.ts`

- Resolves the caller (`getCallerUserId`) and checks
  `hasActivePremium(callerId)`.
- When the viewer is **not premium**, the PostgREST query appends
  `is_premium_only=eq.false` so premium rows never leave the database.
- The response echoes `isPremiumOnly` per item so the UI can render a
  crown badge for premium viewers.

### `search`

`supabase/functions/search/index.ts`

- Same identity + entitlement resolution.
- After scoring, the results are filtered against a
  `select video_id from curated_videos where is_premium_only = true`
  lookup and non-premium callers get those rows dropped.

### `recommendations`

`supabase/functions/recommendations/index.ts`

- Same identity + entitlement resolution.
- Uses the same `is_premium_only` filter on the candidate pool before
  ranking, so premium-only items are never surfaced to free users.

### Failure mode

If `has_active_premium` errors or `getCallerUserId` cannot verify the
token, the helpers return `false` — i.e. the safer default is "not
premium".

---

## 4. Admin console (`/admin/entitlements`)

- Owner or Admin only (route guarded by `has_role` + `is_owner`).
- Grant form validates:
  - `user_id` is a well-formed UUID.
  - `expires_at` is in the future (unless plan is lifetime/free).
  - `reason` is present (min 3 chars) — written to the audit log.
- Confirmation dialogs (`AlertDialog`) fire before both grant and revoke.
- FK / permission errors are translated into friendly messages
  ("Unknown user id", "Not authorised").
- Every action is logged with actor, target, plan, and reason.
