import { cn } from "@/lib/utils";

/**
 * Heartify brand mark.
 *
 * Composition: a soft crescent embracing a heart — the two symbols of the
 * product's name and mission. Rendered as a single SVG so it stays crisp on
 * iOS home screens, share cards, and app chrome without shipping a raster.
 *
 * Use in every place a bare "H" tile used to sit (Navbar, BottomTabBar, empty
 * states). For share cards and app icons, export the same paths at 512×512.
 */
export default function Logomark({
  className,
  size = 32,
  title = "Heartify",
}: {
  className?: string;
  size?: number;
  title?: string;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 40 40"
      width={size}
      height={size}
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <title>{title}</title>
      <defs>
        <linearGradient id="heartify-mark-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.82" />
        </linearGradient>
        <linearGradient id="heartify-mark-glyph" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary-foreground))" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(var(--primary-foreground))" stopOpacity="0.88" />
        </linearGradient>
      </defs>
      {/* Rounded tile — matches --radius-card scale */}
      <rect x="0" y="0" width="40" height="40" rx="10" fill="url(#heartify-mark-bg)" />
      {/* Crescent — carved by subtracting an offset circle from a base disc */}
      <path
        d="M28.5 20a10.5 10.5 0 1 1-6.7-9.78 8.2 8.2 0 0 0 0 19.56A10.5 10.5 0 0 1 28.5 20Z"
        fill="url(#heartify-mark-glyph)"
      />
      {/* Heart — nestled inside the crescent's open bowl */}
      <path
        d="M20.6 25.4c-.35.32-.85.32-1.2 0l-3.2-2.9c-1.6-1.45-1.6-3.9 0-5.35a3.35 3.35 0 0 1 4.6-.1l.2.18.2-.18a3.35 3.35 0 0 1 4.6.1c1.6 1.45 1.6 3.9 0 5.35l-3.2 2.9Z"
        fill="hsl(var(--primary))"
        opacity="0.95"
      />
    </svg>
  );
}
