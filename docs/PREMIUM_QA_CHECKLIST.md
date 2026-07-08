# Premium — End-to-End QA Checklist

A manual test pass proving that `is_premium_only` content is filtered
correctly on every read path, for every viewer class. Run this after any
change to `useEntitlement`, `_shared/entitlements.ts`, or any of the
`feed / search / recommendations` edge functions.

## Fixtures

Prepare these once per environment:

- [ ] **User A — free.** Fresh signup, no row in `entitlements` (or `plan = 'free'`).
- [ ] **User B — premium (open-ended).** `grant_entitlement(B, 'premium', null)`.
- [ ] **User C — premium (expiring).** `grant_entitlement(C, 'premium', now() + interval '1 day')`.
- [ ] **User D — expired premium.** `grant_entitlement(D, 'premium', now() - interval '1 day')`.
- [ ] **Anonymous** — signed-out browser.
- [ ] At least **3 curated videos** with `is_premium_only = true` and 5+ with `is_premium_only = false`, all `moderation_state IN ('approved','auto_approved')`.

## Client hook — `useEntitlement`

- [ ] Anonymous session → `loading` flips to `false` and `isPremium === false`.
- [ ] Free user (A) → `isPremium === false`, `plan === 'free'`.
- [ ] Premium open-ended (B) → `isPremium === true`, `expiresAt === null`.
- [ ] Premium expiring (C) → `isPremium === true`.
- [ ] Expired premium (D) → `isPremium === false` even though `plan !== 'free'`.
- [ ] Realtime: admin revokes B in `/admin/entitlements` → B's tab flips to
      free within a few seconds **without a reload**.
- [ ] Realtime: admin grants A → A's tab flips to premium within a few
      seconds without a reload.

## UI — AudioSection premium banner

- [ ] While `useEntitlement().loading`, the "Checking your Premium status…"
      row is visible; upgrade CTA is not.
- [ ] Non-premium viewer sees the gradient upsell with **Request Premium
      access** and the copy noting checkout is coming soon.
- [ ] Premium viewer sees the **Premium Active** pill and no upsell.
- [ ] There is no button anywhere that flips premium client-side.

## `feed` edge function

Call `GET /functions/v1/feed` with the appropriate `Authorization` header.

- [ ] Anonymous → response contains **zero** items with
      `isPremiumOnly === true`.
- [ ] User A (free) → zero premium-only items in the response.
- [ ] User D (expired) → zero premium-only items in the response.
- [ ] User B / C (premium) → premium-only items appear and each carries
      `isPremiumOnly: true`.
- [ ] Directly hitting PostgREST with the anon key still cannot leak
      premium-only rows to a free viewer (they're filtered server-side, not
      just in the UI).

## `search` edge function

- [ ] Query a term that matches at least one premium-only video.
- [ ] Anonymous / A / D → premium-only matches are absent.
- [ ] B / C → premium-only matches are present.
- [ ] Result ordering for non-premium viewers is unchanged aside from the
      filtered rows (no gaps that reveal counts).

## `recommendations` edge function

- [ ] Seed watch history for A and B that includes categories overlapping
      with premium-only videos.
- [ ] A → recommendations contain no premium-only items.
- [ ] B → recommendations may contain premium-only items.
- [ ] D (expired) → treated as non-premium, no premium-only items.

## `/admin/entitlements`

- [ ] Non-admin visiting the route is bounced or sees an empty table
      (RPCs raise `forbidden`).
- [ ] Grant with an invalid UUID → inline validation error, no request sent.
- [ ] Grant with an expiry in the past → inline validation error.
- [ ] Grant with `plan = 'premium_lifetime'` disables the expiry input.
- [ ] Grant with an unknown (well-formed) UUID → toast "Unknown user id".
- [ ] Grant on an existing user → confirmation dialog shows the previous
      plan and expiry, and the row updates on confirm.
- [ ] Revoke → confirmation dialog appears, on confirm the row's plan
      moves to `free` and `expires_at` is set to `now()`.
- [ ] `privileged_actions_log` gets one row per grant/revoke with the
      correct actor, target, plan, and reason.

## Regression guardrails

- [ ] `rg -n "togglePremium\(" src/` returns only the deprecated no-op in
      `PlayerContext` — no UI code invokes it.
- [ ] `rg -n "isPremiumUser\s*=\s*true" src/` returns nothing (no
      hard-coded overrides).
- [ ] Edge function logs for `feed / search / recommendations` show the
      entitlement check ran for every request during the test pass.
