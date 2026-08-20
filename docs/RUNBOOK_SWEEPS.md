# Runbook — visual-safety-sweep & sweep-embeddable

On-call reference for the two content-integrity cron workers. Both are
non-user-facing but a silent stall degrades the halal floor (unsafe thumbnails
stay live) or playability (non-embeddable videos stay in the feed).

**Audience:** on-call engineer. **Time to triage:** target < 10 minutes.

---

## 1. At a glance

| Worker | Schedule | Auth | Budget | Symptom of failure |
| --- | --- | --- | --- | --- |
| `visual-safety-sweep` | every 5 min (pg_cron) | `x-cron-token` (`INGEST_CRON_TOKEN`) or `x-cron-secret` (`CRON_SECRET`) | 20s per AI call, 90s per run | 500/504 responses; `visual_state='unchecked'` backlog grows |
| `sweep-embeddable` | hourly (pg_cron) | same cron gate, or verified admin JWT | 200 batches × 50 ids max | `quota_exhausted: true`; non-playable videos remain visible |

Both return JSON with the fields on-call should read first:

```jsonc
// visual-safety-sweep
{ "scanned": 32, "truncated": true, "applied": {...}, "escalation": {...} }
// sweep-embeddable
{ "ok": true, "checked": 450, "hidden": 6, "deferred": 50,
  "stop_reason": "quota", "quota_exhausted": true }
```

---

## 2. Dashboards

| Where | What it shows | Use it for |
| --- | --- | --- |
| `/admin/ops-health` | Per-function invocation count, error ratio, p95 duration, tier badge (from `function_metrics` via the `observed()` wrapper) | First stop. Is the function running at all? Is it slow or erroring? |
| `/admin/ops-health` → Alerts panel | Rows from `production_alerts` (raised by `check_ops_alerts`) | Confirm whether an alert is sustained or a single blip |
| `/admin/moderation` | Visual verdict distribution, archived-by-vision counts | Confirm verdicts are actually being applied |
| `/admin/global-discovery` | Corpus size, approved/hidden counts | Confirm the embeddability sweep is shrinking the unplayable tail |
| Edge function logs | Raw `[visual-safety-sweep]` / `[sweep-embeddable]` lines | Root cause once the dashboard localises the failure |

Useful SQL (read-only):

```sql
-- Visual scan backlog and throughput
select visual_state, count(*)
from curated_videos
where is_archived = false
group by 1 order by 2 desc;

-- Oldest embeddability check (staleness of the sweep)
select min(embed_checked_at), count(*) filter (where embed_checked_at is null)
from curated_videos where is_archived = false and is_hidden = false;

-- Recent function health
select fn, count(*) calls, avg(duration_ms)::int avg_ms,
       count(*) filter (where status >= 500) errors
from function_metrics
where created_at > now() - interval '6 hours'
  and fn in ('visual-safety-sweep','sweep-embeddable')
group by 1;

-- Open alerts
select * from production_alerts
where resolved_at is null order by created_at desc limit 20;
```

---

## 3. Alerts and what they mean

Alerts come from `check_ops_alerts()` reading `function_metrics`. Thresholds are
deliberately **sustained-signal** based (>= 20% error ratio over a window with a
minimum call volume) so a single cold start or one slow AI call does not page.

| Alert | Meaning | Severity | First action |
| --- | --- | --- | --- |
| `visual-safety-sweep error ratio high` | >= 20% of runs returned 5xx in the window | P2 | Check for `apply_visual_verdicts` / statement-timeout errors in logs |
| `visual-safety-sweep p95 duration high` | Runs approaching the 90s budget | P3 | Expect `truncated: true`; only act if the backlog is also growing |
| `visual-safety-sweep no invocations` | pg_cron stopped firing | P2 | Verify the cron job row and the cron token secret |
| `sweep-embeddable quota exhausted` | `quota_exhausted: true` with `stop_reason: "quota"` | P3 | Expected daily; see §5 |
| `sweep-embeddable error ratio high` | 5xx runs, not quota | P2 | Usually PostgREST/statement timeout; see §6 |
| `visual scan backlog growing` | `unchecked` count rising across several hours | P2 | Throughput is below intake — see §4 remediation |

**Not an alert (by design):** `truncated: true` on a single run, one
`deferred` batch, or a single `model_error` verdict. These are normal
back-pressure signals; the next tick re-claims the rows.

---

## 4. Diagnosing timeouts (visual-safety-sweep)

Design contract (enforced by `src/test/visual-safety-sweep.test.ts`):

1. Each AI-gateway call is aborted at **20s** and degrades to an `unchecked`
   verdict — never a `clean` one.
