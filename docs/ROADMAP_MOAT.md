# Heartify — Long-Range Roadmap

Companion to `docs/STRATEGY_MOAT.md`, governed by `docs/FIRST_PRINCIPLES_2046.md` (company blueprint, MVP sequence, dependency graph). This roadmap sequences the *compound moat* into buildable waves. It is written to still make sense a decade from now: the principles are permanent, the waves are the current best implementation of those principles.

Every wave is filtered by three tests, in order:

1. **Benefit test.** Does this raise *value received per minute spent*, or only time spent? If only time spent, reject.
2. **Video-first test.** Does this make Heartify better at discovering, trusting, watching, or learning from beneficial videos? If no, backlog.
3. **Compound-moat test.** Does this strengthen at least one of the eight moat pillars (benefit-first ranking, trust & transparency, beneficial-video graph, creator ecosystem, personalization-in-trusted-corpus, family-safe by default, explainability, learning progression) in a way that compounds over years? If no, deprioritize.

Standing rules:

- **No manipulative tactics, ever.** Implementation choices (infinite scroll, autoplay, push cadence) remain available *only* where they demonstrably serve benefit.
- **Engagement metrics are measured, not optimized for in isolation.** Retention, DAU, session length, and completion are health signals — a benefit-caused rise is good, a benefit-neutral rise is a warning.
- **Ritual, memory, and coordination features may only ship as re-rankers or retention layers over the video experience.** They never become separate spines.
- **Waves ship sequentially.** Parallel work only when a wave is genuinely blocked.
- **Every wave writes back to `docs/STRATEGY_MOAT.md`** if reality changes the thesis.

---

## Wave 0 — Principle lock (documentation + telemetry only)

**Ships moat pillar:** the guardrail beneath every pillar. No product surface.

**Scope**
- Codify the benefit objective, session-quality checklist, and *"measure engagement, never optimize for it in isolation"* rule in the internal metrics dashboard and PRD template.
- Add benefit-weighted metrics (finish-rate on recommended videos, session-quality rating, learning-path progression) beside existing retention metrics.
- Add a manipulative-pattern audit to the quarterly review.
- Publish Founder Principles (Strategy §8) as a signed internal document; every PRD must reference which principle it advances.

**Proof**
- PRD template updated; dashboard shows benefit metrics beside engagement metrics.
- First quarterly audit run with zero manipulative-pattern findings.

**Blocks:** every later wave.

---

## Wave 1 — Trust Spine (M1)

**Ships moat pillar:** Trust & transparency. The primary differentiator.

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

**Serves the benefit objective by** making every "beneficial" claim independently verifiable. Without trust, benefit is a marketing word.

**Why YouTube cannot copy:** per-video attestation at their catalog scale contradicts their supply model.

**Depends on:** existing moderation pipeline (P1.2D). **Blocks:** every later wave.

---

## Wave 2 — Beneficial Intelligence Engine (M2)

