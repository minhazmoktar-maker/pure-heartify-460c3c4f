# Heartify — Next Steps

Ordered by expected impact per unit of effort.

## 1. Finish embedding coverage (search + recommendation quality)
111,118 rows lack embeddings. Write side is already cheap
(`apply_video_embeddings`). Add a self-terminating cron mirroring
`backfill-search-tsv` that embeds N rows/minute, with a hard spend cap and a
priority order: surfaced-in-last-90-days → approved → the long tail.
**Blocked on:** AI Gateway spend approval.

## 2. Ramp the benefit ranker
Ranker is at a 10% arm. Ramp 10 → 50 → 100 gated on `benefit_arm_readout`
showing treatment ≥ control on worth-it rate at n large enough to matter.
**Blocked on:** real user label volume.

## 3. Raise benefit-label response rate
Benefit priors are input-starved. Try an in-feed one-tap prompt (instead of
modal-only), and a single push per day maximum inside quiet-hour rules.

## 4. Institutional co-sign (MVP-9)
`trusted_institutions` and `attestations` already exist. Add institution-signed
attestation rows plus a public badge on `/verify`. This is the hardest moat to
copy and needs partner agreements, not code.

## 5. Native apps
Capacitor shells, `.well-known` files with real Team ID / SHA-256, store
listings, on-device accessibility and performance passes.

## 6. Legacy linter sweep
One reviewed migration pinning `search_path` on legacy functions and revoking
`anon` execute where it isn't intentional. Do it with a diff review, not blindly.

## 7. Decompose `src/App.tsx`
Split the route table into route-group modules. Zero user-visible change; large
maintainability win for a Cursor-based workflow.

## 8. Tests where breakage is expensive
Retrieval pool assembly, `halalGuard` classification, streak state transitions,
attestation chain verification.

## 9. Reset performance baseline
After the next deploy: `select pg_stat_statements_reset();` then re-run the slow
query audit so the numbers reflect current code only.
