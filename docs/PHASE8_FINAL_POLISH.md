# Phase 8 — Final Polish

Scope-limited pass: no new features, only cross-cutting refinements that
normalize the tactile feel of the entire app.

## Delivered

### 1. Normalized haptics — `src/lib/haptics.ts`
Introduces a single `haptic(intent)` API with named intents (`light`,
`selection`, `success`, `warning`, `error`). All intents delegate to the
existing `buzz()` helper (Capacitor Haptics on native, Web Vibration on
browsers) and honor `prefers-reduced-motion`. Replaces the ad-hoc
`navigator.vibrate(10)` call in `Wird.tsx`. Existing `celebrate*` and
`sound*` helpers continue to work — `haptics.ts` is the canonical entry
point for new tactile feedback.

### 2. Normalized sounds
`soundHaptics.ts` was already the single earcon source. No API changes;
Phase 8 only ensures haptics use the same reduced-motion gate.

### 3. Global focus rings
`index.css` now applies a two-color focus-visible ring
(`background` inner + `--ring` outer) to any anchor, button,
`role="button"`, `summary`, or `[tabindex]`. shadcn primitives keep their
own rings; the baseline covers hand-rolled interactive elements that
previously fell back to browser defaults.

### 4. Cursor normalization
Interactive elements resolve to `cursor: pointer`; disabled or
`aria-disabled="true"` elements resolve to `not-allowed`; text inputs
resolve to `text`. Applied at the `:where()` selector so specificity
stays zero and per-component overrides still win.

### 5. Custom scrollbars
Thin, themed scrollbars using `--muted-foreground` at low opacity, with
a hover state that increases opacity. Both `scrollbar-width` (Firefox)
and `-webkit-scrollbar-*` (Chromium/WebKit) are covered; unsupported
browsers keep their default scrollbar.

### 6. Route & loading transitions
Added a `.transition-route` utility keyed off `--duration-short` and
`--ease-standard` so any Suspense fallback or manual transition matches
the existing `RouteTransition` component's timing. Reduced-motion users
get no animation.

### 7. Tiny details
- `-webkit-tap-highlight-color: transparent` removes the grey iOS flash
  now that pressable states are explicit (`pressable`, `press-soft`).
- Branded `::selection` at 25% primary opacity.
- Smooth in-page anchor scrolling, disabled under reduced motion.
- `.press-soft` utility for icon buttons that don't use `.pressable`.

## Non-goals

- No new routes, features, or copy.
- No component API changes beyond the additive `haptic()` helper.
- No shadcn primitive overrides.

## Verification

- Typecheck clean.
- Focus rings visible on keyboard nav across `/onboarding`, `/watch`,
  `/practice`, `/learn`, `/you`.
- Reduced-motion + sound-disabled paths continue to no-op.
- Scrollbars match theme in both light and dark modes.
