// SeriesRail — shown on the Watch page when the current video is part of a
// detected multi-part series. Renders a compact horizontal list of episodes
// with the current one highlighted so viewers can jump to the next/previous
// installment without hunting the feed.

import { Link } from "react-router-dom";
import { CheckCircle2, ListVideo, Play } from "lucide-react";
import type { SeriesResult } from "@/hooks/useSeriesEpisodes";
import { cn } from "@/lib/utils";

interface Props {
  series: SeriesResult;
  className?: string;
}

export default function SeriesRail({ series, className }: Props) {
  const { episodes, currentIndex, base } = series;
  const total = episodes.length;
  const done = Math.max(0, currentIndex + 1);
  const pct = Math.round((done / total) * 100);

  return (
    <section
      aria-labelledby="series-rail-title"
      className={cn(
        "rounded-card border border-border bg-card p-4 shadow-sm",
        className,
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-micro font-medium uppercase tracking-wide text-muted-foreground">
            Continue the series
          </p>
          <h2 id="series-rail-title" className="truncate text-base font-semibold text-foreground">
            {base}
          </h2>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-pill bg-primary/12 px-3 py-1 text-xs font-medium text-primary">
          <ListVideo className="h-3.5 w-3.5" aria-hidden />
          {done}/{total}
        </span>
      </div>

      <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${pct}%` }}
          aria-hidden
        />
      </div>

      <ol className="flex gap-2 overflow-x-auto pb-1" role="list">
        {episodes.map(({ video, episode }, i) => {
          const isCurrent = i === currentIndex;
          const isWatched = i < currentIndex;
          return (
            <li key={video.id} className="min-w-[220px] max-w-[260px] shrink-0">
              <Link
                to={`/watch/${video.id}`}
                state={{ video }}
                aria-current={isCurrent ? "true" : undefined}
                className={cn(
                  "group flex h-full flex-col overflow-hidden rounded-card border transition-colors",
                  isCurrent
                    ? "border-primary bg-primary/8"
                    : "border-border bg-background hover:border-primary/40 hover:bg-accent/40",
                )}
              >
                <div className="relative aspect-video w-full overflow-hidden bg-muted">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : null}
                  <span
                    className={cn(
                      "absolute left-2 top-2 rounded-pill px-2 py-0.5 text-[10px] font-semibold",
                      isCurrent
                        ? "bg-primary text-primary-foreground"
                        : isWatched
                          ? "bg-emerald-500/90 text-white"
                          : "bg-background/90 text-foreground",
                    )}
                  >
                    Ep {episode}
                  </span>
                  {isCurrent ? (
                    <span className="absolute inset-0 flex items-center justify-center bg-primary/25">
                      <Play className="h-6 w-6 fill-primary-foreground text-primary-foreground" aria-hidden />
                    </span>
                  ) : isWatched ? (
                    <span className="absolute right-2 top-2 rounded-full bg-emerald-500 p-0.5 text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                    </span>
                  ) : null}
                </div>
                <p className="line-clamp-2 px-2.5 py-2 text-xs font-medium text-foreground">
                  {video.title}
                </p>
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
