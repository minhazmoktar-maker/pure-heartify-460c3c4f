// Phase 10 — Illustrated empty state art.
// Inline SVG so we ship no binary assets and every stroke inherits our theme
// tokens (`text-primary`, `text-muted-foreground`). Variants are named after
// the user situation they explain, not the imagery — semantically stable when
// we redraw later.

import { cn } from "@/lib/utils";

export type EmptyIllustrationVariant =
  | "empty-list"
  | "no-search-results"
  | "no-favorites"
  | "no-notifications"
  | "all-caught-up"
  | "location"
  | "not-found";

interface Props {
  variant: EmptyIllustrationVariant;
  className?: string;
}

export default function EmptyIllustration({ variant, className }: Props) {
  const base = cn("h-32 w-32 text-primary/70", className);
  switch (variant) {
    case "no-favorites":
      return (
        <svg viewBox="0 0 96 96" fill="none" className={base} aria-hidden="true">
          <circle cx="48" cy="48" r="44" className="fill-primary/5" />
          <path
            d="M48 68 L28 50 a10 10 0 0 1 14-14 l6 6 6-6 a10 10 0 0 1 14 14 z"
            className="fill-primary/15 stroke-primary/70"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M40 32 l2 4 4 2 -4 2 -2 4 -2-4 -4-2 4-2z" className="fill-[hsl(var(--gold))]" />
        </svg>
      );
    case "no-search-results":
      return (
        <svg viewBox="0 0 96 96" fill="none" className={base} aria-hidden="true">
          <circle cx="42" cy="42" r="22" className="fill-primary/5 stroke-primary/70" strokeWidth="2.5" />
          <path d="M58 58 L76 76" className="stroke-primary/70" strokeWidth="4" strokeLinecap="round" />
          <path d="M34 42 h16 M42 34 v16" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "no-notifications":
      return (
        <svg viewBox="0 0 96 96" fill="none" className={base} aria-hidden="true">
          <path
            d="M28 60 v-14 a20 20 0 0 1 40 0 v14 l6 8 h-52 z"
            className="fill-primary/10 stroke-primary/70"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path d="M42 72 a6 6 0 0 0 12 0" className="stroke-primary/70" strokeWidth="2" strokeLinecap="round" fill="none" />
          <circle cx="66" cy="30" r="6" className="fill-[hsl(var(--gold))]" />
        </svg>
      );
    case "all-caught-up":
      return (
        <svg viewBox="0 0 96 96" fill="none" className={base} aria-hidden="true">
          <circle cx="48" cy="48" r="30" className="fill-primary/10 stroke-primary/70" strokeWidth="2" />
          <path d="M34 50 l10 10 18-22" className="stroke-primary" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <path d="M14 22 l4 4 M78 22 l-4 4 M14 74 l4-4 M78 74 l-4-4" className="stroke-primary/40" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
    case "empty-list":
    default:
      return (
        <svg viewBox="0 0 96 96" fill="none" className={base} aria-hidden="true">
          <rect x="18" y="22" width="60" height="52" rx="10" className="fill-primary/5 stroke-primary/70" strokeWidth="2" />
          <path d="M28 40 h40 M28 52 h28 M28 62 h20" className="stroke-primary/40" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="72" cy="22" r="6" className="fill-[hsl(var(--gold))]" />
        </svg>
      );
  }
}
