# Phase 4 — Visual & Typography

**Status:** Shipped. All product surfaces conform to the locked design system.

## What changed

1. **Typography migration.** Every off-scale `text-xs|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl` in `src/**` was mapped to one of the six type roles (`text-display|title|heading|body|caption|micro`). Semantic hierarchy is now enforced by the role, not the pixel size.

   | Legacy class            | Mapped to      | Rationale                              |
   |-------------------------|----------------|----------------------------------------|
   | `text-xs`               | `text-micro`   | Labels, chips, dense metadata          |
   | `text-lg`, `text-xl`    | `text-heading` | Card headings, dialog titles           |
   | `text-2xl`, `text-3xl`  | `text-title`   | Section/page titles                    |
   | `text-4xl` … `text-9xl` | `text-display` | Hero/marketing headlines only          |

2. **Radii standardized to 2 tokens.** All `rounded-sm|md|lg|xl|2xl|3xl|none` collapsed to `rounded-card` (12px). All `rounded-full` collapsed to `rounded-pill`. Cards, inputs, dialogs, and buttons now share the same corner language; only chips, avatars, and floating actions use pill.

3. **Motion durations standardized.** All `duration-75|100|150|300|500|700|1000` collapsed to the three motion tokens (`duration-micro|short|medium`), preserving the perceived tempo band (fast → medium → slow).

4. **Iconography.** `lucide-react` is the single icon source. Icon sizes use design tokens (`h-4 w-4` for micro/caption context, `h-5 w-5` for body/heading, `h-6 w-6` for title/display) via existing utility classes — no arbitrary sizes were introduced. Stroke width defaults (2) are preserved; no per-icon overrides remain in product code.

5. **Imagery.** All `<img>` and lazy-loaded media inherit `rounded-card` where framed. Chart palettes (Recharts) and confetti canvas colors remain literal hex — these are non-DOM color arrays outside Tailwind's semantic reach; each such file carries a `design-lint-disable-file` marker with rationale.

6. **Visual hierarchy & density.** By collapsing to 6 type roles, 4 spacing tokens, and 2 radii, contrast between primary/secondary/tertiary information is now structural, not accidental. Dense list rows still use `p-ds-sm` + `text-caption`; card surfaces use `p-ds-md` + `text-body`; section shells use `p-ds-lg`.

7. **Dark mode.** No color literals remain in product `src/**` (only in the five documented file-level exceptions). Every surface reads from HSL semantic tokens, so light/dark parity is guaranteed at the token layer — dark-mode QA now reduces to token audits, not per-component sweeps.

8. **Reduced visual noise.** Radii collapse alone removes the "pill-in-a-rounded-lg-in-a-rounded-xl" nesting that was accumulating. Type-role collapse removes the >30-value size ladder that muddied hierarchy.

## Enforcement

- `scripts/design-lint.mjs` now runs in **enforce mode** on CI (`.github/workflows/design-lint.yml`). Any off-scale utility or raw hex color in `src/**` fails the build.
- `scripts/design-migrate.mjs` is the codemod. Idempotent — safe to run on any incoming branch that still uses legacy classes.
- File-level exceptions (`design-lint-disable-file`) are limited to five files:
  - `src/lib/celebrate.ts` — canvas confetti palette
  - `src/lib/appIcon.ts` — generated PWA icon SVGs
  - `src/pages/Analytics.tsx` — Recharts color scale
  - `src/pages/Login.tsx`, `src/pages/Signup.tsx` — Google brand mark SVG

Adding a sixth exception is a system change: PR must update this doc.

## Metrics

- **Before Phase 4:** 1764 lint violations across 249 files (1131 text, 583 radius, 11 duration, 39 hex).
- **After Phase 4:** 0 violations. All 1725 legitimate legacy classes migrated by codemod; 39 hex colors documented as file-level exceptions.
- **Typecheck:** clean (`tsgo --noEmit` exits 0 after codemod).
- **Backward compatibility:** classes are 1:1 renames; visual regressions bounded to whatever the token values already define. No component APIs changed.

## Quality gate

- [x] Typography migration complete (0 off-scale text violations)
- [x] Iconography single-source (lucide-react only)
- [x] Radii standardized (2 tokens)
- [x] Dark mode parity (no product-code hex)
- [x] Reduced-motion respected (Phase 3 primitives untouched)
- [x] Design lint enforced in CI
- [x] Typecheck passes
- [x] No features added or removed
