# Heartify Platform API

Contract for constrained clients (Apple Watch, Wear OS, widgets, TV, Auto).
All endpoints are additive — existing web/mobile calls are unchanged.

Base URL: `https://<project-ref>.functions.supabase.co/`
Auth: `Authorization: Bearer <supabase jwt>` where noted.

## GET `/client-bootstrap`
Cold-start payload for any new device.

**Auth:** optional (anonymous returns feature flags + capabilities only).
**Cache:** `private, max-age=30` (signed in) · `public, max-age=60` (anon).
**Payload budget:** < 4 KB.

```json
{
  "server_time": "2026-07-09T12:00:00Z",
  "user_id": "uuid | null",
  "profile": { "display_name": "…", "locale": "en" },
  "entitlement": { "plan": "free", "expires_at": null },
  "preferences": { "prayer_method": "MWL" },
  "feature_flags": { "premium_ui_enabled": false, "salah_tracker": true },
  "capabilities": { "platforms": ["web","ios","android","watchos","wearos","tvos","carplay","androidauto"] }
}
```

## GET `/prayer-times?lat&lng&date&method`
Pure computation, no DB.

**Auth:** none. **Cache:** `public, max-age=3600`. **Budget:** < 500 B.
`method`: `MWL | ISNA | Egypt | Makkah | Karachi | Tehran | Jafari`.

## GET `/qibla?lat&lng`
Great-circle bearing to the Kaaba.

**Auth:** none. **Cache:** `public, max-age=86400`. **Budget:** < 200 B.

## GET `/user-sync-pull?since=<iso>`
Delta of the user's cross-device state.

**Auth:** required. **Cache:** `private, no-store`. **Budget:** ~20 KB typical.
Returns rows updated after `since` from: `dhikr_sessions`, `salah_log`,
`reading_progress`, `favorites`, `user_preferences_v2`, `streaks`.

## POST `/user-sync-push`
Upsert deltas produced on any device.

**Auth:** required. **Body:** `SyncPushBody` (see `src/lib/shared/types.ts`).
All arrays are hard-capped (100 items, 50 for preferences).

## Shared TypeScript types
All DTOs live in `src/lib/shared/types.ts`. Mirror these 1:1 in Swift / Kotlin.
