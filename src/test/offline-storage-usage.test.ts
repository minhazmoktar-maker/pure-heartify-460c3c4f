/**
 * Storage-usage aggregation for the offline downloads screen and the
 * background-download re-arming contract.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  formatBytes,
  parseSurahTrackId,
  groupUsageByReciter,
  totalOfflineBytes,
} from "@/lib/offlineStorage";
import type { OfflineUsageRow } from "@/lib/audioOffline";

const row = (id: string, bytes: number, plan: "free" | "premium" = "premium"): OfflineUsageRow => ({
  id, bytes, plan, savedAt: 1, expiresAt: plan === "premium" ? null : 2,
});

describe("formatBytes", () => {
  it("scales KB / MB / GB and never shows negative sizes", () => {
    expect(formatBytes(0)).toBe("0 MB");
    expect(formatBytes(-10)).toBe("0 MB");
    expect(formatBytes(200 * 1024)).toBe("200 KB");
    expect(formatBytes(5.5 * 1_048_576)).toBe("5.5 MB");
    expect(formatBytes(250 * 1_048_576)).toBe("250 MB");
    expect(formatBytes(3 * 1024 * 1_048_576)).toBe("3.00 GB");
  });
});

describe("parseSurahTrackId", () => {
  it("extracts reciter and surah for canonical Qur'an ids", () => {
    expect(parseSurahTrackId("q-alafasy-36")).toEqual({ reciterId: "alafasy", surah: 36 });
    expect(parseSurahTrackId("q-mishary-al-afasy-114")).toEqual({
      reciterId: "mishary-al-afasy", surah: 114,
    });
  });

  it("rejects non-Qur'an and out-of-range ids", () => {
    expect(parseSurahTrackId("lecture-123")).toBeNull();
    expect(parseSurahTrackId("q-alafasy-0")).toBeNull();
    expect(parseSurahTrackId("q-alafasy-115")).toBeNull();
  });
});

describe("groupUsageByReciter", () => {
  const rows = [
    row("q-a-2", 30_000_000),
    row("q-a-1", 10_000_000),
    row("q-b-1", 5_000_000),
    row("podcast-9", 1_000_000, "free"),
  ];

  it("totals every cached file", () => {
    expect(totalOfflineBytes(rows)).toBe(46_000_000);
    expect(totalOfflineBytes([])).toBe(0);
  });

  it("groups per reciter, largest first, with surahs in order", () => {
    const groups = groupUsageByReciter(rows);
    expect(groups.map((g) => g.reciterId)).toEqual(["a", "b", "other"]);
    expect(groups[0]).toMatchObject({ bytes: 40_000_000, count: 2 });
    expect(groups[0].rows.map((r) => r.id)).toEqual(["q-a-1", "q-a-2"]);
    expect(groups[2].count).toBe(1);
  });
});

/* ------------------------------------------------ background continuation */

const nudgeQueue = vi.fn(() => 2);
const resumeInterruptedDownloads = vi.fn(async () => 2);

vi.mock("@/lib/offlineQueue", () => ({
  nudgeQueue: (...a: unknown[]) => nudgeQueue(...(a as [])),
  resumeInterruptedDownloads: () => resumeInterruptedDownloads(),
}));
vi.mock("@/lib/diagnostics", () => ({ diag: vi.fn() }));

describe("background downloads", () => {
  beforeEach(() => {
    vi.resetModules();
    nudgeQueue.mockClear();
    resumeInterruptedDownloads.mockClear();
    vi.useRealTimers();
  });

  it("re-arms the queue when the app returns to the foreground", async () => {
    const { startBackgroundDownloads } = await import("@/lib/offlineBackground");
    const stop = startBackgroundDownloads();

    Object.defineProperty(document, "visibilityState", { value: "visible", configurable: true });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(nudgeQueue).toHaveBeenCalledTimes(1);
    expect(resumeInterruptedDownloads).toHaveBeenCalledTimes(1);

    // Focus + online fire together on a real resume — they must coalesce.
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
    expect(nudgeQueue).toHaveBeenCalledTimes(1);

    stop();
    window.dispatchEvent(new Event("focus"));
    expect(nudgeQueue).toHaveBeenCalledTimes(1);
  });
});
