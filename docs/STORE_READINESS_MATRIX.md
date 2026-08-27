# Heartify — Store readiness matrix

Status of every Play Store and App Store requirement, with the exact artifact
in this repo that satisfies it. `Repo` = done here. `You` = requires your
accounts, payment, identity, or legal attestation and cannot be automated.

Apply native config after `npx cap add`:

```bash
npm run cap:configure        # patch signing, SDK levels, permissions, plist
npm run cap:configure:check  # CI gate: fails if native config drifted
```

## Android — Google Play

| Requirement | Status | Where |
| --- | --- | --- |
| App functionality & UI | Repo | `src/` — mobile-first shell, bottom nav, safe areas |
| Android build (AAB) | Repo | `android/fastlane/Fastfile` → `fastlane android build_only` / `internal` |
| App icon / splash | Repo | `public/icons/icon-source.png`, `splash-source.png` + `@capacitor/assets` |
| App name / package ID | Repo | `capacitor.config.ts` (`appId`, `appName`) |
| Signing / release config | Repo | `scripts/apply-native-config.mjs` → `android/app/heartify-signing.gradle` (keystore + passwords stay out of git) |
| Keystore file itself | You | `keytool -genkey …` per `docs/BETA_TESTFLIGHT_PLAY.md` |
| Privacy policy page | Repo | `/privacy` (`src/pages/Privacy.tsx`), `/terms` |
| Data Safety form | Repo prepared | `docs/play-data-safety.md`, `docs/STORE_SUBMISSION_TEMPLATES.md` §3 — you submit |
| Content rating questionnaire | Repo prepared | `docs/PLAY_CONTENT_RATING.md` — you submit |
| Target Android API | Repo | `ANDROID_SDK` in `scripts/apply-native-config.mjs` (compile/target 36, min 24) |
| Permissions implementation | Repo | `ANDROID_PERMISSIONS` — only notifications, location, network, vibrate, billing |
| Screenshots | Repo generated | `store-assets/screenshots/android`, `android-tablet` (`npm run store:screenshots`) |
| Feature graphic | Repo | `store-assets/play-feature-graphic.jpg` |
| Store listing / title / description | Repo | `docs/STORE_LISTING.md` |
| Testing / bug fixing | Repo | `npm test`, `npm run test:e2e`, `npm run cap:smoke` |
| Crash / error handling | Repo | `src/components/ErrorBoundary.tsx` + backend production alerts |
| Play Console account & fee | You | — |
| Developer identity verification | You | — |
| Organization / business verification | You | if applicable |
| Age / content declarations | You | attest using `docs/PLAY_CONTENT_RATING.md` |
| Copyright / trademark ownership | You | legal |
| Final Play review | Google | — |

## iOS — App Store

| Requirement | Status | Where |
| --- | --- | --- |
| iOS app implementation | Repo | Capacitor shell + `src/` |
| UI/UX | Repo | mobile-first design system, RTL, dynamic type |
| App icon | Repo | `public/icons/icon-source.png` (1024²) |
| Splash / launch screen | Repo | `capacitor.config.ts` → `SplashScreen`, `splash-source.png` |
| Bundle ID / configuration | Repo | `capacitor.config.ts` (`appId`, `ios.scheme`, app-bound domains) |
| App signing configuration | You + Repo | `ios/App/fastlane/Fastfile` (match/gym); certificates need your Apple account |
| Privacy policy | Repo | `/privacy` |
| Privacy nutrition labels | Repo prepared | `docs/APP_STORE_PRIVACY_LABELS.md` — you verify/submit |
| Privacy manifest | Repo | `docs/privacy-info.xcprivacy` → applied to `ios/App/App/PrivacyInfo.xcprivacy` |
| Permission descriptions | Repo | `IOS_USAGE_STRINGS` in `scripts/apply-native-config.mjs` |
| Screenshots | Repo generated | `store-assets/screenshots/ios-6.7`, `ios-6.1`, `ipad-12.9` |
| Description / keywords / metadata | Repo | `docs/STORE_LISTING.md` |
| TestFlight setup | Repo prepared | `docs/BETA_TESTFLIGHT_PLAY.md` — account required |
| Crash / error handling | Repo | `ErrorBoundary` + alerting |
| In-app purchases | Repo code | membership entitlements + checkout; Apple IAP products must be created in App Store Connect |
| Apple Developer account & fee | You | — |
| Identity / business verification | You | — |
| Banking & tax agreements | You | required before paid membership |
| Copyright / trademark ownership | You | legal |
| App Review | Apple | — |
| App Store Connect submission | You + Repo | fastlane uploads; account actions are yours |

## Pre-submission command sequence

```bash
npm test && npm run typecheck
npm run store:screenshots
npm run build && npx cap sync
npm run cap:configure && npm run cap:configure:check
cd android && fastlane android internal      # Play internal track
cd ios/App && fastlane ios beta              # TestFlight
```
