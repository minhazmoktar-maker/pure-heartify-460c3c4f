# Heartify for Apple Watch — Xcode setup

Everything logic-side already exists in this repo and is testable without Xcode:

```
heartify-watch/
  Package.swift                                  HeartifyKit (watchOS 10+/iOS 16+)
  Sources/HeartifyKit/WatchCompanion.swift       payload models + clock helpers (port of src/lib/shared/watch.ts)
  Sources/HeartifyKit/HeartifyClient.swift       one-call networking, App Group cache, session token
  Sources/HeartifyKit/ComplicationModel.swift    payload -> rendered strings, refresh cadence
  Tests/HeartifyKitTests/                        unit tests for the mapping
  HeartifyWatch/                                 watchOS app target sources (SwiftUI)
  HeartifyWatchComplications/                    WidgetKit bundle sources
```

Backend contract: `GET {SUPABASE_URL}/functions/v1/watch-companion?lat&lng&method&tz_offset`
(auth optional — no bearer token means prayer data only, never account data).

A Swift package cannot declare a watchOS app or a widget extension, so the two
app targets must be created once in Xcode on a Mac. Sources above are then added
by reference; no code needs to be rewritten.

## 1. Prerequisites

- macOS with Xcode 15.4 or newer, watchOS 10 SDK.
- Apple Developer Program membership (paid) — complications require a provisioning profile.
- The existing Heartify iOS app bundle id (Capacitor): `com.heartifyapp.app`.

## 2. Create the targets

1. Open the iOS project (`ios/App/App.xcworkspace` after `npx cap sync ios`).
2. File → New → Target → **watchOS → App**.
   - Product name: `HeartifyWatch`
   - Bundle id: `com.heartifyapp.app.watchkitapp`
   - Interface: SwiftUI, Language: Swift, Life cycle: SwiftUI App
   - Uncheck "Include Notification Scene" and tests (HeartifyKit already has tests).
3. File → New → Target → **watchOS → Widget Extension**.
   - Product name: `HeartifyWatchComplications`
   - Bundle id: `com.heartifyapp.app.watchkitapp.complications`
   - Uncheck "Include Configuration App Intent" (the providers are static).
   - Embed in: `HeartifyWatch`.
4. Delete the placeholder `.swift` files Xcode generated in both new targets.

## 3. Add the shared package and sources

1. File → Add Package Dependencies → **Add Local…** → select `heartify-watch/`.
2. Add the `HeartifyKit` library to the *frameworks and libraries* of **both**
   `HeartifyWatch` and `HeartifyWatchComplications`.
3. Drag `heartify-watch/HeartifyWatch/*.swift` into the `HeartifyWatch` target
   (Add to target: HeartifyWatch only).
4. Drag `heartify-watch/HeartifyWatchComplications/HeartifyComplications.swift`
   into the widget target (Add to target: HeartifyWatchComplications only).

## 4. Capabilities

App Group — required: the widget extension reads the cached payload and the
session token written by the app.

1. Signing & Capabilities → + Capability → **App Groups** on all three targets
   (iOS app, `HeartifyWatch`, `HeartifyWatchComplications`).
2. Add group `group.com.heartifyapp.shared` to each.
   If you must use a different id, change the two constants in
   `HeartifyClient.swift` (`HeartifyCacheStore.shared` and `HeartifySession`).

Location — the watch app requests coarse location for prayer times. Add to the
**HeartifyWatch** target's Info.plist:

```
NSLocationWhenInUseUsageDescription = Heartify uses your approximate location to
calculate accurate prayer times on your watch.
```

Nothing else is needed: no HealthKit, no background modes, no push entitlement.

## 5. Sign-in handoff (optional but recommended)

Unauthenticated watches show prayer times only. To show streak/salah/dhikr, the
iOS app must hand the Supabase access token to the watch:

- iOS side: after sign-in, send `["accessToken": session.accessToken]` via
  `WCSession.default.transferUserInfo(_:)`.
- Watch side: in `WCSessionDelegate.session(_:didReceiveUserInfo:)` call
  `HeartifySession.store(userInfo["accessToken"] as? String)`, then reload
  timelines with `WidgetCenter.shared.reloadAllTimelines()`.
- On sign-out send `nil` so the watch drops account data immediately.

Never log or display the token.

## 6. Run and verify

```bash
# logic tests, no Xcode needed
cd heartify-watch && swift test
```

In Xcode: select the `HeartifyWatch` scheme → an Apple Watch Series 9 (watchOS 10)
simulator → Run. Expected:

- Glance shows next prayer name, local time, countdown; "Remaining today" and
  streak appear only when a token was handed over.
- Offline (turn off the Mac's network): the glance keeps the last payload and
  shows "Showing last saved times".
- Long-press a watch face → Edit → complications → Heartify → "Next Prayer" and
  "Heartify Streak" appear for circular, corner, inline and rectangular slots.

## 7. Ship

1. Version/build numbers on the watch targets must match the iOS app.
2. Archive the **iOS app** scheme (the watch app and its extension are embedded
   automatically) → Distribute App → App Store Connect.
3. In App Store Connect add watch screenshots (410×502 for Series 9 45mm) and
   confirm the privacy label already declares coarse location "App Functionality,
   not linked to identity".

## Known limits

- This sandbox cannot produce signed binaries; steps 2-7 must run on your Mac.
- Complication refreshes are budgeted by watchOS; `ComplicationMapper.nextRefresh`
  requests 5/15/30-minute cadence depending on proximity to the next prayer, and
  the in-timeline entries keep the countdown accurate between system refreshes.
