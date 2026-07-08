import type { RuleHit, Stage, StageResult, Thresholds, VideoContext } from "../types.ts";

interface Rule {
  id: string;
  name: string;
  kind: string;
  pattern: string;
  severity: "hard" | "soft";
  applies_to: string;
  enabled: boolean;
}

/**
 * Rule engine stage. Runs configurable keyword / pattern rules from
 * `moderation_rules`. Hard hits are terminal (state=blocked); soft hits
 * add risk but let downstream stages continue.
 */
export function ruleStage(supabaseUrl: string, serviceKey: string): Stage {
  return {
    name: "rule_engine",
    async run(ctx: VideoContext, _t: Thresholds): Promise<StageResult> {
      const rules = await loadRules(supabaseUrl, serviceKey);
      const haystacks: Record<string, string> = {
        title_description: `${ctx.title} ${ctx.description ?? ""}`.toLowerCase(),
        channel: (ctx.channel_title ?? "").toLowerCase(),
        tags: (ctx.tags ?? []).join(" ").toLowerCase(),
      };
      haystacks.all = Object.values(haystacks).join(" ");

      const hits: RuleHit[] = [];
      for (const r of rules) {
        if (!r.enabled) continue;
        const hay = haystacks[r.applies_to] ?? haystacks.all;
        const needle = r.pattern.toLowerCase();
        if (!needle) continue;
        const matched = r.kind === "pattern" ? tryRegex(needle, hay) : hay.includes(needle);
        if (matched) {
          hits.push({
            rule_id: r.id, name: r.name, kind: r.kind,
            severity: r.severity, matched: r.pattern,
          });
        }
      }

      const hardHit = hits.find((h) => h.severity === "hard");
      if (hardHit) {
        return {
          stage: "rule_engine",
          state: "blocked",
          confidence: 0,
          risk: 100,
          reasoning: `Hard rule violation: ${hardHit.name} ("${hardHit.matched}")`,
          rule_hits: hits,
          terminal: true,
        };
      }

      const risk = Math.min(60, hits.length * 15);
      return {
        stage: "rule_engine",
        state: hits.length ? "pending_review" : "pending_review",
        confidence: hits.length ? 80 - risk : 100,
        risk,
        reasoning: hits.length
          ? `${hits.length} soft rule hit(s): ${hits.map((h) => h.name).join(", ")}`
          : "No rule violations detected",
        rule_hits: hits,
      };
    },
  };
}

function tryRegex(pattern: string, hay: string): boolean {
  try { return new RegExp(pattern, "i").test(hay); } catch { return false; }
}

async function loadRules(url: string, key: string): Promise<Rule[]> {
  try {
    const res = await fetch(`${url}/rest/v1/moderation_rules?enabled=eq.true&select=*`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return [];
    return (await res.json()) as Rule[];
  } catch { return []; }
}
