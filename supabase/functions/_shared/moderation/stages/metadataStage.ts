import type { Stage, StageResult, Thresholds, VideoContext } from "../types.ts";

/**
 * Metadata heuristics stage — cheap signals derived purely from video metadata.
 * No external calls. New heuristics slot in here.
 */
export function metadataStage(): Stage {
  return {
    name: "metadata_analysis",
    async run(ctx: VideoContext, _t: Thresholds): Promise<StageResult> {
      const signals: Record<string, unknown> = {};
      let risk = 0;
      let confidence = 70;
      const reasons: string[] = [];

      const title = (ctx.title ?? "").trim();
      if (title.length < 5) { risk += 20; reasons.push("Very short title"); }
      if (/[A-Z]{6,}/.test(title)) { risk += 5; reasons.push("Excessive caps in title"); }
      if ((title.match(/[!?]/g)?.length ?? 0) > 3) { risk += 5; reasons.push("Excessive punctuation"); }

      const desc = ctx.description ?? "";
      if (desc.length < 20) { risk += 5; reasons.push("Very short description"); }

      if (ctx.language && !["en", "ar", "ur", "id", "ms", "tr", "bn"].includes(ctx.language)) {
        risk += 10;
        reasons.push(`Language ${ctx.language} outside common halal audience`);
      }

      if (ctx.duration_seconds != null) {
        if (ctx.duration_seconds < 15) { risk += 15; reasons.push("Very short duration"); }
        signals.duration_seconds = ctx.duration_seconds;
      }

      signals.title_length = title.length;
      signals.description_length = desc.length;

      confidence = Math.max(30, 90 - risk);
      return {
        stage: "metadata_analysis",
        state: "pending_review",
        confidence,
        risk,
        reasoning: reasons.length ? reasons.join("; ") : "Metadata within normal ranges",
        signals,
      };
    },
  };
}
