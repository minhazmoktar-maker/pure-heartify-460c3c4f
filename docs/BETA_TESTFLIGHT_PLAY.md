# Heartify — Beta Release Runbook (TestFlight + Play Internal Testing)

Single source of truth for shipping a beta build of Heartify to iOS TestFlight
and Google Play Internal Testing. Everything here matches the automation in
`.github/workflows/mobile-release.yml`, `ios/App/fastlane/Fastfile`, and
`android/fastlane/Fastfile`.

Related docs: `docs/STORE_LISTING.md` (copy), `docs/play-data-safety.md`
(Data Safety answers), `docs/ios-info-plist-additions.xml` (purpose strings),
`docs/DEVICE_MATRIX.md` (test devices), `docs/LAUNCH_HANDOFF.md` (production).

---

## 0. Build configuration (already in the repo)

| Item | Value / location |
|---|---|
| App name | `heartify` (`capacitor.config.ts`) |
| Bundle / package id | `app.lovable.6731527d4fb54e95bb9e47de8bea4363` |
| Web assets | bundled `dist/` — **never** a remote `server.url` in release builds |
| iOS scheme | `App` (workspace `ios/App/App.xcworkspace`) |
| Android artifact | `android/app/build/outputs/bundle/release/app-release.aab` |
| Version source | git tag `vX.Y.Z`; build number = timestamp (iOS) / run number (Android) |
| Pre-build gate | `npm run cap:smoke` (Playwright smoke spec) |

Change the bundle id in `capacitor.config.ts` **before** the first upload if you
want a branded id (e.g. `app.heartify.mobile`) — it can never be changed after
the first store submission.

---

## 1. One-time Apple setup

1. Apple Developer Program membership (paid, org or individual).
2. App Store Connect → **Apps → +** → New App:
   - Platform iOS, name `Heartify`, primary language, bundle id, SKU `heartify-ios`.
3. Create an **App Store Connect API key** (Users and Access → Integrations →
   App Store Connect API, role *App Manager*). Download the `.p8` once.
4. Create a private git repo for `fastlane match` signing assets, then run once
   from a Mac: `cd ios/App && bundle exec fastlane match appstore`.
5. Merge `docs/ios-info-plist-additions.xml` keys into `ios/App/App/Info.plist`
   (purpose strings + `UIBackgroundModes: audio, remote-notification, fetch`).
6. Enable capabilities in Xcode: Push Notifications, Background Modes (Audio,
   Remote notifications), Associated Domains (`applinks:pure-heartify.lovable.app`).
7. Fill App Privacy (Nutrition Label) to match `docs/play-data-safety.md`.
8. Add the Team ID and SHA-256 App ID to `public/.well-known/apple-app-site-association`.

### GitHub secrets — iOS
`APP_STORE_CONNECT_API_KEY_ID`, `APP_STORE_CONNECT_API_ISSUER_ID`,
`APP_STORE_CONNECT_API_KEY_B64` (base64 of the `.p8`), `MATCH_PASSWORD`,
`MATCH_GIT_URL`, `MATCH_GIT_BASIC_AUTHORIZATION` (base64 `user:token`),
`IOS_TEAM_ID`.

---

## 2. One-time Google setup

1. Play Console developer account (one-time fee) + **Create app** → `Heartify`.
2. Generate the upload keystore (keep the `.jks` and passwords in a vault —
   losing them means losing the ability to update the app):
   ```bash
   keytool -genkey -v -keystore upload-keystore.jks -alias heartify \
     -keyalg RSA -keysize 2048 -validity 10000
   ```
3. Enable **Play App Signing** (default for new apps).
4. Create a **service account** in Google Cloud → grant it *Release manager* in
   Play Console (Users and permissions) → download the JSON key.
5. **Upload the very first AAB manually** in the console (`Testing → Internal
   testing → Create new release`). The Play API rejects the first upload of a
   package it has never seen.
6. Complete: Data safety (`docs/play-data-safety.md`), Content rating
   questionnaire, Target audience (13+, not "designed for children"), Ads
   declaration = **No ads**, Privacy policy URL `https://pure-heartify.lovable.app/legal/privacy`.
7. Put the release signing SHA-256 into `public/.well-known/assetlinks.json`.

