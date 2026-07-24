# Heartify — Execution Roadmap

**Author role:** Principal PM (Apple) + Staff Engineer
**Input:** World-Class Product Audit (score 6.4/10)
**Output:** Ship plan. No new features unless required. Bias to *removal* and *consolidation*.

---

## Phase 1 — Challenge the Audit (kill-list)

Each audit recommendation was pressure-tested against: necessity, behavioral evidence, comparable consumer apps, simplicity cost, usability cost, mission alignment, maintenance cost, and whether a simpler alternative exists. Verdict per item:

| # | Audit recommendation | Verdict | Reasoning |
|---|---|---|---|
| A1 | Anchor micro-rituals to the 5 prayer windows | **KEEP** | Behavioral: implementation intentions + contextual cues (Fogg, BJ). Aligned with mission. Simpler than adding new "reminder" features. Replaces, not adds. |
| A2 | Reframe streaks around identity ("You are becoming…") | **KEEP** | Behavioral: identity-based habits (Clear). Zero new surfaces — copy + iconography only. |
| A3 | Consolidate Home hero into a single ritual card | **KEEP** | Deletes complexity. Directly addresses the "supermarket" critique. |
| A4 | Branded share-image as default share unit | **KEEP** | Infra already exists (`shareImage.ts`). Removes text-only fallback. Zero new features — reroutes existing ones. |
| A5 | 3-day curated cold-start | **KEEP** | Solves D1 drop-off; evidence from Duolingo/Calm onboarding. |
| A6 | Named "Editor's Pick" per day | **KEEP** | Human curator voice = differentiator; costs one row/day. |
| A7 | New "Ummah pulse" live counter | **KILL** | Vanity metric. Risks engagement-hack aesthetic that violates mission ("calm over stimulation"). |
| A8 | Gamified XP/levels on top of streaks | **KILL** | Duplicates streaks. Mission conflict (engagement hacks). Maintenance burden. |
| A9 | AI chat companion "Ask a scholar" | **KILL (defer)** | Moderation risk is existential (fatwa liability). Not needed for launch. |
| A10 | Push A/B testing framework overhaul | **KILL** | Existing experiments infra sufficient. Not a launch blocker. |
| A11 | Redesign bottom tab bar iconography | **KILL** | Cosmetic. No retention signal. |
| A12 | Add stories/reels-style vertical feed | **KILL** | Direct mission conflict (endless scroll). |
| A13 | Weekly "Recap Sunday" email digest | **DEFER to P3** | Requires email infra hardening. Real, but not launch-critical. |
| A14 | Household/Kids-mode PIN hardening | **KEEP** | Trust. Already shipped locally; needs server-side enforcement. |
| A15 | Prayer notifications with adhan preview | **KEEP (light)** | Necessary for A1 to work. Reuse existing push infra. |

**Net effect:** 15 recommendations → **9 kept**, 5 killed, 1 deferred. Feature *count* stays flat; feature *quality* rises.

---

## Phase 2 — Prioritization

Effort scale: S (≤2d), M (3–5d), L (1–2 wk).

### P0 — Must ship before launch

| ID | Task | Why | ΔD1 | ΔD7 | ΔD30 | Happiness | Effort | Risk | Deps |
|----|------|-----|-----|-----|------|-----------|--------|------|------|
| P0-1 | **Ritual Spine**: single Home hero anchored to the *current* prayer window with one 30–60s action | Kills identity crisis; gives the app one verb per open. | +3–5pp | +4–7pp | +3–5pp | High | M | UX regression if wrong window shown | Prayer-time source, A15 |
| P0-2 | **Identity streaks**: rename/rewire streak copy + iconography to state-of-becoming | Higher perceived meaning; zero new surfaces. | +1pp | +3pp | +5pp | High | S | Low | none |
| P0-3 | **Branded share as default** across ayah/dhikr/video/streak/dua | Every share becomes an ad. | 0 | +2pp | +3pp | Med | S | Image gen perf | `shareImage.ts` |
| P0-4 | **3-day cold-start** curated path (Day1 dua, Day2 ayah, Day3 short lecture) | Fixes D1 → D3 cliff. | +6–10pp | +5pp | +2pp | High | M | Curation quality | Editor's Pick data |
| P0-5 | **Prayer-window push (light)** — one contextual push per day, capped | Trigger for P0-1. | +2pp | +3pp | +2pp | Med | S | Notification fatigue | existing push cap |
| P0-6 | **Household PIN server enforcement** | Trust + child safety = table stakes. | 0 | +1pp | +2pp | High | S | Auth edge cases | existing PIN dialog |
| P0-7 | **Delete/merge cruft**: consolidate 40+ routes; hide non-essential from bottom nav | Reduces cognitive load; increases speed to primary action. | +2pp | +2pp | +2pp | High | M | Broken deep links | route audit |

