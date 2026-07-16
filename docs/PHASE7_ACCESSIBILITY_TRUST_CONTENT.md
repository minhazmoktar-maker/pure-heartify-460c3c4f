# Phase 7 — Accessibility, Trust & Content

## Scope
Complete Phase 7 of the Master Transformation Blueprint: raise the a11y floor,
finish the Trust Center, and validate the analytics taxonomy end-to-end.

## Shipped

### Accessibility
- **Skip-to-content link** (`src/components/SkipLink.tsx`) — first tab stop in
  the app, jumps focus to `#main-content`. Only visible on focus. Uses design
  tokens (`bg-primary`, `text-primary-foreground`, `ring-ring`) — no arbitrary
  colors.
- **`#main-content` landmark** wired on `RouteTransition` (both the animated
  and reduced-motion branches) so every route exposes a single stable target
  for the skip link and for screen-reader "jump to main" gestures.
  `tabIndex={-1}` enables programmatic focus; `outline:none` avoids a visible
  ring on route change while keeping keyboard focus on interactive children.
- Verified existing landmark hygiene: every `size="icon"` Button in the tree
  already carries `aria-label`; Radix-based shadcn primitives (Dialog, Menu,
  Popover) provide the correct ARIA out of the box; only 3 `h-screen`
  occurrences remain and all are on non-viewport surfaces (toast host,
  admin gate, OAuth consent) that were reviewed and accepted.

### Trust Center
- Extended `src/pages/Trust.tsx` with three new sections without touching the
  existing content or visual language:
  - **Subprocessors & integrations** — managed backend, YouTube Data API,
    push delivery (VAPID / APNs / FCM), Sentry. Explicit "no ad networks,
    no data sale" statement and DPA contact.
  - **Retention & deletion** — active-account retention, 24-month analytics
    aggregation window, deletion timeline, 30-day encrypted-backup rotation.
  - **Incident response** — monitoring posture, notification commitment, and
    post-incident summary policy.
- Copy stays app-owned and factual per the trust-page-generation rules — no
  certification claims, no "verified by Lovable" language, no absolute
  guarantees.

### Analytics taxonomy validation
- Audited every `track(...)` call in `src/` and cross-referenced with
  `event_schemas`. Found **32 events emitted by client code that were not
  registered** — those inserts were silently rejected by the
  `validate_analytics_event()` trigger, meaning growth / referral / khatm /
  admin funnels were producing zero rows.
- Migration `20260716_*` seeds all missing events (acquisition, activation,
  search, recommendations, favorites, premium, referral, retention, admin/
  audit, moderation, khatm, legacy aliases, `perf`) with descriptions and
  `required_properties`. `ON CONFLICT` backfills docs for the pre-existing
  rows so the admin `/admin/events` list is now fully descriptive.
- Rewrote `docs/analytics-event-taxonomy.md` to match the shipped catalog and
  document the funnel-prefix naming convention adopted in
  `src/lib/growthEvents.ts`.

## Not in scope (Phase 8 or later)
- New product surfaces, redesigns, or content pipelines.
- Server-driven i18n for legal/trust copy — current pages are English-only by
  design; localized routes ship with Phase 8+.
- Automated axe-core CI job — Lighthouse-a11y floor (`>= 0.9`) already gates
  releases via `.github/workflows/lighthouse.yml`; a dedicated axe pass is
  earmarked for a later reliability sprint.

## Quality gate
- `tsgo --noEmit` clean.
- Design-lint clean (no arbitrary colors introduced; SkipLink uses tokens).
- Trust page, RouteTransition, and SkipLink render without console errors.
- Migration applied; `event_schemas` count increased by 32; no existing rows
  removed. Client `track()` continues to be fire-and-forget so any future
  unknown event is logged in dev but never breaks UX.
- No functional regression: existing routes, tests, and edge functions
  unchanged.
