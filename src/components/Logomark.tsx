import { cn } from "@/lib/utils";
import heartifyMark from "@/assets/heartify-mark.png";

/**
 * Heartify brand mark — the official heart-with-play glyph. Rendered as a
 * transparent PNG so it stays consistent with the app icon, favicon, and
 * share cards (which all originate from the same source asset).
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
    <img
      src={heartifyMark}
      width={size}
      height={size}
      alt={title}
      className={cn("shrink-0 object-contain", className)}
      draggable={false}
    />
  );
}
