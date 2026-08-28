/** Progress UI for the per-reciter "Download whole Qur'an" control. */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Track } from "@/data/audio";
import type { QueueItem } from "@/lib/offlineQueue";

const state = {
  isPremium: true,
  items: [] as QueueItem[],
  savedIds: [] as string[],
};

vi.mock("@/hooks/useEntitlement", () => ({
  useEntitlement: () => ({ isPremium: state.isPremium, loading: false }),
}));
vi.mock("@/hooks/useOfflineQueue", () => ({
  useOfflineQueue: () => ({ items: state.items }),
}));
vi.mock("@/lib/audioOffline", () => ({
  listOfflineIds: vi.fn(async () => state.savedIds),
  removeOfflineTrack: vi.fn(async () => {}),
}));
vi.mock("@/components/premium/UpgradeSheet", () => ({ default: () => null }));

import ReciterDownloadAllButton from "@/components/offline/ReciterDownloadAllButton";

const tracks = Array.from({ length: 10 }, (_, i) => ({
  id: `q-alafasy-${i + 1}`,
  title: `Surah ${i + 1}`,
  url: `https://cdn.test/${i + 1}.mp3`,
}) as unknown as Track);

const item = (over: Partial<QueueItem> & { id: string }): QueueItem => ({
  title: over.id,
  url: "https://cdn.test/x.mp3",
  isPremium: true,
  status: "downloading",
  pct: 0,
  attempt: 1,
  maxAttempts: 3,
  queuedAt: 1,
  ...over,
});

const view = () =>
  render(
    <ReciterDownloadAllButton reciterId="alafasy" reciterName="Alafasy" tracks={tracks} />,
  );

beforeEach(() => {
  state.isPremium = true;
  state.items = [];
  state.savedIds = [];
});

describe("ReciterDownloadAllButton", () => {
  it("offers the whole-Qur'an download when nothing is cached", async () => {
    view();
    expect(await screen.findByRole("button", { name: /download whole qur'an/i })).toBeTruthy();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("shows cancel plus a live progress bar while downloading", async () => {
    state.items = [item({ id: tracks[0].id, status: "downloading", pct: 50 })];
    state.savedIds = [tracks[1].id, tracks[2].id];
    view();
    expect(await screen.findByRole("button", { name: /cancel whole qur'an download/i })).toBeTruthy();
    const bar = await screen.findByRole("progressbar");
    // 2 saved + 0.5 in flight of 10 tracks => 25%
    expect(bar.getAttribute("aria-valuenow")).toBe("25");
    expect(screen.getByText(/2\/10 surahs saved/i)).toBeTruthy();
  });

  it("offers resume and remove when the download is partial", async () => {
    state.savedIds = tracks.slice(0, 4).map((t) => t.id);
    view();
    expect(await screen.findByRole("button", { name: /download whole qur'an/i })).toBeTruthy();
    expect(screen.getByText(/resume download \(4\/10\)/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /remove all downloaded surahs/i })).toBeTruthy();
  });

  it("marks the set complete once every surah is saved", async () => {
    state.savedIds = tracks.map((t) => t.id);
    view();
    const btn = await screen.findByRole("button", { name: /download whole qur'an/i });
    expect(btn.textContent).toMatch(/whole qur'an downloaded/i);
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it("renders nothing when the reciter has no verified recording", () => {
    const { container } = render(
      <ReciterDownloadAllButton reciterId="x" reciterName="X" tracks={[]} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
