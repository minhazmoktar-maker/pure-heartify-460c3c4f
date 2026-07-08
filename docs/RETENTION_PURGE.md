# Heartify — Retention Purge Runbook

_Last updated: 2026-07-08_

The nightly **`retention-purge`** edge function deletes rows past their configured TTL
from three high-volume tables and writes a durable audit trail to
`public.retention_purge_runs`.

Read this before wiring cron, investigating a missed run, or changing a policy.

---

## 1. What it does

For each row in `public.retention_policies`, the DB function
`enforce_retention_policies()` deletes rows older than `retention_days` from the matching table:

| Table                    | Default retention | Rationale                                                |
|--------------------------|------------------:|----------------------------------------------------------|
| `analytics_events`       | 90 days           | Product analytics — aggregate is what matters, not rows. |
| `search_queries`         | 180 days          | Powers "trending" + typo suggestions; older is noise.    |
| `recommendation_events`  | 180 days          | Powers CTR/dwell training signal.                        |

Change a TTL:

```sql
UPDATE public.retention_policies
   SET retention_days = 120
 WHERE table_name = 'analytics_events';
```

Every purge invocation writes **one** row to `public.retention_purge_runs`:

| Column          | Meaning                                                              |
|-----------------|----------------------------------------------------------------------|
| `id`            | UUID of the run.                                                     |
| `started_at`    | Job start (server clock).                                            |
| `finished_at`   | NULL for runs that crashed mid-flight (see §6).                      |
| `status`        | `running` \| `ok` \| `error`.                                        |
| `triggered_by`  | Value of `x-triggered-by` header, else user-agent (truncated 200).   |
| `purged`        | JSONB: `{ "analytics_events": 42, "search_queries": 17, ... }`.      |
| `total_rows`    | Sum of `purged` values (denormalised for cheap dashboards).          |
| `error_message` | First 2000 chars of the failure, or NULL.                            |
| `duration_ms`   | Wall-clock duration.                                                 |

Only admins and platform owners can read the table (RLS on
`retention_purge_runs`). The edge function uses the service role and bypasses RLS.

---

## 2. Cron wiring

Pick **one** of the two patterns below — do not run both.

### 2a. GitHub Actions (preferred)

`.github/workflows/nightly-reaudit.yml` (or a sibling workflow) hits the function
once per day. Add:

```yaml
- name: Retention purge
  run: |
    curl -fsSL -X POST \
      -H "x-cron-token: ${{ secrets.AUDIT_CRON_TOKEN }}" \
      -H "x-triggered-by: github-actions-nightly" \
      "$SUPABASE_URL/functions/v1/retention-purge"
```

The token is the `AUDIT_CRON_TOKEN` secret in the Supabase project — rotate it
alongside the rest of the audit stack.

### 2b. Supabase pg_cron

If you'd rather keep everything inside the DB:

```sql
select cron.schedule(
  'retention-purge-nightly',
  '0 3 * * *',   -- 03:00 UTC
  $$
  select net.http_post(
    url:='https://<PROJECT>.supabase.co/functions/v1/retention-purge',
    headers:='{"x-cron-token":"<AUDIT_CRON_TOKEN>","x-triggered-by":"pg_cron"}'::jsonb,
    body:='{}'::jsonb
  );
  $$
);
```

⚠️ pg_cron stores the token in a system table. Prefer GitHub Actions if the
project has strict secret-hygiene requirements.

---

## 3. Dry-run mode

You can invoke the function without deleting anything — useful for smoke tests
and staging validation:

```bash
curl -X POST \
  -H "x-cron-token: $AUDIT_CRON_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}' \
  "$SUPABASE_URL/functions/v1/retention-purge"
```

Behaviour:

- Opens an audit row, status transitions `running` → `ok`.
- Writes `purged = {"dry_run": true}`, `total_rows = 0`.
- Skips the RPC call entirely, so no rows are deleted.

Use this in CI on every PR that touches the function to catch regressions in
auth handling or the audit-row write path.

---

## 4. Interpreting `retention_purge_runs`

### Healthy day

```sql
SELECT started_at, status, total_rows, purged, duration_ms
FROM public.retention_purge_runs
ORDER BY started_at DESC
LIMIT 7;
```

Expect one `ok` row per day. `total_rows` will spike right after a policy
change or a large data-import event, then settle to a steady state.

### Fast admin queries

```sql
-- Last 30 days at a glance.
SELECT date_trunc('day', started_at)::date AS day,
       count(*) FILTER (WHERE status = 'ok')    AS ok,
       count(*) FILTER (WHERE status = 'error') AS errors,
       sum(total_rows)                          AS rows_purged
FROM public.retention_purge_runs
WHERE started_at > now() - interval '30 days'
GROUP BY 1 ORDER BY 1 DESC;
```

```sql
-- Any runs that never finished (process killed, timeout, etc).
SELECT id, started_at, triggered_by
FROM public.retention_purge_runs
WHERE status = 'running' AND started_at < now() - interval '1 hour';
```

### Missed nights

```sql
SELECT gs::date AS missing_day
FROM generate_series(now() - interval '30 days', now(), interval '1 day') gs
WHERE NOT EXISTS (
  SELECT 1 FROM public.retention_purge_runs
   WHERE started_at::date = gs::date AND status = 'ok'
);
```

If this returns rows, cron is broken — check the GitHub Actions history or
`select * from cron.job_run_details order by end_time desc limit 20;`.

---

## 5. Alerts

Configure **any two** of these; do not rely on a single signal.

