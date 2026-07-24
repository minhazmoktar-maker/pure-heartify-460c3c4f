# W1 — Route Inventory (baseline)

Snapshot of `src/App.tsx` before any W1 milestone changes.

- **File LOC:** 843
- **Total `<Route>` / `<Navigate>` entries:** 509
- **Concrete page routes:** 181
- **Redirects (`<Navigate>`):** 309
  - **Structural (→ `/library/:slug`):** 286 — collapse candidates for **M3** (single catch-all + allow-list). No user-visible URL changes.
  - **One-off / legacy:** 23 — audited in `docs/w1-redirect-audit.csv` for **M4**.

## Bottom navigation (unchanged)

5 spines — `home`, `quran`, `prayer`, `dhikr`, `you` — per `src/lib/navigation.ts`. **No tab count change in W1.** The `dhikr → read + practice` split is deferred to W1.5.

## Milestone scope reminder

| Milestone | Touches routes? | Signals gate |
|---|---|---|
| M1 | No — docs only | — |
| M2 | Structure only (AppShell wrapper) | Deep-link tests |
| M3 | Structural redirect collapse, behavior-identical | Deep-link tests + 20-slug sample |
| M4 | Deletes only rows marked `REMOVE` in audit CSV | Full evidence matrix |
| M5 | Prunes nav entries pointing at M4-deleted paths | Full vitest + e2e |
| M6 | Verification & sign-off | Smoke + halal + deep-link |

## Redirect audit summary (from `docs/w1-redirect-audit.csv`)

- **KEEP:** 20 — active internal references, notification/email links, or docs pointing at them as canonical.
- **REMOVE:** 3 — `/pricing`, `/owner-profile`, `/mfa-verify`. Zero GSC impressions/clicks (last 90d), zero internal refs, not in sitemap, not share prefixes, not referenced by edge functions or marketing docs.
- **DEFER:** 0 — every non-library redirect has a confident verdict.

Only the 3 REMOVE rows will be deleted in M4. Every other one-off redirect stays.
