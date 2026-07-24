# Heartify — Benefit-First, Video-First Moat Roadmap

Companion to `docs/STRATEGY_MOAT.md`. Waves protect the primary moats first: **Trust (M1)** and the **Beneficial Intelligence Engine (M2)**. Every wave is filtered by both the video-first test and the benefit test.

## Execution rules

1. **Video-first test.** A feature ships only if it makes Heartify better at discovering, trusting, watching, or learning from beneficial videos. If no → future backlog.
2. **Benefit test.** Does this raise *value received per minute spent*, or does it only raise time spent? Anything that only lifts engagement without lifting benefit is rejected. We still measure retention, completion, and DAU — we just refuse to optimize for them in isolation.
3. **No manipulative tactics, ever.** Dark patterns, artificial urgency, guilt-driven prompts, ragebait framings. Implementation choices (infinite scroll, autoplay, push cadence) stay available when they demonstrably serve benefit.
4. **Ritual, memory, and coordination features may only ship as re-rankers or retention layers over the video experience.** They never become separate spines.
5. **Waves ship sequentially.** No parallel wave unless one is genuinely blocked.
6. **Every wave writes back to `docs/STRATEGY_MOAT.md`** if reality changes the thesis.

---

## Wave 0 — Principle lock (documentation + telemetry only)

**Ships moat:** the philosophical guardrail beneath every wave. No product surface.

**Scope**

- Codify the benefit objective, session-quality checklist, and "measure engagement but never optimize for it in isolation" rule in the internal metrics dashboard and PRD template.
- Add benefit-weighted metrics (finish-rate on recommended videos, session-quality rating, learning-path progression) alongside existing retention metrics.
- Add a manipulative-pattern audit to the quarterly review.

**Proof**

- PRD template updated; dashboard shows benefit metrics beside engagement metrics.
- First quarterly audit run with zero manipulative-pattern findings.

**Blocks:** every later wave — this is the guardrail.

---

## Wave 1 — Trust Spine (M1 — highest priority)

**Ships moat:** M1 — Trust & moderation. Anchored to the watch experience.

**Scope**

- Signed moderation attestations on **every** video: reviewer ID, timestamp, tier, model version, rule hits — cryptographically signed and immutable.
- Public `/verify/:content_id` page — end-to-end, indexable, cacheable.
- Reviewer chain surfaced on every card and watch page: *"Reviewed by X · Endorsed by Y · Tier A"*.
- Trust as a **ranking signal**, not only a filter.
- Report-a-video flow with public SLA.
- Audit log for every automated and manual moderation action.

**Proof**

- ≥ 99.5% of surfaced videos carry a valid signed attestation.
- 100/100 random watch-page audit passes human re-review.
- Median report-to-resolution < 24h.
- Parent-audit NPS ≥ +40.

**Serves the benefit objective by** making every "beneficial" claim independently verifiable — without trust, benefit is a marketing word.

**Depends on:** existing moderation pipeline (P1.2D). **Blocks:** every later wave.

---

## Wave 2 — Beneficial Intelligence Engine (M2)

**Ships moat:** M2. Turns the trust substrate into a compounding data advantage that answers one question: *"What's the most beneficial video this person wants to watch right now?"*

**Scope**

- **Knowledge graph tables** (with RLS + grants): `kg_topics`, `kg_institutions`, `kg_scholars`, `kg_sources`, `kg_languages`, `kg_madhhab`, plus edge tables for video↔topic, video↔source, source↔institution.
- **Multilingual embeddings** on the approved corpus across 18+ languages; nearest-neighbor retrieval alongside existing candidate generators.
- **New ranking signals wired into the engine**: user goals, learning progress, difficulty progression, time-available, session context, prayer context (when opted in), and language/dialect preference.
- **Negative-signal features** wired into ranking — rejection reasons become training features.
- Expanded per-video **"Why you're seeing this"** transparency — expose trust + graph + taste + context factors.
- Session-diverse retrieval remains the default; top-channel share ≤ 5% and repeat rate < 1% remain hard invariants.
- Post-watch session-quality micro-survey (*"Did this help you?"*) as an explicit benefit signal fed back into ranking.

**Proof**

- Finish-rate on recommended videos improves ≥ 15% vs. control.
- Session-quality rating ≥ 4.2 / 5 across a random 1% sample.
- Top-channel share stays ≤ 5%; repeat rate < 1%.
- ≥ 90% of DAU see recommendations in their preferred language when available.
- Engine coverage: every approved video reachable via ≥ 2 retrieval paths.

**Serves the benefit objective by** making benefit the ranking objective itself, not a post-hoc filter.

**Depends on:** Wave 1 attestations. **Blocks:** Wave 3 payout math.

---

## Wave 3 — Beneficial-source ecosystem (M3 — broadened)

