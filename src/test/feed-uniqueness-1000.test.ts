/**
 * 1000-user / 1000-visit feed uniqueness regression suite.
 *
 * Two production guarantees are locked in here:
 *
 *   1. Cross-user — if 1000 people open Heartify at the same moment, no two
 *      of them get the same feed, and the average pairwise overlap stays low.
 *   2. Repeat-visit — if ONE person opens the app 100x/day (>1000x/month),
 *      every open is a different feed with substantial new content and never
 *      a duplicate inside a single feed.
 *
 * Loosening any threshold here is a deliberate product decision, not a test
 * fix: these are the numbers that stop the feed from feeling repetitive.
 */

import { describe, it, expect } from "vitest";
import {
  buildCorpus,
  buildUsers,
  runSimulation,
  simulateRepeatVisits,
} from "./feedSimulation";

// Wider corpus than the 100-user suite: 1000 users need catalog room.
const corpus = buildCorpus(120, 40);

describe("feed uniqueness — 1000 concurrent users", () => {
  const users = buildUsers(1000);
  const report = runSimulation(users, corpus);

  it("no two of the 1000 users receive an identical feed", () => {
    expect(report.identicalFeedPairs).toBe(0);
  });

  it("never renders a duplicate video inside a single feed", () => {
    expect(report.duplicatesWithinFeed).toBe(0);
  });

  it("keeps cross-user overlap low at cohort scale", () => {
    expect(report.meanPairwiseOverlap).toBeLessThan(0.45);
    expect(report.maxPairwiseOverlap).toBeLessThan(0.9);
  });

  it("surfaces a broad slice of the catalog across the cohort", () => {
    expect(report.catalogCoverage).toBeGreaterThan(0.25);
  });

  it("never lets one channel dominate any of the 1000 feeds", () => {
    expect(report.maxChannelShare).toBeLessThanOrEqual(0.2);
  });
});

describe("feed uniqueness — one user, 1000 sessions (100x/day habit)", () => {
  const user = buildUsers(1)[0];
  const report = simulateRepeatVisits(user, corpus, 1000);

  it("every one of the 1000 opens produces a different feed", () => {
    expect(report.distinctFeeds).toBe(1000);
  });

  it("never repeats a video inside a single open", () => {
    expect(report.duplicatesWithinFeed).toBe(0);
  });

  it("each open brings substantial new content vs the previous open", () => {
    expect(report.meanConsecutiveNovelty).toBeGreaterThan(0.4);
    expect(report.minConsecutiveNovelty).toBeGreaterThan(0.1);
  });

  it("a month of daily use explores a wide slice of the catalog", () => {
    expect(report.catalogCoverage).toBeGreaterThan(0.5);
  });

  it("session-to-session overlap stays well below repetition territory", () => {
    expect(report.meanPairwiseOverlap).toBeLessThan(0.5);
  });
});
