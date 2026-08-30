/**
 * /offline/videos — downloaded Heartify Originals, playable with no network.
 *
 * Playback reads the Blob straight out of IndexedDB, so the list works in
 * airplane mode. Object URLs are revoked when the selection changes.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Film, Play, Trash2 } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import EmptyState from "@/components/EmptyState";
import {
  clearAllOfflineVideos,
  getOfflineVideoUrl,
  listOfflineVideos,
  removeOfflineVideo,
  totalOfflineVideoBytes,
  type OfflineVideoMeta,
} from "@/lib/offlineVideo";
import { formatBytes } from "@/lib/offlineStorage";

export default function OfflineVideos() {
  const [rows, setRows] = useState<OfflineVideoMeta[]>([]);
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);

  const refresh = useCallback(async () => {
    setRows(await listOfflineVideos());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return () => {
      if (playing) URL.revokeObjectURL(playing.url);
    };
  }, [playing]);

  const total = useMemo(() => totalOfflineVideoBytes(rows), [rows]);

  async function play(id: string) {
    const url = await getOfflineVideoUrl(id);
    if (!url) {
      toast.error("This download is no longer available.");
      void refresh();
      return;
    }
    setPlaying((prev) => {
      if (prev) URL.revokeObjectURL(prev.url);
      return { id, url };
    });
  }

  async function remove(id: string) {
    if (playing?.id === id) {
      URL.revokeObjectURL(playing.url);
      setPlaying(null);
    }
    await removeOfflineVideo(id);
    await refresh();
    toast.success("Download removed");
  }

  async function clearEverything() {
    if (playing) {
      URL.revokeObjectURL(playing.url);
      setPlaying(null);
    }
    const n = await clearAllOfflineVideos();
    await refresh();
    toast.success(n > 0 ? `Cleared ${n} video${n === 1 ? "" : "s"}` : "Nothing to clear");
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Downloaded videos — Heartify"
        description="Watch your downloaded Heartify Originals with no internet connection."
        path="/offline/videos"
      />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <PageHeader
          title="Downloaded videos"
          subtitle="Heartify Originals saved on this device — they play without internet."
          icon={Film}
          backHref="/offline"
        />

        {rows.length === 0 ? (
          <EmptyState
            icon={Film}
            title="No downloaded videos yet"
            description="Open a Heartify Original and tap Download to keep it on this device."
            action={
              <Button asChild className="h-11">
                <Link to="/originals">Browse Heartify Originals</Link>
              </Button>
            }
          />
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between gap-3 rounded-card border p-4">
              <div>
                <p className="text-micro uppercase tracking-wide text-muted-foreground">Downloaded videos</p>
                <p className="text-lg font-semibold text-foreground">
                  {rows.length} · {formatBytes(total)}
                </p>
              </div>
              <Button variant="outline" className="h-10 gap-2" onClick={clearEverything}>
                <Trash2 className="h-4 w-4" /> Clear all
              </Button>
            </div>

            {playing && (
              <video
                key={playing.url}
                src={playing.url}
                controls
                autoPlay
                playsInline
                className="mb-4 aspect-video w-full rounded-xl border border-border bg-black"
                data-testid="offline-video-player"
              />
            )}

            <ul className="space-y-2" aria-label="Downloaded videos">
              {rows.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center justify-between gap-3 rounded-card border p-3"
                  data-testid="offline-video-row"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{row.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {row.creator ? `${row.creator} · ` : ""}
                      {formatBytes(row.bytes)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-9 gap-1"
                      onClick={() => play(row.id)}
                      aria-label={`Play ${row.title}`}
                    >
                      <Play className="h-4 w-4" /> Play
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-9"
                      onClick={() => remove(row.id)}
                      aria-label={`Remove ${row.title}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
