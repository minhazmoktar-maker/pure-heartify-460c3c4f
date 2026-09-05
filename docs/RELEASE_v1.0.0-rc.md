# Heartify — Release Candidate v1.0.0-rc

Frozen: 2026-09-05 (UTC). Status: **RELEASE CANDIDATE — FROZEN**.
No further product, architecture, UI, feature, dependency, database, recommendation,
localization or performance changes may be made unless a genuine production blocker is found.

## 1. Release identifier

- Version: `v1.0.0-rc`
- Scope: entire repository at this point in history (source, migrations, edge functions, docs, tests).
- Versioning mechanism: Lovable-managed project history. Every message checkpoint is restorable;
  this document marks the exact frozen state. If the repository is exported to Git, tag the export
  commit `v1.0.0-rc`.

## 2. Verified state at freeze (measured, not assumed)

- Typecheck: `bunx tsc -p tsconfig.app.json --noEmit` — clean.
- Unit/integration tests: `bunx vitest run` — **482 passed, 1 skipped, 51 files passed / 1 skipped**.
- Production build: succeeded (~635 KB main bundle, ~209 KB gzip, ~4.4 MB PWA precache).
- Security findings: none pending at freeze time.
- No production-critical `lovable.app` URLs in `src`, `supabase`, `public`, `index.html`,
  `capacitor.config.ts`. Remaining references are preview/test-only.
- AI provider access goes through the portable gateway wrapper
  (`supabase/functions/_shared/aiGateway.ts`, `AI_GATEWAY_BASE_URL` / `AI_GATEWAY_API_KEY`).

Not proven and not claimed: million-user capacity, native store builds, real institution
signatures, extra YouTube quota, any legal/store approval.

## 3. Deployment state

Live edge functions (deployed and smoke-checked HTTP 200):
`feed`, `recommendations`, `search`, `surfaces`, `support-agent`, alert/notification dispatch
functions, `og-image`, SEO/sitemap functions, moderation + caption + ingestion functions,
`bn-ingest-verify` (auth-protected).

Scheduled jobs (`pg_cron`), active: serving-function warmer (`warm-serving-functions`, every
2 min, `service_role` only), ingestion + verification jobs, rejection-recovery, corpus health
monitor, safety sweeps, push dispatch.

Frontend: published to `heartifyapp.com` / `www.heartifyapp.com` via the Publish flow. Frontend
changes require an explicit Publish; backend changes deploy immediately.

Measured live latency after warmer (indicative, not SLA): feed ~1.4–2.9 s warm, recommendations
~1.1–2.0 s, search ~0.9–4.3 s; occasional cold isolates up to ~8 s.

## 4. Backup / recovery

- Source: full project history in Lovable; any prior checkpoint can be restored from the version
  history panel. Restore-to-this-point = the checkpoint containing this file.
- Database migrations: all preserved under `supabase/migrations/` in chronological order and are
  the single source of truth for schema, RLS, grants and cron jobs.
- Environment variables: documented in `docs/ENVIRONMENT.md` (names and purpose only; no values).
- Deployment configuration: `docs/DEPLOYMENT.md`; independence/migration path in
  `docs/EXIT_LOVABLE.md` and `docs/MIGRATION.md`; operational handover in
  `docs/PRODUCTION_HANDOFF.md`.
- Rollback procedure:
  1. Frontend: restore the previous checkpoint in Lovable version history, then Publish.
  2. Edge functions: revert the function source to the previous checkpoint and redeploy that
     function only.
  3. Database: forward-fix with a new migration. Do not edit or delete applied migrations.
  4. Cron: disable a misbehaving job with `SELECT cron.unschedule('<job-name>');`.

No secrets are stored in the repository or in this document.

## 5. Remaining external / manual requirements (not software defects)

- Signed Android production build (Android Studio/SDK + upload keystore + Play SHA-256).
- Signed iOS production build (Xcode on macOS + Apple Team ID + provisioning profiles).
- App Store / Play Store submission, review and store metadata sign-off.
- watchOS target build from `heartify-watch/` (see `docs/WATCHOS_SETUP.md`).
- Real institution signatures for `/verify` (currently structural support only, no fabricated
  attestations).
- Additional YouTube Data API keys (slots 3–6) for further catalogue scaling.
- Google Search Console sync is **optional** and is not a blocker for normal operation.

## 6. Known risks

- Cold-start latency on serving edge functions is mitigated by the 2-minute warmer but not
  eliminated; first request after a scaling event can be several seconds.
- Catalogue growth is bounded by available YouTube API quota.
- Full 262-spec Playwright suite cannot be executed reliably in the build sandbox (browser binary
  constraints); focused smoke and deep-link specs pass via `scripts/playwright.sh`.
- Upstream YouTube availability changes can make individual videos unplayable; the corpus health
  monitor and unplayable-report path handle this reactively.

## 7. Post-freeze policy

Only genuine production blockers may be changed. Each such change must be: minimal in scope,
tested, and appended to the change log at the bottom of this file.

### Post-freeze change log

_(empty at freeze)_
