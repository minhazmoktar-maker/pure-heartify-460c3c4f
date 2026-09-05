# Environment Variables

All values live in two places: Vite build-time vars (frontend, `VITE_*`) and
Supabase Edge Function secrets (backend). There is no committed `.env` with
secret values.

## Frontend (build time)

| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Backend REST/Realtime/Functions base URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon key (safe in the bundle) |
| `VITE_SUPABASE_PROJECT_ID` | Used to build function URLs |

These are the only frontend variables. Nothing privileged is ever exposed to
the browser (verified by repo scan: no service-role key in `src/`).

## Backend secrets (Edge Functions)

| Name | Used by | Required |
| --- | --- | --- |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | all functions | yes (auto-provided by Supabase) |
| `AI_GATEWAY_BASE_URL` | `_shared/aiGateway.ts` | recommended — any OpenAI-compatible endpoint |
| `AI_GATEWAY_API_KEY` | `_shared/aiGateway.ts` | recommended |
| `LOVABLE_API_KEY` | fallback only if the two above are unset | optional |
| `YOUTUBE_API_KEY`, `YOUTUBE_API_KEY_2` … `_6` | `ingest-videos`, `discover-channels`, `sample-channel-videos` | at least one; more raises quota |
| `INGEST_CRON_TOKEN`, `CRON_SECRET` | all cron-invoked workers | yes |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | web push (`send-push`, `get-vapid-public-key`) | yes for push |
| `FCM_SERVER_KEY` | Android push fanout | yes for Android push |
| `RESEND_API_KEY` | `dispatch-alert`, `alert-fanout` | yes for alert email |
| `BKASH_*`, `NAGAD_*` | `bkash-payment`, `nagad-payment` | only if those gateways are used |
| `GSC_*` | `gsc`, `gsc-sync` | only for Search Console sync |

## AI provider independence

`supabase/functions/_shared/aiGateway.ts` resolves the AI provider in this
order: `AI_GATEWAY_BASE_URL` + `AI_GATEWAY_API_KEY`, then `LOVABLE_API_KEY`.
Setting the first pair points every AI feature (visual safety sweep, channel
summaries, transcript translation, captions, embeddings, support agent) at any
OpenAI-compatible provider with no code change.
