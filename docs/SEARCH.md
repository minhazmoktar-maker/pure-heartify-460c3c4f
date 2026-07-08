# Search architecture

## Goals
- Scale to hundreds of thousands / millions of videos.
- Typo-tolerant, fuzzy, synonym-aware, intent-aware.
- Pluggable backend: Postgres FTS + pg_trgm today; Meilisearch / Typesense / OpenSearch / Elasticsearch tomorrow with **no client changes**.
- Every hit passes the moderation pipeline (`moderation_state IN ('approved','auto_approved')`).

## Layers

```
Client (React)
  └─ useSmartSearch  ── POST /functions/v1/search ──▶ Edge Function
                                                       ├─ AI intent (Lovable AI, google/gemini-3-flash-preview) — fail-open, 1.2s budget
                                                       ├─ SearchProvider (env: SEARCH_PROVIDER)
                                                       │    ├─ postgres  → RPC public.search_videos (default)
                                                       │    ├─ meilisearch  (stub)
                                                       │    ├─ typesense    (stub)
                                                       │    └─ opensearch   (stub)
                                                       ├─ get_trending_searches / get_related_searches
                                                       └─ logs to search_queries (feeds trending + history)
```

The `SearchProvider` interface (`supabase/functions/_shared/search/types.ts`) is the swap point. Any new backend adds one file and one `case` in `providers.ts`.

## Ranking formula (Postgres provider)

```
rank = 0.45 * ts_rank(search_tsv, plainto_tsquery(q))
     + 0.25 * word_similarity(q, title|channel)     -- pg_trgm typo tolerance
     + 0.15 * trust_boost                            -- 1 if is_trusted_channel else 0
     + 0.10 * recency_boost                          -- linear decay over 3 years
     + 0.05 * halal_boost                            -- halal_score / 100
```

### Signal-by-signal

| Weight | Signal | Why |
| -----: | ------ | --- |
| 0.45   | Full-text rank | Primary relevance. Title(A) > Channel(B) > Category(C) via `setweight`. |
| 0.25   | Trigram similarity | Catches typos ("quraan"→"quran"), morphological variants, missing spaces. |
| 0.15   | Trust boost | Content on `is_trusted_channel = true` outranks equivalent untrusted matches. |
| 0.10   | Recency | Fresher videos win ties; linear decay so old classics still surface for niche queries. |
| 0.05   | Halal score | Fine-grain tiebreak — never dominates relevance. |

Match-type label (`fulltext` / `fuzzy` / `related`) is surfaced to the client for UI cues.

## Query rewriting

1. **Normalization** — NFKD, strip diacritics, lowercase, collapse whitespace (client + server).
2. **Synonyms** — `search_synonyms` table (`quran ↔ quraan/koran/...`, editable by admins). Provider expansion hook lives in each adapter; the Postgres provider gets it "for free" via trigram tolerance for common variants and via the AI-rewritten query.
3. **AI intent** — Lovable AI returns `{ rewrittenQuery, topic, category, channel, entities, language }`. When it names a category or channel we pass it as a hard filter; otherwise we pass `rewrittenQuery` as the query.

## Autocomplete

`public.search_autocomplete(prefix, limit)` unions:
- Title prefixes over approved videos.
- Channel prefixes over trusted channels.
- Historical queries from `search_queries` ranked by frequency.

The client debounces at 250 ms and caches for 15 s.

## Trending and related

- `get_trending_searches(limit, window_hours)` — top normalized queries in the window.
- `get_related_searches(query, limit)` — co-occurrence: other queries by users who also searched this one, last 30 days.

Both are `SECURITY DEFINER` and read-only. No user text is interpolated into SQL — only bound parameters.

## Data flow

- `curated_videos.search_tsv tsvector` — maintained by trigger `curated_videos_tsv_trg` on `BEFORE INSERT OR UPDATE OF title, channel_title, category`.
- GIN indexes: `search_tsv`, `title gin_trgm_ops`, `channel_title gin_trgm_ops`, plus `(is_trusted_channel, published_at DESC)`.
- Backfill for legacy rows: `supabase/functions/search-backfill` (admin-only, batched).

## Swapping backends

To move to Meilisearch:
1. Add `MeilisearchSearchProvider` implementing `SearchProvider`.
2. Register in `providers.ts`.
3. Set `SEARCH_PROVIDER=meilisearch` and provide `MEILI_URL` / `MEILI_KEY` secrets.
4. Stream `curated_videos` changes into the Meili index via a trigger → edge webhook, or a nightly reindex job.

Nothing in the client (`useSmartSearch`) or in the edge endpoint contract changes.

## Security

- Every search executes as the caller's role; `search_videos` is SECURITY DEFINER but selects only from `curated_videos` filtered to approved moderation states.
- `search_queries` inserts require `user_id IS NULL OR auth.uid() = user_id`.
- Autocomplete never leaks unapproved titles.
- AI intent detection is fail-open — a Gateway 429/402/timeout never blocks a search.
