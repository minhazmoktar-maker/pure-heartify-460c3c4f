# Heartify — Complete Feature Reference

A concise, descriptive map of every part of the app. Grouped by surface. Routes are
in `src/App.tsx`; backend logic lives in Postgres RPCs + `supabase/functions/*`.

---

## 1. Core video spine (halal-first discovery)

| Surface | Route | What it does |
|---|---|---|
| Home / Today-first | `/` | Opens on one action: today's pick + benefit-ranked rails, lazy-mounted for instant LCP. |
| Explore | `/explore` | Category, language and topic browsing over the approved corpus. |
| Section | `/section/:sectionId` | Full grid for a single rail, with horizontal + vertical infinite scroll. |
| Watch | `/watch/:videoId` | Full-bleed player, provenance badge, favorite, share-image, not-interested, report. |
| Shorts | `/shorts` | Vertical beneficial-clips feed. |
| Search | `/search` | Real-time autocomplete, synonym expansion, locale-aware ranking. |
| Trusted channels | `/channels`, `/sources` | Directory of approved channels and beneficial institutions. |
| Verify | `/verify/:videoId` | Public attestation ledger record (hash-chained moderation proof). |
| Programmatic landings | `/halal`, `/halal/:slug`, `/guides/*`, `/library/:slug` | SEO surfaces with per-page title/meta/canonical/JSON-LD. |

**Moderation floor (non-negotiable):** zero music, zero female-featured content, channel
reputation never overrides per-video rules. Enforced by DB triggers, `halalGuard.ts`, and
the confidence-tiered pipeline (tiers A 98–100, B 90–97, C 70–89, D <70).

**Recommendation stack:** independent retrieval pools (fresh, beneficial, taste, hidden gems,
exploration) → dedup → MMR rerank → per-session shuffle seed → diversity slider. Benefit
priors (T+90 "was this worth your time?" labels) feed ranking; feeds are never optimized on
watch time alone.

---

## 2. Listening

| Surface | Route | What it does |
|---|---|---|
| Reciters & Scholars | `/listen`, `/audio` | Side-by-side tabs; full-Qur'an recitations from 40+ reciters plus scholar lectures. |
| Reciter detail | `/reciter/:id` | Surah list always starting from Al-Fātiḥah, resume position, playback speed. |
| Offline downloads | in-player | IndexedDB storage with entitlement gating; CORS-blocked CDNs are streamed through the `audio-proxy` edge function so downloads work on iOS/Android. |
| Background player | global | Media-session metadata, lock-screen controls, listening minutes feed streaks. |

---

## 3. Qur'an & worship tools

Qur'an reader (`/quran`, `/quran/:surah`), Mushaf (`/mushaf`), Hifz (`/hifz`), Tajweed
(`/tajweed`), Khatm tracker and groups (`/khatm`, `/khatm/groups`, `/khatm/group/:id`,
`/khatm/join/:code`), prayer times & Qibla (`/prayer`, `/qibla`, `/salah`), Adhkar and duʿā
sets (`/adhkar`, `/duas`, `/hisnul`, `/masnoon-duas`), Dhikr counter and circles (`/dhikr`,
`/dhikr/circles`), Wird builder (`/wird`), Journal / Niyyah (`/journal`), fasting (`/fasting`),
Hijri calendar (`/hijri`), Zakat and inheritance calculators (`/zakat`, `/inheritance`),
Ramadan / Hajj / Umrah planners.

---

## 4. Daily habit & streak system

- **Today's Dose** (`/today`): one curated item per day; completion is the core habit signal.
- **Streaks**: DB-trigger based; watching, listening, dose completion and dhikr all count.
  Streak freezes, milestone badges, weekly recap (`/recap`).
- **Achievements** (`/achievements`), badges, leaderboards (`/leaderboards`), teams (`/teams`).
- **Shareable assets**: A4-landscape certificate and ayah/video/dhikr share images
  (`src/lib/shareImage.ts`), public streak pages (`/s/:handle/:days`, `/w/:handle/:week`).

---

## 5. Social & accountability

