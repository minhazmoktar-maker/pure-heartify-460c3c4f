# Heartify — App Store & Google Play Submission Kit

_Last updated: July 8, 2026_

This document is the single source of truth for the metadata, review notes,
copy, and asset checklist required to submit Heartify to the Apple App Store
and Google Play Store. Copy strings are localisation-ready but only the
English (`en-US`) canonical is included here — other locales pull from
`src/i18n/dictionaries/`.

---

## 1. App identity

| Field                   | Value                                                    |
| ----------------------- | -------------------------------------------------------- |
| App name                | Heartify                                                 |
| Subtitle (iOS, 30 char) | Halal streaming, curated                                 |
| Short desc (Play, 80)   | Halal-first video, calmly curated for focus & family.    |
| Bundle ID / App ID      | `app.lovable.6731527d4fb54e95bb9e47de8bea4363`           |
| Primary category        | Lifestyle                                                |
| Secondary category      | Entertainment                                            |
| Age rating (Apple)      | 4+ (no objectionable content by design)                  |
| Content rating (Play)   | Everyone                                                 |
| Kids category           | **Not enrolled.** Content is family-friendly but the app is not filed under Apple's "Made for Kids" or Google's Designed for Families programme. Revisit only after COPPA / kids-privacy audit. |
| Support URL             | `https://pure-heartify.lovable.app/`                     |
| Marketing URL           | `https://pure-heartify.lovable.app/`                     |
| Privacy policy URL      | `https://pure-heartify.lovable.app/privacy`              |
| Terms URL               | `https://pure-heartify.lovable.app/terms`                |

## 2. App description (long form, ≤4000 char)

> **Heartify — halal streaming, calmly curated.**
>
> Heartify is a distraction-free video app built for Muslim families. Every
> channel is human-reviewed, every video passes multi-stage moderation, and
> nothing is shown that would take your heart out of remembrance of Allah.
>
> **What you get**
> • A calm home feed — no autoplaying junk, no rage-bait, no ads between
>   videos.
> • Trusted channels only — scholars, storytellers, family-friendly creators.
> • Daily Dose — one thoughtfully picked video for your day.
> • Continue watching — pick up on any device where you left off.
> • Favorites & watch history — private to you, deletable at any time.
> • Language & content-mix controls — English, العربية, Türkçe, বাংলা,
>   Bahasa Indonesia, Français, Deutsch, with more on the way.
>
> **Built on halal principles**
> • Ownership-key deduplication so blocked creators cannot re-appear under
>   aliases.
> • Nightly re-audit sweep so anything newly problematic is removed.
> • Trust scoring on every channel — high, medium, low, critical.
>
> **Your privacy**
> • No third-party advertising, no data brokers.
> • In-app account deletion — one tap, permanent.
> • Personal data is stored in encrypted cloud infrastructure and never sold.
>
> Heartify is free. Premium may be introduced in the future for optional
> features — the core, family-safe experience will always remain accessible.

## 3. Keywords (Apple, 100-char limit)

`halal,islam,quran,muslim,nasheed,streaming,family,kids-safe,dua,lecture,arabic,islamic`

## 4. What's New (release notes for first submission)

> First public release. Curated halal video catalogue, Daily Dose,
> cross-device Continue Listening, in-app account deletion, Sign in with
> Apple, and language controls covering seven starting languages.

---

## 5. Reviewer notes (Apple App Review + Play Store review team)

