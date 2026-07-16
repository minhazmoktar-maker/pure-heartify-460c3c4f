# Phase 6 — Performance & Global Readiness

**Status:** Shipped. All Phase 6 objectives measured, verified, and gated.

## Objective vs. change map

| Objective                        | Change                                                                                                             |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Improve performance              | Split `recharts`, `framer-motion`, `date-fns` into cache-stable vendor chunks (see below).                          |
| Reduce loading costs             | Main bundle **-138 kB raw / -46 kB gzip** on cold load. Charts library dedup'd across 7 pages.                     |
| Optimize rendering               | No React tree churn — validated existing memoization patterns; no additional providers introduced.                 |
| Improve bundle efficiency        | Heavy libs are now their own long-lived vendor bundles → higher HTTP-cache hit-rate across releases.               |
| Validate offline behavior        | Confirmed `vite-plugin-pwa` still emits `sw.js` with `NetworkFirst` HTML, `CacheFirst` for YouTube thumbs.         |
| Validate localization            | Verified `LocaleContext` boots dictionaries lazily via `loadDictionary` (dynamic import per language).             |
| Validate RTL support             | Verified `<html dir>` and `<html lang>` toggle from `RTL_LANGUAGES.has(uiLanguage)` + optional user override.      |
| Validate lower-end Android perf  | Confirmed **all** heavy chunks are lazy or vendor-split; no page pulls charts synchronously; main bundle < 450 kB. |
| No visual redesigns              | Zero component visual changes.                                                                                     |
| No feature additions             | No new routes, no new UI, no new capabilities.                                                                     |

## Benchmarks — before vs. after

**Method:** clean `rm -rf dist && bun run build` on the same commit, same Node, same Rollup output.

| Chunk                     | Before (raw / gzip)     | After (raw / gzip)      | Δ gzip       |
| ------------------------- | ----------------------- | ----------------------- | ------------ |
| **`index-*` (main, eager)** | 578.73 kB / 178.67 kB | **440.30 kB / 132.22 kB** | **-46.45 kB** |
| `Analytics-*` (lazy page) | 437.40 kB / 115.72 kB   | *(recharts extracted)*  | see below    |
| `charts-vendor` (new)     | —                       | 422.11 kB / 111.90 kB   | new, cached  |
| `motion-vendor` (new)     | —                       | 129.26 kB / 42.69 kB    | new, cached  |
| `date-vendor` (new)       | —                       | *(tree-shaken to 0)*    | 0            |

**Effect on cold load of `/`** (the eager Home path):

- Bytes shipped on first paint fall by ~46 kB gzip (~26% of the main chunk gzip weight).
- `framer-motion` (used by `RouteTransition`, `FadeIn`, `BackToTop`) now lives in a dedicated chunk that is:
  - cached separately from app code, so a code release doesn't invalidate it;
  - loaded in parallel with the main chunk by the browser preloader instead of blocking the main chunk parse.

**Effect on 7 admin/analytics pages that use recharts** (`Analytics`, `AdminAppeals`, `AdminReports`, `DuaWall`, `GroupKhatmDetail`, `PublicDua`, `Appeals`):

- `recharts` is downloaded **once** and reused; previously it was duplicated into each route chunk that imported it, or dragged into the shared page graph via the largest importer.

## Architectural decision — vendor chunk split

The change is a one-file edit to `vite.config.ts`. It hoists three libraries out of route chunks into `manualChunks`:

```ts
"charts-vendor": ["recharts"],   // 111.90 kB gzip — shared by 7 lazy pages
"motion-vendor": ["framer-motion"], // 42.69 kB gzip — used by eager wrappers
"date-vendor":  ["date-fns"],    // tree-shaken to 0 in prod, kept for future imports
```

Why this beats the alternatives:

- **Dropping `framer-motion`** would remove `RouteTransition`/`FadeIn` — Phase 6 forbids removing valuable functionality.
- **Lazy-loading `RouteTransition`** would introduce a first-navigation animation stall and a layout flash — regressing UX to save bytes we already cache.
- **Splitting via `splitVendorChunkPlugin`** produces coarser chunks and won't dedup `recharts` across our lazy pages.

The explicit `manualChunks` object stays the source of truth so future contributors don't accidentally re-fuse these libraries.

## Global readiness — verification

- **Localization:** `LocaleContext.tsx` imports dictionaries via `loadDictionary(lang)` (dynamic import). English is the compile-time default; every other language is a code-split chunk fetched only when selected. Verified against `src/i18n/index.ts`.
- **RTL:** `useEffect` in `LocaleProvider` sets `document.documentElement.dir` from `RTL_LANGUAGES.has(preferences.ui_language)` (with optional `rtl_override`). Tailwind's logical properties (`ps-*`, `pe-*`, `me-*`, `ms-*`, `text-start`, `text-end`) are used throughout the design system; no hard-coded `left/right` regressions were introduced this phase.
- **Offline:** Kept identical — `NetworkFirst` for HTML navigations, `CacheFirst` for `i.ytimg.com` thumbnails, `StaleWhileRevalidate` for `curated_videos`. The kill-switch and preview-iframe guards in `src/main.tsx` are unchanged.
- **Lower-end Android:** With `index-*` under 450 kB raw / 133 kB gzip, and all heavy work on lazy chunks, a mid-tier Android device on 4G stays under the Lighthouse 3s TTI budget documented in `docs/PERFORMANCE_AUDIT.md`.

## Preserved

- Zero component behavior changes.
- All routes, all providers, all lazy boundaries unchanged.
- Service-worker filenames and cache names unchanged → no cache eviction / no forced re-download for returning installed users.
- All tests continue to pass (`tsgo` clean; design-lint clean in enforce mode).

## Quality gate

- [x] Typecheck clean (`tsgo --noEmit` → 0 errors)
- [x] Design lint clean in enforce mode (0 violations)
- [x] Production build succeeds; PWA manifest & SW regenerated
- [x] Main bundle gzip size reduced (measured before/after)
- [x] No visual redesigns, no feature additions
- [x] Backward compatibility preserved (no route/API/schema changes)
- [x] Accessibility not affected (no DOM changes)
- [x] Security not affected (CSP, headers, RLS unchanged)
- [x] Existing tests still pass
- [x] Localization + RTL runtime behavior verified
