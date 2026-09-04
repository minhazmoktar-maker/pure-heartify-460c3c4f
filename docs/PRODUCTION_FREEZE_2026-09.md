# Production Freeze — 2026-09-01

State of the codebase at freeze, and the short list of items that only the
project owner can finish (credentials, developer accounts, partner sign-off).

## Freeze verification
| Check | Result |
| --- | --- |
| TypeScript (`tsconfig.app.json`) | clean |
| Unit/integration tests | 435 passing, 1 skipped (48 files) |
| Security scan | 0 active findings |
| RLS / Data API grants | verified on all user-facing tables |
| Sitemaps / robots / canonical | pointed at `https://heartifyapp.com` |
| GSC | property verified, sitemap accepted (0 errors) |

## Fixed in this pass
- **Asr prayer time bug**: `prayer-times` passed a sign-flipped solar altitude,
  so Asr could be computed *after* Maghrib (Dhaka: 21:12 local instead of
  15:26). Fixed and covered by a regression test.
- **`watch-companion` endpoint shipped**: single small payload for watchOS
  complications, Smart Stack widgets and Wear tiles. Anonymous callers get
  prayer data only; account data requires a verified bearer token.
- **Shared watch contract**: `src/lib/shared/watch.ts` is the reference
  implementation to port into Swift (`HeartifyKit`), with tests.

## Owner-only remaining work
1. **Native launch** — signed Android/iOS builds. Needs Apple Team ID, Play
   upload key SHA-256, and the `.well-known/assetlinks.json` +
   `apple-app-site-association` entries populated with those values.
2. **Apple Watch** — create the watchOS target in `heartify-watch`; the backend
   contract it needs is already live (see `docs/WATCHOS_ROADMAP.md`).
3. **YouTube quota** — `YOUTUBE_API_KEY_3..6` are wired in code but unset.
   Setting them is the actual ceiling on reaching 1M+ videos.
4. **Institutional co-signing** — `trusted_institutions` / attestations exist;
   real signatures from named scholars/institutions need partner sign-off.

## Post-freeze policy
Only these change classes are in scope without re-opening the freeze:
- security fixes, RLS/grant corrections
- content-corpus operations (ingestion, moderation, recovery crons)
- store metadata and native shell configuration
- copy/localization corrections

Feature work resumes after the store submissions are accepted.

## Freeze addendum — 2026-09-01

- Institutional co-signatures are now a scored trust signal:
  `channel_trust_weights.w_institution_cosign` (2.0, capped at 5 distinct
  institutions), `channel_trust_profiles.institution_cosign_count`,
  `channel_cosign_strength()`, and `get_cosign_trust_summary()` (public).
  `/verify` shows live attestation coverage and states the ranking effect.
  Only signatures binding the *current* ledger digest count.
- `rejection-recovery-hourly` run manually: 322 videos re-opened; moderation +
  visual sweep workers draining ~845 decisions / 30 min. `evidence_free_rejections`
  = 14,963 remaining, gated on evidence-based channel review.
- YouTube key pool: `YOUTUBE_API_KEY`, `_2`, `GOOGLE_API_KEY` live in every
  quota-consuming function. `YOUTUBE_API_KEY_3..6` remain unset — the real
  ceiling on 1M+ videos.
- Owner-only, unchanged: signed Android/iOS builds (Team ID, Play SHA-256),
  watchOS target, real institution signing keys.

## Freeze addendum — final E2E verification

**P0 fixed: anonymous readers were locked out of core tables.**
Earlier RPC hardening revoked `anon` EXECUTE on the security-definer helpers
(`viewer_has_active_entitlement`, `has_role`, `is_owner`, `has_min_role`,
`has_active_premium`, `has_active_entitlement`) that RLS policies on
`curated_videos`, `reciter_audio_sources`, `playlists`, `playlist_items` and
`regional_language_mix` evaluate. Postgres rejected the *whole query* with
`42501 permission denied for function`, so every signed-out visitor saw
"This video is no longer available" on deep-linked watch pages and an empty
Listen library — including Google's crawler.
Fix (migrations 0019/0020): EXECUTE granted to `anon`, and each helper now
hard-returns `false` when the request's JWT role is `anon` and a user id is
supplied, so no anonymous boolean-oracle probing of another user's roles or
entitlements is possible. Authenticated, definer and service_role paths are
unchanged.

**E2E suite: 229 passed, 33 skipped (auth-gated), 0 failed** (13.9m, full run).
Spec corrections made alongside the fix:
- `capacitor-smoke`: playback test now presses the lite-YouTube facade's play
  button (the embed intentionally mounts only on user intent), and the feed-card
  count is polled while lanes hydrate progressively.
- `cache-invalidation`: bfcache history navigation resolves on `commit` with an
  explicit cap — restored pages never re-fire `load`, which hung the test for
  the full 300s timeout.
- Sandbox runs must go through `scripts/playwright.sh` (the downloaded
  `chrome-headless-shell` cannot resolve libglib here).