> Heartify curates and plays back publicly available YouTube videos through
> the official YouTube IFrame Player API — the app does not download,
> re-host, or strip advertising from any third-party content. Playback is
> gated by YouTube's own terms and delivered inside the sanctioned iframe.
>
> To review the moderation pipeline, sign in with the demo account below.
> The account has no admin privileges — reviewers see the same experience as
> a first-time user. To view catalog admin tools, use the moderator account
> (separate credentials provided in the App Store Connect / Play Console
> reviewer notes field, not this document).
>
> **Demo account (end-user):**
>   Email: `review@heartify.app`
>   Password: `Heartify-Review-2026`
>   (Rotate this password before every submission; strip from build if
>   the account is ever compromised.)
>
> **Sign in with Apple** is offered alongside email/password and Sign in with
> Google, satisfying App Store Review Guideline 4.8. Anonymous sign-up is
> disabled server-side.
>
> **Account deletion** is available in-app under Profile → Delete account.
> Deletion revokes all sessions, scrubs user-owned rows across 14 tables,
> and calls Supabase Auth Admin to remove the identity. This satisfies App
> Store Review Guideline 5.1.1(v).
>
> **Kids content**: Heartify is family-friendly but **not** filed as a Kids
> Category / Made for Kids app. No child-directed data collection, no
> third-party analytics SDKs. If Apple flags any concerns about the
> family-safe positioning we are happy to add a parental gate.
>
> **Push notifications** are opt-in and used only for content the user
> favorited or the Daily Dose reminder. No promotional messaging.
>
> **Rate limiting** (60 requests/min per user for recommendations,
> 120 requests/min for search) protects the backend from abuse. If your
> testing pipeline exceeds these limits and you see HTTP 429, please
> contact us and we will whitelist your test IPs.

---

## 6. Screenshot plan

_All screenshots must be captured on real hardware or Xcode simulator at the
sizes below. Do NOT scale up smaller shots — Apple rejects those._

### iOS

| Device               | Resolution      | Count | Purpose                       |
| -------------------- | --------------- | ----- | ----------------------------- |
| iPhone 6.9" (Pro Max)| 1290 × 2796     | 5–8   | Primary hero shots            |
| iPhone 6.5"          | 1284 × 2778     | 5–8   | Legacy hero shots             |
| iPad 13"             | 2064 × 2752     | 5–8   | iPad marketing                |

### Android

| Device               | Resolution      | Count | Purpose                       |
| -------------------- | --------------- | ----- | ----------------------------- |
| Phone                | 1080 × 1920+    | 4–8   | Standard Play Store listing   |
| 7" tablet            | 1024 × 600+     | 1–4   | Optional tablet listing       |
| 10" tablet           | 1280 × 800+     | 1–4   | Optional tablet listing       |
| Feature graphic      | 1024 × 500      | 1     | Play Store featured banner    |

### Recommended shot list (labelled marketing scenes)

1. **"Calm home feed"** — Daily Dose card + hero section.
2. **"Every channel reviewed"** — Trusted-channel section with badges.
3. **"Continue where you left off"** — Continue Listening carousel.
4. **"Language & diversity, your call"** — Locale settings card.
5. **"Made for focus"** — Watch screen with clean player.
6. **"Your account, your control"** — Profile with Delete account visible.

Store the produced screenshots under `docs/store-assets/screenshots/` before
upload (git-ignored).

---

## 7. Icon & branding assets

Master icon lives at `public/app-icon-1024.png` (1024 × 1024, no alpha).
Generate the platform-specific sizes with `@capacitor/assets`:

```bash
# From project root, after building web assets
npx @capacitor/assets generate --iconOnly --iconSource public/app-icon-1024.png --iconBackgroundColorDark "#0F172A"
```

This emits every required Apple & Android icon into `ios/App/App/Assets.xcassets`
and `android/app/src/main/res/mipmap-*`.

For the splash screen and adaptive icon, run once you have a splash source:

```bash
npx @capacitor/assets generate --splashSource public/splash.png --splashBackgroundColor "#0F172A"
```

Splash colour: `#0F172A` (matches `capacitor.config.ts → SplashScreen.backgroundColor`).

---

## 8. Data-safety declarations

### Apple Privacy Nutrition Label

