# Plan — Tighten strategy to a video-first, trust-led moat

Scope: docs only. Rewrite `docs/STRATEGY_MOAT.md` and `docs/ROADMAP_MOAT.md` to lock Heartify's identity as *the world's most trusted platform for discovering and watching halal, beneficial content*. No code changes.

## Identity lock (applied to both docs)

- Positioning: **video-first platform**. Qur'an, prayer, journal, streaks, family = supporting tools that make video discovery, trust, retention, or learning stronger. They are never the product spine.
- Every feature filter becomes: *"Does it make Heartify better at discovering, trusting, watching, or learning from beneficial videos?"* If no → future backlog.
- Remove all language that repositions Heartify as a "daily spiritual operating system." Replace with "video-first, trust-led."

## Rewrite of `docs/STRATEGY_MOAT.md`

Re-ordered and re-weighted moats:

1. **M1 — Trust & moderation (primary moat)**
   - Signed per-video attestations, tier A–D, public `/verify/:content_id`.
   - Human + institution review chain visible on every card.
   - Trust becomes a ranking signal, not just a filter.
2. **M2 — Discovery & recommendation (primary moat)** — new dedicated section explaining the compounding data advantages:
   - Halal-labeled corpus (title/description/tags/thumbnail signals + human tier).
   - Islamic knowledge graph (topics, madhhab, language, scholar lineage, institution).
   - Multilingual understanding across 18+ languages already crawled.
   - Behavioral taste graph on a filtered corpus (denominator YouTube can't replicate without abandoning ad economics).
   - Negative-signal dataset (why videos were rejected) — proprietary and cumulative.
   - Why it's hard to copy: requires simultaneous investment in moderation labels + multilingual NLP + Islamic ontology + long-tail catalog.
3. **M3 — Beneficial-creator ecosystem** — broaden from scholars to **all beneficial creators**: Islamic education, dawah, Qur'an, science, history, entrepreneurship, language learning, parenting, documentaries, productivity, engineering, medicine.
   - Sadaqah tipping, waqf memberships, reviewed-content bonus pool weighted by tier + trust-graph + finish-rate.
   - Institutional grants and cross-creator endorsements.
   - Target: top ~2,000 beneficial creators globally earn more per 1k views on Heartify than on YouTube within 24 months.
4. **M4 — Family safety (Kids Mode)** — tier-A + explicit whitelist + parent audit dashboard + report SLA.
5. **M5 — Ritual integrations (supporting, contextual discovery only)** — prayer-time-aware recommendations, Ramadan surfaces, Jumu'ah rail, Qiyam recommendations. Explicit non-goals: no full prayer app, no productivity app, no habit tracker as a product line. Rituals only exist to inform *which video to show right now*.
6. **M6 — Spiritual memory (optional retention layer)** — bookmarks, notes, khatm ledger, year-in-iman. Kept as a lock-in mechanism, not a spine.
7. **M7 — Ummah coordination (long-term)** — synchronized viewing (global khatm rooms, Qiyam watch rooms, masjid-hosted rooms). Deferred; still video-anchored.

Other section changes:
- Rewrite the flywheel diagram around **Trust → Discovery → Creators → Households → back to Trust**.
- Rewrite "Unique jobs" list to be video-outcome jobs (certify the source, discover the beneficial video, guarantee zero-doubt watch, pay the beneficial creator fairly, learn from what you watched).
- Rewrite the one-sentence durability test to keep the video framing: *"YouTube shows me what will keep me watching. Heartify shows me the most beneficial thing to watch right now — and proves why it's safe."*
- Add explicit **Non-goals** section: not a prayer app, not a productivity app, not a social network, not a Muslim TikTok.

## Rewrite of `docs/ROADMAP_MOAT.md`

Waves re-ordered and re-scoped to match the new priority. Each wave keeps proof metrics; each is filtered by the video-first test.

- **Wave 1 — Trust Spine (was M2).** Signed attestations on every video, `/verify/:id`, reviewer chain on cards, trust-weighted ranking. Proof: ≥99% of surfaced videos carry a valid signed attestation; parent-audit NPS ≥+40.
- **Wave 2 — Discovery Moat.** Knowledge graph tables (topics, institutions, scholars, languages, madhhab), multilingual embeddings on the approved corpus, negative-signal dataset wired into ranking, per-video "why you're seeing this" already exposed. Proof: session-diversity holds while finish-rate improves ≥15%; top-channel share stays ≤5%.
- **Wave 3 — Beneficial Creator Ecosystem (broadened).** Sadaqah tipping, waqf memberships, reviewed-content bonus pool across all beneficial categories, creator earnings dashboard, "Claim your channel" for non-scholar beneficial creators. Proof: top 100 beneficial creators earn ≥1.5× YouTube CPM equivalents; ≥500 active waqf memberships.
- **Wave 4 — Family Safety / Kids Mode.** Tier-A-only Kids Mode, parent audit log, report-a-video SLA, child seat lock. Proof: 100/100 random Kids Mode videos pass human re-review; median report-to-resolution <24h.
- **Wave 5 — Ritual-Aware Discovery (supporting).** Prayer-time-aware home rail ordering, Ramadan mode surfacing, Jumu'ah rail, Qiyam rail. Explicitly **not** a prayer app; rituals only re-rank video surfaces. Proof: prayer-window sessions show higher finish-rate and lower bounce vs. control.
- **Wave 6 — Learning Loop (optional memory).** Bookmarks with reflections, "what I learned this month" summary drawn from watched + noted videos, year-in-iman recap. Proof: ≥30% of DAU save ≥1 reflection/week.
- **Wave 7 — Ummah Coordination (deferred).** Synchronized watch rooms, masjid-hosted rooms, institution-led cohort classes. Still video-anchored.

Add a top-of-file **Execution Rules** section:
1. Video-first test gates every proposed feature.
2. Ritual, memory, and coordination features may only ship as re-rankers or retention layers over the video experience.
3. Waves ship sequentially; no parallel wave unless one is genuinely blocked.
4. Every wave writes back to `STRATEGY_MOAT.md` if reality changes the thesis.

Close with: *Next action — on approval, open a dedicated plan for Wave 1 (Trust Spine) focused entirely on the watch experience.*

## Deliverables

- `docs/STRATEGY_MOAT.md` — rewritten per above.
- `docs/ROADMAP_MOAT.md` — rewritten per above.
- No code, no schema, no config changes in this pass.
