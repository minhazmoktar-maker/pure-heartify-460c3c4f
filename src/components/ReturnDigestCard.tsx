import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X, Play, BellRing, Gem, RotateCcw } from "lucide-react";
import SmartImage from "@/components/SmartImage";
import { useReturnDigest, type ReturnDigestKind } from "@/hooks/useReturnDigest";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "heartify.return-digest.dismissed";

const KIND_ICON: Record<ReturnDigestKind, typeof Play> = {
  resume: RotateCcw,
  follow_upload: BellRing,
  fresh_gem: Gem,
};

function awayLabel(hours: number | null): string {
  if (!hours || hours < 20) return "Since you were last here";
  const days = Math.round(hours / 24);
  if (days <= 1) return "Since yesterday";
  if (days < 7) return `Since ${days} days ago`;
  const weeks = Math.round(days / 7);
  return weeks <= 1 ? "Since last week" : `Since ${weeks} weeks ago`;
}

/**
 * "Since you were away" — the return-value surface of Heartify's habit loop.
 *
 * Honest by construction: it renders only when the `return_digest` RPC finds
 * something that genuinely changed (an unfinished video, a new upload from a
 * followed creator, a fresh high-trust gem in the user's languages). No
 * manufactured activity, no urgency, no counters — one dismissible strip of
 * real next actions, each carrying the reason it is being shown.
 */
const ReturnDigestCard = () => {
  const { data } = useReturnDigest(6);
  const [dismissedFor, setDismissedFor] = useState<string | null>(() => {
    try { return localStorage.getItem(DISMISS_KEY); } catch { return null; }
  });

  const items = data?.items ?? [];
  const stamp = data?.last_seen ?? null;
  const visible = items.length > 0 && stamp !== null && dismissedFor !== stamp;

  const heading = useMemo(() => awayLabel(data?.away_hours ?? null), [data?.away_hours]);

  useEffect(() => {
    if (!visible) return;
    track("return.digest_viewed", {
      item_count: items.length,
      away_hours: data?.away_hours ?? 0,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, stamp]);

  if (!visible) return null;

  const dismiss = () => {
    track("return.digest_dismissed", { item_count: items.length });
    try { localStorage.setItem(DISMISS_KEY, stamp!); } catch { /* ignore */ }
    setDismissedFor(stamp);
  };

  return (
    <section
      aria-label="Since you were away"
      className="rounded-card border border-border bg-card p-4 shadow-e1"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-title font-semibold text-foreground">{heading}</h2>
          <p className="text-caption text-muted-foreground">
            Only what actually changed — {items.length} worth your time.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss what's new since you were away"
          className="-m-2 flex h-11 w-11 items-center justify-center rounded-pill text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <ul className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item, i) => {
          const Icon = KIND_ICON[item.kind] ?? Play;
          const resumeAt = item.kind === "resume" && item.progress_seconds
            ? `?t=${Math.max(0, Math.floor(item.progress_seconds) - 5)}`
            : "";
          return (
            <li key={item.video_id} className="w-[220px] shrink-0 snap-start">
              <Link
                to={`/watch/${item.video_id}${resumeAt}`}
                onClick={() =>
                  track("return.digest_clicked", {
                    video_id: item.video_id,
                    kind: item.kind,
                    position: i,
                  })
                }
                className="group block rounded-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SmartImage
                  src={item.thumbnail_url ?? `https://i.ytimg.com/vi/${item.video_id}/hqdefault.jpg`}
                  alt={item.title}
                  aspect="aspect-video"
                  wrapperClassName="rounded-card overflow-hidden bg-secondary"
                  className="h-full w-full object-cover transition-transform duration-medium group-hover:scale-[1.02]"
                />
                <p className={cn(
                  "mt-2 line-clamp-2 text-caption font-semibold text-foreground",
                )}>
                  {item.title}
                </p>
                {item.channel_title && (
                  <p className="line-clamp-1 text-micro text-muted-foreground">{item.channel_title}</p>
                )}
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-pill bg-secondary px-2 py-1 text-micro font-medium text-muted-foreground">
                  <Icon className="h-3 w-3" aria-hidden />
                  {item.reason}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default ReturnDigestCard;