| Data type            | Collected | Linked to user | Used for tracking | Purpose                        |
| -------------------- | --------- | -------------- | ----------------- | ------------------------------ |
| Email address        | Yes       | Yes            | No                | App functionality              |
| Name (display name)  | Yes       | Yes            | No                | App functionality              |
| User ID              | Yes       | Yes            | No                | App functionality              |
| Product interaction  | Yes       | Yes            | No                | Analytics, App functionality   |
| Search history       | Yes       | Yes            | No                | App functionality              |
| Playback progress    | Yes       | Yes            | No                | App functionality              |
| Crash data           | Yes       | No             | No                | App functionality              |
| Performance data     | Yes       | No             | No                | Analytics                      |
| Device ID (push)     | Yes       | Yes            | No                | App functionality              |

No third-party advertising SDK. No location, no financial, no health data.

### Google Play Data Safety Form

Mirror the Apple table above. Encryption in transit: yes. Deletion request:
yes, via in-app Profile → Delete account, no email required.

---

## 9. Submission gating checklist (must be green before hitting Submit)

- [ ] `capacitor.config.ts` has no `server.url` in the production build (verified by `CAP_LIVE_RELOAD_URL` unset).
- [ ] `npm run build && npx cap sync` runs clean.
- [ ] Signing certificate in place (Apple: distribution cert & provisioning profile; Google: upload key).
- [ ] App icon + all splash variants generated via `@capacitor/assets`.
- [ ] Privacy policy URL + Terms URL return HTTP 200 (they do — `/privacy`, `/terms`).
- [ ] Sign in with Apple present alongside Google (Login + Signup screens).
- [ ] Account deletion present under Profile → Delete account.
- [ ] Push notification consent copy reviewed.
- [ ] Rate-limit thresholds documented and reviewer IPs whitelisted if needed.
- [ ] Screenshots captured at required resolutions.
- [ ] Reviewer demo account works from a signed-out state.

---

## 10. Contacts

| Role                | Contact                              |
| ------------------- | ------------------------------------ |
| Legal / privacy     | `privacy@heartify.app`               |
| App Review liaison  | `appreview@heartify.app`             |
| Security disclosure | `security@heartify.app`              |
| Support             | `support@heartify.app`               |

---

## 11. ASO metadata (frozen for v1 submission)

| Field | Value | Char limit |
| --- | --- | ---: |
| App Store title | `Heartify: Halal Streaming` | 30 |
| App Store subtitle | `Curated video for the soul` | 30 |
| Play Store title | `Heartify — Halal Streaming` | 30 |
| Play Store short description | `Halal-first video, calmly curated for focus, family, and faith.` | 80 |
| iOS keywords (comma, no spaces) | `halal,islamic,quran,nasheed,muslim,family,kids,tafsir,seerah,ramadan,duas,mindful,adhkar,dhikr` | 100 |

**Google Play does not use a keyword field** — instead, ensure the long
description contains each keyword organically (2–3 times max).

## 12. Screenshot copy (per device)

Six screenshots per platform. Same order everywhere so metadata reads
naturally:

1. **"Every video, human-reviewed."** — home feed hero shot.
2. **"Your Daily Dose of remembrance."** — Daily Dose card.
3. **"Search the way you think."** — search results with suggestions.
4. **"Listen to verified reciters."** — audio player screen.
5. **"Streaks that build the habit."** — profile / streak.
6. **"Curated collections for every moment."** — For You shelves.

Preview video (30 s, portrait): open home → Daily Dose → play video →
favorite → share. Silent, captioned in EN + AR.

## 13. Review-request policy

Handled in code by `src/lib/inAppReview.ts::triggerIfDelightful()`:

- ≥ 3 days since first launch
- ≥ 5 delight moments (Daily Dose completion, streak extension, favorite)
- ≥ 90 days since last prompt
- Uses `@capacitor-community/in-app-review` on native, soft toast on web

Call sites: `useCompleteDoseVideo` on success, `useFavorites.toggle` on
add, streak-extend hook.