### P1 — Very high impact

| ID | Task | ΔD30 | Effort | Risk |
|----|------|------|--------|------|
| P1-1 | Editor's Pick daily slot (curated, one card) | +3pp | S | curation ops |
| P1-2 | Series continuity nudge ("Continue Ep 4") on Home | +2pp | S | already partial |
| P1-3 | Onboarding → topic-taste 3-tap picker (feeds Personalization v2) | +3pp | M | cold-start quality |

### P2 — Important

- P2-1 Referral surface polish (Invite page CTA weight)
- P2-2 Empty-state illustrations across 8 surfaces
- P2-3 Offline audio download queue UI

### P3 — Later

- P3-1 Weekly Recap Sunday email
- P3-2 Regional Daily Dose experiments
- P3-3 Creator monetization surfaces

### P4 — Nice to have

- P4-1 Widget (iOS/Android home-screen prayer countdown)
- P4-2 Apple Watch complication
- P4-3 Print-friendly journal export

---

## Phase 3 — Consolidation (what to delete/merge)

| Current | Action | Replacement |
|---|---|---|
| `HomeHero` + `TodayHero` + `DailyDoseHero` overlap | **Merge** | One `RitualCard` bound to current prayer window |
| `/scholars` + `/reciters` + `/listen` tabs | Already merged in Listen — **delete** `/scholars` top-level from nav | Deep-link only |
| Two streak surfaces (profile card + milestone dialog + weekly recap) | Keep dialog + weekly; **remove** profile duplicate | Single source in `useStreak` |
| Multiple "share" buttons with text fallback | Collapse into one `<ShareButton kind="…" />` producing image | `shareImage.ts` |
| Bottom-nav items: Home, Discover, Listen, Journal, Profile + hidden Admin | Drop "Discover" (fold into Home rails) | 4-tab bar |
| Legacy `AgeGate` remnants | **Delete** | Household PIN covers it |
| `Trust` + `About` pages | **Merge** | One `/about` with trust block |

Target: **-8 routes**, **-6 components**, **-3 duplicate DB read paths**.

---

## Phase 4 — Implementation Order

### Step 1 — Route & component cleanup (P0-7)
- Files: `src/App.tsx`, `src/components/BottomTabBar.tsx`, `src/pages/*` deletions, `src/test/deep-links.test.tsx`.
- DB: none.
- Migration: 301 redirects in `public/_redirects` for removed routes.
- Tests: extend deep-link tests to assert redirects; Playwright smoke on bottom-nav.
- Rollout: single deploy; behind no flag (structural).
- Rollback: revert commit; redirects are additive.

### Step 2 — Ritual Spine hero (P0-1) + Identity streak copy (P0-2)
- Files: new `src/components/RitualCard.tsx`; refactor `src/pages/Index.tsx`; update `src/hooks/useStreak.ts` copy map.
- Components: replaces `HomeHero`, `TodayHero`, `DailyDoseHero` usages on `/`.
- DB: none (reads existing prayer times + daily dose).
- API: none.
- Tests: unit for window-selection at boundary times; visual regression snapshot.
- Rollout: flag `ff.ritual_spine` (10% → 50% → 100% over 5 days).
- Rollback: flag off → old heroes.

