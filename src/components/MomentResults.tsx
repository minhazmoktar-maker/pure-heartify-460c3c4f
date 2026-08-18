import { Link } from "react-router-dom";
import { Quote } from "lucide-react";
import { formatTimestamp, useTranscriptMoments } from "@/hooks/useTranscript";

/**
 * In-video search results: the exact spoken moments matching the query.
 * Each row deep-links to /watch/:id?t=<seconds>, so the user lands on the
 * sentence instead of the start of a 90-minute lecture.
 *
 * Renders nothing when no transcript matches, so it stays invisible until the
 * transcript corpus covers a query.
 */
export default function MomentResults({ query, limit = 8 }: { query: string; limit?: number }) {
  const { data } = useTranscriptMoments(query, undefined, limit);
  const moments = data ?? [];
  if (moments.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        <Quote className="h-4 w-4 text-primary" aria-hidden />
        Spoken moments
      </h2>
      <ul className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
        {moments.map((m) => (
          <li key={`${m.video_id}-${m.start_ms}`}>
            <Link
              to={`/watch/${m.video_id}?t=${Math.floor(m.start_ms / 1000)}`}
              className="flex min-h-[44px] items-start gap-3 px-3 py-3 transition-colors hover:bg-muted/60"
            >
              <img
                src={`https://i.ytimg.com/vi/${m.video_id}/default.jpg`}
                alt=""
                width={80}
                height={45}
                loading="lazy"
                className="h-[45px] w-20 shrink-0 rounded-md object-cover"
              />
              <span className="min-w-0">
                <span className="line-clamp-2 text-sm text-foreground">{m.text}</span>
                <span className="mt-1 block font-mono text-micro text-primary">
                  Jump to {formatTimestamp(m.start_ms)}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
