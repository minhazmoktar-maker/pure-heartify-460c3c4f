/**
 * Bulk ("whole Qur'an") offline download helpers for a single reciter.
 *
 * Every reciter surah track uses the deterministic id `q-<reciterId>-<n>`
 * (see `data/reciterCatalog`), so a reciter's download set can be derived from
 * the shared offline queue without extra bookkeeping.
 *
 * This module is intentionally free of React so the queue math can be unit
 * tested in isolation.
 */
import type { Track } from "@/data/audio";
import { reciterQuranTracks } from "@/data/reciterCatalog";
import {
  enqueueDownload,
  cancelDownload,
  clearQueueItem,
  type QueueItem,
} from "@/lib/offlineQueue";
import { listOfflineIds, removeOfflineTrack } from "@/lib/audioOffline";

export const reciterTrackPrefix = (reciterId: string) => `q-${reciterId}-`;

export function isReciterTrackId(id: string, reciterId: string): boolean {
  return id.startsWith(reciterTrackPrefix(reciterId));
}

export type BulkStatus = "idle" | "downloading" | "complete" | "partial";

export interface BulkProgress {
  total: number;
  saved: number;
  active: number;
  failed: number;
  /** 0-100, counting completed surahs plus in-flight percentages. */
  pct: number;
  status: BulkStatus;
}

/**
 * Progress for one reciter's complete-Qur'an download.
 *
 * `savedIds` are ids already persisted in IndexedDB; queue items contribute
 * fractional progress so the bar moves while a large surah streams in.
 */
export function computeBulkProgress(params: {
  reciterId: string;
  trackIds: string[];
  savedIds: string[];
  items: QueueItem[];
}): BulkProgress {
  const { reciterId, trackIds, savedIds, items } = params;
  const total = trackIds.length;
  const wanted = new Set(trackIds);
  const savedSet = new Set(savedIds.filter((id) => wanted.has(id)));
  const mine = items.filter((i) => wanted.has(i.id) && isReciterTrackId(i.id, reciterId));

  const active = mine.filter((i) =>
    i.status === "queued" || i.status === "downloading" || i.status === "retrying",
  );
  const failed = mine.filter((i) => i.status === "failed").length;

  // Completed queue items are treated as saved even if the IndexedDB listing
  // hasn't been refreshed yet — avoids the bar snapping backwards.
  for (const i of mine) if (i.status === "completed") savedSet.add(i.id);

  const partialPct = active.reduce((sum, i) => sum + Math.min(99, i.pct) / 100, 0);
  const saved = savedSet.size;
  const pct = total === 0 ? 0 : Math.min(100, Math.round(((saved + partialPct) / total) * 100));

  let status: BulkStatus = "idle";
  if (active.length > 0) status = "downloading";
  else if (total > 0 && saved >= total) status = "complete";
  else if (saved > 0) status = "partial";

  return { total, saved, active: active.length, failed, pct, status };
}

/**
 * Queues every not-yet-saved surah for a reciter. Returns how many were added.
 * Already-cached surahs are skipped so re-tapping resumes rather than restarts.
 */
export async function enqueueWholeQuran(
  reciterId: string,
  opts: { isPremium: boolean; tracks?: Track[] },
): Promise<number> {
  const tracks = (opts.tracks ?? reciterQuranTracks(reciterId)).filter((t) => Boolean(t.url));
  if (tracks.length === 0) return 0;
  const saved = new Set(await listOfflineIds());
  let queued = 0;
  for (const t of tracks) {
    if (saved.has(t.id)) continue;
    enqueueDownload({
      id: t.id,
      title: t.title || t.id,
      url: t.url,
      isPremium: opts.isPremium,
      trackIsPremium: t.isPremium,
    });
    queued++;
  }
  return queued;
}

/** Cancels all in-flight/queued surahs for a reciter (partial bytes kept). */
export function cancelWholeQuran(reciterId: string, items: QueueItem[]): number {
  const mine = items.filter(
    (i) =>
      isReciterTrackId(i.id, reciterId) &&
      (i.status === "queued" || i.status === "downloading" || i.status === "retrying"),
  );
  for (const i of mine) cancelDownload(i.id);
  return mine.length;
}

/** Deletes every saved surah for a reciter and clears its queue rows. */
export async function removeWholeQuran(
  reciterId: string,
  opts: { trackIds: string[]; items: QueueItem[] },
): Promise<number> {
  cancelWholeQuran(reciterId, opts.items);
  const wanted = new Set(opts.trackIds);
  const saved = (await listOfflineIds()).filter((id) => wanted.has(id));
  for (const id of saved) await removeOfflineTrack(id);
  for (const i of opts.items) {
    if (wanted.has(i.id)) await clearQueueItem(i.id);
  }
  return saved.length;
}