| Feature | Route | Notes |
|---|---|---|
| Your Circle | `/connections` | Find members, send/cancel/accept connection requests, view verified weekly progress (only if shared). |
| Public profile | `/u/:handle` | Server-enforced privacy (`get_profile_showcase`); block + report available to anyone. |
| Pokes / nudges | anywhere | Rate-limited encouragement, preference-aware. |
| Challenges | `/challenges`, `/connections` | Private or public goals: minutes, doses, days, streak, **sadaqah days**, **sadaqah acts**. |
| Sadaqah tracker | `/sadaqah` | Amounts, categories and notes stay on-device; only a per-day *count* signal is stored, so challenges compare consistency, never money. Optional daily reminder (`sadaqah_challenge` notification kind) nudges you when today isn't logged. |
| Duʿā wall | `/dua-wall`, `/dua` | Requests + ameens, anonymous supported. |
| Safety | everywhere | Block, report (`report_heartify_user`, 10/day cap), appeals (`/appeals`). |

Privacy defaults: profile / streak / progress / activity visibility are per-user controls;
the server filters before data leaves the database.

---

## 6. Learning & knowledge graph

- **Concept graph**: `concepts`, `concept_prerequisites`, `concept_video_segments`.
- **Guided paths** (`/learn`, `/learn/path/:slug`, `/learn/:slug`): seeded curricula for
  creed, Qur'an and character with per-user progress.
- **Reference library**: 400+ curated topical pages (fiqh, seerah, aqeedah, finance, family,
  psychology, history, contemporary issues) — each an SEO landing plus in-app reading surface.

---

## 7. Notifications & reminders

`/settings/notifications` controls each kind: Daily Dose, streak protection, prayer times,
khatm, duʿā ameens, circle & accountability, **sadaqah challenge**, weekly recap — each with
push / email / in-app switches, quiet hours and timezone. Web push uses VAPID + service
worker; every dispatcher respects preferences, quiet hours and per-day caps.

---

## 8. Account, membership & growth

Auth (`/login`, `/signup`, password reset, email verify, MFA at `/security/mfa`), onboarding
(`/onboarding`, 9 steps: language, interests, goals, reminders), profile & settings
(`/profile`, Kids Mode, strict halal mode, locale, theme, channel visibility), data export
(`/account/export-data`), Heartify+ (`/plus`, `/premium`, gift codes, household seats),
referrals (WhatsApp duʿā loop, `/invite`, `/redeem`), PWA install prompts, offline page.

**Monetization:** membership, waqf/sadaqah, institutional licensing, certificates. Never advertising.

---

## 9. Creator & institution tools

`/creators`, `/creators/dashboard`, `/claim-channel`, `/creators/claim` — claim a channel,
see moderation status and reach, submit appeals. Trusted institutions get co-sign provenance.

---

## 10. Trust, transparency & moderation ops

Public: `/trust`, `/transparency`, `/status`, `/verify/:videoId`, `/appeals`.

Admin (role-gated): moderation queue and log, SLA, channel pipeline + trust scores, approved
channels, discovery and global discovery dashboards, dedup, rec-health, feed-diversity with
per-user trace, benefit labels, experiments and feature flags, retention cohorts, analytics,
audio integrity, reports, users, roles, entitlements, alerts, ops, GSC, audit log.

---

## 11. Pipeline & automation (backend)

Edge functions cover ingestion (deep pagination, per-row retry on rejection), channel
discovery, batch classification, channel-id backfill, benefit labels, daily dose generation,
push dispatch, share images, audio proxy, and watchdogs. `pg_cron` schedules discovery
(hourly), classification (20 min), channel repair (30 min), watchdog (15 min), benefit labels
(daily), and sadaqah challenge reminders (daily 17:00 UTC). Failures land in a dead-letter
queue with production alerts.

---

## 12. Cross-cutting standards

Mobile-first (44×44 targets, bottom tab bar of 4 spines, edge-swipe back, safe areas),
semantic design tokens only, WCAG 2.2 AA, RTL + 18 languages, React Query caching with
prefetch, AVIF/WebP + LCP preloads, CSP with report-uri, HSTS, Sentry release tagging,
attestation ledger for verifiable moderation history.
