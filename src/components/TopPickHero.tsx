import { Link } from "react-router-dom";
import { Play, ShieldCheck, Sparkles } from "lucide-react";
import { useSurface } from "@/hooks/useSurface";

/**
 * Signed-out "one action, one screen" hero.
 * Replaces the marketing paragraph with a single Top Pick card: the
 * highest-trust trending video, one big Play CTA. The halal-first moat is
 * shown on-card ("Reviewed · Family-safe") instead of buried in copy.
 */
export default function TopPickHero() {
  const { items, isLoading } = useSurface("trending", { getExcludeIds: () => [] });
  const top = items?.[0];

  return (
    <section className="mx-auto max-w-[1800px] px-4 pt-3 md:px-6" aria-label="Today's top pick">
      <div className="relative overflow-hidden rounded-card border border-border bg-card shadow-e1">
        {top ? (
          <Link
            to={`/watch/${top.id}`}
            aria-label={`Play now: ${top.title}`}
            className="group relative block"
          >
            <div className="relative aspect-[16/9] w-full overflow-hidden bg-muted md:aspect-[21/9]">
              <img
                src={top.thumbnailUrl}
                alt=""
                width={1600}
                height={900}
                loading="eager"
                decoding="async"
                {...({ fetchpriority: "high" } as { fetchpriority: string })}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/10" />
              <div className="absolute inset-0 grid place-items-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white/95 shadow-xl transition-transform group-hover:scale-105 md:h-20 md:w-20">
                  <Play className="h-7 w-7 translate-x-0.5 fill-black text-black md:h-9 md:w-9" aria-hidden />
                </span>
              </div>
              <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-pill bg-black/60 px-2.5 py-1 text-micro font-semibold text-white backdrop-blur">
                <Sparkles className="h-3.5 w-3.5" aria-hidden /> Today's Top Pick
              </div>
              <div className="absolute inset-x-0 bottom-0 p-4 md:p-6">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-pill bg-emerald-500/90 px-2 py-0.5 text-[11px] font-semibold text-white">
                  <ShieldCheck className="h-3 w-3" aria-hidden /> Reviewed · Family-safe
                </div>
                <h2 className="line-clamp-2 max-w-3xl text-lg font-bold leading-tight text-white md:text-2xl">
                  {top.title}
                </h2>
                <p className="mt-1 truncate text-sm text-white/80">{top.channelTitle}</p>
              </div>
            </div>
          </Link>
        ) : (
          <div className="aspect-[16/9] w-full animate-pulse bg-muted md:aspect-[21/9]" aria-hidden={isLoading} />
        )}
      </div>
    </section>
  );
}
