import { useCallback, useEffect, useState } from "react";
import { Download, Check, Loader2, Trash2 } from "lucide-react";
import type { Track } from "@/data/audio";
import { toast } from "sonner";
import {
  hasOfflineTrack,
  saveOfflineTrackGated,
  removeOfflineTrack,
} from "@/lib/audioOffline";
import { useEntitlement } from "@/hooks/useEntitlement";
import UpgradeSheet from "@/components/premium/UpgradeSheet";
import { cn } from "@/lib/utils";

type Props = { track: Track & { isPremium?: boolean }; className?: string };

export default function DownloadTrackButton({ track, className }: Props) {
  const { isPremium } = useEntitlement();
  const [status, setStatus] = useState<"idle" | "saved" | "downloading">("idle");
  const [pct, setPct] = useState(0);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<string | undefined>();

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
    if (!track.url) {
      toast.error("This track isn't available yet");
      return;
    }
    try {
      setStatus("downloading");
      setPct(0);
      await saveOfflineTrackGated(track.id, track.url, {
        isPremium,
        trackIsPremium: track.isPremium,
        onProgress: setPct,
      });
      setStatus("saved");
      toast.success(
        isPremium
          ? "Saved for offline listening"
          : "Saved · free downloads expire after 24h",
      );
    } catch (e: unknown) {
      setStatus("idle");
      const code = (e as { code?: string })?.code;
      if (code === "OFFLINE_TRACK_PREMIUM") {
        setUpgradeFeature("Downloading premium reciters");
        setUpgradeOpen(true);
      } else if (code === "OFFLINE_FREE_LIMIT") {
        setUpgradeFeature("Unlimited offline downloads");
        setUpgradeOpen(true);
      } else {
        toast.error(e instanceof Error ? e.message : "Download failed");
      }
    }
  }, [status, track.id, track.url, track.isPremium, isPremium]);

  const label =
    status === "saved" ? "Remove download"
    : status === "downloading" ? `Downloading ${pct}%`
    : "Download for offline";

  return (
    <>
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
      <UpgradeSheet open={upgradeOpen} onOpenChange={setUpgradeOpen} feature={upgradeFeature} />
    </>
  );
}
