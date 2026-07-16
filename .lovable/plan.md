
# Mobile-First Excellence Transformation

Heartify already ships a mobile foundation (BottomTabBar, safe-area class, KidsMode, PWA, Command Palette). This plan brings the mobile surface to a genuinely native-feeling, world-class bar without regressing desktop or removing features.

## 1. Mobile Experience Audit — Findings

Grouped by severity. Only issues that materially affect the 99% mobile user.

### Critical
1. **Top nav search bar takes ~50% of the header on phones** — `Navbar.tsx` renders the search input inline at all breakpoints. On <400px screens it crowds Menu, Notifications, and Upgrade CTA, and forces the keyboard on tap. Should collapse to a single search icon → full-screen search sheet.
2. **Slide-out menu is a 40+ item flat list** — heavy scrolling, no grouping, no search inside. Cognitive load is high; thumb reach to top items is poor. Needs sectioned groups + sticky search + "recent".
3. **No swipe-back / horizontal gestures** on watch, shorts, mushaf, reader. Users expect iOS/Android edge-swipe. Add a lightweight gesture layer (Framer Motion drag on `RouteTransition`) for back nav where safe.
4. **Modals used where bottom-sheets belong** — AddToPlaylistDialog, ReportButton, GiftDialog, SuggestContentDialog, NotInterestedMenu render as centered `Dialog`s on mobile. shadcn `Drawer` (vaul) exists in the project — switch these to Drawer < md.
5. **Bottom tab bar hides on many valuable routes** — `shouldShowBottomBar` currently strips it from too many pages (verify list). Immersive OK for /watch, /shorts, /mushaf; everywhere else it should remain, or users lose the spine.
6. **Video/watch page double-chrome** — sticky top navbar + bottom bar + player controls stack on small screens, cutting player area. Auto-hide top navbar on scroll-down for watch/shorts.

### High
7. **Forms not mobile-optimized** — missing `inputMode`, `autoComplete`, `enterKeyHint` on login/signup/search/contact/zakat/dhikr counter. Numeric fields don't invoke numeric keypad.
8. **Tap targets under 44px** in several icon-only Buttons (`size="icon"` = 36px). Global fix: add `min-h-11 min-w-11` to primary mobile icon buttons (BackToTop, ReportButton, comment reactions, follow, share).
9. **No pull-to-refresh** on feed pages (Home, Browse, For You, Notifications). Add via a small custom hook using touch events, only on primary content routes.
10. **Keyboard obscures inputs** — search modal, comment composer, dhikr goal input don't scroll into view when keyboard opens. Add `scrollIntoView({block:'center'})` on focus + `visualViewport` resize listener.
11. **Long lists not virtualized** — Channels, Creators, Bookmarks, Watch History, DuaWall, Adhkar, Glossary. Adopt `@tanstack/react-virtual` for lists >100 items to keep scroll at 60 fps on mid-range Android.
12. **Images not sized for mobile** — many `<img>` without `sizes`/`srcSet` and without `loading="lazy"`/`decoding="async"`. Extend `SmartImage` and enforce use.
13. **Safe-area gaps** — only bottom is handled (`pb-safe`). Left/right insets ignored on notched landscape iPhones for immersive routes; top inset ignored for `/shorts` full-bleed.

### Medium
14. **Route transitions are cross-fades** across every page — feels web-y. Use platform-appropriate slide-in for spine navigation (push) and modal-up for /watch, matching iOS/Material push.
15. **Typography scales identically at all sizes** — headings often too large on 360-390px widths, causing wrap. Introduce clamp() or a mobile step-down in tokens for `text-hero`, `text-display`, `text-h1`.
16. **Sticky headers overlap deep-link anchors** — partial fix landed via ScrollRestoration, but `scroll-margin-top` isn't set globally.
17. **Loading states inconsistent** — some routes flash white, others show PageSkeleton, others spinners. Standardize on PageSkeleton + skeleton cards for feed rows.
18. **Empty states missing on mobile-critical surfaces** — Bookmarks, Playlists, WatchLater, Followed Creators. `EmptyIllustration` component exists but is under-used.
19. **Command Palette (⌘K) is invisible to mobile users** — no discoverable entry point. Add a floating "Search everything" chip in the top nav on mobile that opens palette; palette itself needs mobile-friendly layout (full-screen sheet).
20. **Kids Mode toggle deeply buried** — should surface in bottom sheet from top nav for parents.

### Low
21. **Haptics only fire in a couple places** — `soundHaptics.ts` exists; hook into follow, favorite, streak increment, tab switch (subtle).
22. **App icon picker not surfaced on mobile** — hide from mobile web (PWA-only) or expose only when installed.
23. **Adhan test buttons play at desktop volume** — clamp mobile playback.
24. **Language switcher label truncates on small screens** — icon-only variant needed <sm.
25. **Copy density** — hero and card subtitles too wordy on 360px; tighten strings.
26. **`RouteTransition` runs `animate` on every route** — disable when `prefers-reduced-motion`.
27. **Bundle** — `Navbar.tsx` imports 40+ Lucide icons eagerly; tree-shake or lazy import icon set for the menu.

