# Recommendation System

## Shape

Retrieval → gating → scoring → diversification → assembly. Implemented in
`supabase/functions/feed`, `supabase/functions/recommendations`,
`supabase/functions/surfaces`, with shared logic in `src/lib/`
(`languageRelevance.ts`, `languageBalance.ts`, ranking helpers) so the same
rules are unit-testable and reused by the simulation.

## Retrieval lanes

1. **Personalized** — affinity over topics, creators, categories from watch
   history and `benefit_outcomes`.
2. **Followed** — channels the user follows.
3. **Trending** — recent engagement, trust-weighted.
4. **Cold start** — onboarding interests + region/language context.
5. **Exploration** — deliberate off-profile novelty.

## Gates (hard filters, applied before scoring)

- Strict Halal: `status=approved`, `visual_state=clean`, `halal_score>=70`.
- Premium: `is_premium_only` requires an entitlement.
- Language eligibility from `languageRelevance.ts` (with thin-supply fallback
  so a small language never yields an empty feed).
- Negative feedback: downvoted creators are not re-served.

## Scoring

Benefit signal (T+90 "was this worth it?" rate) is the primary objective, not
watch time. Combined with affinity, channel trust (institutional
co-signatures included), freshness, and language relevance. Novelty decay
suppresses recently seen items and semantic duplicates via `video_embeddings`.

## Diversification

Per-channel cap, per-category cap, language-share balancing with remainder
caps (`languageBalance.ts`), and semantic dedupe on assembly.

## Validated behaviour (1,000-user simulation)

`src/test/recommendationSimulation.ts` harness (`recommendation-simulation-1000.test.ts`, `feed-uniqueness-1000.test.ts`), production-like language retrieval, 1,000
synthetic users differing in language prefs, interests, creators, watch
history, engagement, negative feedback, exploration appetite:

- mean pairwise top-K overlap: 0.4%
- top creator share: 15%
- language mismatch: 0%
- downvoted creators re-served: 0
- exploration rate: 67%
- catalog coverage: 80%
- lift over popularity baseline: 1.88×
- heavy users: 100 distinct pages, 54% new items per session

The objective is high personalization with low unnecessary overlap and
controlled exploration — not per-user uniqueness.
