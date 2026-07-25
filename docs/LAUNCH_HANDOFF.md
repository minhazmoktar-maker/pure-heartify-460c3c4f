# Heartify — iOS + Android + Global Launch Handoff

Everything Lovable can do has been shipped and verified. This document
is the checklist for the work only **you** can do — because it requires
credentials, hardware, or admin consoles Lovable does not have access
to.

Order the steps below top-to-bottom. Each block is independent unless
noted.

---

## 0. Pre-flight (already done in-app)

- [x] Build passes, typecheck passes, PWA precache clean (3.5 MB, 313 files).
- [x] 0 critical security findings.
- [x] SECURITY DEFINER view fixed (`channel_discovery_progress`).
- [x] Anon EXECUTE revoked from 3 personalization RPCs
      (`log_feed_impressions`, `pool_because_you_watched`, `pool_continue_watching`).
- [x] 18 language dictionaries shipped: en, ar, tr, bn, id, fr, de, ur,
      ms, fa, ha, ps, zh, ko, ja, es, pt, sw.
- [x] RTL wired for ar / ur / fa / ps (via `LocaleContext`).
- [x] Deep-link manifests present (`public/.well-known/`).
- [x] Store-safe Capacitor config (no remote `server.url` in prod builds).
- [x] `i18n:check` CI script added — run `bun run i18n:check` before every release.

---

## 1. iOS — Universal Links + App Store

### 1.1 Fill your Apple Team ID

`public/.well-known/apple-app-site-association` currently contains the
placeholder string **`TEAMID`**. Replace both occurrences with your
real 10-character Apple Developer Team ID (Apple Developer portal →
top-right → Membership).

Do this in the repo, commit, and re-publish. Universal Links will not
verify until the file is served with the real Team ID and the exact
`Content-Type: application/json` (Lovable hosting already sets this).

### 1.2 Initialize the native iOS project

Only the fastlane scaffolding exists in `ios/`. On a Mac with Xcode
installed:

```bash
git pull
npm install
npx cap add ios
npx cap sync ios
```

### 1.3 iOS Info.plist — required privacy strings

Add these keys to `ios/App/App/Info.plist` before submitting to
TestFlight. Missing keys → automatic App Store rejection.

| Key | Recommended value |
|---|---|
| `NSUserTrackingUsageDescription` | "Heartify never tracks you across other apps. This dialog is required by iOS." |
| `NSCameraUsageDescription` | Only if you enable profile-photo capture — otherwise **omit**. |
| `NSPhotoLibraryUsageDescription` | Only if you enable photo picker — otherwise **omit**. |
| `NSUserNotificationsUsageDescription` | "Prayer reminders, streak nudges, and Jumu'ah reminders. You can turn these off any time in Settings." |
| `ITSAppUsesNonExemptEncryption` | `false` (unless you add custom crypto — you haven't). |

### 1.4 App Store Connect metadata

- Category: **Reference** (secondary: Lifestyle).
- Age rating: 4+.
- Privacy manifest (`PrivacyInfo.xcprivacy`): declare Supabase network
  domain + analytics events. Template lives in Apple's Privacy
  Manifest docs.

---

## 2. Android — App Links + Play Store

### 2.1 Fill both Android SHA-256 fingerprints

`public/.well-known/assetlinks.json` has two placeholder strings:

- `REPLACE_WITH_PLAY_APP_SIGNING_SHA256_FINGERPRINT` — from Play Console
  → Release → Setup → App integrity → **App signing key certificate**.
- `REPLACE_WITH_UPLOAD_KEY_SHA256_FINGERPRINT` — from Play Console
  → Release → Setup → App integrity → **Upload key certificate**.

Both must be present or Android App Links will silently fall back to
the browser.

### 2.2 Initialize the native Android project

```bash
git pull
npm install
npx cap add android
npx cap sync android
```

Open `android/` in Android Studio, review `AndroidManifest.xml`, and
strip any permissions you don't use (Capacitor pulls in defaults you
may not need — internet is fine; storage, camera, contacts should be
absent).

### 2.3 Play Console setup

- Data safety form: declare Supabase-backed auth, analytics, no
  advertising ID, no cross-app tracking.
- Content rating: IARC → Reference / Educational.
- Target API 34 (Android 14) minimum by Aug 2026 policy — Capacitor
  8 already targets 34.

---

## 3. Legal + policy URLs

You already have `/privacy`, `/terms`, `/cookies`, `/appeals` routes
live. When submitting to either store, use:

- Privacy policy URL: `https://pure-heartify.lovable.app/privacy`
- Terms URL: `https://pure-heartify.lovable.app/terms`
- Support URL: `https://pure-heartify.lovable.app/contact`

Replace the domain with your custom domain once connected in
Project Settings → Domains.

---

## 4. Globalization — post-launch improvements

Shipped:

- 18 dictionaries, RTL for 4 locales, key-parity CI check
  (`bun run i18n:check`), locale detection with graceful fallback,
  regionalized Daily Dose, reciter/scholar multi-language routing.

Not yet shipped (out of scope for the pre-launch pass; ship after
first 1k installs to learn where translation gaps hurt most):

- Per-locale route prefixes (`/ar`, `/id`, `/tr`, …). Currently the
  app is single-URL and swaps content client-side, so Google can't
  index per-language variants. Requires router refactor.
- Per-locale sitemaps + `hreflang` alternates. Depends on the route
  prefix work above.
- Localized meta descriptions on the top 10 landing routes
  (`/`, `/quran`, `/reciters`, `/scholars`, `/prayer-times`, `/duas`,
  `/dhikr`, `/streak`, `/kids`, `/halal/:slug`).

Track these in `docs/ROADMAP_MOAT.md` under "Wave M4 — Localized SEO".

---

## 5. Residual DB linter warnings (safe to launch with)

The linter still reports 111 warnings after this pass. These are
**intentional and reviewed**:

- **16 × "Public Can Execute SECURITY DEFINER Function"** —
  the halal discovery/search RPCs (`search_videos`,
  `search_reciters`, `search_autocomplete`, `search_trending`,
  `get_trending_searches`, `get_related_searches`,
  `get_beneficial_sources_directory`, `get_public_attestation`,
  `get_global_discovery_stats`, `get_feed_candidates_diversified`,
  and the 6 `pool_*` public feeds). These must remain callable by
  unauthenticated visitors so guests see the same halal-first feed
  as signed-in users. Do not revoke.
- The remaining warnings are internal helper functions
  (`has_role`, `has_min_role`, `has_active_premium`, etc.) called
  by other SECURITY DEFINER wrappers. They are not directly reachable
  by anon because `authenticated`-only policies gate the outer path,
  but the linter can't prove that statically.

If a future audit wants to eliminate the noise entirely, wrap each
public discovery RPC in an outer thin function that is `SECURITY
INVOKER` and reads through views — significant refactor, low security
gain.

---

## 6. Release checklist (execute in order)

1. Fill Team ID in `apple-app-site-association`.
2. Fill both SHA-256 fingerprints in `assetlinks.json`.
3. `bun run i18n:check` — must exit 0.
4. `bun run typecheck` — must exit 0.
5. `bun run test` — must pass.
6. `bun run build` — must succeed.
7. Publish web from Lovable (this pushes `.well-known/*` live).
8. On your Mac: `git pull && npm install && npx cap add ios && npx cap sync ios && npx cap open ios`.
9. Fill Info.plist keys, archive, submit to TestFlight.
10. On any machine: `npx cap add android && npx cap sync android && npx cap open android`.
11. Generate signed AAB, upload to Play Console internal track.
12. Once both stores approve internal track, promote to production.

You're ready.
