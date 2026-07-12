# Guarantee 100 videos per "For You" section + automated verification

## Goal
Every For You section renders exactly 100 unique halal videos on first load, after refresh, and after scroll — and this is verified by an automated test that fails loudly if any section falls short.

## Why the current build falls short
Verification earlier this session showed most rows landing between 2 and 85 videos. Three compounding causes:

1. `CuratedSectionRow` filters against a **global** `seenVideoIds` set from `FeedDiversityContext`, so later sections lose items that appeared in earlier ones.
2. `useCuratedSection` fetches at most `queryBudget` (1 or 3) of a section's queries and stops the moment it *hits* `maxResults` — no overfetch, no backfill when a topic is narrow.
3. The `feed` edge function returns a single page; the row never asks for more even when it received fewer than 100 items.

## What we'll build

### 1. Scope dedup to inside a section (not across sections)
`FeedDiversityContext` keeps its per-channel cap, but the cross-section `seenVideoIds` global set is removed from the "reach 100" path. Each section dedupes internally by `video.id` so it can still hit 100 even if adjacent rows use the same video. The channel cap stays (prevents one channel dominating a row).

### 2. Backfill loop in `CuratedSectionRow` until length === 100
Replace the current single-fetch flow with a loop that keeps pulling until the section has 100 unique videos or all sources are exhausted:

```text
target = 100
result = []
seen   = new Set()

// a) DB feed pagination
while result.length < target and feed.hasNextPage:
    page = feed.fetchNext()
    push unique + channel-capped items

// b) YouTube fallback across ALL section.queries (not just 3)
for q in section.queries:
    if result.length >= target: break
    ytVideos = fetchHalalVideos(q, perQuery=50)
    push unique + channel-capped + halalScore>=minScore items

// c) Adjacent-query backfill for narrow topics
if result.length < target:
    for q in ADJACENT_QUERIES[section.id] ?? GENERIC_HALAL_QUERIES:
        ytVideos = fetchHalalVideos(q, 50)
        push unique + channel-capped items (relaxed minScore floor, e.g. minScore-10)
        if result.length >= target: break

return result.slice(0, target)
```

Adjacent queries live in a new map in `src/data/adjacentQueries.ts`, keyed by section id, falling back to a shared `GENERIC_HALAL_QUERIES` list (e.g. "islamic reminder", "quran recitation", "seerah lecture", "halal podcast").

### 3. Update `useCuratedSection` to support backfill
- Remove the hard `queryBudget` cap of 1/3. Instead take an optional `desiredCount` and keep looping through `section.queries` until reached or exhausted.
- Deduplicate by `video.id` inside the hook.
- Keep the trust/halalScore sort, then slice to `desiredCount`.

### 4. Drive the DB feed to full pages
`useInfiniteFeed` already supports pagination. `CuratedSectionRow` will call `fetchNextPage()` in a `useEffect` while `videos.length < 100 && hasNextPage && !isFetchingNextPage`, with a safety cap (e.g. max 6 pages) to avoid runaway loops on empty sections.

### 5. Automated verification (Playwright + Vitest runner)
New test at `src/test/for-you-sections.e2e.test.ts` that:
- Logs in via injected Supabase session (`LOVABLE_BROWSER_*` env).
- Loads `/`, waits for For You.
- Scrolls to bottom, waiting for each section's loader to disappear.
- For each `<section>` inside `<main>`, reads `data-section-id` and `data-video-count` attributes we'll add to `CuratedSectionRow`.
- Asserts `count === 100` for every section, and asserts uniqueness by scraping `data-video-id` on each card and checking `Set(size) === 100`.
- Reloads once, re-asserts (covers "after refresh").
- Then scrolls the horizontal rail of one section end-to-end and re-asserts count is still 100 (covers "after scroll/pagination").

The test is skipped automatically when `LOVABLE_BROWSER_AUTH_STATUS !== "injected"` so CI without a session is a soft-pass. Run via `bunx vitest run src/test/for-you-sections.e2e.test.ts`.

### 6. Small DOM instrumentation
Add to `CuratedSectionRow`'s root `<section>`:
- `data-section-id={section.id}`
- `data-video-count={videos.length}`
- `data-loading={isLoading || backfilling}`

And on each card wrapper: `data-video-id={video.id}`. This is the stable contract the test relies on.

## Files touched

```text
src/contexts/FeedDiversityContext.tsx         # drop global seen set from filter path (keep for optional UX)
src/components/CuratedSectionRow.tsx          # backfill loop, in-section dedup, DOM instrumentation
src/hooks/useCuratedSection.ts                # remove query budget, add desiredCount + full dedup
src/data/adjacentQueries.ts       (new)       # per-section adjacent queries + GENERIC_HALAL_QUERIES
src/test/for-you-sections.e2e.test.ts (new)   # Playwright-driven verification
```

No backend/edge-function changes required — `feed` already paginates and caps at 100 per page, which is what we need.

## Acceptance criteria
- Every For You section renders exactly 100 videos on `/` after initial load.
- Same after a hard refresh (`location.reload()`).
- Same after horizontal scroll to the end of a section's rail.
- Every section's 100 IDs are unique (no in-section duplicates).
- The new automated test passes locally and prints per-section counts on failure so regressions are immediately diagnosable.
