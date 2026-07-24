# Heartify — Final Architecture Review

**Input:** `docs/EXECUTION_ROADMAP.md`
**Goal:** prevent unnecessary work. Bias hard toward *cut*, *merge*, *defer*.

---

## Verdict table (every kept item, re-challenged)

| ID | Item | Verdict | Reasoning |
|----|------|---------|-----------|
| P0-1 | Ritual Spine (single Home card tied to current prayer window) | **KEEP** | Only item that changes the *shape* of the app. Directly solves the "supermarket" critique. Users will notice within one session. If removed, launch has no identity. |
| P0-2 | Identity streak copy | **MERGE into P0-1** | Copy-only change; ship as part of the RitualCard PR, not as a separate workstream. No independent dashboard needed — its KPI folds into P0-1. |
| P0-3 | Branded share default | **SIMPLIFY** | Real virality lever, but 5 templates is over-scoped for launch. Ship **2 templates only**: ayah and streak (the two things users already share most). Add the other 3 post-launch based on share-mix telemetry. |
| P0-4 | 3-day cold-start | **SIMPLIFY** | The value is Day 1, not Days 2–3. A curated Day-1 experience (single ritual + one Editor's Pick) captures ~80% of the retention lift at ~30% of the effort. Days 2–3 can just be the Ritual Spine doing its job. |
| P0-5 | Prayer-window push (light) | **KEEP** | Cheap, and P0-1 needs a trigger to be discovered by returning users. Enforce the existing 3/wk cap; no new infra. |
| P0-6 | Household PIN server enforcement | **POST-LAUNCH** | Local SHA-256 gate is already shipped and adequate for launch trust. Server enforcement is a hardening upgrade, not a launch blocker. Genuine parents are not adversaries; determined kids are rare and can be handled in v1.1. Frees ~1 week. |
| P0-7 | Route/nav consolidation | **KEEP** | Highest simplicity ROI. Deletes code, reduces cognitive load, improves perf. Ship first. |
| P1-1 | Editor's Pick daily slot | **MERGE into P0-4** | It *is* the Day-1 cold-start payload. One table, one reader, one card — not two features. |
| P1-2 | Series continuity nudge | **POST-LAUNCH** | Already partially shipped via `useSeriesEpisodes`. Polish is not a launch blocker; wait for real usage data before investing more. |
| P1-3 | Onboarding taste picker | **POST-LAUNCH** | Personalization v2 already infers taste from behavior. A chip picker adds onboarding friction (measurable D0 drop) for a signal we can derive within one session. Classic "solving an imagined problem." Revisit only if cold-start feed quality is measurably poor after launch. |

**Net:** 10 items → **4 workstreams** (P0-1+P0-2, P0-3 simplified, P0-4+P1-1 merged, P0-5, P0-7). Two items deferred, two removed from launch scope.

---

## Leanest launch roadmap

Four workstreams, sequenced. Each is independently shippable and rollback-safe.

### W1 — Consolidation (P0-7)
Delete/merge routes, collapse bottom nav to 4 tabs, add 301s. **Effort: M. Ships first because every later change is easier on a smaller surface.**

### W2 — Ritual Spine + identity streak copy (P0-1 + P0-2)
One `RitualCard` replaces three heroes on Home. Streak copy shifts to identity-based language in the same PR. **Effort: M. The one change that redefines the app.**

### W3 — Prayer-window push (P0-5)
Reuses existing push infra + cap. Powers re-entry into the Ritual Spine. **Effort: S.**

### W4 — Day-1 Editor's Pick + branded share (P0-4-lite + P0-3-lite + P1-1 merged)
- One `editors_picks` row/day surfaced as Day-1 hero for new users and as a secondary card for returning users.
- Two share templates (ayah, streak) become the default share unit.
- **Effort: M combined.**

**Total: ~3 weeks** (vs. 5 in the original plan). Zero new features. Two deletions. One consolidation. One rethink of Home. One re-entry trigger. One shareable artifact. One curator voice.

---

## The single highest-ROI feature to build first

# → W1: Consolidation (route + nav cleanup)

**Why it comes before everything else:**

1. **It's the only workstream that makes every other workstream cheaper.** Ritual Spine, Editor's Pick, and branded share all live on Home or in the nav. Building them on top of a 40-route, 5-tab surface guarantees rework. Building them on a 4-tab, deduplicated surface is straightforward.
2. **It ships user-visible value on day one.** A smaller nav + faster time-to-primary-action is felt in the first session, before any behavioral feature lands.
3. **It's pure removal.** No new UI, no new DB, no new copy to localize, no moderation surface, no KPI to invent — just deletions, redirects, and a nav refactor. Lowest risk of anything on the list.
4. **It de-risks the audit's central critique** ("identity crisis / supermarket"). Even if W2–W4 slipped, launching with W1 alone already moves the app measurably closer to its promise.
5. **It compounds.** Bundle size drops, LCP improves, deep-link tests get simpler, Search Console coverage tightens — every one of those benefits every subsequent release forever.

Everything else is a bet on user behavior. W1 is a bet on our own code, and we always win that bet.

**Recommended order:** W1 → W2 → W3 → W4. Ship W1 this week.
