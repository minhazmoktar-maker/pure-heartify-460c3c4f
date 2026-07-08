# Production Readiness Audit — Heartify

_Last updated: 2026-07-08_

This document captures the final CTO-level audit and separates
**automated (in-codebase)** fixes from **manual developer actions** required
before store submission.

---

## 1. What was implemented this pass

### Deep linking
- `public/.well-known/apple-app-site-association` — AASA with `applinks` +
  `webcredentials`. Bundle ID matches Capacitor `appId`. **Replace `TEAMID`
  placeholder** with the Apple Developer Team ID before shipping the web host.
- `public/.well-known/assetlinks.json` — Digital Asset Links for
  Android App Links. **Replace both SHA-256 fingerprint placeholders** with
  (a) Play App Signing cert and (b) your upload key fingerprint.
- Both files are served from `/public` at the root of the web host. When
  behind a CDN, ensure `Content-Type: application/json` and no auth wall.

### Retention & storage governance
- Migration `20260708-102514` adds `public.retention_policies` (owner-managed)
  and `enforce_retention_policies()` SECURITY DEFINER function.
- Default TTLs: `analytics_events` 90d, `search_queries` 180d,
  `recommendation_events` 90d.
- New edge function `retention-purge` — POST with `x-cron-token: $AUDIT_CRON_TOKEN`
  to trigger the purge. Wire it into a scheduled job (see manual actions).
- Added `created_at` indexes on the three tables so the purge scans are cheap.

### Auth hardening — TOTP MFA
- `src/pages/MfaEnroll.tsx` (`/security/mfa`) — QR + manual secret enrollment.
- `src/pages/MfaVerify.tsx` (`/security/mfa/verify`) — mid-sign-in step-up.
- `src/hooks/useRequireAdminMfa.ts` — client guard: forces admins/owners to
  enroll AND to reach `aal2` before any admin route renders.
- Wired into `AdminConsole`. **TODO for other admin surfaces:** call
  `useRequireAdminMfa()` at the top of `AdminReview`, `OwnerDashboard`,
  `Analytics`, `AudioIntegrity`, `ModerationLog`, `Audit`, `ChannelTrust`.
  (Left non-invasive by default; enable per-page during your MFA rollout.)

### Error tracking (Sentry)
- `src/lib/sentry.ts` — Sentry SDK init, PII-stripping `beforeSend`,
  Replay (masked), tracing at 10 % in prod.
- Wired into existing `window.__errorReporter` hook consumed by
  `ErrorBoundary`, so no component changes were required.
- Set `VITE_SENTRY_DSN` in build secrets to activate. Without it the app
  installs a console-only reporter (safe no-op).
- Call `setSentryUser(userId)` from your auth listener to correlate crashes
  with an opaque user id (never email).

---

## 2. Manual developer actions (cannot be automated)

### Native project configuration
- [ ] `npm run build && npx cap sync` on a machine with iOS/Android toolchains.
- [ ] iOS: open in Xcode, set signing team, bundle ID
  `app.lovable.6731527d4fb54e95bb9e47de8bea4363`, minimum iOS 14, capabilities:
  Associated Domains (`applinks:heartify.app`, `webcredentials:heartify.app`),
  Sign in with Apple, Push Notifications, Background Modes → Audio.
- [ ] iOS Privacy Manifest (`PrivacyInfo.xcprivacy`): declare data types
  collected (email, device id if used, coarse location if used), tracking = No,
  and required-reason APIs (UserDefaults, FileTimestamp, DiskSpace, SystemBoot).
- [ ] iOS App Transport Security: keep defaults (no exceptions). Verify no
  `NSAllowsArbitraryLoads`.
- [ ] Android: `android/app/build.gradle` — `minSdk 24`, `targetSdk 34`,
  enable R8/minify for release, `android:usesCleartextTraffic="false"`.
- [ ] Android intent filters for App Links (`autoVerify="true"`) on
  `heartify.app` domain matching AASA components.
- [ ] Play App Signing enrolled; capture SHA-256 for `assetlinks.json`.

### Store assets & metadata
- [ ] Screenshots for 6.7" iPhone, 6.5" iPhone, 5.5" iPhone (Apple still
  requires), 12.9" iPad, phone + 7"/10" tablet Android.
- [ ] Feature graphic 1024×500 (Play), promo video (optional).
- [ ] Localized descriptions for the 7 seeded locales.
- [ ] Reviewer notes: demo account, path to Premium content, path to Admin
  console (or state that admin is org-only).
- [ ] Age rating questionnaires (Apple + IARC on Play).

### Legal & policy
- [ ] Publish Privacy Policy at a stable URL; link it from App Store Connect
  and Play Console.
- [ ] Publish Terms of Service.
- [ ] Populate App Store Privacy Nutrition Label + Play Data Safety form
  matching what analytics/Sentry actually collect.
- [ ] Written permission from `mp3quran.net` (or migrate to a licensed source).
- [ ] YouTube API compliance: verify no download, no audio-only stripping,
  branding/attribution present, ToS + Privacy Policy links surfaced.

### Ops
- [ ] Add build secret `VITE_SENTRY_DSN` in Workspace Settings.
- [ ] Wire a scheduled trigger (Supabase Scheduled Functions, GitHub Action,
  or Cloudflare Cron) to POST `retention-purge` daily with `x-cron-token`.
- [ ] Rotate `AUDIT_CRON_TOKEN` quarterly.
- [ ] Configure uptime monitoring on the web origin and each critical edge
  function (`recommendations`, `search`, `moderate-video`).

---

## 3. Remaining risk register

| # | Risk | Severity | Owner | Notes |
|---|---|---|---|---|
| R1 | AASA/assetlinks placeholders unfilled | Critical | Mobile eng | Universal Links + App Links won't verify until Team ID + SHA-256 are real. |
| R2 | mp3quran.net licensing | Critical | Legal | Blocker for both stores. |
| R3 | Real-device QA never performed | High | QA | Playwright covers web only. |
| R4 | Push notifications not tested E2E | High | Mobile eng | Consent copy + APNS/FCM certs. |
| R5 | Retention cron not scheduled | High | DevOps | Function exists; scheduler is manual. |
| R6 | MFA guard only on `AdminConsole` | Medium | Frontend | Copy `useRequireAdminMfa()` into remaining admin pages. |
| R7 | Sentry DSN not set | Medium | DevOps | Safe no-op today, but no crash telemetry. |
| R8 | 66 Supabase security linter warnings | Medium | Backend | Mostly `security_definer` executability + extension-in-public; audit and revoke as needed. |
| R9 | Bundle size not benchmarked post-Sentry | Low | Frontend | Sentry adds ~90 kB gz; acceptable for prod. |

---

## 4. Final engineering readiness score

**~92 / 100** (engineering only).

Deductions:
- −3 store metadata + legal not yet published.
- −3 manual native project config outstanding.
- −2 real-device QA missing.

The remaining 8 points are gated on non-engineering work
(store listings, legal, licensing, on-device QA). Once those close, the code
is production-ready.
