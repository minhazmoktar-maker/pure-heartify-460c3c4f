import type { Stage, StageResult, Thresholds, VideoContext } from "../types.ts";

/**
 * Channel reputation stage. If the channel is on the approved whitelist,
 * boost confidence; if it's blocked, terminate immediately.
 */
export function reputationStage(supabaseUrl: string, serviceKey: string): Stage {
  return {
    name: "channel_reputation",
    async run(ctx: VideoContext, _t: Thresholds): Promise<StageResult | null> {
      if (!ctx.channel_id) {
        return {
          stage: "channel_reputation",
          state: "pending_review",
          confidence: 40,
          risk: 30,
          reasoning: "No channel context available",
          signals: { reputation: "unknown" },
        };
      }

      const headers = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };

      const [approvedRes, blockedRes] = await Promise.all([
        fetch(
          `${supabaseUrl}/rest/v1/approved_channels?youtube_channel_id=eq.${ctx.channel_id}&select=id,consistency_score,status`,
          { headers },
        ),
        fetch(
          `${supabaseUrl}/rest/v1/blocked_creators?select=pattern`,
          { headers },
        ),
      ]);

      const approved = approvedRes.ok ? ((await approvedRes.json()) as Array<{ consistency_score: number; status: string }>) : [];
      const blocked = blockedRes.ok ? ((await blockedRes.json()) as Array<{ pattern: string }>) : [];

      const hay = `${ctx.channel_title ?? ""} ${ctx.title}`.toLowerCase();
      const blockedHit = blocked.find((b) => hay.includes(b.pattern.toLowerCase()));
      if (blockedHit) {
        return {
          stage: "channel_reputation",
          state: "blocked",
          confidence: 0,
          risk: 100,
          reasoning: `Blocked creator match: ${blockedHit.pattern}`,
          signals: { blocked_pattern: blockedHit.pattern },
          terminal: true,
        };
      }

      if (approved.length > 0 && approved[0].status === "active") {
        return {
          stage: "channel_reputation",
          state: "pending_review",
          confidence: Math.min(95, approved[0].consistency_score ?? 90),
          risk: 5,
          reasoning: "Channel is on the approved whitelist",
          signals: { reputation: "approved", score: approved[0].consistency_score },
        };
      }

      return {
        stage: "channel_reputation",
        state: "pending_review",
        confidence: 40,
        risk: 25,
        reasoning: "Channel not on whitelist",
        signals: { reputation: "unknown" },
      };
    },
  };
}
