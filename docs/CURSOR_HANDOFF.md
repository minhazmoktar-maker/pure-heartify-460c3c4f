# Cursor Handoff

Read in this order: this file → `ARCHITECTURE.md` → `KNOWN_LIMITATIONS.md` →
`NEXT_STEPS.md` → `PRODUCTION_CHECKLIST.md` → `DEPLOYMENT.md`.

## Mental model in 60 seconds

Heartify is a halal-first, ad-free discovery product optimized for **benefit per
minute**. Client is React 18 + Vite + Tailwind. Backend is Postgres + Edge
Functions on Lovable Cloud (Supabase under the hood). The moat is not the UI —
it is (a) a trigger-enforced halal floor, (b) a hash-chained attestation ledger,
(c) a concept knowledge graph, (d) T+90 benefit labels feeding the ranker.

## Where things live

```
src/pages/                     route components (lazy-loaded from src/App.tsx)
src/components/                UI; YouTubeVideoCard, InfiniteVideoGrid, CommentThread…
src/hooks/                     data access (useInfiniteFeed, useStreak, useDailyDose…)
src/contexts/                  PlayerContext, FeedDiversityContext
src/lib/                       halalGuard, shareImage, mcp tools
src/integrations/supabase/     GENERATED — never edit
supabase/functions/            54 edge functions
supabase/functions/_shared/    recommendations/, surfaces/, embed.ts, ai-gateway
docs/                          this documentation set + audit history
```

## Non-negotiable rules (violating these has broken production before)

1. **No `select *` on `curated_videos`.** The `embedding` column is 1536 floats.
   Always pass an explicit column list.
2. **No per-row write loops.** Bulk work goes through a set-based RPC. See
   `apply_video_embeddings(jsonb, text)` and `backfill_search_tsv(int)`.
3. **Scope `BEFORE UPDATE` triggers** on `curated_videos` with `UPDATE OF <cols>`.
   An unscoped trigger cost ~35 ms on every unrelated write and 8,411 s of
   cumulative DB time before it was fixed.
4. **Every new public table gets `GRANT`s in the same migration** as its RLS.
5. **Roles only in `user_roles`**, checked via `has_role()`. Never on `profiles`.
6. **Semantic tokens only** in components — no `text-white`, no hex literals.
7. **Halal floor is enforced in the database**, not the client. Keep it that way;
   channel reputation never overrides video-level rules.
8. **No advertising surfaces, ever.** Revenue = membership, waqf/sadaqah,
   institutional licensing, certificates.

## Useful queries

```sql
-- corpus health
select count(*) total,
       count(*) filter (where search_tsv is null) tsv_null,
       count(*) filter (where embedding is null)  emb_null
from curated_videos;

-- automation
select jobname, schedule, active from cron.job order by jobname;

-- hotspots
select calls, round(mean_exec_time) mean_ms, round(total_exec_time) total_ms, query
from pg_stat_statements order by total_exec_time desc limit 20;
```

## First things to do in Cursor

1. `npm install && npm run dev`.
2. Read `KNOWN_LIMITATIONS.md` — do not re-discover known blockers.
3. Pick up `NEXT_STEPS.md` item 1 (embedding backfill) once spend is approved.
4. Reset `pg_stat_statements` after your first deploy so performance numbers
   describe your code, not the project's history.