### Step 3 — Branded share default (P0-3)
- Files: `src/components/ShareButton.tsx` (new), replace call sites (ayah, dhikr, video, streak, dua).
- DB: none.
- Tests: snapshot generated PNG for 5 kinds; a11y label check.
- Rollout: full deploy.
- Rollback: revert component.

### Step 4 — Prayer-window push (P0-5)
- Files: `supabase/functions/personalized-push/index.ts` extension; `src/pages/Settings/Notifications.tsx` copy.
- DB: add `prayer_push_last_sent_at` on `notification_prefs`.
- Migration: `ALTER TABLE ... ADD COLUMN ... DEFAULT NULL;` + GRANT untouched.
- Tests: edge fn unit test for cap logic; verify 3/wk global cap still honored.
- Rollout: 5% cohort for 48h → 100%.
- Rollback: cron pause + flag `ff.prayer_push`.

### Step 5 — 3-day cold-start (P0-4) + Editor's Pick (P1-1)
- Files: `src/pages/Onboarding/*`, new `editors_picks` reader in `src/hooks/useEditorsPick.ts`.
- DB: new table `editors_picks(id, date, entity_type, entity_id, blurb, curator)` with GRANT SELECT to `authenticated`, RLS read-only; write via service role.
- Migration: standard CREATE TABLE + GRANT + RLS + policy block.
- Tests: snapshot for each day-of-cohort; RLS policy tests.
- Rollout: cohort-gated on `signup_at < now - 3d`.
- Rollback: flag `ff.cold_start_v2`.

### Step 6 — Household PIN server enforcement (P0-6)
- Files: `src/lib/householdPin.ts`, new RPC `verify_household_pin`.
- DB: `household_pins(user_id, pin_hash, updated_at)`; RLS: self read/update; hash server-side via `pgcrypto`.
- Tests: RPC unit; brute-force lockout after 5 attempts.
- Rollout: dual-write local + server for 1 week; then server-authoritative.
- Rollback: fall back to local hash.

### Step 7 — Onboarding taste picker (P1-3)
- Files: `src/pages/Onboarding/Topics.tsx`.
- DB: writes to existing `user_taste_profiles`.
- Tests: ensures feed diversity post-selection.
- Rollout: 100% new signups.
- Rollback: skip step via flag.

### Step 8 — P2 polish, then P3/P4 as capacity allows.

---

## Phase 5 — Risks

| Task | What could go wrong | Mitigation |
|---|---|---|
| P0-1 Ritual Spine | Wrong prayer window shown near boundaries; DST bugs; users in unusual latitudes | Server-derived windows w/ user-confirmed method; unit tests at boundaries; graceful "next window in Xm" fallback |
| P0-2 Identity streaks | Copy feels preachy; alienates casual users | A/B test copy; keep numeric streak visible |
| P0-3 Branded share | Image gen latency > 800ms feels broken; PII leakage via user handle | Pre-warm on hover; strip PII from templates |
| P0-4 Cold-start | Curated content stale; feels heavy-handed | Editorial rotation weekly; skip button always visible |
| P0-5 Prayer push | Notification fatigue; wrong time zone | Global 3/wk cap enforced; user-set method + tz on onboarding |
| P0-6 Household PIN | Lockout of legitimate parents; recovery loop | Email-based reset; rate-limit not lockout |
| P0-7 Route deletion | Broken external links; SEO loss | 301 redirects; sitemap regen; Search Console coverage watch |
| P1-1 Editor's Pick | Curator absent → empty slot | Fallback to top approved video of the day |
| P1-3 Taste picker | Cold users skip → worse feed | Default to broad topic set on skip |

Cross-cutting: **moderation** — every new surface routes through existing halal-first pipeline; no new ingress. **A11y** — all new components require 44px targets, labeled controls, screen-reader announcements. **Perf** — Home LCP budget unchanged at ≤2.0s p75; block merge if regresses.

---

## Phase 6 — Success Metrics & kill thresholds

