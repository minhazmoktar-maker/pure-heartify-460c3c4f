# Phase 9 — Reliability, performance, ops excellence

This phase adds the ops-grade guardrails Heartify needs to scale to millions of
users without paging on every incident.

## What shipped

| Concern | Artifact |
| --- | --- |
| Load testing in CI | `tests/load/k6-smoke.js`, `.github/workflows/load-tests.yml` |
| Capacity plan | See "Capacity plan" below |
| Structured logs across edge functions | `supabase/functions/_shared/logger.ts` |
| Image CDN + signed URLs | `supabase/functions/image-proxy/index.ts`, `src/lib/imageProxy.ts` |
| Edge-function coverage smoke | `supabase/functions/_shared/__tests__/edge_functions_smoke_test.ts` |
| Vitest coverage floor | `vitest.config.ts` (v8, thresholds enforced) |
| Weekly dep + secret rotation | `.github/workflows/dep-rotation.yml` |
| Per-release Lighthouse budgets | `lighthouserc.cjs` (categories now `error`) |
| Release-tagged Sentry | Already in `src/lib/sentry.ts` (release = `APP_VERSION`) |

## Capacity plan (initial)

Baseline targets, validated by nightly k6 smoke (`load-tests.yml`):

- Landing (`/`, `/about`, `/trust`) — p95 < 800 ms at 20 VUs, 60 s.
- Feed anonymous (`/functions/v1/feed`) — p95 < 1200 ms at 20 VUs.
- Search anonymous (`/functions/v1/search?q=…`) — p95 < 1000 ms at 20 VUs.

Scale gates (open a scaling ticket when any breach):

- p95 latency > 1500 ms sustained for 30 min → resize compute one tier.
- Edge-function CPU seconds > 80 % of monthly quota by day 25 → resize.
- Postgres cache-hit ratio < 0.95 for 24 h → add read replicas (Phase 10+).

## Structured log contract

Every edge function that adopts the shared logger emits single-line JSON with:

```
{ ts, level, fn, release, msg, ...extra }
```

Errors go to stderr, everything else to stdout, so shippers can classify by
stream. Never log secrets. Prefer IDs + latency + boolean outcomes.

## Image CDN

Front all third-party image hosts through `image-proxy`. Signatures are
HMAC-SHA256 (first 32 hex chars of `HMAC(secret, url + '|' + expires)`), with
a `SUPABASE_FUNCTIONS_URL` route that only accepts whitelisted upstream hosts.
`IMAGE_PROXY_SIGNING_KEY` must be set as an edge-function secret; rotate every
30 days (tracked by the weekly rotation reminder issue).

## Coverage bar

The Vitest coverage floor starts at 20 % (lines/functions/statements) and 15 %
branches, scoped to `src/lib` and `src/hooks`. Ratchet it up by ~5 points per
release until we reach 60 %+.

## Rotation cadence

The weekly rotation workflow (Monday 09:00 UTC) opens a GitHub issue listing
the secrets due for review. Close the issue once rotations land.