## 2. Desktop vs Mobile — Inconsistencies

| Area | Desktop today | Mobile today | Recommendation |
| --- | --- | --- | --- |
| Search | Inline input in navbar | Same, cramped | Icon → full-screen sheet on <md |
| Primary nav | Sheet + top bar | Sheet + bottom tabs | Keep both; make sheet grouped + searchable |
| Notifications | Bell dropdown | Bell dropdown | Convert to bottom Drawer < md |
| Add to playlist / Report / Gift / Suggest | Centered Dialog | Same | Drawer < md |
| Command palette | ⌘K discoverable | Hidden | Floating chip + `/` icon on mobile |
| Player | Standard | Standard | Auto-hide chrome, PiP on scroll, gesture seek |
| Long lists | Scroll fine | Junk on Android | Virtualize |
| Route transitions | Fade | Fade | Push slide on mobile, fade on desktop |

## 3. Prioritized Implementation Plan

### Phase M1 — Navigation & chrome (biggest UX wins)
- Collapse top navbar search to icon + full-screen SearchSheet on <md.
- Convert Notifications, AddToPlaylist, Report, Gift, Suggest, NotInterested, KidsMode toggle to shadcn `Drawer` on <md; keep `Dialog` on ≥md.
- Reorganize mobile menu: sticky search, grouped sections (Worship, Learn, You, Admin), recent-visited row, larger tap rows.
- Audit `shouldShowBottomBar`: bottom bar visible on all non-immersive routes; auto-hide top navbar on scroll-down for /watch and /shorts.
- Add floating "Search everything" pill (opens CommandPalette) inside bottom-safe-area on Home & Browse.

### Phase M2 — Native feel
- Add horizontal edge-swipe back gesture on non-tabbed routes via Framer Motion drag on `RouteTransition`.
- Replace cross-fade with push-slide transition on mobile spine navigation; keep fade on desktop and for reduced-motion.
- Wire haptics for tab switch, follow, favorite, streak, sheet open.
- Enforce 44×44 tap targets: audit `Button size="icon"` sites; add `min-h-11 min-w-11` variant.
- Fix safe-area on all sides for `/shorts`, `/mushaf`, `/watch`.

### Phase M3 — Input, forms, keyboard
- Add `inputMode`, `autoComplete`, `enterKeyHint` across all inputs (Login, Signup, ForgotPassword, Contact, Search, Zakat, DhikrGoal, CreatorApply).
- Focus-scroll-into-view helper triggered on `focus` + `visualViewport.resize`.
- Numeric fields → `inputMode="numeric"` + `pattern`; email → `inputMode="email"`.

### Phase M4 — Performance
- Virtualize Channels, Creators, Bookmarks, WatchHistory, DuaWall, Adhkar, Glossary, Search results with `@tanstack/react-virtual`.
- Wrap all `<img>` in `SmartImage` and add `sizes` presets (card, hero, avatar); enforce via lint rule.
- Preload LCP hero image per-route via `<link rel="preload">` injection in `SEO.tsx` when `heroSrc` provided.
- Lazy-load the Navbar mobile menu (`Sheet` content) — only mount on open.
- Split Lucide icon imports for the menu into a dynamic chunk.
- Add pull-to-refresh hook for Home, Browse, ForYou, Notifications.

### Phase M5 — Delight & polish
- Typography clamp() tokens for mobile scale-down.
- Global `scroll-margin-top` matching sticky header height.
- Empty states everywhere (Bookmarks, Playlists, WatchLater, Followed Creators, Search-no-results) using `EmptyIllustration`.
- Copy pass on hero/card subtitles for 360px.
- Kids Mode & language quick-toggle in a "Quick settings" Drawer from navbar.

### Phase M6 — Verification
- Playwright suite at 390×844 (iPhone) and 360×780 (Android) covering: navbar search sheet, drawer conversions, bottom-tab persistence, gesture back, pull-to-refresh, keyboard scroll-into-view, virtualized list scroll, form autocomplete/inputMode.
- Lighthouse mobile budget: LCP < 2.5s, CLS < 0.05, TBT < 200ms on Home, Browse, Watch, Today.
- Manual pass on real iPhone Safari + Android Chrome via BrowserStack script.

## 4. Rules I will follow
- No functionality removed. Every existing screen still reachable.
- Desktop untouched unless a shared component is refactored; in that case desktop path is preserved with breakpoint branching.
- All colors, spacing, radii through existing design tokens — no ad-hoc hex/px.
- Shadcn/Radix primitives kept for accessibility guarantees.
- Reduced-motion respected everywhere new motion is introduced.

## 5. What ships first
Phase M1 delivers ~70% of the perceived improvement (search sheet, drawers, cleaner menu, bottom-bar coverage, auto-hide chrome). I recommend starting there, then M2, then the rest.

Reply "go M1" (or a specific phase) and I'll implement.
