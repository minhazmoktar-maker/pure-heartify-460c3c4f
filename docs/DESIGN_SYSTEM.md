# Heartify Design System (Locked v1)

**Source of truth.** Every UI decision defers to this file. Adding a new value is a system change, not a component decision — open a PR that updates this doc, `src/index.css`, and `tailwind.config.ts` together.

Rule: **if it isn't in this document, it can't be used.**

---

## 1. Type roles (exactly 6)

| Role       | Class            | Size / Line-height                  | Weight | Use                              |
|------------|------------------|-------------------------------------|--------|----------------------------------|
| `display`  | `text-display`   | clamp(2.25rem, 4vw, 3.5rem) / 1.05  | 700    | Hero / marketing headlines only  |
| `title`    | `text-title`     | 1.5rem / 1.2                        | 600    | Page / section titles            |
| `heading`  | `text-heading`   | 1.125rem / 1.3                      | 600    | Card headings, dialog titles     |
| `body`     | `text-body`      | 1rem / 1.6                          | 400    | Default paragraph text           |
| `caption`  | `text-caption`   | 0.875rem / 1.5                      | 400    | Secondary / helper text          |
| `micro`    | `text-micro`     | 0.75rem / 1.4                       | 500    | Labels, chips, uppercase eyebrows|

Anything else (`text-xs`, `text-lg`, `text-2xl`, arbitrary `text-[…]`) is prohibited outside `prose-heartify` article bodies.

## 2. Spacing scale (exactly 4)

| Token | Value | Class prefix           | Use                                   |
|-------|-------|------------------------|---------------------------------------|
| `xs`  | 4px   | `p-ds-xs`, `gap-ds-xs` | Tight groupings inside a control      |
| `sm`  | 8px   | `p-ds-sm`, `gap-ds-sm` | Icon ↔ label, dense lists             |
| `md`  | 16px  | `p-ds-md`, `gap-ds-md` | Default component padding             |
| `lg`  | 32px  | `p-ds-lg`, `gap-ds-lg` | Section rhythm, card interior padding |

Vertical page rhythm is a multiple of `lg` (32 / 64 / 96). Anything mid-scale (12, 20, 24, 40) is off-system.

## 3. Radii (exactly 2)

| Token  | Value  | Class          | Use                              |
|--------|--------|----------------|----------------------------------|
| `card` | 12px   | `rounded-card` | Cards, inputs, dialogs, buttons  |
| `pill` | 9999px | `rounded-pill` | Chips, avatars, floating actions |

No `rounded-sm`, `rounded-lg`, `rounded-xl`, or ad-hoc radii.

## 4. Elevations (exactly 3)

| Token | Class       | Use                                    |
|-------|-------------|----------------------------------------|
| `e0`  | `shadow-e0` | Flat surfaces resting on background    |
| `e1`  | `shadow-e1` | Cards, buttons, list rows at rest      |
| `e2`  | `shadow-e2` | Menus, popovers, hovered cards, modals |

## 5. Motion tokens (exactly 3)

Every animation MUST pick one duration and the shared easing.

| Token    | Value | Class             | Use                                      |
|----------|-------|-------------------|------------------------------------------|
| `micro`  | 120ms | `duration-micro`  | Press, focus ring, hover swap            |
| `short`  | 200ms | `duration-short`  | Card lift, popover, tooltip, menu open   |
| `medium` | 320ms | `duration-medium` | Route transitions, drawer, milestone pop |

Easing: `--ease-standard: cubic-bezier(0.22, 1, 0.36, 1)` — exposed as `ease-standard`. No other curves.

## 6. Accent-use rule (exactly 1)

**Gold is used for exactly one thing per view: the single most important action or status.**

- Hero primary CTA — gold.
- Streak-milestone badge — gold.
- Selected tab underline — gold.
- Never: gold on every card, every price, every icon. Never two gold accents visible at once.

Primary buttons, links, and focus rings use `--primary` (emerald). Gold (`--gold`) is reserved.

## 7. Guardrails (CI)

`scripts/design-lint.mjs` fails the build when it finds:

- Hardcoded hex colors in `src/**/*.{ts,tsx}` (`#ffffff`, `#000`, `bg-[#…]`)
- Off-scale Tailwind text sizes (`text-xs`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`, `text-4xl`, `text-5xl`)
- Off-scale radii (`rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full`)
- Arbitrary durations (`duration-[…ms]`, `duration-75|100|150|300|500|700|1000`)

Allow-listed: `src/components/ui/**` (vendored shadcn) and `src/integrations/**` (auto-generated). Individual lines may opt out with `// design-lint-disable` on the same or previous line. Whole files may opt out with `// design-lint-disable-file` anywhere in the file — reserved for canvas palettes (confetti), chart color scales, generated SVGs (PWA icons), and third-party brand marks (Google G).

Run locally:

- `node scripts/design-lint.mjs` — enforce (exit 1 on any violation)
- `node scripts/design-lint.mjs --report` — count violations without failing
- `node scripts/design-migrate.mjs` — Phase 4 codemod that maps legacy Tailwind sizes/radii/durations to design tokens (idempotent, safe to re-run)

CI: `.github/workflows/design-lint.yml` runs in **enforce mode** (Phase 4+). Any violation without a documented exception fails the build.

## 8. Change process

1. Prove the existing tokens can't express the need.
2. PR must update this doc, tokens in `src/index.css`, Tailwind mapping in `tailwind.config.ts`, and any new lint exception together.
3. Two reviewers required.
