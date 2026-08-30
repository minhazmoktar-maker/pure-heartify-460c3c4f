/**
 * Download control for first-party Heartify uploads.
 *
 * Only rendered for native uploads (we never cache third-party bytes). Shows
 * live progress, resumes interrupted transfers, and turns into a "Downloaded"
 * state with a delete action once the blob is stored.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Download, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getVideoPartialProgress,
  hasOfflineVideo,
  removeOfflineVideo,
  saveOfflineVideo,
} from "@/lib/offlineVideo";
import { formatBytes } from "@/lib/offlineStorage";

interface Props {
  uploadId: string;
  title: string;
  /** Short-lived signed playback URL for the upload. */
  url: string | null;
  creator?: string | null;
  language?: string | null;
}

export default function VideoDownloadButton({ uploadId, title, url, creator, language }: Props) {
  const [saved, setSaved] = useState(false);
  const [pct, setPct] = useState<number | null>(null);
  const [partialBytes, setPartialBytes] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    setSaved(await hasOfflineVideo(uploadId));
    const partial = await getVideoPartialProgress(uploadId);
    setPartialBytes(partial?.received ?? null);
  }, [uploadId]);

  useEffect(() => {
    void refresh();
    return () => abortRef.current?.abort();
  }, [refresh]);

  async function start() {
    if (!url) {
      toast.error("Playback isn't ready yet — try again in a moment.");
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setPct(0);
    try {
      await saveOfflineVideo(
        { id: uploadId, url, title, creator, language },
        {
          signal: controller.signal,
          onProgress: setPct,
          onRetry: ({ attempt, maxAttempts }) =>
            toast.info(`Connection dropped — retrying (${attempt}/${maxAttempts})`),
        },
      );
      setSaved(true);
      toast.success("Saved for offline watching");
    } catch (error) {
      const err = error as Error;
      if (err.name !== "AbortError") toast.error(err.message || "Download failed");
    } finally {
      setPct(null);
      abortRef.current = null;
      void refresh();
    }
  }

  async function remove() {
    await removeOfflineVideo(uploadId);
    await refresh();
    toast.success("Download removed");
  }

  if (pct !== null) {
    return (
      <div className="flex items-center gap-3" data-testid="video-download-progress">
        <Progress value={pct} className="h-2 w-28" />
        <span className="text-xs text-muted-foreground">{pct}%</span>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 gap-1"
          onClick={() => abortRef.current?.abort()}
          aria-label="Cancel download"
        >
          <X className="h-4 w-4" /> Cancel
        </Button>
      </div>
    );
  }

  if (saved) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          data-testid="video-download-saved"
        >
          <Check className="h-3.5 w-3.5" /> Available offline
        </span>
        <Button size="sm" variant="ghost" className="h-9 gap-1" onClick={remove} aria-label="Remove download">
          <Trash2 className="h-4 w-4" /> Remove
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="secondary"
      className="h-9 gap-2"
      onClick={start}
      disabled={!url}
      data-testid="video-download-button"
    >
      {url ? <Download className="h-4 w-4" /> : <Loader2 className="h-4 w-4 animate-spin" />}
      {partialBytes ? `Resume (${formatBytes(partialBytes)} saved)` : "Download"}
    </Button>
  );
}