**Ships moat pillar:** Benefit-first ranking + the beneficial-video graph + explainability + personalization-in-trusted-corpus (four pillars in one wave — this is the flywheel's engine).

**Scope**
- **Knowledge graph tables** (with RLS + grants): `kg_topics`, `kg_institutions`, `kg_scholars`, `kg_sources`, `kg_languages`, `kg_madhhab`, plus edge tables for video↔topic, video↔source, source↔institution.
- **Multilingual embeddings** on the approved corpus across 18+ languages; nearest-neighbor retrieval alongside existing candidate generators.
- **New ranking signals**: user goals, learning progress, difficulty progression, time-available, session context, prayer context (opt-in), language/dialect.
- **Negative-signal features** wired into ranking — rejection reasons become training features and a proprietary dataset.
- Expanded per-video **"Why you're seeing this"** transparency — expose trust + graph + taste + context factors.
- Session-diverse retrieval remains default; top-channel share ≤ 5% and repeat rate < 1% remain hard invariants.
- Post-watch session-quality micro-survey (*"Did this help you?"*) fed back into ranking as an explicit benefit signal.

**Proof**
- Finish-rate on recommended videos improves ≥ 15% vs. control.
- Session-quality rating ≥ 4.2 / 5 across a random 1% sample.
- Top-channel share ≤ 5%; repeat rate < 1%.
- ≥ 90% of DAU see recommendations in their preferred language when available.
- Engine coverage: every approved video reachable via ≥ 2 retrieval paths.

**Serves the benefit objective by** making benefit the ranking objective itself, not a post-hoc filter.

**Why YouTube cannot copy:** their objective function is priced against watch time. Replacing it is a company-scale rewrite of their ad marketplace.

**Depends on:** Wave 1. **Blocks:** Wave 3 payout math.

---

## Wave 3 — Beneficial-source ecosystem (M3)

**Ships moat pillar:** creator ecosystem. Covers **all** beneficial sources — scholars, universities, institutes, foundations, masjids, educational organizations, independent educators, researchers, engineers, doctors, historians, language teachers, productivity experts, entrepreneurs, documentary creators, parents, and children's educators.

**Scope**
- Sadaqah tipping on every video (Stripe / Paddle rails).
- Monthly waqf memberships to a creator or institution.
- Reviewed-content bonus pool: distributed by **tier × trust-graph edges × finish-rate**, never raw views.
- Transparent earnings dashboards (`/creator/earnings`, `/institution/earnings`).
- Institutional grants portal.
- **"Claim your channel / institution"** flow open to every beneficial source.
- Payout compliance (KYC, tax, cross-border).

**Proof**
- Top 100 beneficial sources earn ≥ 1.5× estimated YouTube CPM equivalents for the same category.
- ≥ 500 active waqf memberships within 90 days.
- ≥ 20 institutional grants active.
- ≥ 30% of DAU tip or subscribe within 60 days of signup.

**Serves the benefit objective by** funding the supply of beneficial content YouTube's ad marketplace structurally underpays.

**Why YouTube cannot copy:** their CPM cannot pay a scholar, a university, or a physician competitively with a viral entertainer. Ours can — because our revenue is not priced against watch time.

**Depends on:** Wave 1, Wave 2.

---

## Wave 4 — Family Safety / Kids Mode (M4)

**Ships moat pillar:** family-safe by default.

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

**Why YouTube cannot copy:** their family product is a separate walled garden. On Heartify, family safety is the default posture of the whole platform.

**Depends on:** Wave 1, Wave 2.

---

## Wave 5 — Ritual-Aware Discovery (M5 — supporting)

**Ships moat pillar:** ritual as a *context signal* for discovery. Explicitly **not** a prayer app.

**Scope**
- Prayer-time-aware home rail ordering (Qur'an minute before Zuhr, reflection after Maghrib, wind-down after Isha).
- Ramadan mode — nightly tarawih recommendations, iftar-window shorts.
- Jumu'ah rail on Fridays.
- Qiyām rail in the last 10 nights.
- Push notifications anchored to local prayer times when opted in, capped ≤ 3/week, quiet hours honored.

**Non-goals (explicit).** No full prayer app. No qibla-as-a-product. No habit tracker. No productivity dashboard.

**Proof**
- Prayer-window sessions show ≥ 10% higher finish-rate and ≥ 15% higher session-quality vs. control.
- Push CTR ≥ 12% at the ≤ 3/week cap.

**Serves the benefit objective by** matching content to the moment — a Qur'an minute is more valuable before Zuhr than at midnight.

**Why YouTube cannot copy:** they have no reason to know when a user prays, and cannot ask.

**Depends on:** Wave 2.

---

## Wave 6 — Learning Progression (M6)

**Ships moat pillar:** longitudinal learning memory. Not a "spiritual scrapbook" — a curriculum that compounds year over year.

**Scope**
- Bookmarks with personal reflections on watched videos.
- Ayah / dua bookmarks that link back to source videos.
- Explicit learning paths across Islamic sciences, Arabic, Qur'anic literacy, science, history, entrepreneurship, and language — authored by scholars and institutions.
- *"What I learned this month"* AI summary drawn only from the user's own watched + noted videos.
- Year-in-īmān recap (shareable stat card, private data by default).
- Full export (JSON + PDF), one-click.

**Proof**
- ≥ 30% of DAU save ≥ 1 reflection per week by day 30.
- ≥ 5× share rate on year-end recap vs. non-memory users.
- ≥ 10% of DAU are enrolled in a learning path by month 6.
- Export usage ≥ 5%.

**Serves the benefit objective by** turning consumption into retained learning — benefit compounds after the video ends.

**Why YouTube cannot copy:** their memory model is a taste graph tuned to sell ads, not a curriculum tuned to advance a learner.

**Depends on:** Wave 2.

---

## Wave 7 — Ummah Coordination (M7 — long-term, deferred)

**Ships moat pillar:** coordination at Ummah scale. Deferred until Waves 1–4 are proven. Every feature is **video-anchored**.

**Scope**
- Global Ramadan khatm room (video + audio).
- Synchronized Qiyām nights (last 10 nights, live rooms).
- Masjid-hosted watch rooms (institution-owned live rooms).
- Institution-run cohort classes with certificates.

**Proof**
- First global Ramadan khatm completes ≥ 1 full Qur'an cycle with ≥ 10k participants.
- ≥ 5 institutions run classes with ≥ 500 enrolled users each.
- ≥ 100k participations in a single Qiyām night.

**Serves the benefit objective by** letting users learn together, not chat aimlessly.

**Why YouTube cannot copy:** they can build a live product, but not one whose audience is already gathered around beneficial video, endorsed by institutions.

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
Wave 6  Learning Progression           (M6)  — compounding memory
Wave 7  Ummah Coordination             (M7)  — long-term, deferred
```

---

## Ten-year read

If Heartify executes Waves 0–7 with the Founder Principles intact (Strategy §8), then by year 10:

- Every video on the platform carries a signed, publicly verifiable attestation.
- The beneficial-knowledge graph is the largest of its kind, in 18+ languages, extending across Islamic sciences and every beneficial category.
- Thousands of scholars, universities, foundations, masjids, and beneficial creators earn a living here — including creators YouTube's ad marketplace structurally underpays.
- Millions of families use Heartify by default for their children, because family safety is a posture of the whole product.
- Every recommendation can explain itself.
- Users are advancing along explicit learning paths that took years to walk — and would take years to rebuild elsewhere.
- Institutions treat Heartify as shared infrastructure for beneficial knowledge, the way earlier generations treated libraries.

If any of those bullets is false in year 10, we optimized for the wrong thing. Return to Strategy §8 and correct.

---

*Next action:* on approval, open a dedicated plan for **Wave 0 — Principle lock**, then **Wave 1 — Trust Spine**, scoped entirely to the watch experience.
