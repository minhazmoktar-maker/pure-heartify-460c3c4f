
# Multi-Platform Expansion Plan (Web · iOS · Android · watchOS · TV · Auto)

**Guiding rule:** every change is **additive**. No existing route, component, API, RLS policy, or user flow is removed, renamed, or gated behind a flag. If a change would alter current behavior, it does not ship in this phase.

---

## Phase 1 — Platform-neutral API surface (backend, additive only)

Goal: give constrained clients (Apple Watch, complications, widgets) tiny, cacheable JSON endpoints without touching existing tables or edge functions.

New edge functions (all read-only, JWT-optional, aggressively cacheable):
- `client-bootstrap` — one call returns: user profile summary, entitlement, feature flags, preferred locale, timezone. Replaces N round-trips on cold start for watch/widget.
- `prayer-times` — server-computed daily prayer times for a lat/lng + method. Pure function, no DB write. Cached per (date, lat_rounded, method).
- `qibla` — bearing for lat/lng. Pure math.
- `daily-adhkar` — today's morning/evening adhkar payload, already-translated, ~5 KB.
- `dua-shortcuts` — small curated list of top duas with Arabic + transliteration + translation.
- `user-sync-pull` / `user-sync-push` — delta sync for bookmarks, favorites, streaks, dhikr counts, reading progress, salah log. Uses `updated_at` cursors. Watch/widget-friendly (< 20 KB typical).

No existing function is modified. Web/mobile keep calling what they call today.

## Phase 2 — Cross-device state tables (new tables, no migrations to existing tables)

New tables, each with the standard 4-step migration (CREATE → GRANT → RLS → POLICY) and `auth.uid()` scoping:
- `dhikr_sessions` (user_id, dhikr_key, count, target, completed_at)
- `salah_log` (user_id, date, prayer, prayed_at, on_time, source)
- `reading_progress` (user_id, resource_type, resource_id, position, updated_at) — unified across mushaf, articles, library entries
- `device_registrations` (user_id, platform, device_id, app_version, capabilities jsonb, last_seen_at) — lets us target watch vs phone vs TV for push
- `user_preferences_v2` (user_id, key, value jsonb) — thin KV so new clients can add settings without schema churn

Existing `favorites`, `watch_history`, `streaks`, `entitlements`, `profiles`, `device_tokens` are **untouched**. New tables sit alongside them.

## Phase 3 — Shared TypeScript packages (web repo only, no runtime change)

Extract pure-logic modules under `src/lib/shared/` so a future React Native / SwiftUI bridge can mirror them:
- `src/lib/shared/prayer.ts` — prayer time math (already partially exists; consolidate).
- `src/lib/shared/qibla.ts` — bearing math.
- `src/lib/shared/entitlement.ts` — plan → capability map (already in `useEntitlement`; extract the pure part).
- `src/lib/shared/sync.ts` — delta-sync client using the new endpoints.
- `src/lib/shared/types.ts` — DTOs used by every platform.

Existing hooks (`useEntitlement`, `usePrayerTimes`, etc.) re-export from these shared modules. **Public API of every hook stays identical.**

## Phase 4 — watchOS-readiness contract (documentation + fixtures)

- `docs/PLATFORM_API.md` — freeze the contract of every new endpoint above (request, response, cache headers, size budget).
- `docs/WATCHOS_ROADMAP.md` — how a future Swift/WatchKit app consumes the endpoints, complications spec (prayer countdown, next prayer, dhikr counter), Smart Stack widgets, offline cache strategy, background refresh cadence.
- `docs/DEVICE_MATRIX.md` — capability flags per platform (web, iOS, Android, watchOS, tvOS, CarPlay, Android Auto, Wear OS) so `client-bootstrap` returns the right feature set.
- Sample JSON fixtures under `docs/fixtures/` so the watch team can build against real payloads before the Swift app exists.

## Phase 5 — Guardrails (CI-only, no user impact)

- Add a typecheck-time check that `src/integrations/supabase/client.ts` and existing edge functions are not modified in this branch's diff (prevents accidental regression).
- Extend the Playwright suite with a "no-regression" smoke test that hits the top 20 existing routes and asserts 200 + core selectors present.

---

## What is explicitly NOT in this plan
- No changes to premium gating, moderation pipeline, streaming/player, admin consoles, or any existing page.
- No renaming of routes, tables, columns, or hooks.
- No client-side feature flags that hide existing UI.
- No Swift, Kotlin, or native code — those live in separate repos when the time comes; this repo just publishes the contract.

## Rollout order
1. Phase 2 migrations (new tables only).
2. Phase 1 edge functions.
3. Phase 3 shared modules + re-exports.
4. Phase 4 docs + fixtures.
5. Phase 5 CI guardrails.

Each phase ends with a clean typecheck and a Playwright smoke run against the existing routes to prove nothing regressed.

**Approve to proceed with Phase 2 (new tables) first, or tell me to reorder.**
