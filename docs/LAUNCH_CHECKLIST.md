# Heartify — Final Launch Checklist

Single source of truth for the launch window. `[x]` = verified in repo/backend today.
`[ ]` = needs a founder decision, a real device, an account, or live traffic.
Companion docs: `docs/PRODUCTION_CHECKLIST.md` (engineering depth), `docs/BETA_TESTFLIGHT_PLAY.md` (store steps), `docs/LAUNCH_HANDOFF.md`.

---

## 1. Blockers — must be green before you ship

- [ ] **iOS Team ID** patched into `public/.well-known/apple-app-site-association`
- [ ] **Android SHA-256 fingerprints** (Play App Signing + upload key) patched into `public/.well-known/assetlinks.json` — currently placeholders
- [ ] Fresh `security scan` run inside the launch window, zero critical findings
- [ ] Leaked-password (HIBP) protection enabled in auth settings
- [ ] Custom domain `www.heartifyapp.com` DNS verified and live (status: initiated)
- [ ] Apple/Google developer accounts, tax + banking complete
- [ ] Privacy Policy + Terms reviewed by counsel for target jurisdictions

## 2. Content & halal floor

- [x] Female-content and music blocks enforced by DB triggers, not app code
- [x] Multilingual deny patterns (Arabic, Latin, Indic, CJK scripts) live
- [x] Channel blocklist enforced server-side and in `halalGuard.ts`
- [x] Autonomous visual thumbnail sweep with auto-block threshold
- [x] Attestation ledger hash-chained, publicly verifiable at `/verify`
- [ ] Manual spot check: 50 random feed items per top-6 language, zero violations
- [ ] Kids Mode spot check on a real device

## 3. Product surfaces

- [x] Today-first home, 5-tab spine, no ad surfaces anywhere
- [x] Infinite scroll on home, search, related, and rails — dedup verified
- [x] Listen: reciters + scholars, full Quran, offline queue with resume
- [x] Streaks, challenges, e-medals, certificates, badges
- [x] Social: connections, requests, accountability challenges, reporting
- [x] Learning paths, benefit labels, knowledge-graph concepts
- [ ] End-to-end tap of every primary CTA on one iPhone and one mid-range Android

## 4. Personalization & feed quality

- [x] Hard language gate in `feed` / `search` RPCs
- [x] Diversity slider wired to retrieval; verified across 100 simulated users
- [x] Session-seeded shuffle — no two refreshes identical
- [x] Cold-start heuristics + sparse-profile interleaving
- [x] `/admin/feed-diversity`, `/admin/rec-health` live dashboards
- [ ] 7-day post-launch watch: top-channel share stays under 5%

## 5. Growth engine (must run without manual help)

- [x] Autonomous discovery: self-expanding query bank, pruning, growth controller
- [x] Channel pipeline tick every 10 minutes with adaptive throughput
- [x] Language-equity scheduler prioritizing deficit languages
- [x] Dead-letter queue + stuck-job reaper
- [ ] Confirm 24h autonomy targets are met three days in a row (`autonomy_health`)

## 6. Security & privacy

- [x] RLS + explicit GRANTs on every user-facing table
- [x] Roles isolated in `user_roles` with `has_role()`
- [x] Privileged RPCs revoked from `anon`; cron endpoints gated by secret
- [x] HSTS, X-Frame-Options, CSP with `report-uri` → Sentry
- [x] Data export + account deletion + cookie consent + age gate
- [ ] Play Data Safety + App Privacy answers submitted (drafts in `docs/play-data-safety.md`)

## 7. Performance & reliability

- [x] Route-level code splitting, LCP preloads, `font-display: swap`, AVIF/WebP
- [x] Skeletons matched to layout; above-the-fold eager loading
- [x] Ops alerts every 10 min; `/status` and `/diagnostics` health surfaces
- [ ] Load test against production-like traffic
- [ ] On-call destination (email/Slack) wired to a real channel
- [ ] Backup restore rehearsed end to end

## 8. Store submission

- [ ] App icons, screenshots (6.7", 6.1", tablet, Android), feature graphic
- [ ] Store listing copy from `docs/STORE_LISTING.md`
- [ ] Age rating questionnaires completed
- [ ] TestFlight internal build + 5 external testers passed a full session
- [ ] Play internal testing track green, then closed → open testing

## 9. Growth & SEO at launch

- [x] Chunked sitemaps, canonical tags, JSON-LD, per-page metadata
- [x] Programmatic landings (`/halal/:slug`, guides, calendar)
- [x] GSC connected with daily monitoring workflow
- [ ] Submit sitemaps + request indexing on the custom domain
- [ ] Referral/WhatsApp loop tested with two real accounts

## 10. Launch day runbook

1. Freeze feature work; run security scan + typecheck + E2E suite.
2. Publish web, verify `/`, `/watch/:id` (signed out), `/listen`, `/challenges`, `/connections`.
3. Promote store builds from testing tracks to production.
4. Watch for 48h: ops alerts, `event_schemas` rejections, feed diversity, crash-free rate.
5. Hold a 24h rollback decision point (feature flags first, redeploy second).

---

**Definition of launch-ready:** every item in §1 is checked, §2 spot checks pass, and no critical security finding is open.
