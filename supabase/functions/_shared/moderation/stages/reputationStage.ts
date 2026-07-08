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
        // Layer channel trust profile on top of whitelist membership.
        const trustRes = await fetch(
          `${supabaseUrl}/rest/v1/channel_trust_profiles?youtube_channel_id=eq.${ctx.channel_id}&select=trust_score,risk_level`,
          { headers },
        );
        const trust = trustRes.ok
          ? ((await trustRes.json()) as Array<{ trust_score: number; risk_level: string }>)[0]
          : undefined;
        const score = trust?.trust_score ?? approved[0].consistency_score ?? 60;
        const risk = trust?.risk_level ?? "medium";

        // Critical-risk channels are never trusted, whitelist or not.
        if (risk === "critical") {
          return {
            stage: "channel_reputation",
            state: "human_review_required",
            confidence: 20,
            risk: 90,
            reasoning: `Channel is on whitelist but trust is critical (${score.toFixed(0)})`,
            signals: { reputation: "whitelist_but_critical", trust_score: score, risk_level: risk },
          };
        }
        return {
          stage: "channel_reputation",
          state: "pending_review",
          confidence: Math.min(97, Math.max(50, score)),
          risk: risk === "high" ? 40 : risk === "medium" ? 15 : 5,
          reasoning: `Channel whitelisted (trust ${score.toFixed(0)}, risk ${risk})`,
          signals: { reputation: "approved", trust_score: score, risk_level: risk },
        };
      }

      // Non-whitelisted: still consult trust profile if we have one.
      const trustRes = await fetch(
        `${supabaseUrl}/rest/v1/channel_trust_profiles?youtube_channel_id=eq.${ctx.channel_id}&select=trust_score,risk_level`,
        { headers },
      );
      const trust = trustRes.ok
        ? ((await trustRes.json()) as Array<{ trust_score: number; risk_level: string }>)[0]
        : undefined;
      if (trust) {
        return {
          stage: "channel_reputation",
          state: trust.risk_level === "critical" ? "human_review_required" : "pending_review",
          confidence: Math.max(20, Math.min(80, trust.trust_score)),
          risk: trust.risk_level === "critical" ? 85 : trust.risk_level === "high" ? 55 : 30,
          reasoning: `Off-whitelist trust score ${trust.trust_score.toFixed(0)} (${trust.risk_level})`,
          signals: { reputation: "off_whitelist", trust_score: trust.trust_score, risk_level: trust.risk_level },
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
