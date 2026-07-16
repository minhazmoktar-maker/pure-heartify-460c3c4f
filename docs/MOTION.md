# Heartify Motion & Interaction (Phase 3)

Source of truth for every animation, transition, loading and overlay in the app. Every new interactive surface must pick from these tokens and primitives — nothing bespoke.

Related: `docs/DESIGN_SYSTEM.md` (foundation tokens), `src/index.css` (implementation), `tailwind.config.ts` (mapping).

---

## 1. Motion tokens (exactly 3 durations + 1 easing)

Defined once in `src/index.css` and exposed to Tailwind as `duration-micro|short|medium` and `ease-standard`.

| Token          | Value | Class             | Use                                              |
|----------------|-------|-------------------|--------------------------------------------------|
| `--duration-micro`  | 120ms | `duration-micro`  | Press, focus ring flip, tooltip, hover swap |
| `--duration-short`  | 200ms | `duration-short`  | Card lift, popover, dropdown, dialog fade, route transition |
| `--duration-medium` | 320ms | `duration-medium` | Sheet slide, drawer, page skeleton, milestone pop |
| `--ease-standard`   | `cubic-bezier(0.22, 1, 0.36, 1)` | `ease-standard` | The only curve. |

No other durations or curves are permitted outside `src/components/ui/*` legacy code and `prose-heartify` article bodies.

## 2. Reduced motion contract

The app respects `prefers-reduced-motion: reduce` at **every** layer:

1. **Global CSS bypass** (`src/index.css`): collapses `animate-*`, ranges/tables, and universal transition/animation durations to ~0ms.
2. **Component-level guards**: `RouteTransition`, `FadeIn`, `soundHaptics`, `celebrate.ts`, and `AutoTheme` short-circuit when the media query matches.
3. **Utility variants**: interactive primitives (`.card-interactive`, `.pressable`, dialog/sheet/popover/dropdown/tooltip) ship `motion-reduce:transform-none motion-reduce:transition-none motion-reduce:duration-micro` variants so they render instantly without breaking layout.

Every new animation MUST either use one of these primitives or opt-in with `motion-reduce:*` variants — never author raw `@keyframes` without a reduced-motion escape.

## 3. Interactive states (required on every interactive surface)

Every clickable/focusable element MUST expose the four states:

| State          | Class or primitive                                     |
|----------------|--------------------------------------------------------|
| **hover**      | `hover:-translate-y-0.5 hover:shadow-e2` (cards) / `hover:opacity-95` (buttons) |
| **focus-visible** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` |
| **active/press** | `.pressable` utility (`active:scale-[0.98]`) — or `.card-interactive` for cards |
| **disabled**   | `disabled:opacity-60 disabled:cursor-not-allowed`      |

Two shortcuts are canonical:

- `.card-interactive` — full four-state polish for grid/list cards.
- `.pressable` — tactile press for buttons, chips, list rows.

Both live in `src/index.css` and both bake in reduced-motion guards.

## 4. Loading vocabulary (skeletons over spinners)

`Loader2` spinners are legacy. For new work, prefer skeletons that preserve layout so route transitions do not jump.

- **Route/page loading** — `<PageSkeleton variant="default|list|grid|detail|feed" />` (see `src/components/PageSkeleton.tsx`). Uses `duration-medium ease-standard`.
- **In-place loading** — `<Skeleton className="h-4 w-24" />` from `@/components/ui/skeleton`.
- **Optimistic inline spinner** — acceptable inside buttons via `Loader2` when the operation is truly indeterminate; wrap it in `motion-reduce:animate-none`.

## 5. Overlays

All overlay primitives share `duration-short` (enter) / `duration-medium` (sheet-style entry) with `ease-standard`, plus reduced-motion variants. Every project surface MUST use these primitives — do not hand-roll modals or slide-ins.

| Surface                    | Primitive                          |
|----------------------------|-------------------------------------|
| Modal                      | `Dialog` (`@/components/ui/dialog`) |
| Bottom / side panel        | `Sheet`  (`@/components/ui/sheet`)  |
| Menu                       | `DropdownMenu` (`@/components/ui/dropdown-menu`) |
| Contextual popover         | `Popover` (`@/components/ui/popover`) |
| Tooltip                    | `Tooltip` (`@/components/ui/tooltip`) |
| Toast                      | `notify` helper (`@/lib/notify`) — wraps sonner |

## 6. Toast contract

Import from `@/lib/notify` — **not** raw `sonner`:

```ts
import { notify } from "@/lib/notify";

notify.success("Saved");                       // 4s default
notify.success("Saved", { length: "ack" });    // 2s
notify.error("Upload failed");                 // 6.5s (long by default)
notify.error("Session expired", { length: "sticky" }); // stays until dismissed
```

Legacy `useToast` (`@/hooks/use-toast`) remains supported for existing screens but new code MUST use `notify`. Only one `<Toaster />` may live in the app tree (mounted in `src/App.tsx`).

## 7. Route transitions & entrance choreography

- Cross-route fade: `<RouteTransition>` wraps `<Routes>` in `App.tsx` — 200ms fade + 4px slide, respects reduced motion.
- Content entrance: `<FadeIn index={n}>` for staggered grids, hero copy, and section reveals — 320ms with 40ms stagger capped at 200ms.

Do not add per-page enter animations outside these two components.

## 8. Guardrails

The `scripts/design-lint.mjs` job blocks:

- Arbitrary durations (`duration-[…ms]`, `duration-75|100|150|300|500|700|1000`)
- Off-scale radii, hex colors, and off-scale text sizes

Any legitimate exception may use a `// design-lint-disable` comment on the same or previous line. Vendored shadcn primitives under `src/components/ui/**` are allow-listed but were re-tokenized in Phase 3 anyway.

## 9. Change process

1. Prove the existing tokens can't express the need.
2. PR must update this doc, `src/index.css`, `tailwind.config.ts`, and any new primitive together.
3. Two reviewers required (Design + Eng).
