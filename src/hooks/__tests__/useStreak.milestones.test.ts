import { describe, it, expect } from "vitest";

// Local copy of the client-side milestone list; the server RPC uses the same values.
const MILESTONES = [3, 7, 14, 30, 60, 100, 180, 365, 500, 1000];

function nextMilestoneAfter(n: number): number | null {
  return MILESTONES.find((m) => m > n) ?? null;
}

describe("streak milestones", () => {
  it("returns the next milestone for zero", () => {
    expect(nextMilestoneAfter(0)).toBe(3);
  });
  it("returns the next milestone at a boundary", () => {
    expect(nextMilestoneAfter(3)).toBe(7);
    expect(nextMilestoneAfter(7)).toBe(14);
    expect(nextMilestoneAfter(30)).toBe(60);
    expect(nextMilestoneAfter(365)).toBe(500);
  });
  it("returns null past the highest milestone", () => {
    expect(nextMilestoneAfter(1000)).toBeNull();
    expect(nextMilestoneAfter(9999)).toBeNull();
  });
});
