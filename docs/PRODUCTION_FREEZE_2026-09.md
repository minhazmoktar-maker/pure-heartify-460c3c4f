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