### GitHub secrets — Android
`ANDROID_KEYSTORE_B64` (base64 of `.jks`), `ANDROID_KEYSTORE_PASSWORD`,
`ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`, `PLAY_SERVICE_ACCOUNT_JSON`.

Optional: `SLACK_WEBHOOK_URL` for failure alerts.

---

## 3. Per-release checklist

Pre-flight (do all of these before tagging):

- [ ] `npm run test` and `npm run typecheck` clean
- [ ] `npm run cap:smoke` passes locally
- [ ] Security scan has no unresolved critical findings
- [ ] Web app published so backend/edge functions match the shipped bundle
- [ ] `CAP_LIVE_RELOAD_URL` **unset** in every release environment
- [ ] Push notifications verified on a physical device (APNs key uploaded to
      App Store Connect; FCM `google-services.json` present for Android)
- [ ] Deep links verified: `/watch/:id`, `/verify`, `/learn/path/:slug`
- [ ] Offline downloads verified (download → kill app → reopen → resumes)
- [ ] Release notes drafted (`BETA_CHANGELOG`)

Ship:

```bash
git tag v1.0.0 && git push origin v1.0.0     # builds iOS + Android
# or, from the Actions tab: "Mobile Release" → Run workflow → lane: both|ios|android
```

The workflow: smoke gate → `npm run build` → `npx cap sync` → version bump →
signed build → upload. Artifacts (`ios-ipa`, `android-aab`) are retained 14 days.

Post-upload:

- [ ] **iOS**: App Store Connect → TestFlight → wait for processing (10–30 min) →
      answer the export-compliance prompt (Heartify uses only standard HTTPS
      encryption → "exempt") → add internal testers/groups → build available.
      Set `TESTFLIGHT_GROUPS="Core Team,Scholars"` to auto-assign groups.
- [ ] **Android**: Play Console → Testing → Internal testing → confirm the
      release is *live* (the lane uploads with `release_status: completed`; use
      `PLAY_RELEASE_STATUS=draft` to stage instead) → share the opt-in link.
- [ ] Smoke the installed build on the `docs/DEVICE_MATRIX.md` minimum devices.
- [ ] Log the build number + changelog in `src/data/changelog.ts`.

---

## 4. Tester onboarding

**iOS (internal, up to 100 users / 30 builds)**: add the tester's Apple ID email
in TestFlight → they install the TestFlight app → accept invite. External
testing (up to 10,000) requires a Beta App Review — allow 1–2 days.

**Android (internal, up to 100 users)**: create an email list in Internal
testing → share the opt-in URL → testers must accept before Play shows the app.

Ask every tester to report through Profile → Help → Report a problem so reports
land with device/build metadata attached.

---

## 5. Rejection risks specific to Heartify

| Risk | Mitigation |
|---|---|
| Remote-loaded web content (Guideline 4.7 / 2.5.2) | Release builds bundle `dist/`; `capacitor.config.ts` only sets `server.url` when `CAP_LIVE_RELOAD_URL` is exported |
| User-generated content moderation (1.2) | Show the report/block flows and moderation pipeline in review notes |
| Missing purpose strings | `docs/ios-info-plist-additions.xml` merged into Info.plist |
| Account deletion requirement (5.1.1(v)) | Profile → Export & Delete My Data, plus `/legal/delete-account` |
| Payments outside IAP | Membership must use Apple IAP / Play Billing inside the app |
| Data Safety mismatch | Keep `docs/play-data-safety.md` and the Privacy Label identical |
| Sign-in required to see content | Provide a demo account in review notes; core browsing works signed-out |

---

## 6. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| `No signing certificate found` | `match` repo unreachable or `MATCH_PASSWORD` wrong |
| `The bundle version must be higher` | iOS build number not increasing — lane stamps `YYYYMMDDHHmm` UTC |
| `Version code already used` | Android `versionCode` = run number; re-run the workflow |
| `Package not found` (Play API) | First AAB was never uploaded manually — do step 2.5 |
| Testers see no build | Play release left in draft, or TestFlight export compliance unanswered |
| White screen on device | `dist/` missing — `npm run build` before `npx cap sync` |
| Push not delivered | APNs key missing (iOS) or `google-services.json` not synced (Android) |
