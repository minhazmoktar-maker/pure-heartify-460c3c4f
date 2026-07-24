# W1 (Revised) — Route & Redirect Consolidation Only

**Scope change from original W1:**
- **Keep 5 tabs.** No `dhikr → read + practice` split. IA changes are deferred to a separate workstream (W1.5) after usability validation.
- **Evidence-gated redirect removal.** No redirect is deleted on a single signal. Multi-signal validation required.

Everything else is pure technical refactor: safer, reversible, no user-visible taxonomy change.

---

## Guardrails (apply to every milestone)

- Stop and wait for approval between milestones.
- Per milestone: `tsgo` typecheck → `bun run lint` → `bunx vitest run` (targeted where possible, full on integration milestones) → deep-link e2e where relevant.
- No route is deleted without a 301 redirect **or** proof of zero usage across all applicable signals below.
- 5-tab bottom nav (`home / quran / prayer / dhikr / you`) is untouched.

### Redirect-removal evidence matrix

A redirect may only be removed when it is either
(a) covered by a broader surviving redirect (structural — e.g. topic slug already caught by `/:slug → /library/:slug`), **or**
(b) confirmed unused across every applicable signal:

| Signal | Source | Threshold |
|---|---|---|
| Search Console impressions (90d) | GSC connector | 0 impressions AND 0 clicks |
| Analytics pageviews (90d) | `analytics.page_views` (if present) | 0 hits |
| Internal links | `rg` across `src/`, `public/`, `docs/`, `supabase/` | 0 references |
| Sitemap references | `public/sitemap.xml` + `public/sitemaps/*.xml` | not listed |
| Notifications & emails | `supabase/functions/**`, `src/lib/notify.ts`, email templates | not referenced |
| Public share links | `src/lib/share.ts`, share route patterns in `navigation.ts` | not a share prefix |
| Marketing/store copy | `docs/STORE_LISTING.md`, `docs/STORE_SUBMISSION_TEMPLATES.md`, `public/llms.txt` | not referenced |

Signals that don't exist for a given route (e.g. no email touch) are marked N/A, not passing.

Output of the audit is a checked-in CSV (`docs/w1-redirect-audit.csv`) with one row per candidate redirect and a verdict: `KEEP`, `REMOVE`, or `DEFER`. Only `REMOVE` rows are touched in code.

---

## Milestones

### M1 — Baseline & audit (no code changes to routes)
- Inventory: dump every `<Route>` and `<Navigate>` from `src/App.tsx` into `docs/w1-inventory.md`.
- Build the redirect audit CSV using the matrix above. Pull GSC data via the connector; grep the repo for the other signals. Flag anything ambiguous as `DEFER`.
- Deliverable: two docs, zero code changes to routes.
- Checks: typecheck + lint (should be no-ops).
- **Stop for approval.**

### M2 — AppShell extraction (pure refactor, no route changes)
- Introduce `src/components/AppShell.tsx` wrapping `<Navbar />`, `<Outlet />`, `<BottomTabBar />`, and existing global providers currently hand-wired around routes.
- Convert top-level `<Route>` entries to children of one shell route. No route paths change. No components merge.
- Update `src/lib/navigation.ts` only if a helper needs the new layout (expected: none).
- Checks: typecheck, lint, `src/lib/__tests__/navigation.test.ts`, `src/test/deep-links.test.tsx`, one full `bunx vitest run`.
- **Stop for approval.**

### M3 — Structural redirect collapse (safe, mechanical)
- Replace the ~200+ per-slug `<Navigate to="/library/:slug">` entries with a single catch-all `<Route path=":slug" element={<LibrarySlugRedirect />}>` guarded by an allow-list derived from `src/data/*`. Behavior identical; source shrinks.
- No user-visible URL changes. Every previously-redirecting URL still 301s to the same destination.
- Checks: typecheck, lint, deep-link tests, add a new test asserting a sample of 20 legacy slugs still redirect correctly.
- **Stop for approval.**

### M4 — Evidence-approved redirect removal (only CSV `REMOVE` rows)
- Delete only the redirects marked `REMOVE` in `docs/w1-redirect-audit.csv` from M1.
- For each removed redirect, add a row to `docs/w1-removed-redirects.md` (path, destination it used to point at, signals reviewed, date).
- Checks: typecheck, lint, deep-link tests, `bunx vitest run`.
- **Stop for approval.**

### M5 — Navigation architecture cleanup (no tab changes)
- Tighten `src/lib/navigation.ts`: remove `owns` patterns for any route deleted in M4; keep all 5 spines and their labels.
- Ensure `resolveSpine`, `isSystemRoute`, `shouldShowBottomBar`, and `spinePath` still cover 100% of surviving routes (extend `navigation.test.ts` with a full-coverage assertion).
- Prune unused menu entries in `src/components/Navbar.tsx` that point at routes deleted in M4. No re-grouping.
- Checks: typecheck, lint, full `bunx vitest run`, deep-link e2e.
- **Stop for approval.**

### M6 — Verification pass
- `docs/w1-summary.md`: LOC deltas, route count before/after, redirect count before/after, bundle-size delta for `App.tsx` chunk, Lighthouse spot-check on `/`, `/quran`, `/listen`.
- Confirm no regressions in `tests/e2e/smoke.spec.ts`, `tests/e2e/halal-only-surfaces.spec.ts`, `src/test/deep-links.test.tsx`.
- **Stop for approval before closing W1.**

---

## Explicitly out of scope (deferred)

- Merging `dhikr` into `read` + `practice`, or any bottom-tab count change → **W1.5**, gated on usability validation.
- Any Home hero / RitualCard work → **W2**.
- Push cadence changes → **W3**.
- Editor's Pick / share templates → **W4**.

## Risk & rollback

- Each milestone is a single logical change. Revert = revert that milestone's commit.
- M3 and M4 are the only user-facing risk surfaces; both are guarded by the deep-link test suite and (for M4) the multi-signal audit CSV.
- No database, RLS, edge-function, or auth changes in W1.

## Technical notes

- Route data still lives in `src/App.tsx` and `src/lib/navigation.ts`. No new routing library.
- `AppShell` uses React Router's nested-route `<Outlet />`; no behavior change for `useNavigationState`, `smartBack`, or existing scroll restoration.
- The M3 catch-all lives *after* every real route so it can't shadow them; allow-list prevents it from swallowing typos into a redirect loop.