## Formal freeze entry — 2026-09-04

State at freeze: **228 passed · 33 skipped (auth-gated, need CI test-user
secrets) · 0 failed** on the full 262-spec Playwright suite via
`./scripts/playwright.sh`. Typecheck clean (`tsgo -p tsconfig.app.json`),
unit suite green.

### Shipped in this freeze window

**Shorts / reels (`/shorts`) — strict-halal by construction.**
New `get_shorts_feed(_limit,_offset,_lang,_min_seconds,_max_seconds)` RPC
(migration `0021`) is the only data source. Eligibility, all server-side:
`moderation_state IN ('approved','auto_approved')`, `visual_state = 'clean'`
(the visual sweep is the stage that rejects music, instruments and non-mahram
imagery — `unchecked` and `flagged` can never surface here), `halal_score >= 70`,
embeddable, not hidden/archived/premium-only, dedup-canonical, duration clamped
to 5–180s. ~46k videos currently qualify. The page no longer guesses shorts from
title regexes against an external API.
Anti-addiction guardrails, deliberate: a pause card every 10 shorts pointing to
Today's Dose, and a T+0 `queue_benefit_label_now` after 15s on screen so shorts
feed the *benefit* ranker rather than watch time. `/shorts` is now in
`MAIN_NAV_ITEMS`.

**RTL regression fixed.** `YouTubeVideoCard` overlays used physical
`left-2`/`right-2`, so the bookmark + feedback action row did not mirror and
`rtl-keyboard.spec.ts` failed reading-order on the watch page. Converted to
logical `start-2`/`end-2`; RTL keyboard + snapshot + halal-surface specs pass.

### Known, accepted at freeze

- **Dev-only React ref warning.** `Function components cannot be given refs`
  cascades from `lovable-tagger` in the Vite dev pipeline (stack bottoms out in
  `react-helmet-async`/dev tooling, not app code). Absent from production
  builds; console assertions filter it.
- **33 skipped specs** are role/auth-gated (`TEST_ADMIN_*`, `TEST_MOD_*`,
  `TEST_USER_*`) and run only where those CI secrets exist.

### Owner-only — cannot be completed in this environment

1. **Signed Android build / Play submission.** Needs the real Apple Team ID and
   the Play app-signing SHA-256 fingerprint (never supplied) plus a local
   Android Studio/keystore. Repo side is ready: `heartify-signing.gradle`,
   fastlane `internal`/`build_only`, `apply-native-config.mjs`.
2. **Apple Watch target.** `src/lib/shared/watch.ts` + `docs/WATCHOS_ROADMAP.md`
   define the contract and complication mapping; producing a watch app requires
   Xcode and an Apple developer account.
3. **Real institution signatures.** Code path is live — `institution_cosign`,
   `attestation_cosignatures`, `channel_trust_weights.w_institution_cosign`
   boosting rank, and the `/verify` dashboard. Only partner sign-off is missing.
4. **`YOUTUBE_API_KEY_3..6`** remain unset; ingest rotates whatever keys exist.

---

## Freeze entry — 2026-09-04 (search relevance + suggestions)

### Verification

- `bash scripts/playwright.sh` (full suite, system Chromium path): **229 passed,
  33 skipped (auth-gated), 0 failed** in 17.9m.
- `bunx vitest run src/lib/__tests__/searchEngine.test.ts`: 14 passed.
- Autocomplete RPC smoke-tested over the anon REST endpoint for
  `quran / hadith / ram / salah / dua / tajwe / seerah` — all sub-second.

### Shipped this cycle

- **`search_autocomplete` rebuilt** (migrations `0023`–`0028`). It now blends
  four sources instead of channel-prefix only: related multi-word phrases mined
  from serving video titles, word-boundary channel matches, an expanded topic
  list, and popular past queries. Whole-word phrase mining uses word arrays
  (never regex slicing), so suggestions can no longer be cut mid-word.
  `_suggestion_phrase_is_noisy()` drops repeated words, query-swallowing tokens
  (`quran quranrecitation`) and dangling connectors/initials
  (`salah assim al`). Every mined title stays inside the strict halal predicate:
  `approved|auto_approved`, not hidden/archived/premium, `visual_state='clean'`,
  `halal_score >= 70`.
- **Spelling normalizer widened** — `muslmah|muslimah|musalman → muslim`,
  `emaan|eemaan → iman`, plus `iman/faith/belief/aqeedah/tawheed` and
  `muslim/muslimah/islam/ummah` synonym clusters.
- **"Searching instead for X"** now renders on `/search` when the canonical
  query differs from what was typed, so normalized variants are visible rather
  than silent. Wording deliberately avoids "Results for" to keep the page's
  single `Results for "<q>"` heading unambiguous for a11y and tests.

### Still open (unchanged, owner-only)

Signed Android build, Apple Watch Xcode target, real partner attestation
signatures, `YOUTUBE_API_KEY_3..6`. Dev-only `lovable-tagger` ref warning
remains accepted and filtered.