| Signal                             | Threshold                                    | Tool               |
|------------------------------------|----------------------------------------------|--------------------|
| No `ok` row in the last 26 hours   | Page on-call                                 | Sentry cron / uptime |
| Any `error` row                    | Slack #ops                                   | Supabase log drain |
| `duration_ms > 60_000`             | Warn (index or lock contention)              | Grafana / metabase |
| `total_rows > 10 × 7-day median`   | Investigate — likely a policy change         | Metabase           |

---

## 6. Failure modes

### `status='running'` orphans

Process died between the initial `INSERT` and the final `UPDATE`. Safe to
delete manually after confirming no worker is still executing:

```sql
DELETE FROM public.retention_purge_runs
WHERE status = 'running' AND started_at < now() - interval '1 day';
```

Cron will produce a healthy row on the next tick.

### `status='error'`

`error_message` holds up to 2000 chars of the RPC failure. Common causes:

- Statement timeout on a huge `analytics_events` delete → shrink retention
  window incrementally rather than in one step, or add a partitioning strategy.
- Missing GRANT after a schema change → rerun the retention migration.
- `AUDIT_CRON_TOKEN` mismatch → function returns 401 before opening a run row;
  you will see cron 4xx, not an `error` row. Rotate the token via
  `secrets--update_secret`.

### Silent skip

If cron never fires there will be no row at all. Query in §4 catches this.

---

## 7. Local + CI verification

- **Unit tests** (Deno, stubbed client): `supabase/functions/retention-purge/index_test.ts`
  — 8 tests covering auth, dry-run, success, error, header capture, truncation,
  timing fields, and totals.
- **End-to-end SQL smoke** (manual — do not run against prod):

  ```sql
  -- Insert an old + a new analytics row, invoke the RPC, check counts.
  INSERT INTO public.analytics_events (event_name, created_at)
  VALUES ('retention-smoke-old', now() - interval '400 days'),
         ('retention-smoke-new', now());
  SELECT public.enforce_retention_policies();
  SELECT event_name FROM public.analytics_events
   WHERE event_name LIKE 'retention-smoke-%';
  -- Expected: only 'retention-smoke-new' remains.
  ```

- **Post-run assertion**: after the E2E smoke or a real cron tick, the newest
  `retention_purge_runs` row must have `status='ok'`, `finished_at IS NOT NULL`,
  `duration_ms > 0`, and a numeric `total_rows`.

---

## 8. When to change the schema

Adding a new tracked table? Update in one PR:

1. Add a row to `public.retention_policies`.
2. Add a `DELETE` branch to `enforce_retention_policies()` (same migration).
3. Add a Deno test asserting the new key appears in `purged`.
4. Redeploy the edge function — **no code change needed**; it just relays whatever
   the RPC returns.

Adding a new tracked table without steps 1-3 is a silent NOOP — the audit row
will still say `ok`, so operators must catch it in review.

---

## 9. Automated CI verification

Two GitHub Actions workflows keep the purge path healthy:

- **`.github/workflows/retention-purge-smoke.yml`** — nightly `dryRun` against
  staging. Verifies the function is reachable, the `AUDIT_CRON_TOKEN` is
  accepted, and a new `retention_purge_runs` row is created. Fails loudly if
  either the HTTPS cron path or the DB audit trail regresses.
- **`.github/workflows/retention-purge-staging-e2e.yml`** — weekly (and
  on-demand). Seeds throwaway old + fresh rows into every retention-managed
  table, runs the purge for real, and asserts:
  - old rows are gone,
  - fresh rows are preserved,
  - the audit row is `status='ok'` with `duration_ms > 0` and matching
    per-table counts in `purged`.

Required secrets (Repository → Settings → Actions → Secrets):

| Secret | Used by | Notes |
| --- | --- | --- |
| `STAGING_SUPABASE_URL` | both | `https://<ref>.supabase.co` (must NOT contain `prod`) |
| `AUDIT_CRON_TOKEN` | both | Same value as the edge function's `AUDIT_CRON_TOKEN` secret |
| `STAGING_SUPABASE_SERVICE_ROLE_KEY` | e2e only | Needed to seed + verify data |
| `STAGING_SUPABASE_ANON_KEY` | smoke only | For the read-back query |

The e2e test refuses to run if the URL string contains `prod` — extra guard
against accidental production data deletion.

---

## 10. Idempotent seed helpers (reciters, and future data)

Seeding curated content (reciters, aliases, and future reference data) uses
these helpers so re-running any migration is safe:

- **`public.upsert_reciter(...)`** — inserts by `canonical_name_en`, updates
  provided non-null fields on conflict. No duplicates possible.
- **`public.add_reciter_alias(reciter_id, alias)`** — inserts one alias,
  silently skips if the normalised form already exists globally.
- **`public.backfill_reciter_alias_variants()`** — regenerates the common
  transliteration variants (Al-/El-/As-/Ash-, sh/ch, ee/i, oo/u, hyphen
  strips, dh/z, gh/g) for every reciter. Safe to re-run anytime; skipped
  variants are cheap.

Pattern for future seed migrations (Qaris **or any other reference data**):

```sql
SELECT public.upsert_reciter(
  _name_en => 'Mishary Rashid Alafasy',
  _name_ar => 'مشاري راشد العفاسي',
  _country => 'Kuwait',
  _primary_riwayah => 'Hafs',
  _popularity_score => 95
) AS id \gset
SELECT public.add_reciter_alias(:'id', 'Meshary Alafasy');
SELECT public.add_reciter_alias(:'id', 'Mishari Rashid');
```

Then, at the bottom of the migration:

```sql
SELECT public.backfill_reciter_alias_variants();
```

Result: repeated runs neither duplicate reciters nor duplicate aliases, and
every canonical name gains its common misspellings automatically.
