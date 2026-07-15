# Heartify Information Architecture (Phase 2)

**Status:** Locked v1. Source of truth: `src/lib/navigation.ts`.

## The product spine — 5 tabs

Every one of the app's 190+ routes maps to exactly one of five top-level spines. This is the mental model users carry between sessions.

| Spine      | Path        | Everything under it                                                             |
|------------|-------------|----------------------------------------------------------------------------------|
| **Home**     | `/`         | Feed, Today, Search, Section detail, share landings (weekly recap, badges, streaks) |
| **Watch**    | `/channels` | Channels, Shorts, playlists, video detail, creator hub                          |
| **Practice** | `/prayer`   | Prayer / Qibla, Quran, Mushaf, Dhikr, Adhkar, Salah tracker, Khatm, Ramadan, Zakat, Sadaqah, wird, streaks, teams — everything you *do* daily |
| **Learn**    | `/learn`    | Library, Hadith, Seerah, 99 Names, scholars, prophets, sahaba, sciences, fatwa, quiz, stories, halal-check, all knowledge encyclopedias |
| **You**      | `/profile`  | Profile, bookmarks, achievements, weekly recap, notifications, offline, Plus, changelog, appeals, transparency |

**System surfaces** (auth, admin, legal, OAuth consent) are routed but sit outside the spine tabs — they still resolve to a home spine for the smart-back button.

## Design decisions

1. **Consolidation via nesting, not deletion.** All 191 pages remain routable at their existing URLs. Nothing is removed. The IA is a *view* over the existing router.
2. **One tab per surface, unambiguously.** No route belongs to two spines. `resolveSpine()` walks the map in order and returns the first match.
3. **Immersive routes hide the bar.** Watch, Shorts, Mushaf, and auth flows go full-bleed. `shouldShowBottomBar()` centralises that rule.
4. **URL is state.** Filters, tab selection, and search query live in query params so back/forward, refresh, and share all Just Work. See `useNavParam` / `useNavParamList`.
5. **Back always leads somewhere.** `SmartBackButton` prefers browser history, then falls back to the spine's root — no dead-end back button ever.

## Deliverables shipped in Phase 2

| Artifact | Purpose |
|---|---|
| `src/lib/navigation.ts` | Spine taxonomy (5 tabs) + route-to-spine map + system route list |
| `src/components/BottomTabBar.tsx` | Mobile bottom nav rendering the spine |
| `src/components/ScrollRestoration.tsx` | Preserves scroll on POP, resets on PUSH, keeps position on REPLACE |
| `src/components/SmartBackButton.tsx` | Back button with spine-root fallback |
| `src/hooks/useNavigationState.ts` | URL-backed filter/tab state — `useNavParam`, `useNavParamList` |
| `src/lib/__tests__/navigation.test.ts` | Spine coverage & routing rule tests |

## What did NOT change

- The router in `src/App.tsx` (all `<Route>` entries preserved verbatim, including 200+ legacy `/topic → /library/topic` redirects).
- The desktop `Navbar` (kept intact — the bottom bar is additive, mobile-only).
- Individual page components — no page markup was rewritten.

## How to use it

**Add a new route:**
1. Register the route in `App.tsx` as usual.
2. Add its pattern to the appropriate spine's `owns` array in `src/lib/navigation.ts`.
3. Add a matching assertion in `src/lib/__tests__/navigation.test.ts`.

**Use URL-backed state instead of `useState`:**
```tsx
const [tab, setTab] = useNavParam("tab", "overview");
```
Refresh, back, and share all preserve the selected tab.

**Replace ad-hoc `navigate(-1)`:**
```tsx
<SmartBackButton />
```
Deep-links no longer land users on a broken "Back" that closes the tab.

## Phase 3+ handoffs

- **Redundant routes** (`/premium → /plus`, admin sub-routes → `/admin/console`) already exist as redirects but should be reviewed for a single canonical top-level "Admin" landing in a later phase.
- **Persistent app shell layout** (nested `<Outlet />` per spine) is intentionally *not* introduced in Phase 2 to avoid touching 191 pages. A future phase can migrate routes into an `<AppShell><Outlet/></AppShell>` layout without changing IA.
- **Desktop side rail** consuming the same spine map can replace the mobile bar's role on wide viewports without a second source of truth.

## Guardrail

`bunx vitest run src/lib/__tests__/navigation.test.ts` must pass. Any change to the spine map runs its assertions.
