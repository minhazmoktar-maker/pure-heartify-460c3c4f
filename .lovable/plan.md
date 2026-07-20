# Heartify — Ranked Backlog (from first-time-user critique)

Ordered by *return-visit impact ÷ effort*. Each item has the measurable user benefit it moves.

| # | Item | Impact | Effort | Metric it moves |
|---|------|--------|--------|-----------------|
| 1 | **Kill debug telemetry on all public rails** (`pool=80 · took=793ms · ch=17…`) | H | XS | Trust, perceived polish |
| 2 | **"Today" hero density pass** — collapse 4 stacked cards into one calm above-the-fold "Right now" block (next salah + streak inline, verse as quiet secondary, daily-dose as row 2) | H | S | D1/D7 return, LCP hierarchy |
| 3 | **Rail count on Home: 11 → 5** (Continue · For you · Recently added · Trending · Listen) — the rest live behind "Browse all" | H | S | Session depth, scroll fatigue ↓ |
| 4 | Empty-state rails must never render as skeletons that resolve to nothing — hide or replace with 1 real editorial card | H | S | "Feels alive" |
| 5 | Signed-out home: replace bottom `HeroSection` marketing with a **single sample video + one-sentence promise**; move the rest to `/about` | M | S | Signup lift |
| 6 | **First-run ≤ 60s**: 3 taps (language · one interest chip · Dhikr or Quran) → straight to content. No DOB, no permissions, no notification asks | H | M | Activation |
| 7 | Push permission: never on cold start; ask after first completed dhikr OR first video finish (already have `PushPermissionPrompt` — enforce trigger) | M | XS | Permission grant % |
| 8 | Bottom tab bar: label typography down to `text-micro`, active state = gold underline (1 accent rule), remove tab shadow | M | XS | Craft |
| 9 | Cookie toast: hide entirely after first scroll on all routes (currently only >120px) — make it "self-dismissing on any intent" | L | XS | Fold cleanliness |
| 10 | Verse of Day: add "Continue where you left off in Al-Baqarah" if user has Quran history — otherwise stays as-is | M | S | Quran DAU |
| 11 | Video card: drop channel initial avatar chip when a real channel thumbnail exists; tighten metadata to one line | M | S | Scan speed |
| 12 | Search: elevate "Recently searched" + "Try: [3 chips]" instead of blank state | M | S | Search usage |
| 13 | Dhikr: haptic on 33/66/99, quiet celebrate on 100; keep silent between | L | XS | Delight |
| 14 | Prayer: show "You've prayed 3/5 today" chip above next-salah countdown | M | S | Return frequency |
| 15 | Settings: consolidate 3 notification screens into one matrix | M | M | Clarity |
| 16 | Offline banner: swap to a 1-line inline strip under Navbar instead of floating pill | L | XS | Craft |
| 17 | Home footer: shorten to `Privacy · Terms · Trust` — trim 5 links to 3 | L | XS | Density |
| 18 | Trust page: pin "Moderation at a glance" numbers to the top with a last-updated timestamp | M | XS | Trust |
| 19 | Preload the first video thumbnail on Home (fetchpriority already set — add `<link rel=preload as=image>` for card-0 URL when known) | M | M | LCP |
| 20 | Replace generic "Nothing to show yet" copy globally with domain-specific empty states via existing `EmptyState` component | M | S | Warmth |

---

## Focused execution — Top 3

### 1. Kill debug telemetry on public rails
- `SurfaceRail` / `CuratedSectionRow` render diagnostic strings (`pool=… took=…ms · ch=… · cats=… · fresh=…%`) as a subtitle when data returns. Gate that entire line behind `import.meta.env.DEV || localStorage.getItem('heartify.debug') === '1'`.
- Grep for the format tokens (`took=`, `pool=`, `fresh=`) and remove from anything shipped to end users.
- Keep them visible on `/admin/rec-health` and behind the debug flag.

### 2. "Today" hero density pass
- `src/components/TodayHero.tsx`: merge the 4-card stack into one card:
  - Row 1: next salah countdown (left, primary) + streak flame (right, compact).
  - Row 2: verse of day as a quiet text block, no card chrome.
  - Row 3: 3 daily-dose thumbnails as a compact carousel (already lazy).
- One elevation (`shadow-e1`), one radius (`rounded-card`), 32px vertical rhythm, gold used only on the streak flame.
- Removes the "wall of cards" first impression; keeps every action.

### 3. Home rail count 11 → 5
- `src/pages/Index.tsx`:
  - Signed-in visible: `continue_watching`, `for_you`, `recently_added`, `trending`, `listen`.
  - Move `because_you_watched`, `new_videos`, `popular_this_week`, `hidden_gems`, `new_channels`, `browse` behind a single **"Browse all"** section that renders on demand (button expands, or link to `/browse`).
  - Signed-out visible: `trending`, `recently_added`, `listen` — the rest collapse the same way.
- `InfiniteVideoGrid` at the bottom stays — it's the endless-explore surface.

## Technical notes

- No schema changes. No new edge functions. All three fixes are frontend-only.
- Design tokens already exist; no `index.css` / `tailwind.config.ts` edits needed.
- Debug flag: `localStorage.heartify.debug = '1'` reveals telemetry — document in `docs/APP_GUIDE.md`.
- Rail-collapse should preserve deep links: `/section/:surface` routes remain, so "Browse all" is discovery-safe.

Approve to build, or tell me to reorder / swap items in / out.
