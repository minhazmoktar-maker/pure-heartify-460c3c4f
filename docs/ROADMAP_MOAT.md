# Heartify — Six-Wave Moat Roadmap

Companion to `docs/STRATEGY_MOAT.md`. Each wave ships one moat (M1–M6), ends with a measurable proof, and unlocks the next. M7 (Ummah Coordination) rides on top of M1–M6.

---

## Wave M1 — Ritual Spine (habit)
**Ships moat:** M1 — Ritual ownership.

**Scope**
- `liturgical_day` engine keyed to local prayer times (Fajr → Isha) using existing `prayer_times` data.
- Prayer-anchored micro-moments: Fajr reflection, Duha nudge, pre-Zuhr Qur'an minute, Asr reset, Maghrib gratitude, Isha wind-down.
- Modes: Jumu'ah (Fri), Ramadan, Qiyam (last 10 nights), Ashura, Arafah.
- Streak model refactored: completion = ritual done, not seconds watched.
- Push scheduled per user's local prayer times with quiet-hours honoured.

**Proof to declare wave complete**
- D30 retention lifts ≥ +15% vs. control cohort.
- ≥ 40% of DAU complete at least one prayer-anchored moment daily.
- ≥ 25% of DAU hold a 7-day ritual streak.

**Depends on:** existing prayer-time & streak infra. **Blocks:** M5 (memory needs ritual events).

---

## Wave M2 — Trust Graph (credibility)
**Ships moat:** M2 — Institutional trust graph + M6 attestation surface.

**Scope**
- New tables: `institutions`, `scholar_credentials`, `content_attestations` (with RLS + grants).
- Institution onboarding portal (`/institutions/onboard`) with verification workflow.
- Signed reviewer chain surfaced on every video card and watch page: *"Reviewed by X · Endorsed by Y · Tier A"*.
- Public `/verify/:content_id` page showing the full chain (reviewer, timestamp, tier, rules hit).
- Ranking uses trust-graph weight as a first-class factor.

**Proof**
- ≥ 500 videos carry a full attestation chain.
- ≥ 25 institutions onboarded.
- Parent-audit NPS ≥ +40.

**Depends on:** existing moderation pipeline. **Blocks:** M4 (creator payouts need institutional graph), M6 finalization.

---

## Wave M3 — Household (network effects)
**Ships moat:** M3.

**Scope**
- Household model: up to 6 seats, roles = `owner`, `parent`, `member`, `child`.
- Parent-admin child profiles with locked Kids Mode.
- Shared family streaks (Fajr, khatm, weekly muhasaba).
- Family khatm assignment UI (assign juz to each member).
- Family Ramadan leaderboard.
- Onboarding step: *"Add someone in your household."*
- Migration path for existing single accounts → auto-create household of 1.

**Proof**
- ≥ 30% of new signups add a second seat within 14 days.
- Households with ≥ 2 seats show 3× D90 vs. singletons.
- Family khatm completion rate ≥ 60% of started family khatms.

**Depends on:** M1 (streaks), M6 (Kids Mode parent guarantee).

---

## Wave M4 — Beneficial-Creator Economics (supply)
**Ships moat:** M4.

**Scope**
- Sadaqah tipping (one-tap on every video, Stripe / Paddle rails).
- Monthly waqf memberships to a scholar or institution.
- Reviewed-content bonus pool: monthly distribution weighted by tier + trust-graph edges + watch-quality (finished %), never raw views.
- Transparent scholar earnings dashboard (`/creator/earnings`).
- Institutional grants portal (a masjid funds a khatib).
- Payout compliance (KYC, tax, cross-border).

**Proof**
- Top 100 scholars earn ≥ 1.5× per 1k views vs. estimated YouTube CPM for the same category.
- ≥ 500 active waqf memberships within 90 days.
- ≥ 20 institutional grants active.

**Depends on:** M2 (trust graph), M3 (household subs fund the pool).

---

## Wave M5 — Spiritual Memory (data lock-in)
**Ships moat:** M5.

**Scope**
- Muhasaba journal (weekly prompt tied to Jumu'ah).
- Ayah bookmarks with personal reflections.
- Dua list, khatm ledger.
- "What I learned this month" AI summary generated only from the user's own notes.
- Year-in-iman recap (shareable stat card, private data by default).
- Full export (JSON + PDF), one-click.

**Proof**
- ≥ 30% of DAU write ≥ 1 journal entry per week by day 30.
- ≥ 5× share rate on year-end recap vs. non-memory users.
- Export usage ≥ 5% (used as a trust signal, not churn signal).

**Depends on:** M1 (ritual events feed the journal).

---

## Wave M6 — Zero-Doubt Discovery (parental safety, finalized)
**Ships moat:** M6.

**Scope**
- Signed moderation attestation stored per video (already partially in place — formalize signing + audit log).
- Public `/verify/:content_id` (finalized end-to-end).
- Kids Mode = tier-A only + explicit institutional whitelist + child seat lock.
- Parent dashboard: what the child watched, when, and why it was approved.
- Report-a-video with SLA displayed publicly.

**Proof**
- ≥ 99.5% of surfaced videos have a valid attestation.
- Parent-audit test: 100/100 random child-mode videos pass a human re-review.
- Median report-to-resolution < 24h.

**Depends on:** M2 (trust graph provides the signing identities).

---

## Wave M7 — Ummah Coordination (civic)
**Ships moat:** M7. Rides on top of M1–M6.

**Scope**
- Global Ramadan khatm (aggregate juz completion across all users).
- Live Qiyam nights (last 10 nights, synchronized rooms).
- Masjid-hosted watch rooms (institution-owned live rooms).
- Institution-run classes with cohort progress and certificates.
- Disaster dua campaigns (admin-flagged, opt-in push).

**Proof**
- First global Ramadan khatm completes ≥ 1 full Qur'an cycle with ≥ 10k participants.
- ≥ 5 institutions run classes with ≥ 500 enrolled users each.
- ≥ 100k participations in a single Qiyam night.

**Depends on:** M2 (institutions), M3 (household participation), M4 (institutional payouts).

---

## Execution rules

1. **Ship one wave completely before starting the next** — each wave ends with the proof metrics above measured on real users.
2. **Every new feature proposal is filtered by:** does it strengthen at least one of M1–M7? If no, reject.
3. **Every wave writes back to `docs/STRATEGY_MOAT.md`** if reality changes the thesis.
4. **The moat is the sum, not any single wave.** Prioritize order (M1 → M2 → M3 → M4 → M5 → M6 → M7); do not parallelize unless a wave is genuinely blocked.

---

*Next action:* on user approval, open a dedicated plan for **Wave M1 — Ritual Spine** and begin building.
