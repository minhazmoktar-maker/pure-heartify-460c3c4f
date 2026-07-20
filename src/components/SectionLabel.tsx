import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * Canonical editorial section label.
 *
 * Enforces one visual pattern for every rail / card eyebrow across Heartify:
 * Fraunces small-caps, tabular numerals, muted-foreground, generous tracking.
 * No leaves, no colour drift, no bespoke variants. If a label needs an icon
 * (e.g. "Verse of the day"), pass one via `icon` — it renders at 12px in the
 * same muted tone, never as an accent.
 *
 * Why: the previous mix of green ✧, duotone books, and tabular caps made the
 * home feed feel assembled from parts. A single component makes hierarchy
 * scannable in one glance and is the anchor of the P3 craft polish.
 */
export default function SectionLabel({
  children,
  icon,
  as: Tag = "p",
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  as?: "p" | "h2" | "h3" | "span" | "div";
  className?: string;
}) {
  return (
    <Tag
      className={cn(
        // Editorial pattern: Fraunces small-caps, wide tracking, tabular figures.
        "font-heading text-micro font-semibold uppercase tabular-nums tracking-[0.14em] text-muted-foreground",
        "inline-flex items-center gap-1.5",
        className,
      )}
      style={{ fontVariantCaps: "all-small-caps", fontFeatureSettings: '"tnum", "smcp"' }}
    >
      {icon ? (
        <span aria-hidden className="inline-flex h-3 w-3 items-center justify-center opacity-70 [&>svg]:h-3 [&>svg]:w-3">
          {icon}
        </span>
      ) : null}
      <span>{children}</span>
    </Tag>
  );
}
