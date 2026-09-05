# Migration Guide — Operating Heartify Without Lovable

Heartify is a standard Vite + React + TypeScript app with a Supabase backend.
Nothing in the production path requires Lovable once the steps below are done.
See also `docs/EXIT_LOVABLE.md` and `docs/PRODUCTION_HANDOFF.md`.

## 1. Source

Clone the Git repository. Remove the dev-only tagger from `vite.config.ts`
(`lovable-tagger` runs in development mode only) and `bun install`.

## 2. Frontend hosting

`bun run build` produces static assets in `dist/`. Host on any static host
with SPA fallback (Cloudflare Pages, Netlify, Vercel, S3+CloudFront, nginx).
Set the three `VITE_*` variables at build time (`docs/ENVIRONMENT.md`).
Point `heartifyapp.com` at the host.

## 3. Backend

Option A (keep Supabase): the project is a normal Supabase project — take over
billing/ownership and continue with the Supabase CLI.

Option B (self-host): run supabase/postgres + GoTrue + PostgREST + Realtime +
Storage + Edge Runtime via Docker, restore a `pg_dump`, apply
`supabase/migrations`, deploy `supabase/functions`, and update the `VITE_*`
URLs.

## 4. AI provider

Set `AI_GATEWAY_BASE_URL` and `AI_GATEWAY_API_KEY` to any OpenAI-compatible
provider (OpenAI, Azure OpenAI, OpenRouter, self-hosted). This removes the
`LOVABLE_API_KEY` fallback entirely.

## 5. Scheduled jobs

All jobs are `pg_cron` entries stored in the database — they migrate with the
dump. Verify with `select * from cron.job;` after restore.

## 6. Remaining Lovable references (classified)

| Reference | Class | Action |
| --- | --- | --- |
| `lovable-tagger` in `vite.config.ts` | B (dev only) | remove when leaving |
| `previewAuthStorage.ts` preview host list | B (dev only) | inert in production |
| `ai.gateway.lovable.dev` in the CSP `connect-src` | B | drop after setting your own AI gateway |
| `pure-heartify.lovable.app` in CSP `img-src` and one test fixture | A | historical, harmless |
| Docs mentioning Lovable | A | historical |

No category C (production dependency) references remain: the AI gateway
fallback is optional, and hosting, database, auth, functions, storage, cron
and push all run on infrastructure you control.

## 7. Native apps

Capacitor project configuration is complete (`apply-native-config.mjs`,
privacy manifests, icons, launch screens). Signed builds and store submission
require your own Apple/Google accounts, signing credentials and
macOS/Android toolchains — see `docs/STORE_READINESS_MATRIX.md` and
`docs/WATCHOS_SETUP.md`.
