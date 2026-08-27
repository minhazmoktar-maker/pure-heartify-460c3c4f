/**
 * 1,000-session novelty-decay regression suite.
 *
 * Locks in the product promise behind the feed pipeline: repeated opens keep
 * producing new beneficial content, refreshes meaningfully change results, and
 * no near-duplicate re-upload is ever served twice inside a session.
 *
 * Every threshold here is a product decision — loosening one means accepting a
 * more repetitive feed.
 */

import { describe, it, expect } from "vitest";
import {
  runNoveltyDecay,
  buildDedupCorpus,
  DEFAULT_KNOBS,
  type NoveltyKnobs,
} from "./noveltyDecay";

const corpus = buildDedupCorpus();

describe("novelty decay — 1000 sessions x 10 refreshes", () => {
  const report = runNoveltyDecay(1000, 10, corpus);

  it("never repeats a video inside a single page", () => {
    expect(report.duplicatesWithinPage).toBe(0);
  });

  it("never serves the same near-duplicate group twice in a session", () => {
    expect(report.repeatedGroupsWithinSession).toBe(0);
  });

  it("keeps every refresh substantially new content", () => {
    // Refresh 0 is by definition 100% new; refreshes 1..9 are the real test.
    expect(report.noveltyByRefresh[0]).toBe(1);
    for (let r = 1; r < report.refreshes; r++) {
      expect(report.noveltyByRefresh[r]).toBeGreaterThan(0.6);
    }
    expect(report.minMeanNovelty).toBeGreaterThan(0.6);
  });

  it("does not decay novelty monotonically toward zero", () => {
    const late = report.noveltyByRefresh.slice(-3).reduce((a, b) => a + b, 0) / 3;
    expect(late).toBeGreaterThan(0.6);
  });

  it("keeps pages full — the pipeline must not starve itself", () => {
    expect(report.meanPageSize).toBeGreaterThan(23);
  });

  it("keeps two different sessions' first pages mostly different", () => {
    expect(report.crossSessionOverlap).toBeLessThan(0.35);
  });

  it("surfaces a broad slice of the catalog across the cohort", () => {
    expect(report.catalogCoverage).toBeGreaterThan(0.5);
  });
});

describe("novelty decay — ranking knobs actually move the needle", () => {
  // Deliberately tiny catalog (8 channels x 8 videos): the knobs only become
  // observable once the pool is small enough to exhaust, which is exactly the
  // pressure a niche language lane puts on the pipeline.
  const smallCorpus = buildDedupCorpus(8, 8);

  function run(overrides: Partial<NoveltyKnobs>) {
    return runNoveltyDecay(60, 8, smallCorpus, { ...DEFAULT_KNOBS, ...overrides });
  }

  it("disabling semantic dedup lets duplicate groups repeat", () => {
    const off = run({ semanticDedup: false });
    expect(off.repeatedGroupsWithinSession).toBeGreaterThan(0);
    expect(run({}).repeatedGroupsWithinSession).toBe(0);
  });

  it("disabling fatigue detection reduces novelty", () => {
    const on = run({ fatigueDetection: true });
    const off = run({ fatigueDetection: false });
    expect(off.minMeanNovelty).toBeLessThan(on.minMeanNovelty);
  });

  it("higher exploration temperature widens catalog coverage", () => {
    const cold = run({ explorationTemperature: 0.1 });
    const hot = run({ explorationTemperature: 1.6 });
    expect(hot.catalogCoverage).toBeGreaterThanOrEqual(cold.catalogCoverage);
  });
});
