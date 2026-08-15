import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Check, Loader2, Trash2, RotateCw } from "lucide-react";
import type { Track } from "@/data/audio";
import { toast } from "sonner";
import { hasOfflineTrack, removeOfflineTrack } from "@/lib/audioOffline";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import UpgradeSheet from "@/components/premium/UpgradeSheet";
import { cn } from "@/lib/utils";
import { diag } from "@/lib/diagnostics";

type Props = { track: Track & { isPremium?: boolean }; className?: string };

export default function DownloadTrackButton({ track, className }: Props) {
  const { isPremium } = useEntitlement();
  const { items, enqueue, cancel } = useOfflineQueue();
  const [saved, setSaved] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();

  const queued = useMemo(() => items.find((i) => i.id === track.id), [items, track.id]);

  useEffect(() => {
    let live = true;
    hasOfflineTrack(track.id).then((v) => { if (live) setSaved(v); });
    return () => { live = false; };
  }, [track.id]);

  // React to queue outcomes: success marks saved, gated failures upsell.
  useEffect(() => {
    if (!queued) return;
    if (queued.status === "completed") {
      setSaved(true);
      return;
    }
    if (queued.status === "failed") {
      if (queued.errorCode === "OFFLINE_TRACK_PREMIUM") {
        setUpgradeFeature("Downloading premium reciters");
        setUpgradeOpen(true);
      } else if (queued.errorCode === "OFFLINE_FREE_LIMIT") {
        setUpgradeFeature("Unlimited offline downloads");
        setUpgradeOpen(true);
      } else if (!fellBackRef.current) {
        // Offline caching failed for a non-gating reason (host blocks CORS and
        // isn't proxy-allowlisted, HTTP error, network loss). Fall back to a
        // native browser download so the user still gets the MP3.
        fellBackRef.current = true;
        const url = queued.url || track.url;
        if (url) {
          try {
            const a = document.createElement("a");
            a.href = url;
            a.download = `${track.title || track.id}.mp3`;
            a.rel = "noopener";
            a.target = "_blank";
            document.body.appendChild(a);
            a.click();
            a.remove();
            diag("download", "fallback_browser", { trackId: track.id, code: queued.errorCode });
            toast.success("Couldn't save offline — downloading in your browser instead");
          } catch {
            toast.error("Download failed — please try again");
          }
        } else {
          toast.error("Download failed — please try again");
        }
      }
    }
  }, [queued, track.url, track.title, track.id]);

  const inFlight = queued?.status === "downloading" || queued?.status === "retrying" || queued?.status === "queued";

  const onClick = useCallback(async () => {
    if (inFlight) {
      cancel(track.id);
      toast.info("Download cancelled — progress is kept for resuming");
      return;
    }
    if (saved) {
      await removeOfflineTrack(track.id);
      diag("download", "removed", { trackId: track.id });
      setSaved(false);
      toast.success("Removed from downloads");
      return;
    }
    if (!track.url) {
      toast.error("This track isn't available yet");
      return;
    }
    enqueue({
      id: track.id,
      title: track.title || track.id,
      url: track.url,
      isPremium,
      trackIsPremium: track.isPremium,
    });
    toast.success(
      isPremium
        ? "Added to your download queue"
        : "Added to queue · free downloads expire after 24h",
    );
  }, [inFlight, saved, track.id, track.url, track.title, track.isPremium, isPremium, enqueue, cancel]);

  const label =
    inFlight
      ? queued?.status === "retrying"
        ? `Retrying ${queued.attempt}/${queued.maxAttempts} — tap to cancel`
        : `Downloading ${queued?.pct ?? 0}% — tap to cancel`
      : saved
        ? "Remove download"
        : "Download for offline";

  return (
    <>
      <button
        onClick={onClick}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex h-8 w-8 items-center justify-center rounded-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
          saved && !inFlight && "text-primary",
          className,
        )}
      >
        {queued?.status === "retrying" ? (
          <RotateCw className="h-4 w-4 animate-spin" />
        ) : inFlight ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : saved ? (
          <span className="relative inline-flex">
            <Check className="h-4 w-4" />
            <Trash2 className="absolute inset-0 h-4 w-4 opacity-0 transition-opacity hover:opacity-100" />
          </span>
        ) : (
          <Download className="h-4 w-4" />
        )}
      </button>
      <UpgradeSheet open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
    </>
  );
}
