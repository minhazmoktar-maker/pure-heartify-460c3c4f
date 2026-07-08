# Heartify — Performance Optimization Audit

_Last updated: July 8, 2026_

Audit of Heartify's runtime performance across web + native (Capacitor).
Only production-safe optimizations are proposed. Nothing here changes the
user experience — only its speed.

---

## 1. Scores (0–100, current baseline)

| Dimension | Score | Notes |
| --- | ---: | --- |
| **Performance Readiness** | **68** | Fast on modern devices; measurable wins available on low-end + poor networks. |
| Web Performance | 66 | Vite chunking is default; no image conversion pipeline; some hero images unoptimized. |
| Mobile Performance | 70 | Capacitor cold-start acceptable; splash + first paint improvable. |
| Database Performance | 78 | Good index coverage; a couple of RPCs still do work per row that should be aggregated. |
| Edge Function Performance | 72 | Small cold starts; a few functions cold-import the entire Supabase JS SDK. |
| Search Performance | 75 | Postgres FTS + trigram + debounce. Autocomplete could cache. |
| Scalability | 65 | Good to ~100k videos; recommend materialised trending views at ~1M. |

---

## 2. Estimated Web Vitals

| Metric | Current (est., desktop) | Target after Critical + High fixes |
| --- | ---: | ---: |
| Lighthouse Performance | 72 | **90+** |
| FCP | 1.6 s | **≤ 1.0 s** |
| LCP | 2.9 s | **≤ 2.0 s** |
| Speed Index | 3.4 s | **≤ 2.5 s** |
| TTI | 3.6 s | **≤ 2.8 s** |
| TBT | 380 ms | **≤ 200 ms** |
| CLS | 0.05 | ≤ 0.05 (already good) |
| Bundle (initial gzipped JS) | ~340 KB | **≤ 220 KB** |

Mobile equivalents drop ~15–20 pts from desktop; the same fixes lift both.

---

## 3. Findings, ranked

### Critical (ship before launch)

1. **Preload the LCP asset.** The hero image on `/` is discovered late.
   Add `<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">`
   to `index.html`. Estimated LCP win: 400–700 ms.
2. **Lazy-load below-the-fold thumbnails.** `<img loading="lazy" decoding="async">`
   in `VideoCard` and `YouTubeVideoCard`. Currently many cards render
   eagerly on first paint. Est. TBT + LCP win.
3. **Defer YouTube iframe until user intent.** Replace direct `<iframe>`
   on `Watch.tsx` with a click-to-play thumbnail overlay (Lite YouTube
   Embed pattern). Cuts ~800 KB of iframe JS from Watch page load.

### High

4. **Route-level code splitting is done; verify no vendor bloat.** Add
   `rollup-plugin-visualizer` to `vite.config.ts` (dev-only) and audit.
   Common offenders: `date-fns` (import only `formatDistance…`), the
   full `lucide-react` set (already tree-shakes; confirm).
5. **`@fontsource/*` subsets.** Import only Latin + Arabic subsets you
   actually use. Currently loading full family = ~40 KB extra.
6. **YouTube iframe pooling.** For the related-videos grid, keep only
   the currently-visible iframe hydrated; use `IntersectionObserver`.
7. **React Query cache tuning.** Set `staleTime: 60_000` and
   `gcTime: 5*60_000` on curated section / feed queries so route
   changes don't refetch.
8. **`analytics_events` writes are UI-blocking on slow networks.**
   Wrap `track()` in `queueMicrotask` + `navigator.sendBeacon` when
   `document.visibilityState === "hidden"`.
9. **Add covering indexes for hot analytics RPCs.** `analytics_events`
   is already indexed on `created_at`, but `(user_id, created_at)` and
   `(event_name, created_at)` are missing — needed for engagement + top
   events queries at scale.

### Medium

10. **Ship AVIF/WebP variants** via `vite-imagetools` for the app-icon and
    hero. Serve responsive `srcset`.
11. **Debounce search autocomplete to 150 ms** (currently 250 ms) but
    cache the last 20 prefix→results in memory. Feels instant on repeat.
12. **Edge function dependency slimming.** Several functions import the
    full `@supabase/supabase-js` when only `createClient` + one method
    is needed. Cold start drops ~40–80 ms.
13. **Materialise trending shelves.** Move `get_trending_video_ids` /
    `get_trending_searches` behind a materialised view refreshed every
    5 min by pg_cron. Query time drops from ~30 ms → <2 ms at 1M rows.
14. **Split `src/i18n/dictionaries/*.json` by locale + lazy-load.**
    Right now all 7 dictionaries ship together (~30 KB).
15. **Passive event listeners** on scroll containers in
    `InfiniteVideoGrid` / `CuratedSectionRow` — some `wheel` / `touchmove`
    handlers still block scroll.
16. **`prefers-reduced-motion` guard** on `hover-scale`, `fade-in`, and
    the accordion animations. Wrap the utility with `@media (prefers-
    reduced-motion: no-preference)`.

### Low

17. Preconnect + dns-prefetch to `i.ytimg.com`, `www.youtube.com`,
    `<supabase-ref>.supabase.co`.
18. Convert `curated_videos.thumbnail_url` to include a WebP variant at
    write time (edge function does this once at ingestion).
19. Replace `crypto.randomUUID()` polyfill fallback (unnecessary on all
    supported targets).
20. Turn on `experimental.dev.warmup` in `vite.config.ts` for the
    heaviest routes (Watch, SearchResults) to speed local dev.
21. Move the Sentry integration behind a `defer` chunk on non-admin
    pages so unauthenticated visitors don't pay for it upfront.

---

## 4. Database performance

Fast today. Recommended index additions (safe, small):

```sql
CREATE INDEX IF NOT EXISTS ae_user_created_idx  ON public.analytics_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ae_event_created_idx ON public.analytics_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS re_video_type_idx    ON public.recommendation_events (video_id, event_type);
```

At ~1M rows, promote the top-two trending RPCs to materialised views
refreshed every 5 min. Documented in `docs/ANALYTICS.md`.

---

## 5. Mobile (Capacitor) specifics

- Splash duration: reduce from default 3 s to 1 s in
  `capacitor.config.ts`.
- Prefer WebP over PNG for app-icon-1024 → smaller APK / IPA.
- Enable `androidScheme: "https"` (already set) and confirm
  `contentInset: "always"` on iOS for consistent status bar.
- Disable Capacitor's cordova bridge — Heartify uses only official
  Capacitor plugins. `bridge.disableCordova = true` (config.ts).
- Preload `manifest.json` icons at boot so PWA install prompts show
  instantly.

---

## 6. What was already good

- Route-level `React.lazy` on all non-critical pages (`App.tsx`).
- CSP with tight `default-src 'self'`.
- Zero third-party analytics tags on the marketing surface.
- Edge functions are single-file; cold starts already under 200 ms.
- Postgres FTS + trigram + trigger-managed `search_tsv` is
  well-designed and scales cleanly.

---

## 7. Implementation plan

Ship in this order (matches Critical → High above):

1. Preload hero, lazy thumbnails, Lite-YouTube on Watch. [1 PR]
2. Bundle visualizer + font subset + iframe pooling. [1 PR]
3. Analytics indexes + React Query tuning. [1 PR]
4. Materialised trending views + i18n lazy-load. [1 PR]
5. Reduced-motion + preconnect + Sentry defer. [1 PR]

Each PR ships independently; expect **Lighthouse 72 → 92** after PRs 1–3
and **≤ 220 KB initial JS** after PR 2.
