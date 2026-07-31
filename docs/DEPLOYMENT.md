# Heartify — Deployment

## Environments

| Environment | Where | Notes |
| --- | --- | --- |
| Preview | Lovable preview URL | Auth-gated, service workers disabled |
| Production web | https://pure-heartify.lovable.app | Publish from Lovable, or deploy the Vite build to any static host |
| Backend | Lovable Cloud (Postgres + Edge Functions) | Migrations and functions deploy automatically on approval |

## Web deploy

Frontend changes require an explicit publish/update. Backend changes (migrations,
edge functions) deploy immediately when approved.

Outside Lovable:

```bash
npm install
npm run build      # dist/
```

Serve `dist/` with SPA fallback (`/* -> /index.html`), excluding `/~oauth`.

## Required backend secrets

Set in project secrets (never in code): `LOVABLE_API_KEY` (managed),
`YOUTUBE_API_KEY`, `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`, `CRON_SECRET`,
plus any GSC credentials. `SUPABASE_SERVICE_ROLE_KEY` and the database password
are platform-managed and not retrievable.

## Cron

All scheduled work is `pg_cron` (see `ARCHITECTURE.md`). After a restore or
project move, re-verify with:

```sql
select jobname, schedule, active from cron.job order by jobname;
```

## Native apps

```bash
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init          # appId app.lovable.6731527d4fb54e95bb9e47de8bea4363
npm run build && npx cap sync
npx cap run ios | android
```

Remove the `server.url` hot-reload block from `capacitor.config.ts` before any
store build. Patch `public/.well-known/apple-app-site-association` with the real
Team ID and `assetlinks.json` with the release SHA-256 before submitting.

## Post-deploy verification

1. `/status` and `/diagnostics` are green.
2. Feed returns items for a signed-out and a signed-in session, and two sessions
   do not receive identical ordering.
3. `select count(*) from curated_videos where search_tsv is null;` trends to 0.
4. Ops: `select * from production_alerts order by created_at desc limit 20;`
5. Run a security scan before broad sharing.
