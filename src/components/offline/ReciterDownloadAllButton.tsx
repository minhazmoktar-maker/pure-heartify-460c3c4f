import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Loader2, X, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import type { Track } from "@/data/audio";
import { useEntitlement } from "@/hooks/useEntitlement";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import { listOfflineIds } from "@/lib/audioOffline";
import {
  computeBulkProgress,
  enqueueWholeQuran,
  cancelWholeQuran,
  removeWholeQuran,
} from "@/lib/quranBulkDownload";
import UpgradeSheet from "@/components/premium/UpgradeSheet";
import { cn } from "@/lib/utils";

interface Props {
  reciterId: string;
  reciterName: string;
  tracks: Track[];
  className?: string;
}

/**
 * "Download whole Qur'an" control for one reciter: start, live progress,
 * cancel while running, and remove everything once saved.
 */
export default function ReciterDownloadAllButton({
  reciterId,
  reciterName,
  tracks,
  className,
}: Props) {
  const { isPremium } = useEntitlement();
  const { items } = useOfflineQueue();
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const trackIds = useMemo(() => tracks.map((t) => t.id), [tracks]);

  const refreshSaved = useCallback(async () => {
    const ids = await listOfflineIds();
    setSavedIds(ids);
  }, []);

  useEffect(() => { void refreshSaved(); }, [refreshSaved, items]);

  const progress = useMemo(
    () => computeBulkProgress({ reciterId, trackIds, savedIds, items }),
    [reciterId, trackIds, savedIds, items],
  );

  const gated = items.some(
    (i) => trackIds.includes(i.id) && i.errorCode === "OFFLINE_FREE_LIMIT",
  );
  useEffect(() => { if (gated) setUpgradeOpen(true); }, [gated]);

  const start = useCallback(async () => {
    if (tracks.length === 0) return;
    if (!isPremium) {
      // 114 surahs far exceed the free offline allowance — upsell up front
      // instead of letting 109 downloads fail one by one.
      setUpgradeOpen(true);
      return;
    }
    setBusy(true);
    try {
      const queued = await enqueueWholeQuran(reciterId, { isPremium, tracks });
      toast.success(
        queued === 0
          ? `Whole Qur'an already downloaded — ${reciterName}`
          : `Downloading ${queued} surahs — ${reciterName}`,
      );
    } finally {
      setBusy(false);
    }
  }, [isPremium, reciterId, reciterName, tracks]);

  const cancel = useCallback(() => {
    const n = cancelWholeQuran(reciterId, items);
    toast.info(`Cancelled ${n} downloads — progress is kept for resuming`);
  }, [reciterId, items]);

  const removeAll = useCallback(async () => {
    setBusy(true);
    try {
      const n = await removeWholeQuran(reciterId, { trackIds, items });
      await refreshSaved();
      toast.success(`Removed ${n} downloaded surahs`);
    } finally {
      setBusy(false);
    }
  }, [reciterId, trackIds, items, refreshSaved]);

  if (tracks.length === 0) return null;

  const downloading = progress.status === "downloading";

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {downloading ? (
          <button
            type="button"
            onClick={cancel}
            aria-label="Cancel whole Qur'an download"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-pill border border-border px-4 text-sm font-semibold text-foreground hover:bg-secondary"
          >
            <X className="h-4 w-4" />
            Cancel ({progress.pct}%)
          </button>
        ) : (
          <button
            type="button"
            onClick={start}
            disabled={busy || progress.status === "complete"}
            aria-label="Download whole Qur'an for offline listening"
            className={cn(
              "inline-flex min-h-[44px] items-center gap-2 rounded-pill px-4 text-sm font-semibold transition-colors",
              progress.status === "complete"
                ? "bg-secondary text-muted-foreground"
                : "border border-border text-foreground hover:bg-secondary",
            )}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : progress.status === "complete" ? (
              <Check className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {progress.status === "complete"
              ? "Whole Qur'an downloaded"
              : progress.status === "partial"
                ? `Resume download (${progress.saved}/${progress.total})`
                : "Download whole Qur'an"}
          </button>
        )}

        {progress.saved > 0 && (
          <button
            type="button"
            onClick={removeAll}
            disabled={busy}
            aria-label="Remove all downloaded surahs for this reciter"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-pill px-3 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" />
            Remove
          </button>
        )}
      </div>

      {(downloading || progress.status === "partial") && (
        <div>
          <div
            role="progressbar"
            aria-valuenow={progress.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Whole Qur'an download progress"
            className="h-1.5 w-full overflow-hidden rounded-pill bg-secondary"
          >
            <div className="h-full bg-primary transition-all" style={{ width: `${progress.pct}%` }} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {progress.saved}/{progress.total} surahs saved
            {progress.active > 0 ? ` · ${progress.active} in progress` : ""}
            {progress.failed > 0 ? ` · ${progress.failed} failed` : ""}
          </p>
        </div>
      )}

      <UpgradeSheet
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        feature="Downloading the whole Qur'an offline"
      />
    </div>
  );
}
