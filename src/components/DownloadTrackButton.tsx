import { useCallback, useEffect, useState } from "react";
import { Download, Check, Loader2, Trash2 } from "lucide-react";
import type { Track } from "@/data/audio";
import { toast } from "sonner";
import {
  hasOfflineTrack,
  saveOfflineTrack,
  removeOfflineTrack,
} from "@/lib/audioOffline";
import { cn } from "@/lib/utils";

type Props = { track: Track; className?: string };

export default function DownloadTrackButton({ track, className }: Props) {
  const [status, setStatus] = useState<"idle" | "saved" | "downloading">("idle");
  const [pct, setPct] = useState(0);

  useEffect(() => {
    let live = true;
    hasOfflineTrack(track.id).then((v) => {
      if (live) setStatus(v ? "saved" : "idle");
    });
    return () => { live = false; };
  }, [track.id]);

  const onClick = useCallback(async () => {
    if (status === "downloading") return;
    if (status === "saved") {
      await removeOfflineTrack(track.id);
      setStatus("idle");
      toast.success("Removed from downloads");
      return;
    }
    try {
      setStatus("downloading");
      setPct(0);
      await saveOfflineTrack(track.id, track.audioUrl, setPct);
      setStatus("saved");
      toast.success("Saved for offline listening");
    } catch (e: unknown) {
      setStatus("idle");
      toast.error(e instanceof Error ? e.message : "Download failed");
    }
  }, [status, track.id, track.audioUrl]);

  const label =
    status === "saved" ? "Remove download"
    : status === "downloading" ? `Downloading ${pct}%`
    : "Download for offline";

  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
        status === "saved" && "text-primary",
        className,
      )}
    >
      {status === "downloading" ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : status === "saved" ? (
        <span className="relative inline-flex">
          <Check className="h-4 w-4" />
          <Trash2 className="absolute inset-0 h-4 w-4 opacity-0 transition-opacity hover:opacity-100" />
        </span>
      ) : (
        <Download className="h-4 w-4" />
      )}
    </button>
  );
}