| Feature | Primary KPI | Target | Guardrail | Kill threshold (30d) |
|---|---|---|---|---|
| P0-1 Ritual Spine | D7 retention | +4pp vs control | LCP unchanged | <+1pp or LCP +200ms |
| P0-2 Identity streaks | Streak resurrection rate | +15% | Uninstall neutral | negative uninstall shift |
| P0-3 Branded share | Share→install conversion | ≥3% | Share latency <800ms | <1.5% conversion |
| P0-4 Cold-start | D3 retention | +6pp | Onboarding completion ≥70% | completion <55% |
| P0-5 Prayer push | Push open rate | ≥18% | Unsubscribe rate <0.8% | open <8% or unsub >2% |
| P0-6 Household PIN | Kids-mode DAU/parent | +10% | Support tickets ≤ baseline | tickets 2× baseline |
| P0-7 Cleanup | Time-to-primary-action | -25% | 404 rate ≤ baseline | 404s 1.5× baseline |
| P1-1 Editor's Pick | CTR on hero | ≥12% | Curation SLA 7/7 days | CTR <5% |
| P1-3 Taste picker | Feed diversity (channels/session) | ≥5 unique | Skip rate <40% | skip >60% |

App-wide north stars: D1 ≥ 55%, D7 ≥ 35%, D30 ≥ 22%, sessions/day ≥ 2.4, avg session ≥ 6:30, uninstall <8%/30d.

---

## Phase 7 — Engineering Specs (approved features)

### P0-1 — Ritual Spine
- **Stories**: *As a user opening the app between Fajr and Dhuhr, I see one card labeled "After Fajr — 40s dhikr" with a single tap-through.*
- **Acceptance**:
  - Card reflects the current prayer window within 60s of the boundary.
  - Exactly one primary action visible above the fold.
  - Completing the action logs to `record_streak_activity` and shows a subtle confirmation.
- **Edge cases**: no prayer times set → offer 3-tap city picker; polar latitudes → fallback to global schedule; offline → last-known window with stale badge.
- **Analytics**: `ritual_card_viewed`, `ritual_card_action_started`, `ritual_card_action_completed`, `ritual_card_skipped`.
- **A11y**: `role="region"`, `aria-label="Current ritual"`, 44px targets, screen-reader announces countdown.
- **L10n**: strings in existing i18n bundles; RTL verified.
- **Perf budget**: added JS ≤ 8kb gz; render ≤ 40ms; LCP unchanged.
- **QA**: 5 prayer boundaries, 3 locales, 2 densities, offline, low-end Android.
- **DoD**: flag rolled to 100%, KPIs green at 14d, no P1 bugs open.

### P0-2 — Identity streaks
- **Stories**: *As a returning user, I see "You are becoming someone who never misses Fajr — 12 days" instead of "12 day streak".*
- **Acceptance**: copy map covers 0/1/3/7/30/100 milestones; existing counters unchanged; A/B ready.
- **Edge cases**: streak reset shows compassionate copy, no shame language.
- **Analytics**: `streak_copy_variant`, `streak_share_from_dialog`.
- **A11y/L10n/Perf**: copy-only; no budget impact.
- **QA**: all 14 locales spot-checked for tone.

### P0-3 — Branded share
- **Stories**: *As any user tapping share, I get a Heartify-branded image plus a short URL.*
- **Acceptance**: 5 templates (ayah, dhikr, video, streak, dua); < 800ms gen p75; native share sheet.
- **Edge cases**: canvas unsupported → text+URL fallback; long Arabic renders correctly.
- **Analytics**: `share_generated`, `share_completed`, `share_channel`.
- **A11y**: buttons labeled "Share as image".
- **Perf**: OffscreenCanvas where available; image ≤ 250kb.
- **QA**: iOS 15+, Android 10+, Safari, Chrome.

### P0-4 — 3-day cold-start
- **Stories**: *As a new user on Day 1, I land on a curated dua; Day 2 an ayah; Day 3 a short lecture.*
- **Acceptance**: cohort computed from `signup_at`; skip always visible; completing day feeds streak.
- **Edge cases**: signed-out preview → generic Day 1.
- **Analytics**: `cold_start_day_viewed`, `cold_start_completed`.
- **A11y**: skip is a real button, not a link.
- **L10n**: content localized per user language.
- **Perf**: content prefetched at signup.
- **QA**: fresh install on 3 devices; 3 languages.

