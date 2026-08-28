import { CloudOff, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Playback-source indicator: tells the listener, before they tap, whether a
 * surah will play from the device or stream over the network.
 */
export function OfflineBadge({
  offline,
  showStreaming = false,
  className,
}: {
  offline: boolean;
  /** Also render an explicit "Streams" chip when the track isn't cached. */
  showStreaming?: boolean;
  className?: string;
}) {
  if (!offline && !showStreaming) return null;
  const label = offline ? "Offline available" : "Streams";
  const Icon = offline ? CloudOff : Wifi;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-micro font-medium",
        offline
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border bg-secondary text-muted-foreground",
        className,
      )}
      title={offline ? "Plays without an internet connection" : "Needs a connection to play"}
    >
      <Icon className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}

/** Summary chip for a reciter: how many of the 114 surahs are on-device. */
export function OfflineCountBadge({
  available,
  total,
  className,
}: {
  available: number;
  total: number;
  className?: string;
}) {
  if (available <= 0) return null;
  const complete = total > 0 && available >= total;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-micro font-medium text-primary",
        className,
      )}
      title={
        complete
          ? "Every surah is downloaded — plays fully offline"
          : `${available} of ${total} surahs play without a connection`
      }
    >
      <CloudOff className="h-3 w-3" aria-hidden />
      {complete ? "Fully offline" : `${available}/${total} offline`}
    </span>
  );
}

export default OfflineBadge;
