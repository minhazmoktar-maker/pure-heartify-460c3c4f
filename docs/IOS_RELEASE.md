# Heartify — iOS release guide

Bundle ID: `com.heartifyapp.app` · Version `1.0.0` · Build `1` · Deployment target iOS 15.0
Capacitor 8 (Swift Package Manager — no CocoaPods/Podfile needed).

## Build workflow (Mac)

```bash
npm install
npm run build
npx cap sync ios
npx cap open ios      # opens ios/App/App.xcodeproj in Xcode
```

In Xcode: select the **App** target → Signing & Capabilities → check
"Automatically manage signing" → pick your Team. Capabilities **Push
Notifications** and **Associated Domains** are already declared in
`App/App.entitlements`; Xcode shows them once a Team is selected.

## Already configured in the project

- `Info.plist`: display name, 24 localizations, permission purpose strings
  (notifications, location-when-in-use, camera, photos, photos-add, microphone),
  background modes (`audio`, `remote-notification`, `fetch`), ATS locked to
  HTTPS, `ITSAppUsesNonExemptEncryption=false`, `heartify://` URL scheme,
  `arm64` device capability.
- `App/App.entitlements`: `aps-environment`, associated domains for
  `heartifyapp.com` and `www.heartifyapp.com`, webcredentials.
- `App/PrivacyInfo.xcprivacy`: privacy manifest (no tracking; declared data
  types and required-reason APIs).
- App icon + splash generated from the Heartify mark on brand background.
- `MARKETING_VERSION = 1.0.0`, `CURRENT_PROJECT_VERSION = 1`. Increment only the
  build number for each new TestFlight upload; Android versions are independent.

## Manual (needs your Apple account / Mac)

1. **Apple Developer Program** membership ($99/yr) → developer.apple.com.
2. **Identifiers** → register `com.heartifyapp.app`, enable *Push Notifications*
   and *Associated Domains*.
3. **Keys** → Create Key → check *Apple Push Notifications service (APNs)* →
   download the `.p8` once. Upload that key in Firebase Console → Project
   settings → Cloud Messaging → Apple app configuration (needs Key ID + Team ID).
4. Firebase Console → add an **iOS app** with bundle ID `com.heartifyapp.app` →
   download `GoogleService-Info.plist`. Send it over and it will be wired in;
   iOS push cannot deliver through the existing FCM backend without it.
5. Replace `TEAMID` in `public/.well-known/apple-app-site-association` with your
   real 10-character Apple Team ID (Membership details page), then publish.
6. App Store Connect → **Apps → +** → New App → iOS → name *Heartify* → bundle
   ID `com.heartifyapp.app` → SKU `heartify-ios`.
7. Xcode → Product → Archive → Distribute App → App Store Connect → Upload.
8. App Store Connect → TestFlight → add yourself as internal tester → install
   via the TestFlight app.
9. App Privacy questionnaire: answers mirror
   `docs/APP_STORE_PRIVACY_LABELS.md` (no tracking, no ads).
10. Submit for Review with screenshots per `docs/STORE_LISTING.md`.

## Notes

- No in-app purchases exist, so StoreKit is not required for this release. If
  paid membership ships later, digital goods must use Apple IAP on iOS.
- Account deletion is available in-app (Profile → Delete account), satisfying
  Apple guideline 5.1.1(v).
