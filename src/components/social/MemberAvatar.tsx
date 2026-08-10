/**
 * Small member avatar with an initial fallback.
 * Uses semantic tokens only so it themes correctly in dark mode.
 */
export default function MemberAvatar({
  url,
  name,
  size = "md",
}: {
  url?: string | null;
  name: string;
  size?: "sm" | "md" | "lg";
}) {
  const dims =
    size === "lg" ? "h-16 w-16 text-heading" : size === "sm" ? "h-9 w-9 text-micro" : "h-12 w-12 text-sm";
  return (
    <div
      className={`flex ${dims} shrink-0 items-center justify-center overflow-hidden rounded-pill bg-primary font-bold text-primary-foreground`}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden>{name.replace(/^@/, "")[0]?.toUpperCase() ?? "?"}</span>
      )}
    </div>
  );
}
