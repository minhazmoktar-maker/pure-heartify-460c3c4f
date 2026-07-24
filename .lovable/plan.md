# Plan — Benefit-First Strategy Revision (approved constraints incorporated)

Doc-only. Rewrite `docs/STRATEGY_MOAT.md` and `docs/ROADMAP_MOAT.md` around a benefit-first, video-first, trust-led philosophy — while explicitly keeping engagement metrics (retention, completion, DAU) as measured health signals we care about but never optimize for in isolation.

## Constraints locked in

- Video-first identity preserved.
- **Trust remains the primary differentiator.**
- Engagement metrics are kept and measured; we never optimize for engagement at the expense of benefit; manipulative tactics are forbidden.
- No language banning implementation choices (infinite scroll, autoplay, push cadence). Those stay available whenever they serve benefit.
- Core question becomes: *"What is the most beneficial thing this person **wants** to watch right now?"* — benefit + desire together; never lecture.
- YouTube comparison reframed as a **compound moat**: trusted moderation · verified beneficial sources · multilingual beneficial corpus · superior discovery inside that corpus · family safety · source ecosystem · transparent recommendations.
- Permanent principle: **"Heartify is not trying to maximize time spent. It is trying to maximize value received per minute spent."**

## `docs/STRATEGY_MOAT.md` — changes

1. **Section 0 identity lock** — keep video-first + trust-as-primary-differentiator, add benefit as the *objective function*.
2. **New Section 0.5 — Product principles (permanent)**:
   - Every minute should leave the user better than before.
   - Maximize value received per minute spent — not time spent. Retention, completion, and DAU still matter and are pursued *through* benefit.
   - Core ranking question: *"What is the most beneficial thing this person wants to watch right now?"* Users must feel understood, not lectured.
   - No manipulative engagement tactics. Implementation tools (infinite scroll, autoplay, push) remain available when they serve benefit.
   - Session-quality checklist (taught? faith? skill? question answered? life improved?).
   - Existing feature filter retained.
3. **New Section 1.5 — Direct answer to "Why leave YouTube if it already recommends halal videos?"** Framed as a **compound moat** listing all seven advantages that only work together (trusted per-video moderation · verified beneficial sources · multilingual beneficial corpus · superior discovery inside that corpus · family safety · source ecosystem · transparent recommendations). Closing line: *YouTube's halal videos are accidents of its algorithm; Heartify's are the entire point of ours.*
4. **M1 Trust & moderation** — retained as the primary differentiator.
5. **Rename M2 → Beneficial Intelligence Engine.** Objective stated as *"What's the most beneficial video this person wants to watch right now?"* Signals combined: Trust · Knowledge graph · User goals · Learning progress · Difficulty progression · Diversity · Freshness · Discovery · Session context · Time available · Prayer context · Language/dialect · Negative-signal dataset. Transparency (*"Why you're seeing this"*) is a first-class feature. No prohibitions on implementation techniques.
6. **Rename M3 → Beneficial-source ecosystem.** Broaden actors: scholars, universities, institutes, foundations, masjids, educational organizations, independent educators, researchers, creators. Payout math unchanged.
7. **M4 (Family Safety), M5 (Ritual re-rankers only), M6 (Memory), M7 (Ummah)** retained, each gets a one-line *"Serves the benefit objective by…"* clause.
8. **Section 4 Unique jobs** — update job #2 to *"Recommend the highest-benefit next video the user actually wants — not the stickiest one."*
9. **New Section 10 — Internal north-star metrics.**
   - Primary (benefit-weighted): finish-rate on recommended videos, session-quality rating, learning-path progression, trust-attestation coverage, report resolution median.
   - Guardrails: top-channel share ≤ 5%, repeat rate < 1%, push CTR ≥ 12% at ≤ 3/week, zero manipulative-pattern findings quarterly.
   - Health (measured, never the target on their own): retention (D1/D7/D30), DAU, session length, completion rate — treated as *consequences* of benefit.
10. **Durability test (Section 11)** — updated to:
    > *"YouTube shows me what will keep me watching. Heartify shows me the most beneficial thing I actually want to watch next — and proves why it's safe."*
    Emphasize the gap is a **business-model gap**, not a UI gap.

## `docs/ROADMAP_MOAT.md` — changes

1. **Execution rules** — keep the video-first test, add the benefit test (raises value per minute, not just time). Explicit: engagement metrics are measured; no manipulative tactics; implementation techniques remain available when they serve benefit.
2. **New Wave 0 — Principle lock (docs + telemetry only).** Codify the benefit objective and benefit-weighted metrics next to engagement metrics; add manipulative-pattern audit to quarterly review. Ships first, no product surface.
3. **Wave 1 — Trust Spine (M1)** unchanged, with *"Serves the benefit objective by…"* clause.
4. **Wave 2 — renamed Beneficial Intelligence Engine.** Scope adds user goals, learning progress, difficulty progression, time-available, session context, prayer context, language/dialect. Post-watch session-quality micro-survey feeds back into ranking. Proof metrics reframed: finish-rate ≥ +15%, session-quality ≥ 4.2/5, top-channel share ≤ 5%, repeat < 1%.
5. **Wave 3 — renamed Beneficial-source ecosystem** to match broadened actors.
6. **Waves 4–7** retained, each with a *"Serves the benefit objective by…"* clause.
7. **Priority order** updated to reflect Wave 0 addition and renames.

## Out of scope

- No code, schema, migrations, RPCs, edge functions, tests, or CI changes.
- No component edits.

## Deliverable

Two revised markdown files. Approve to switch to build mode; I write both in one pass.
