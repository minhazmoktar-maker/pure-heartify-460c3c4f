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
