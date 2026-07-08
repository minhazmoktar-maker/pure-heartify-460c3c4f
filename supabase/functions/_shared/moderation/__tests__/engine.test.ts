import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { decideState, runPipeline } from "../engine.ts";
import type { Stage, Thresholds } from "../types.ts";

const T: Thresholds = {
  auto_approve_min_confidence: 98,
  auto_approve_max_risk: 5,
  ai_review_min_confidence: 90,
  human_review_min_confidence: 60,
  reject_below_confidence: 60,
  preferred_ai_provider: "lovable",
  fallback_ai_provider: "gemini",
};

Deno.test("decideState — high conf + low risk => auto_approved", () => {
  assertEquals(decideState(99, 2, T, []), "auto_approved");
});

Deno.test("decideState — high conf + slight risk => ai_review", () => {
  assertEquals(decideState(95, 8, T, []), "ai_review_required");
});

Deno.test("decideState — mid conf => human_review", () => {
  assertEquals(decideState(75, 10, T, []), "human_review_required");
});

Deno.test("decideState — low conf => rejected", () => {
  assertEquals(decideState(40, 10, T, []), "rejected");
});

Deno.test("decideState — hard rule hit => blocked regardless of confidence", () => {
  assertEquals(
    decideState(99, 1, T, [{ name: "x", kind: "keyword", severity: "hard", matched: "x" }]),
    "blocked",
  );
});

Deno.test("runPipeline — terminal stage short-circuits", async () => {
  const s1: Stage = {
    name: "rule_engine",
    run: async () => ({
      stage: "rule_engine", state: "blocked", confidence: 0, risk: 100,
      reasoning: "hard", terminal: true,
      rule_hits: [{ name: "n", kind: "k", severity: "hard", matched: "m" }],
    }),
  };
  const s2: Stage = {
    name: "ai_reasoning",
    run: async () => { throw new Error("should not run"); },
  };
  const out = await runPipeline({ video_id: "v", title: "t" }, [s1, s2], T);
  assertEquals(out.final_state, "blocked");
  assertEquals(out.stage_results.length, 1);
});

Deno.test("runPipeline — weakest confidence wins", async () => {
  const mk = (c: number, r: number): Stage => ({
    name: "metadata_analysis",
    run: async () => ({ stage: "metadata_analysis", state: "pending_review", confidence: c, risk: r, reasoning: "" }),
  });
  const out = await runPipeline({ video_id: "v", title: "t" }, [mk(99, 1), mk(70, 30)], T);
  assertEquals(out.confidence, 70);
  assertEquals(out.risk, 30);
  assertEquals(out.final_state, "human_review_required");
});

Deno.test("runPipeline — thrown stage escalates to human_review", async () => {
  const s: Stage = {
    name: "ai_reasoning",
    run: async () => { throw new Error("boom"); },
  };
  const out = await runPipeline({ video_id: "v", title: "t" }, [s], T);
  assertEquals(out.final_state, "human_review_required");
});
