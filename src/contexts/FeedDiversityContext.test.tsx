import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  FeedDiversityProvider,
  useFeedDiversity,
  readDedupAudit,
  clearDedupAudit,
} from "./FeedDiversityContext";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => (
  <FeedDiversityProvider>{children}</FeedDiversityProvider>
);

describe("FeedDiversityContext — cross-rail dedup", () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    clearDedupAudit();
  });

  it("blocks the same video from two different rails and logs it", () => {
    const { result } = renderHook(() => useFeedDiversity(), { wrapper });

    let firstWon = false;
    let secondWon = true;
    act(() => {
      firstWon = result.current.claim("vidA", "surface:for_you");
      secondWon = result.current.claim("vidA", "surface:trending");
    });

    expect(firstWon).toBe(true);
    expect(secondWon).toBe(false);

    const audit = readDedupAudit();
    expect(audit).toHaveLength(1);
    expect(audit[0]).toMatchObject({
      videoId: "vidA",
      attemptedFrom: "surface:trending",
      claimedBy: "surface:for_you",
    });
  });

  it("claimMany filters out already-seen ids across sources", () => {
    const { result } = renderHook(() => useFeedDiversity(), { wrapper });
    const rail1 = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const rail2 = [{ id: "b" }, { id: "c" }, { id: "d" }];

    let got1: { id: string }[] = [];
    let got2: { id: string }[] = [];
    act(() => {
      got1 = result.current.claimMany(rail1, "rail1");
      got2 = result.current.claimMany(rail2, "rail2");
    });

    expect(got1.map((v) => v.id)).toEqual(["a", "b", "c"]);
    expect(got2.map((v) => v.id)).toEqual(["d"]);
    expect(readDedupAudit()).toHaveLength(2);
  });

  it("persists the seen-set across provider unmount (session survival)", () => {
    const first = renderHook(() => useFeedDiversity(), { wrapper });
    act(() => {
      first.result.current.claim("persistent", "railA");
    });
    first.unmount();

    // Simulate a route navigation: brand-new provider tree, same session.
    const second = renderHook(() => useFeedDiversity(), { wrapper });
    let won = true;
    act(() => {
      won = second.result.current.claim("persistent", "railB");
    });
    expect(won).toBe(false);
  });

  it("reset() clears the seen-set and lets ids be re-claimed (pull-to-refresh)", () => {
    const { result } = renderHook(() => useFeedDiversity(), { wrapper });
    act(() => {
      result.current.claim("v1", "rail1");
    });
    expect(result.current.claim("v1", "rail2")).toBe(false);

    act(() => {
      result.current.reset();
    });
    let won = false;
    act(() => {
      won = result.current.claim("v1", "rail3");
    });
    expect(won).toBe(true);
  });

  it("getSeenSnapshot returns the exact set for server-side exclude", () => {
    const { result } = renderHook(() => useFeedDiversity(), { wrapper });
    act(() => {
      result.current.claimMany(
        [{ id: "x" }, { id: "y" }, { id: "z" }],
        "rail1",
      );
    });
    const snap = result.current.getSeenSnapshot().sort();
    expect(snap).toEqual(["x", "y", "z"]);
  });

  it("simulates high-volume cross-rail + infinite grid — zero duplicates render", () => {
    const { result } = renderHook(() => useFeedDiversity(), { wrapper });
    // 5 rails, each returns 20 items, with 30% overlap between adjacent rails.
    const rails = Array.from({ length: 5 }, (_, r) =>
      Array.from({ length: 20 }, (_, i) => ({ id: `v${r * 14 + i}` })),
    );
    const rendered: string[] = [];
    act(() => {
      for (let r = 0; r < rails.length; r++) {
        const claimed = result.current.claimMany(rails[r], `rail${r}`);
        for (const v of claimed) rendered.push(v.id);
      }
      // Infinite grid pages — 3 pages of 30 items, heavy overlap with rails.
      for (let p = 0; p < 3; p++) {
        const page = Array.from({ length: 30 }, (_, i) => ({
          id: `v${p * 10 + i}`,
        }));
        const claimed = result.current.claimMany(page, "infinite_grid");
        for (const v of claimed) rendered.push(v.id);
      }
    });
    // Every id rendered must be unique.
    expect(new Set(rendered).size).toBe(rendered.length);
  });
});