**Ships moat:** M3. Covers **all** beneficial sources — scholars, universities, institutes, foundations, masjids, educational organizations, independent educators, researchers, and beneficial creators (Islamic education, dawah, Qur'an, science, medicine, history, business, language learning, parenting, productivity, documentaries, engineering, and more).

**Scope**

- Sadaqah tipping on every video (Stripe / Paddle rails).
- Monthly waqf memberships to a specific creator or institution.
- Reviewed-content bonus pool: distributed by **tier × trust-graph edges × finish-rate**, never raw views.
- Transparent earnings dashboard (`/creator/earnings`, `/institution/earnings`).
- Institutional grants portal.
- **"Claim your channel / institution"** flow open to every beneficial source.
- Payout compliance (KYC, tax, cross-border).

**Proof**

- Top 100 beneficial sources earn ≥ 1.5× estimated YouTube CPM equivalents for the same category.
- ≥ 500 active waqf memberships within 90 days.
- ≥ 20 institutional grants active.
- ≥ 30% of DAU tip or subscribe within 60 days of signup.

**Serves the benefit objective by** funding the supply of beneficial content YouTube's ad marketplace refuses to fund.

**Depends on:** Wave 1 (trust), Wave 2 (graph edges).

---

## Wave 4 — Family Safety / Kids Mode (M4)

**Ships moat:** M4. Makes the trust promise concrete for parents.

**Scope**

- Kids Mode = tier A only + explicit institutional whitelist + child seat lock.
- Household model (up to 6 seats, roles: owner / parent / member / child).
- Parent audit dashboard: what the child watched, when, and *why* it was approved.
- Report-a-video for children — priority SLA.
- Child seat lock (PIN-gated exit).

**Proof**

- 100/100 random Kids Mode videos pass human re-review.
- ≥ 30% of new signups add a second seat within 14 days.
- Median report-to-resolution for Kids reports < 12h.

**Serves the benefit objective by** guaranteeing every minute a child spends here is beneficial and safe.

**Depends on:** Wave 1, Wave 2.

---

## Wave 5 — Ritual-Aware Discovery (M5 — supporting)

**Ships moat:** M5, strictly as a **re-ranker over the video surface**. Explicitly **not** a prayer app.

**Scope**

- Prayer-time-aware home rail ordering (Qur'an minute before Zuhr, reflection after Maghrib, wind-down after Isha).
- Ramadan mode — nightly tarawih recommendations, iftar-window shorts.
- Jumu'ah rail on Fridays.
- Qiyam rail in the last 10 nights.
- Push notifications anchored to local prayer times when opted in, capped at ≤ 3/week, quiet hours honored.

**Non-goals (explicit).** No full prayer app. No qibla-as-a-product. No habit tracker. No productivity dashboard.

**Proof**

- Prayer-window sessions show ≥ 10% higher finish-rate and ≥ 15% higher session-quality vs. control.
- Push CTR ≥ 12% at the ≤ 3/week cap.

**Serves the benefit objective by** matching content to the moment — a Qur'an minute is more valuable before Zuhr than at midnight.

**Depends on:** Wave 2.

---

## Wave 6 — Learning Loop (M6 — optional memory)

**Ships moat:** M6 as a lock-in layer, never a spine. Everything here reinforces videos already watched.

**Scope**

- Bookmarks with personal reflections on watched videos.
- Ayah / dua bookmarks that link back to source videos.
- *"What I learned this month"* AI summary drawn only from the user's own watched + noted videos.
- Year-in-iman recap (shareable stat card, private data by default).
- Full export (JSON + PDF), one-click.

**Proof**

- ≥ 30% of DAU save ≥ 1 reflection per week by day 30.
- ≥ 5× share rate on year-end recap vs. non-memory users.
- Export usage ≥ 5%.

**Serves the benefit objective by** turning consumption into retained learning — the benefit compounds after the video ends.

**Depends on:** Wave 2.

---

## Wave 7 — Ummah Coordination (M7 — long-term, deferred)

**Ships moat:** M7. Deferred until Waves 1–4 are proven. Every feature is **video-anchored**.

**Scope**

- Global Ramadan khatm room (video + audio).
- Synchronized Qiyam nights (last 10 nights, live rooms).
- Masjid-hosted watch rooms (institution-owned live rooms).
- Institution-run cohort classes with certificates.

**Proof**

- First global Ramadan khatm completes ≥ 1 full Qur'an cycle with ≥ 10k participants.
- ≥ 5 institutions run classes with ≥ 500 enrolled users each.
- ≥ 100k participations in a single Qiyam night.

**Serves the benefit objective by** letting users learn together, not chat aimlessly.

**Depends on:** Waves 1–4.

---

## Priority order (summary)

```text
Wave 0  Principle lock                       — guardrail, ships first
Wave 1  Trust Spine                    (M1)  — highest priority
Wave 2  Beneficial Intelligence Engine (M2)  — highest priority
Wave 3  Beneficial-source ecosystem    (M3)  — high
Wave 4  Family Safety / Kids Mode      (M4)  — high
Wave 5  Ritual-Aware Discovery         (M5)  — supporting
Wave 6  Learning Loop                  (M6)  — optional retention
Wave 7  Ummah Coordination             (M7)  — long-term, deferred
```

---

*Next action:* on approval, open a dedicated plan for **Wave 0 — Principle lock**, then **Wave 1 — Trust Spine**, scoped entirely to the watch experience.
