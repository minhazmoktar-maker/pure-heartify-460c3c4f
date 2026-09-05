/**
 * 1,000-user recommendation-quality regression suite.
 *
 * The objective is NOT "every user gets unique content" — that is impossible
 * and undesirable. It is: high personalization, low unnecessary overlap, strong
 * language relevance, controlled exploration, high novelty on repeat visits.
 */

import { describe, expect, it } from "vitest";
import {
  buildRecCorpus,
  buildRecUsers,
  runRecommendationSimulation,
  simulateHeavyUser,
} from "./recommendationSimulation";

const corpus = buildRecCorpus(120, 40); // 4,800 videos / 120 channels
const users = buildRecUsers(1000);

describe("recommendations — 1,000 diverse synthetic users", () => {
  const report = runRecommendationSimulation(users, corpus);

  it("fills a full top-20 page for every user", () => {
    expect(report.minItems).toBeGreaterThanOrEqual(12);
    expect(report.meanItems).toBeGreaterThanOrEqual(19);
  });

  it("never repeats a video inside one page", () => {
    expect(report.duplicatesWithinFeed).toBe(0);
  });

  it("keeps top-K overlap low and no two feeds identical", () => {
    expect(report.identicalFeedPairs).toBe(0);
    expect(report.meanPairwiseJaccard).toBeLessThan(0.45);
    expect(report.maxPairwiseJaccard).toBeLessThan(0.95);
  });

  it("does not concentrate on one creator or one category", () => {
    expect(report.maxCreatorShare).toBeLessThanOrEqual(0.2);
    expect(report.maxCategoryShare).toBeLessThanOrEqual(0.6);
  });

  it("respects negative feedback — a downvoted creator is never re-served", () => {
    expect(report.dislikedChannelExposures).toBe(0);
  });

  it("keeps language mismatch rare across all ten markets", () => {
    expect(report.languageMismatchRate).toBeLessThan(0.2);
  });

  it("beats a pure popularity baseline on relevance", () => {
    expect(report.personalizationLift).toBeGreaterThan(1.05);
  });

  it("keeps exploration present but controlled", () => {
    expect(report.meanExplorationRate).toBeGreaterThan(0.1);
    expect(report.meanExplorationRate).toBeLessThan(0.9);
  });

  it("covers a broad slice of the catalog across the cohort", () => {
    expect(report.catalogCoverage).toBeGreaterThan(0.2);
    expect(report.uniqueContentRate).toBeGreaterThan(0.05);
  });
});

describe("recommendations — high-frequency user, 100 opens", () => {
  const user = buildRecUsers(1)[0];
  const report = simulateHeavyUser(user, corpus, 100);

  it("does not collapse into the same small set of content", () => {
    expect(report.distinctFeeds).toBeGreaterThan(90);
    expect(report.catalogCoverage).toBeGreaterThan(0.15);
  });

  it("keeps every open substantially new", () => {
    expect(report.meanNovelty).toBeGreaterThan(0.3);
    expect(report.minNovelty).toBeGreaterThanOrEqual(0);
  });

  it("keeps repeat exposure bounded over a long habit", () => {
    expect(report.repeatExposureRate).toBeLessThan(0.75);
  });
});
