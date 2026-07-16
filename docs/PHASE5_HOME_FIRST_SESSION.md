# Phase 5 — Home & First Session

**Status:** Shipped. All Phase 5 objectives verified against a locked design system.

## What changed

### 1. First-session detection (shared source of truth)

- New hook `src/hooks/useOnboardingStatus.ts` reads `profiles.onboarding_completed_at` and `user_interests.primary_interest` in a single React Query (5-min staleTime). Returns a fine-grained checklist (`hasDisplayName`, `hasAvatar`, `hasBio`, `hasInterests`, `hasReciter`, `hasReminderHour`) plus a normalized `completeness` score.
- One query, three surfaces (Home banner, Profile card, future Nav badge). No duplicated fetches.

### 2. Home — first-session card (`src/components/FirstSessionCard.tsx`)

- Renders only for signed-in viewers whose onboarding is not yet complete.
- Placed above `DailyDoseHero` so activation is the first personalized surface a new viewer sees.
- Session-scoped dismissal (`sessionStorage`) — never nags twice in a session, but returns on the next app open until onboarding actually completes.
- Shows a live completeness bar so returning-but-incomplete users see remaining progress.
- Zero impact on returning fully-onboarded users (component early-returns `null`).

### 3. Profile — completeness checklist (`src/components/ProfileCompletenessCard.tsx`)

- Six-step checklist pinned to the top of the Profile tab.
- Each incomplete row links directly to where the field is edited (Profile fields → `/profile`; interests/reciter/reminder → `/onboarding`).
- Hides itself entirely once all six items are done, so power-users see no clutter.
- Uses the same `useOnboardingStatus` hook — checklist stays in sync with Home.

### 4. Search — first-visit tip (`src/components/SearchTipCard.tsx`)

- Shown once on the empty search state (`/search` with no query).
- Explains the two things new viewers most misunderstand: typo tolerance ("Try 'quraan', 'hubrman'") and halal-scoped indexing.
- `localStorage` dismissal — the tip never returns for a given browser once dismissed.
- Existing `SearchSuggestions` (recent / trending / creators / topics) is untouched.

### 5. Notification defaults — one-click reset

- `NotificationSettings.tsx` now defines `RECOMMENDED_DEFAULTS` explicitly and exposes a **Recommended defaults** button in the page header.
- Defaults chosen to maximise high-signal notifications without inbox spam:
  - Push on: Daily Dose, Streak protection, Prayer times
  - Email on: Weekly recap (only)
  - In-app on: everything (matrix baseline)
- Restore is a single upsert of all seven kinds; the matrix updates optimistically.

## Preserved

- All existing Home widgets (Hero, NextSalah, Ramadan, Streak, Weekly Recap, Daily Dose, tabs) render unchanged.
- All existing Onboarding steps, Profile tabs, Notification kinds, and Search behaviours are intact — Phase 5 is purely additive.
- No routes added or removed. No navigation changes (Phase 2 spine untouched).
- No feature flags, no auth changes, no schema changes.

## Accessibility

- Progress bars use `role="progressbar"` with `aria-valuenow/min/max`.
- Dismiss buttons carry `aria-label`.
- All motion respects `motion-safe:` variants (no forced animation for reduced-motion users).

## Quality gate

- [x] Typecheck clean (`tsgo --noEmit` → 0 errors)
- [x] Design lint clean in enforce mode (0 violations)
- [x] All existing widgets & routes preserved
- [x] No security surface changed (queries scoped by `auth.uid()` via existing RLS)
- [x] No performance regression (single new React Query, 5-min stale time, shared across surfaces)
- [x] Reduced-motion respected
- [x] No feature work outside Phase 5 objectives
