/**
 * Offline Qur'an downloads: bulk queue math, enqueue/cancel/remove behaviour,
 * the offline-first playback path, resume-position restoration, and the
 * Bluetooth / lock-screen transport contract.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

const savedIdsRef = { current: [] as string[] };
const enqueued: unknown[] = [];
const cancelled: string[] = [];
const clearedQueueItems: string[] = [];
const removed: string[] = [];
const blobRef = { current: null as string | null };

vi.mock("@/lib/audioOffline", () => ({
  listOfflineIds: vi.fn(async () => savedIdsRef.current),
  removeOfflineTrack: vi.fn(async (id: string) => { removed.push(id); }),
  getOfflineBlobUrlGated: vi.fn(async () => blobRef.current),
}));

vi.mock("@/lib/offlineQueue", () => ({
  enqueueDownload: vi.fn((i: unknown) => { enqueued.push(i); }),
  cancelDownload: vi.fn((id: string) => { cancelled.push(id); }),
  clearQueueItem: vi.fn(async (id: string) => { clearedQueueItems.push(id); }),
}));

import {
  computeBulkProgress,
  enqueueWholeQuran,
  cancelWholeQuran,
  removeWholeQuran,
  isReciterTrackId,
  reciterTrackPrefix,
} from "@/lib/quranBulkDownload";
import { resolvePlaybackSource, applyResumePosition } from "@/lib/offlinePlayback";
import type { QueueItem } from "@/lib/offlineQueue";
import type { Track } from "@/data/audio";

const item = (over: Partial<QueueItem> & { id: string }): QueueItem => ({
  title: over.id,
  url: `https://cdn.test/${over.id}.mp3`,
  isPremium: true,
  status: "queued",
  pct: 0,
  attempt: 0,
  maxAttempts: 3,
  queuedAt: 1,
  ...over,
});

const makeTracks = (reciterId: string, n: number): Track[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `${reciterTrackPrefix(reciterId)}${i + 1}`,
    title: `Surah ${i + 1}`,
    url: `https://cdn.test/${i + 1}.mp3`,
  }) as unknown as Track);

beforeEach(() => {
  savedIdsRef.current = [];
  blobRef.current = null;
  enqueued.length = 0;
  cancelled.length = 0;
  clearedQueueItems.length = 0;
  removed.length = 0;
});

describe("reciter track ids", () => {
  it("scopes ids to one reciter", () => {
    expect(isReciterTrackId("q-alafasy-3", "alafasy")).toBe(true);
    expect(isReciterTrackId("q-sudais-3", "alafasy")).toBe(false);
  });
});

describe("computeBulkProgress", () => {
  const reciterId = "alafasy";
  const trackIds = makeTracks(reciterId, 4).map((t) => t.id);

  it("is idle with nothing saved or queued", () => {
    const p = computeBulkProgress({ reciterId, trackIds, savedIds: [], items: [] });
    expect(p).toMatchObject({ total: 4, saved: 0, active: 0, pct: 0, status: "idle" });
  });

  it("counts in-flight percentage as fractional progress", () => {
    const p = computeBulkProgress({
      reciterId,
      trackIds,
      savedIds: [trackIds[0]],
      items: [item({ id: trackIds[1], status: "downloading", pct: 50 })],
    });
    // 1 saved + 0.5 of 4 => 38%
    expect(p.status).toBe("downloading");
    expect(p.active).toBe(1);
    expect(p.pct).toBe(38);
  });

  it("treats completed queue rows as saved so the bar never regresses", () => {
    const p = computeBulkProgress({
      reciterId,
      trackIds,
      savedIds: [],
      items: trackIds.map((id) => item({ id, status: "completed", pct: 100 })),
    });
    expect(p).toMatchObject({ saved: 4, pct: 100, status: "complete" });
  });

  it("reports partial when some surahs are saved and nothing is running", () => {
    const p = computeBulkProgress({
      reciterId,
      trackIds,
      savedIds: [trackIds[0], trackIds[2]],
      items: [item({ id: trackIds[3], status: "failed", pct: 10 })],
    });
    expect(p.status).toBe("partial");
    expect(p.failed).toBe(1);
    expect(p.saved).toBe(2);
  });

  it("ignores queue rows from other reciters", () => {
    const p = computeBulkProgress({
      reciterId,
      trackIds,
      savedIds: [],
      items: [item({ id: "q-sudais-1", status: "downloading", pct: 90 })],
    });
    expect(p.active).toBe(0);
    expect(p.pct).toBe(0);
  });
});

describe("bulk download queue", () => {
  const reciterId = "alafasy";

  it("queues every surah with a URL", async () => {
    const tracks = makeTracks(reciterId, 114);
    const n = await enqueueWholeQuran(reciterId, { isPremium: true, tracks });
    expect(n).toBe(114);
    expect(enqueued).toHaveLength(114);
  });

  it("skips already-downloaded surahs so re-tapping resumes", async () => {
    const tracks = makeTracks(reciterId, 5);
    savedIdsRef.current = [tracks[0].id, tracks[1].id];
    const n = await enqueueWholeQuran(reciterId, { isPremium: true, tracks });
    expect(n).toBe(3);
  });

  it("skips tracks without a verified URL", async () => {
    const tracks = makeTracks(reciterId, 3).map((t, i) =>
      i === 1 ? ({ ...t, url: "" } as Track) : t,
    );
    expect(await enqueueWholeQuran(reciterId, { isPremium: true, tracks })).toBe(2);
  });

  it("cancels only active rows for this reciter", () => {
    const ids = makeTracks(reciterId, 3).map((t) => t.id);
    const n = cancelWholeQuran(reciterId, [
      item({ id: ids[0], status: "downloading" }),
      item({ id: ids[1], status: "completed" }),
      item({ id: "q-sudais-1", status: "downloading" }),
      item({ id: ids[2], status: "retrying" }),
    ]);
    expect(n).toBe(2);
    expect(cancelled).toEqual([ids[0], ids[2]]);
  });

  it("removes saved surahs and clears their queue rows", async () => {
    const ids = makeTracks(reciterId, 3).map((t) => t.id);
    savedIdsRef.current = [...ids, "q-sudais-9"];
    const n = await removeWholeQuran(reciterId, {
      trackIds: ids,
      items: [item({ id: ids[0], status: "completed" })],
    });
    expect(n).toBe(3);
    expect(removed).toEqual(ids);
    expect(removed).not.toContain("q-sudais-9");
    expect(clearedQueueItems).toEqual([ids[0]]);
  });
});

describe("offline playback path", () => {
  it("prefers the cached blob over the network URL", async () => {
    blobRef.current = "blob:heartify/abc";
    const res = await resolvePlaybackSource({ id: "q-alafasy-1", url: "https://cdn.test/1.mp3" });
    expect(res).toEqual({ src: "blob:heartify/abc", offline: true });
  });

  it("falls back to streaming when nothing is cached", async () => {
    const res = await resolvePlaybackSource({ id: "q-alafasy-1", url: "https://cdn.test/1.mp3" });
    expect(res).toEqual({ src: "https://cdn.test/1.mp3", offline: false });
  });

  it("returns null when there is neither a blob nor a URL", async () => {
    expect(await resolvePlaybackSource({ id: "x", url: "" })).toBeNull();
  });
});

describe("resume position", () => {
  const fakeAudio = (readyState: number) => {
    const listeners: Record<string, (() => void)[]> = {};
    return {
      currentTime: 0,
      readyState,
      addEventListener: (t: string, fn: () => void) => {
        (listeners[t] ??= []).push(fn);
      },
      removeEventListener: (t: string, fn: () => void) => {
        listeners[t] = (listeners[t] ?? []).filter((f) => f !== fn);
      },
      fire: (t: string) => [...(listeners[t] ?? [])].forEach((f) => f()),
      listeners,
    };
  };

  it("seeks immediately when metadata is already loaded (offline blob)", () => {
    const a = fakeAudio(2);
    applyResumePosition(a, 120);
    expect(a.currentTime).toBe(120);
  });

  it("waits for loadedmetadata on iOS/Android streams", () => {
    const a = fakeAudio(0);
    applyResumePosition(a, 95);
    expect(a.currentTime).toBe(0);
    a.fire("loadedmetadata");
    expect(a.currentTime).toBe(95);
    expect(a.listeners.loadedmetadata).toHaveLength(0);
  });

  it("ignores negligible or invalid positions", () => {
    const a = fakeAudio(2);
    applyResumePosition(a, 3);
    applyResumePosition(a, Number.NaN);
    expect(a.currentTime).toBe(0);
  });
});

describe("lock-screen & Bluetooth transport contract", () => {
  const src = readFileSync(
    path.resolve(process.cwd(), "src/contexts/PlayerContext.tsx"),
    "utf8",
  );

  // Bluetooth headsets/car units send AVRCP commands that the browser surfaces
  // as Media Session actions. Missing handlers = dead buttons on the device.
  it.each([
    "play",
    "pause",
    "stop",
    "previoustrack",
    "nexttrack",
    "seekbackward",
    "seekforward",
    "seekto",
  ])("handles the %s media session action", (action) => {
    expect(src).toContain(`safe("${action}"`);
  });

  it("keeps playbackState and position state in sync for the OS widget", () => {
    expect(src).toContain("navigator.mediaSession.playbackState");
    expect(src).toContain("setPositionState");
  });
});
