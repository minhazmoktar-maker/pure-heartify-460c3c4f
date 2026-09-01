# Heartify watchOS Roadmap

The web/mobile apps are unchanged. This doc describes how a WatchKit /
SwiftUI companion (and Wear OS tiles) consume the Platform API.

## App layers
```text
┌──────────────────────────────────────────┐
│  SwiftUI views · Complications · Widgets │
├──────────────────────────────────────────┤
│  HeartifyKit (Swift package)             │
│   - WatchCompanion.swift (mirrors src/lib/shared/watch.ts)
│   - PrayerTimes.swift  (mirrors prayer.ts)
│   - Qibla.swift        (mirrors qibla.ts)
│   - Entitlement.swift  (mirrors entitlement.ts)
│   - Sync.swift         (calls /user-sync-*)
├──────────────────────────────────────────┤
│  Supabase Swift client (JWT from iPhone) │
└──────────────────────────────────────────┘
```

## One-call companion endpoint (shipped)

`GET /functions/v1/watch-companion?lat=&lng=&method=&tz_offset=`

A single, small payload sized for a watch radio. Anonymous callers get the
prayer block only — no account data is ever returned without a valid bearer
token. Authenticated callers additionally get streak, dhikr and today's salah
glance. Rate limit: 120 req/min per identity.

```json
{
  "schema": 1,
  "server_time": "2026-09-01T14:33:29.706Z",
  "authenticated": false,
  "prayer": {
    "method": "Karachi",
    "date": "2026-09-01",
    "times_utc": { "fajr": "22:22", "sunrise": "23:39", "dhuhr": "05:58", "asr": "09:26", "maghrib": "12:17", "isha": "13:34" },
    "tz_offset": 360,
    "next": { "name": "fajr", "at": "22:22", "in_minutes": 469, "is_tomorrow": false }
  },
  "account": null
}
```

Contract rules:
- All clock strings are **UTC**. Convert with `tz_offset` (or the device
  timezone) for display — see `toLocalClock()` in `src/lib/shared/watch.ts`.
- `schema` is monotonic. Treat unknown fields as ignorable; the payload is
  additive-only so older watch binaries keep parsing.
- Reference implementation + tests: `src/lib/shared/watch.ts`,
  `src/test/watch-companion-contract.test.ts`.

## Complications
| Family                | Data source                          | Refresh              |
| --------------------- | ------------------------------------ | -------------------- |
| Next prayer countdown | `/watch-companion` (`prayer.next`)   | every 15 min         |
| Dhikr counter         | `/watch-companion` (`account.dhikr`) | on wake              |
| Salah tracker glance  | `/watch-companion` (`account.salah_today`) | on wake        |
| Qibla arrow           | `/qibla` + CoreMotion                | live while on screen |

## Smart Stack widgets
- "Next prayer" — big time, small label.
- "Dhikr progress" — ring, current count / target.
- "Today's adhkar" — deep-link into companion.

## Offline strategy
1. On app launch → `/watch-companion` (cache 15 min).
2. Cache prayer times for the next 7 days locally (`/prayer-times` per day).
3. Delta sync via `/user-sync-pull` on background refresh; push edits via
   `/user-sync-push` when connectivity returns. `dhikr_sessions` and
   `salah_log` use `updated_at` for last-write-wins.

## Auth
JWT is provisioned on the iPhone side via the existing Supabase auth flow,
then handed to the watch through WatchConnectivity. The watch never handles
credentials directly. Send it as `Authorization: Bearer <jwt>` plus the
`apikey` header.

## Native work still owned by you
- Create the watchOS target in the `heartify-watch` Xcode project (Apple
  Developer Team ID required).
- App Group + Keychain sharing so the phone can hand the JWT to the watch.
- Complication/widget assets and Store metadata for the watch listing.
- Signed builds (Team ID, provisioning profiles, Play SHA-256 for Wear).

## What we deliberately did NOT do here
- No changes to web routes, admin, moderation, or premium enforcement.
- No new client-side flags that hide existing UI.
- No Swift in this repo — native code lives in a separate `heartify-watch`
  repo consuming the same Platform API contract.
