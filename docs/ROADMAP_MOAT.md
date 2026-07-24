# Heartify — Video-First Moat Roadmap

Companion to `docs/STRATEGY_MOAT.md`. Waves are re-ordered to protect the primary moats first: **Trust (M1)** and **Discovery (M2)**. Every wave is filtered by the video-first test.

## Execution rules

1. **Video-first test gates every proposal.** A feature ships only if it makes Heartify better at discovering, trusting, watching, or learning from beneficial videos. If no → future backlog.
2. **Ritual, memory, and coordination features may only ship as re-rankers or retention layers over the video experience.** They never become separate product spines.
3. **Waves ship sequentially.** No parallel wave unless one is genuinely blocked.
4. **Every wave writes back to `docs/STRATEGY_MOAT.md`** if reality changes the thesis.

---

## Wave 1 — Trust Spine (M1 — highest priority)

**Ships moat:** M1 — Trust & moderation. All work is anchored to the watch experience.

**Scope**

- Finalize signed moderation attestations on **every** video: reviewer ID, timestamp, tier, model version, rule hits — cryptographically signed and immutable.
- Public `/verify/:content_id` page — end-to-end, indexable, cacheable.
- Reviewer chain surfaced on every card and watch page: *"Reviewed by X · Endorsed by Y · Tier A"*.
- Trust as a **ranking signal**, not only a filter — tier + institution edge outrank raw engagement at equal quality.
- Report-a-video flow with public SLA (median time-to-resolution posted).
- Audit log for every automated and manual moderation action (already partially in place — formalize).

**Proof**

- ≥ 99.5% of surfaced videos carry a valid signed attestation.
- 100/100 random watch-page audit passes human re-review.
- Median report-to-resolution < 24h.
- Parent-audit NPS ≥ +40.

**Depends on:** existing moderation pipeline (P1.2D). **Blocks:** every later wave — trust is the substrate.

---

## Wave 2 — Discovery Moat (M2)

**Ships moat:** M2 — Discovery & recommendation. Turns the trust substrate into a compounding data advantage.

**Scope**

- **Knowledge graph tables** (with RLS + grants): `kg_topics`, `kg_institutions`, `kg_scholars`, `kg_creators`, `kg_languages`, `kg_madhhab`, plus edge tables for video↔topic, video↔creator, creator↔institution.
- **Multilingual embeddings** on the approved corpus across 18+ languages; nearest-neighbor retrieval alongside existing candidate generators.
- **Negative-signal features** wired into ranking — rejection reasons become training features so future crawls learn from every past mistake.
- Expanded per-video **"Why you're seeing this"** transparency (already live — surface the trust + graph + taste factors that ranked it).
- Session-diverse retrieval remains the default; ensure top-channel share ≤ 5% and repeat rate < 1% remain hard invariants.
- Language-aware and dialect-aware rails.

**Proof**

- Finish-rate on recommended videos improves ≥ 15% vs. control.
- Top-channel share stays ≤ 5%; repeat rate < 1%.
- ≥ 90% of DAU see recommendations in their preferred language when available.
- Recommender coverage: every approved video reachable via ≥ 2 retrieval paths.

**Depends on:** Wave 1 attestations. **Blocks:** Wave 3 payout math (bonus pool depends on graph edges).

---

## Wave 3 — Beneficial-Creator Ecosystem (M3 — broadened)

**Ships moat:** M3. Covers **all** beneficial creator categories — Islamic education, dawah, Qur'an, science, history, business, language learning, parenting, documentaries, productivity, medicine, engineering.

**Scope**

- Sadaqah tipping (one-tap on every video; Stripe / Paddle rails).
- Monthly waqf memberships to a specific creator or institution.
- Reviewed-content bonus pool: distributed by **tier × trust-graph edges × finish-rate**, never raw views.
- Transparent creator earnings dashboard (`/creator/earnings`).
- Institutional grants portal (a masjid, university, or foundation sponsors a specific creator or series).
- **"Claim your channel"** flow open to every beneficial category, not only scholars.
- Payout compliance (KYC, tax, cross-border).

**Proof**

- Top 100 beneficial creators earn ≥ 1.5× estimated YouTube CPM equivalents for the same category.
- ≥ 500 active waqf memberships within 90 days.
- ≥ 20 institutional grants active.
- ≥ 30% of DAU tip or subscribe within 60 days of signup.

**Depends on:** Wave 1 (trust), Wave 2 (graph edges for payout math).

---

## Wave 4 — Family Safety / Kids Mode (M4)

**Ships moat:** M4. Makes the trust promise concrete for parents.

**Scope**

- Kids Mode = tier A only + explicit institutional whitelist + child seat lock.
- Household model (up to 6 seats, roles: owner / parent / member / child).
- Parent audit dashboard: what the child watched, when, and *why* it was approved.
- Report-a-video for children — routed with priority SLA.
- Child seat lock (PIN-gated exit).

**Proof**

- 100/100 random Kids Mode videos pass human re-review.
- ≥ 30% of new signups add a second seat within 14 days.
- Median report-to-resolution for Kids reports < 12h.

**Depends on:** Wave 1 attestations, Wave 2 graph (institutional whitelist).

---

## Wave 5 — Ritual-Aware Discovery (M5 — supporting)

**Ships moat:** M5, strictly as a **re-ranker over the video surface**. Explicitly **not** a prayer app.

**Scope**

- Prayer-time-aware home rail ordering (Qur'an minute before Zuhr, reflection after Maghrib, wind-down after Isha).
- Ramadan mode — nightly tarawih recommendations, iftar-window shorts.
- Jumu'ah rail on Fridays.
- Qiyam rail in the last 10 nights.
- Push notifications anchored to local prayer times when opted in, capped at ≤ 3/week, quiet hours honored.

**Non-goals (explicit).** No full prayer app. No qibla-as-a-product. No habit tracker. No productivity dashboard. Rituals only re-rank the video feed and drive contextually relevant push.

**Proof**

- Prayer-window sessions show ≥ 10% higher finish-rate and ≥ 15% lower bounce vs. control.
- Push CTR ≥ 12% at the ≤ 3/week cap.

**Depends on:** Wave 2 (ranking hooks).

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
- Export usage ≥ 5% (used as a trust signal).

**Depends on:** Wave 2 (video metadata for summaries).

---

## Wave 7 — Ummah Coordination (M7 — long-term, deferred)

**Ships moat:** M7. Deferred until Waves 1–4 are proven. Every feature is **video-anchored** (a watch room, not a chat product).

**Scope**

- Global Ramadan khatm room (video + audio).
- Synchronized Qiyam nights (last 10 nights, live rooms).
- Masjid-hosted watch rooms (institution-owned live rooms).
- Institution-run cohort classes with certificates.

**Proof**

- First global Ramadan khatm completes ≥ 1 full Qur'an cycle with ≥ 10k participants.
- ≥ 5 institutions run classes with ≥ 500 enrolled users each.
- ≥ 100k participations in a single Qiyam night.

**Depends on:** Waves 1–4.

---

## Priority order (summary)

```text
Wave 1  Trust Spine                 (M1)  — highest priority
Wave 2  Discovery Moat              (M2)  — highest priority
Wave 3  Beneficial-Creator Ecosystem (M3)  — high
Wave 4  Family Safety / Kids Mode   (M4)  — high
Wave 5  Ritual-Aware Discovery      (M5)  — supporting
Wave 6  Learning Loop               (M6)  — optional retention
Wave 7  Ummah Coordination          (M7)  — long-term, deferred
```

---

*Next action:* on approval, open a dedicated plan for **Wave 1 — Trust Spine**, scoped entirely to the watch experience.
