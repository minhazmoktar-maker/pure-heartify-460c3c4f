# Heartify — Production Checklist

Tick before a public launch push. `[x]` = verified in this repo/backend.
`[ ]` = requires devices, traffic, accounts, or a founder decision.

## Security
- [x] RLS enabled with policies on every user-facing table
- [x] Roles isolated in `user_roles` + `has_role()` / `has_min_role()`
- [x] Privileged RPCs revoked from `anon`/`authenticated`
- [x] Cron-only endpoints gated by `X-Cron-Secret`
- [x] HSTS, X-Frame-Options, CSP with `report-uri`
- [ ] Legacy `search_path` linter sweep (154 items, mostly informational)
- [ ] Leaked-password (HIBP) protection enabled in auth settings
- [ ] Fresh security scan immediately before launch

## Data & integrity
- [x] Halal floor enforced by database triggers, not app code
- [x] Attestation ledger hash-chained, publicly verifiable at `/verify`
- [x] Removal blocklist indexed and trigger-enforced
- [x] Retention policies + purge runs configured
- [ ] Embedding coverage ≥ 95% (currently 68%; cost decision)
- [x] Lexical search coverage automated to 100% (self-terminating cron)

## Performance
- [x] Bulk writes are set-based RPCs (no per-row PostgREST loops on hot paths)
- [x] Hot-table `BEFORE UPDATE` triggers scoped with `UPDATE OF`
- [x] Explicit column lists on all feed reads (never `select *`)
- [x] Route-level code splitting
- [x] LCP preloads, `font-display: swap`, AVIF/WebP, skeletons matched to layout
- [ ] Load test executed against production-like traffic
- [ ] `pg_stat_statements` reset post-deploy for a clean baseline

## Reliability
- [x] Dead-letter queue + stuck-job reaper
- [x] Ops alerts every 10 minutes with `production_alerts`
- [x] `/status`, `/diagnostics` health surfaces
- [ ] Paging/on-call destination wired to a real channel (email/Slack)
- [ ] Backup restore rehearsed end-to-end

## Product / UX
- [x] Mobile-first navigation, 44px targets, safe areas, edge-swipe back
- [x] Today-first home, no ad surfaces anywhere
- [x] Onboarding, streaks, notification preference matrix, quiet hours
- [x] 12+ locale dictionaries with RTL
- [ ] Accessibility audit with a real screen reader on device
- [ ] Store assets, screenshots, privacy answers submitted

## Legal
- [x] Privacy, Terms, cookie consent, age gate, data export, account deletion
- [ ] Counsel review of Privacy/Terms for target jurisdictions
