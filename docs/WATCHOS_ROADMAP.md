# Heartify watchOS Roadmap

The web/mobile apps are unchanged. This doc describes how a future WatchKit /
SwiftUI companion consumes the Platform API without any watch-specific backend.

## App layers
```
┌──────────────────────────────────────────┐
│  SwiftUI views · Complications · Widgets │
├──────────────────────────────────────────┤
│  HeartifyKit (Swift package)             │
│   - PrayerTimes.swift  (mirrors prayer.ts)
│   - Qibla.swift        (mirrors qibla.ts)
│   - Entitlement.swift  (mirrors entitlement.ts)
│   - Sync.swift         (calls /user-sync-*)
├──────────────────────────────────────────┤
│  Supabase Swift client (JWT from iPhone) │
└──────────────────────────────────────────┘
```

## Complications
| Family                | Data source                     | Refresh              |
| --------------------- | ------------------------------- | -------------------- |
| Next prayer countdown | `/prayer-times` (cached 1 h)    | every 15 min         |
| Dhikr counter         | `/user-sync-pull`               | on wake              |
| Salah tracker glance  | `/user-sync-pull`               | on wake              |
| Qibla arrow           | `/qibla` + CoreMotion           | live while on screen |

## Smart Stack widgets
- "Next prayer" — big time, small label.
- "Dhikr progress" — ring, current count / target.
- "Today's adhkar" — deep-link into companion.

## Offline strategy
1. On app launch → `/client-bootstrap` (cached 30 s).
2. Cache prayer times for the next 7 days locally (`/prayer-times` per day).
3. Delta sync via `/user-sync-pull` on background refresh; push edits via
   `/user-sync-push` when connectivity returns. `dhikr_sessions` and
   `salah_log` use `updated_at` for last-write-wins.

## Auth
JWT is provisioned on the iPhone side via the existing Supabase auth flow,
then handed to the watch through WatchConnectivity. The watch never handles
credentials directly.

## Feature gating
`entitlement` from `/client-bootstrap` drives capabilities using the shared
map in `src/lib/shared/entitlement.ts` (mirror in Swift). Free tier still gets
widgets, complications, and Smart Stack.

## What we deliberately did NOT do here
- No changes to web routes, admin, moderation, or premium enforcement.
- No new client-side flags that hide existing UI.
- No native code in this repo — Swift lives in a separate `heartify-watch`
  repo consuming the same Platform API contract.
