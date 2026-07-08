# Step-by-step delivery plan

You asked for everything "step by step." Here's the order I'll ship in. Each step is one turn — you confirm/see the result before I move on.

## Step 1 — GSC sync settings panel + sitemap diff
- Add `/admin/gsc/sync` section (or extend `/admin/gsc`) with:
  - Enable/disable toggle for `gsc-hourly-sync` (writes to `_internal_config`, cron function reads flag).
  - "Run now" button → invokes `gsc-sync` edge function.
  - Last run: timestamp, duration, status, error text (from `gsc_sync_snapshots`).
- Sitemap diff:
  - Store parsed sitemap URL list in each snapshot.
  - Diff view: added URLs (green), removed URLs (red), warning-count delta vs previous snapshot.

## Step 2 — Permission tester upgrades
- For each permission in `src/lib/permissions.ts`, add a registry mapping permission → routes + component files it gates.
- Show that mapping in `/admin/permissions`.
- "Simulate missing permission" toggle: overrides `usePermissions` via a dev-only context so I can preview the UI as a lower role without logging out.

## Step 3 — MFA status widget + enrollment help
- New `MfaStatusCard` on `/profile`:
  - Lists every factor (`supabase.auth.mfa.listFactors()`): type (TOTP/Phone/WebAuthn), friendly name, verified status, created/updated timestamps.
  - Unenroll button per factor.
- On `/mfa-enroll`, add an "Enrollment help" panel that maps Supabase error strings to plain-English causes + next steps (AAL2 required, factor already exists, session expired, rate limited, etc.).
- Reproduce your enrollment failure with Playwright, capture the exact error, and add a targeted fix.

## Step 4 — Security review + fixes
- Run `supabase--linter`, `security--get_scan_results`, `code--dependency_scan`.
- Fix real issues (missing RLS, GRANTs, function search_path, dep vulns). Mark intentional-public findings as accepted with rationale in `security-memory`.

## Step 5 — Performance pass
- Analyze bundle (`vite build`), enable route-level code splitting on admin pages, preload LCP image on `/`, convert large PNGs to WebP/AVIF via `vite-imagetools`.
- Report before/after bundle size and reasoning.

## Step 6 — A–Z app documentation
- Write `docs/APP_GUIDE.md` covering: product overview, tech stack, routing map, roles/permissions, every table + purpose, every edge function + trigger, cron jobs, connectors, deployment, ops runbook, troubleshooting.

## Step 7 — End-to-end smoke
- Playwright smoke of `/`, `/about`, `/mfa-enroll`, `/admin/*`, `/owner`, `/profile`, `/admin/gsc`, `/admin/permissions`. Report any 4xx/5xx or console errors.

---

Reply "go" (or "start with step N") and I'll execute Step 1. If you'd rather I collapse a couple of steps into one turn, tell me which.
