// Home rail surfacing the 97 verified scholars that were previously dormant.
// Horizontal, chip-based, deliberately lightweight so it renders even when
// video surfaces below are still hydrating.

import { Link } from "react-router-dom";
import { GraduationCap, ArrowRight } from "lucide-react";
import { useVerifiedScholars } from "@/hooks/useVerifiedScholars";
import { cn } from "@/lib/utils";

export default function ScholarsRail({ className }: { className?: string }) {
  const { data, isLoading } = useVerifiedScholars();
  const items = (data ?? []).slice(0, 20);
  if (!isLoading && items.length === 0) return null;

  return (
    <section aria-label="Verified scholars" className={cn("pt-6", className)}>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-primary" />
          <h2 className="font-sans text-lg font-semibold tracking-tight text-foreground md:text-xl">
            Verified scholars
          </h2>
        </div>
        <Link
          to="/scholars"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <p className="mb-2 px-1 text-sm text-muted-foreground">
        Contemporary teachers vetted by our moderation team.
      </p>
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-3 scrollbar-none">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-11 w-40 shrink-0 animate-pulse rounded-pill bg-secondary/40" />
            ))
          : items.map((s) => (
              <Link
                key={s.id}
                to={`/scholars#${s.id}`}
                className="inline-flex shrink-0 snap-start items-center gap-2 rounded-pill border border-border bg-card px-4 py-2 text-sm font-medium text-foreground shadow-e1 transition hover:bg-secondary"
              >
                <span className="h-6 w-6 rounded-full bg-primary/15 text-center text-xs font-bold leading-6 text-primary">
                  {s.display_name.charAt(0)}
                </span>
                <span className="max-w-[160px] truncate">{s.display_name}</span>
                {s.language && (
                  <span className="text-micro uppercase text-muted-foreground">{s.language}</span>
                )}
              </Link>
            ))}
      </div>
    </section>
  );
}