### P0-5 — Prayer-window push
- **Stories**: *As a user with notifications on, I receive at most one prayer-linked push/day and 3/week total.*
- **Acceptance**: caps enforced server-side; opt-out one tap; content varies (dua/ayah/streak nudge).
- **Edge cases**: tz change mid-day; DST; airplane mode.
- **Analytics**: `push_sent`, `push_opened`, `push_dismissed`, `push_unsubscribed`.
- **A11y**: notification body ≤ 120 chars; no emoji-only content.
- **L10n**: server-selected locale from profile.
- **Perf**: cron ≤ 30s per run.
- **QA**: 5 tz, DST boundary, cap overflow attempts.

### P0-6 — Household PIN (server)
- **Stories**: *As a parent, I set a 4-digit PIN that gates Kids Mode toggle across all my devices.*
- **Acceptance**: pin hashed server-side; 5-attempt rate-limit; email reset.
- **Edge cases**: forgotten PIN; multi-device sync.
- **Analytics**: `pin_set`, `pin_verified`, `pin_failed`, `pin_reset`.
- **A11y**: numeric keypad; error announced via `aria-live`.
- **Perf**: RPC p95 ≤ 100ms.
- **QA**: RLS test suite; brute-force test.

### P0-7 — Consolidation
- **Stories**: *As any user, I reach my primary action within one tap from Home.*
- **Acceptance**: 4-tab nav; deleted routes 301 → nearest surface; sitemap updated.
- **Analytics**: `nav_tab_tapped`, funnel: home → primary action time.
- **A11y**: nav landmarks correct; focus order sane.
- **L10n**: no new strings.
- **Perf**: bundle size ↓ ≥ 30kb gz expected.
- **QA**: full deep-link test suite must pass; Search Console monitored 14d.

### P1-1 — Editor's Pick
- **Stories**: *As a user, I see one hand-picked item labeled "Editor's Pick — [curator name]" per day.*
- **Acceptance**: table populated ≥ 7 days ahead; fallback to top approved video if empty.
- **Analytics**: `editors_pick_viewed`, `editors_pick_clicked`.
- **A11y/L10n/Perf**: standard.
- **QA**: fallback triggers when row missing.

### P1-3 — Onboarding taste picker
- **Stories**: *As a new user, I tap 3 topics from 12 chips and feed personalizes immediately.*
- **Acceptance**: writes to `user_taste_profiles`; skip = broad default; next-open feed reflects picks.
- **Analytics**: `taste_picker_shown`, `taste_topic_selected`, `taste_picker_skipped`.
- **A11y**: chips are buttons with `aria-pressed`.
- **L10n**: topic labels translated.
- **Perf**: chip render < 16ms.
- **QA**: feed diff before/after selection ≥ 60%.

---

## Global Definition of Done

1. Feature behind a flag; canary at ≥ 5% for ≥ 48h.
2. KPI dashboard live before launch; guardrails wired to alert.
3. A11y audit (axe + manual VoiceOver/TalkBack) passes.
4. L10n verified in en, ar, ur, id, ms, tr.
5. LCP/CLS/INP within budget on P75 mid-range Android.
6. Rollback documented and rehearsed once in staging.
7. Post-launch review scheduled at D14 and D30 with kill/keep decision recorded.

---

## Sequencing Summary (calendar)

- **Week 1**: Step 1 (cleanup) + Step 3 (branded share).
- **Week 2**: Step 2 (Ritual Spine + identity streaks) canary.
- **Week 3**: Step 4 (prayer push) + Step 6 (household PIN server).
- **Week 4**: Step 5 (cold-start + Editor's Pick).
- **Week 5**: Step 7 (taste picker), P2 polish, launch review.

Total: ~5 weeks to production-hardened launch with zero net new feature surfaces and a smaller navigation footprint.
