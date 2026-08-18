import { useMemo, useState } from "react";
import { FileText, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import {
  formatTimestamp,
  useRequestTranscript,
  useTranscript,
  useTranscriptJob,
} from "@/hooks/useTranscript";
import { useAuth } from "@/contexts/AuthContext";

type Props = {
  videoId: string;
  /** Seek the player to a moment, in whole seconds. */
  onSeek: (seconds: number) => void;
};

/**
 * Transcript / in-video search for the watch page.
 *
 * Collapsed by default so it never competes with the video for attention, and
 * the segment list is only mounted while open — a 40-minute lecture is ~600
 * rows and mounting that eagerly would cost the LCP.
 */
export default function TranscriptPanel({ videoId, onSeek }: Props) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const { user } = useAuth();
  const { data: transcript, isLoading } = useTranscript(videoId);
  const missing = !isLoading && !transcript;
  const { data: jobStatus } = useTranscriptJob(videoId, missing);
  const request = useRequestTranscript(videoId);

  const segments = useMemo(() => {
    const all = transcript?.segments ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return all;
    return all.filter((s) => s.text.toLowerCase().includes(q));
  }, [transcript, filter]);

  return (
    <section className="mt-6 overflow-hidden rounded-card border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex min-h-[44px] w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
          Transcript
          {transcript && (
            <span className="text-micro font-normal text-muted-foreground">
              {transcript.segmentCount} lines · {transcript.language.toUpperCase()}
            </span>
          )}
        </span>
        <span className="text-micro text-muted-foreground">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="border-t border-border px-4 py-3">
          {isLoading && (
            <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading transcript…
            </p>
          )}

          {missing && (
            <div className="py-2">
              <p className="text-sm text-muted-foreground">
                {jobStatus === "queued" || jobStatus === "running"
                  ? "Transcript is being generated — check back in a few minutes."
                  : jobStatus === "failed"
                    ? "We couldn't generate a transcript for this video."
                    : "No transcript yet for this video."}
              </p>
              {!jobStatus && (
                <button
                  type="button"
                  disabled={!user || request.isPending}
                  onClick={() =>
                    request.mutate(undefined, {
                      onSuccess: () => toast.success("Transcript requested — we'll notify the pipeline"),
                      onError: () => toast.error("Couldn't request a transcript"),
                    })
                  }
                  className="mt-3 inline-flex min-h-[44px] items-center rounded-pill bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                >
                  {request.isPending ? "Requesting…" : user ? "Request transcript" : "Sign in to request"}
                </button>
              )}
            </div>
          )}

          {transcript && (
            <>
              <label className="relative mb-3 block">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search inside this video"
                  aria-label="Search inside this video"
                  className="min-h-[44px] w-full rounded-pill border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground"
                />
              </label>

              {segments.length === 0 ? (
                <p className="py-3 text-sm text-muted-foreground">No lines match "{filter}".</p>
              ) : (
                <ol className="max-h-[420px] space-y-1 overflow-y-auto overscroll-contain">
                  {segments.map((s) => (
                    <li key={`${s.start_ms}-${s.text.slice(0, 12)}`}>
                      <button
                        type="button"
                        onClick={() => onSeek(Math.floor(s.start_ms / 1000))}
                        className="flex w-full gap-3 rounded-card px-2 py-2 text-left transition-colors hover:bg-muted/60"
                      >
                        <span className="shrink-0 pt-0.5 font-mono text-micro text-primary">
                          {formatTimestamp(s.start_ms)}
                        </span>
                        <span className="text-sm leading-relaxed text-foreground">{s.text}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}