2. The run stops starting new waves after **90s** and returns
   `truncated: true` with the verdicts it already has.
3. `unchecked` verdicts are **never applied**, so those rows keep
   `visual_state = 'unchecked'` and are re-claimed by the next tick.

So a slow AI gateway shows up as **low `scanned`, `truncated: true`,
HTTP 200** — not as a 504.

Triage:

- `truncated: true` on most runs + backlog growing → the gateway is slow.
  Check `/admin/ops-health` p95 for the sweep. Mitigation: lower `batch`
  (body `{ "batch": 20 }`) so each run finishes cleanly, or temporarily raise
  cron frequency. Escalate to the AI-gateway owner if p95 stays elevated.
- HTTP 500 with `"error": "<pg message>"` → the failure is in
  `apply_visual_verdicts` or `escalate_visually_unsafe_channels`, not the AI.
  See §6.
- HTTP 401 → the cron token no longer matches the secret.
- HTTP 500 `"LOVABLE_API_KEY not configured"` → the AI key secret is missing.
  Rows were claimed but nothing is lost; they stay `unchecked`.

Manual run (replace the token):

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/visual-safety-sweep" \
  -H "x-cron-token: $INGEST_CRON_TOKEN" \
  -H 'Content-Type: application/json' -d '{"batch":10}' | jq
```

---

## 5. Diagnosing quota exhaustion (sweep-embeddable)

YouTube Data API allows 10,000 units/day per key. `videos.list?part=status`
costs 1 unit per 50 ids, but the whole project shares the budget with
discovery/ingestion — so the sweep is the first thing starved.

Design contract (enforced by `src/test/sweep-embeddable.test.ts`):

1. A `403` whose body matches `/quota/i` is treated as **non-transient**: the
   run stops immediately after logging once per key. No 403 storms.
2. For any batch that could not be verified, **nothing is written** — no
   `embed_checked_at` bump. Those ids come back in `deferred` and remain first
   in line on the next run. No video is left "processed but unchecked".
3. `stop_reason` distinguishes `quota` from `exhausted_corpus`, `yt_error`
   and `fetch_error`.

Triage:

- `stop_reason: "quota"` → wait for the midnight-Pacific quota reset. Confirm
  `deferred` is non-zero and `checked` reflects the work completed before the
  stop. No data fix needed.
- Quota exhausted every day at the same hour → discovery/ingestion is
  consuming the budget. Options: add `YOUTUBE_API_KEY_2` (the function already
  rotates through both), reduce `batches`, or move the sweep to a low-traffic
  hour.
- `stop_reason: "yt_error"` with no quota flag → key/referer restriction or a
  YouTube outage. Check the raw status code in logs.
- `stop_reason: "fetch_error"` → the PostgREST candidate query failed; see §6.
- `checked` high but `hidden` 0 for days → healthy corpus, not a bug.

Manual run:

```bash
curl -sS -X POST "$SUPABASE_URL/functions/v1/sweep-embeddable?batches=5" \
  -H "x-cron-token: $INGEST_CRON_TOKEN" | jq
```

---

## 6. Diagnosing statement timeouts

Symptom: HTTP 500 from either worker with a Postgres message containing
`canceling statement due to statement timeout` (SQLSTATE `57014`), or a
`fetch failed 5xx` log line from `sbFetch`.

Most common causes, in order:

1. **`claim_visual_scan_batch` scanning too much** — the partial index on
   `visual_state` is bloated or missing after a large ingest. Check:

   ```sql
   explain (analyze, buffers)
   select * from curated_videos
   where is_archived = false and visual_state = 'unchecked'
   order by created_at limit 40;
   ```

   Fix: `reindex index concurrently <idx>;` or re-create the partial index.

2. **`apply_visual_verdicts` with a large payload** — reduce `batch` to 20.

3. **`curated_videos` PATCH on a 50-id `in.(...)` list contending with an
   ingest run** — retry; if persistent, lower `batches` so the sweep holds
   fewer locks per run.

4. **Autovacuum debt on `curated_videos`** after a bulk archive. Check
   `pg_stat_user_tables.n_dead_tup`; `vacuum (analyze) curated_videos;`.

Escalation: if a statement timeout persists for > 30 minutes across both
workers, treat it as a database-level incident (P1) rather than a worker bug —
check `/admin/ops-health` for whether user-facing functions (`feed`,
`surfaces`) are also degraded.

---

## 7. Verification after any fix

```bash
bun run test -- src/test/visual-safety-sweep.test.ts src/test/sweep-embeddable.test.ts
```

Then trigger one manual run of each worker (§4, §5) and confirm on
`/admin/ops-health` that the error ratio returns to 0 and the `unchecked`
backlog is shrinking again.
