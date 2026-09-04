# Moving Heartify off Lovable

_Last updated: 2026-09-04_

Heartify is a standard Vite + React + TypeScript app with a Supabase backend
(database, auth, storage, edge functions, cron). Nothing in the runtime depends
on Lovable. This document lists the only Lovable-specific touch points and how to
replace each one.

## 1. What is Lovable-specific

| Item | Where | Replacement |
|---|---|---|
| `lovable-tagger` (dev-only Vite plugin) | `vite.config.ts` devDependencies | Delete the plugin import + `mode === "development"` entry. No runtime impact. |
| `@lovable.dev/cloud-auth-js` preview session bridge | `src/integrations/supabase/previewAuthStorage.ts` | Only used to hydrate the in-editor preview session. Replace the storage adapter with the Supabase default (`localStorage`) in `src/integrations/supabase/client.ts`. |
| `@lovable.dev/mcp-js` | `supabase/functions/mcp` | Optional MCP surface. Remove the function if you do not expose MCP. |
| Lovable AI Gateway (`LOVABLE_API_KEY`) | `supabase/functions/support-agent`, `translate-transcript`, `moderate-*`, `visual-safety-sweep` | Swap the base URL/key for a direct Google Gemini or OpenAI key. Each function reads the model + endpoint from constants at the top of the file. |
| Hosting + `public/_headers` | Lovable hosting | Any static host (Cloudflare Pages, Netlify, Vercel). `_headers` is Netlify/Cloudflare syntax and works as-is on both. |
| Preview/publish URLs | `docs/DEPLOYMENT.md` | Point the custom domain (`heartifyapp.com`) DNS at the new host. |

## 2. Take ownership of the backend

The backend is a real Supabase project. Two paths:

**Keep the same project (fastest).** Ask Lovable support to transfer the
Supabase project into your own organisation. All data, storage objects, cron
jobs, and secrets stay in place; nothing in the app changes.

**Migrate to a new Supabase project.**

1. Create the project, then apply migrations in order:
   `supabase db push` (or `psql -f` each file in `supabase/migrations/` sorted by name).
2. Re-create secrets (`supabase secrets set`): `SUPABASE_SERVICE_ROLE_KEY`,
   `CRON_SECRET`, `INGEST_CRON_TOKEN`, `AUDIT_CRON_TOKEN`,
   `YOUTUBE_API_KEY`…`YOUTUBE_API_KEY_6`, `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`,
   `FCM_SERVER_KEY`, payment keys (`BKASH_*`, `NAGAD_*`), and the AI provider key.
3. Deploy functions: `supabase functions deploy --project-ref <ref>` (all folders
   under `supabase/functions/` except `_shared`).
4. Re-create the `pg_cron` schedules — they live in the migrations; verify with
   `select jobname, schedule, active from cron.job order by jobname;`.
5. Copy storage buckets (`creator-uploads`, thumbnails) with
   `supabase storage cp` or the S3-compatible endpoint.
6. Dump/restore data: `pg_dump --data-only --schema=public` from the old project.
7. Update `.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
   `VITE_SUPABASE_PROJECT_ID`) and regenerate
   `src/integrations/supabase/types.ts` with `supabase gen types typescript`.

## 3. Build and host the web app

```sh
bun install
bun run build          # generates sitemaps, then vite build -> dist/
```

Serve `dist/` as a SPA (all unknown paths rewrite to `/index.html`). Ship the
headers in `public/_headers`, and add `Strict-Transport-Security` and
`X-Frame-Options: DENY` at the CDN.

## 4. Native apps

Capacitor projects are committed (`ios/`, `android/`).

```sh
bun run cap:sync       # smoke check + build + cap sync + native config
bun run cap:android    # requires Android SDK + JDK 17
bun run cap:ios        # requires Xcode on macOS
```

Signing still needs your own credentials: Apple Team ID in
`public/.well-known/apple-app-site-association` and Play App Signing SHA-256 in
`public/.well-known/assetlinks.json`.

## 5. CI

Workflows under `.github/workflows/` already run typecheck, unit tests,
Playwright E2E, Lighthouse, secret scanning, and SEO checks. They need these
repo secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID`, plus the optional `TEST_*` accounts for the
role-gated E2E specs.

## 6. Verification checklist after the move

- [ ] `bun run typecheck && bun run test && bun run build`
- [ ] `bunx playwright test` green (33 specs skip without `TEST_*` accounts)
- [ ] Signed-out `/`, `/watch/:id`, `/listen`, `/shorts` load real data
- [ ] Sign-in, sign-up, Google OAuth work on the new domain
- [ ] `select count(*) from cron.job where active;` matches the migration set
- [ ] Push notification round-trip on web + Android
- [ ] `/status` and `/diagnostics` report healthy
