# Heartify — Known Limitations

Honest list. Nothing here is claimed as fixed.

## Blocked on cost / founder decision

1. **111,118 videos (32% of corpus) have no embedding.** Semantic recall
   therefore covers ~68% of the catalogue. Backfilling means ~111k embedding
   calls through the AI Gateway, which costs credits. `apply_video_embeddings()`
   makes the write side cheap; the model spend is a founder call. Recommended:
   backfill only rows that are `approved`/`auto_approved` and surfaced in the
   last 90 days first.
2. **Attestation institutional co-sign (MVP-9) not built.** Needs real
   institutional partners and signed agreements.
3. **Benefit ranker is at a 10% treatment arm.** Ramping to 50/100% needs enough
   label volume for `benefit_arm_readout` to be conclusive — that needs real users.

## Blocked on external systems

4. **Native iOS/Android apps.** Capacitor shells, store listings, Team ID,
   SHA-256 fingerprints, and `.well-known` association files require Apple/Google
   accounts and physical devices. See `docs/LAUNCH_HANDOFF.md`.
5. **Load testing at scale.** `docs/LOAD_TESTING_PLAN.md` exists; execution needs
   a load generator against a non-preview environment.
6. **YouTube API quota ceiling.** Ingestion throughput is quota-bound, not
   code-bound. Reaching 7,000 channels is a calendar-time problem.

## Technical debt accepted for now

7. **154 database linter items**, overwhelmingly `function_search_path_mutable`
   and `anon_security_definer_function_executable` on legacy functions. New
   functions pin `search_path` and revoke `anon`. A sweep migration over the
   legacy set is safe but noisy — do it in Cursor with a review pass.
8. **`src/App.tsx` is ~66 KB** (route table). It code-splits correctly but should
   be decomposed into route-group modules for readability.
9. **`src/integrations/supabase/types.ts` is ~192 KB** (generated; do not edit).
10. **Some slow statements in `pg_stat_statements` are historical** — e.g. a
    `section_id` + `NOT ILIKE` chain with `select *` and an exact count
    (mean 314 ms). No such query exists in the current source; the counters are
    cumulative since the last stats reset. Reset stats after deploy to get a
    clean baseline before optimizing further.
11. **Test coverage is thin** relative to surface area. Highest-value additions:
    retrieval pool assembly, halal-guard classification, streak transitions.
