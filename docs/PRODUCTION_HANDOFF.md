# Heartify — Production Handoff

_Last updated: 2026-09-04_

For an engineer taking over Heartify with no prior context. Companions:
`docs/ARCHITECTURE.md` (depth), `docs/EXIT_LOVABLE.md` (portability),
`docs/DEPLOYMENT.md`, `docs/SECURITY.md`, `docs/LAUNCH_CHECKLIST.md`.

## 1. What it is

A mobile-first halal video and Islamic-learning platform: curated video feed,
Shorts, Qur'an listening with offline playback, learning paths, streaks and
challenges, social connections, creator uploads, and a public trust ledger.
Roughly 99% of usage is expected on iOS/Android via Capacitor wrapping the same
web build.

## 2. Stack

- **Frontend** — React 18, Vite 5, TypeScript, Tailwind (semantic tokens only),
  shadcn/ui, TanStack Query, React Router. Route-level code splitting.
- **Backend** — Supabase: Postgres + RLS, auth, storage, ~80 edge functions
  (Deno) under `supabase/functions/`, scheduling via `pg_cron`.
- **Native** — Capacitor (`ios/`, `android/`), plus a SwiftUI watch companion
  scaffold in `heartify-watch/` fed by `src/lib/shared/watch.ts`.
- **AI** — Gemini via the gateway for captions, moderation, thumbnails, support
  agent RAG.

## 3. Repo map

```
src/pages/            route components (one file per surface)
src/components/       shared UI; ui/ is shadcn primitives
src/hooks/            data hooks (TanStack Query wrappers)
src/lib/              ranking, halalGuard, searchEngine, region, permissions
src/i18n/             18 locale dictionaries + RTL handling
src/test/             vitest unit tests
supabase/functions/   edge functions (_shared holds authz + helpers)
supabase/migrations/  ordered SQL — the only source of schema truth
tests/e2e/            Playwright specs
docs/                 architecture, security, launch, phase reports
```

## 4. Core invariants — do not break

1. **Halal floor is enforced in the database**, not app code: triggers block
   music/female-presenting content, the channel blocklist is server-side, and
   `visual_state` must be `clean` for a video to serve.
2. **No advertising surfaces anywhere.** Revenue is membership, waqf/sadaqah,
   institutional licensing, certificates.
3. **Optimise benefit per minute, never watch time.** The ranker consumes
   benefit labels and the T+90 satisfaction signal.
4. **Roles live only in `user_roles`**, checked through `has_role()` /
   `has_min_role()`. Never store a role on a profile.
5. **Every public table** has RLS enabled plus explicit `GRANT`s; sensitive
   columns (e.g. `creator_uploads.resume_token`) use column-level grants.
6. **Language relevance**: 80/20 local-language weighting per region
   (`supabase/functions/recommendations`, `src/lib/region.ts`).
7. **Semantic design tokens only** — no hardcoded colour utilities.

## 5. Everyday commands

```sh
bun install
bun run dev            # localhost:8080
bun run typecheck      # tsgo --noEmit
bun run test           # vitest
bunx playwright test   # E2E (needs a build; TEST_* secrets unlock role specs)
bun run build
bun run i18n:check     # locale key parity
bun run cap:sync       # native sync
```

## 6. Deploying

- Web: `bun run build` → publish `dist/` (SPA rewrites, `public/_headers`).
- Functions: `supabase functions deploy <name>`.
- Schema: add a new file to `supabase/migrations/` and push; never edit an
  applied migration.

## 7. Monitoring

- `/status`, `/diagnostics` — public health surfaces.
- `/admin/feed-diversity`, `/admin/rec-health`, `/admin/feed-quality`,
  `/admin/audit`, `/admin/channel-trust` — operational dashboards.
- `production_alerts` + `dispatch-alert` fire every 10 minutes; a dead-letter
  queue and stuck-job reaper cover the ingestion pipeline.
- `/verify` exposes the hash-chained attestation ledger publicly.

## 8. Known limitations / open items

- Signed Android and iOS builds need owner credentials: Apple Team ID and Play
  App Signing SHA-256 (placeholders in the `.well-known` files).
- Apple Watch target is scaffolded, not built — needs local Xcode.
- `/verify` carries the mechanism for institution signatures, but real partner
  attestations must be collected and signed by those institutions.
- YouTube API key slots 3–6 are wired but empty; ingestion throughput stays
  quota-limited until they are filled.
- Embedding coverage ~68% (cost decision); lexical search coverage is 100%.
- Leaked-password (HIBP) protection and admin MFA are auth-dashboard toggles
  that remain off.
- 33 Playwright specs skip without `TEST_*` accounts.

## 9. Suggested next priorities

1. Fill the YouTube key slots and finish the signed store builds.
2. Collect real institutional attestations and surface them on `/verify`.
3. Enable HIBP + admin MFA, add CDN rate limiting on `/functions/v1/*`.
4. Raise embedding coverage above 95% to sharpen semantic dedup and search.
5. Rehearse a backup restore end to end and wire on-call to a real channel.
