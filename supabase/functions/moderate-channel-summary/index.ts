// AI-generated moderation summary for a channel candidate.
// Called per-candidate (or in batches from batch-classify-candidates).
// Writes structured evidence to channel_candidates.moderation_summary.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Candidate = {
  id: string;
  youtube_channel_id: string;
  title: string;
  handle?: string | null;
  description?: string | null;
  category?: string | null;
  subscriber_count?: number | null;
  language_detected?: string | null;
  evidence?: Record<string, unknown> | null;
};

async function callAI(prompt: string): Promise<Record<string, unknown> | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are Heartify's strict halal-first content moderator. " +
              "Given metadata about a YouTube channel, produce a JSON object with fields: " +
              "topics (string[]), presenter_analysis (string, note any female-on-camera or mixed-gender hints), " +
              "music_analysis (string, note nasheed with instruments, background scores, or entertainment music), " +
              "halal_flags (string[], list ANY concern), " +
              "educational_depth ('shallow'|'moderate'|'deep'), " +
              "organization_type ('university'|'government'|'waqf'|'academy'|'mosque'|'scholar_org'|'individual'|'unknown'), " +
              "recommend_tier ('A'|'B'|'C'|'D'), " +
              "rationale (string, 1-2 sentences). " +
              "Reject anything with music/female presenter/entertainment/reaction/prank/celebrity. " +
              "Return ONLY valid JSON, no markdown fences.",
          },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      console.error("AI gateway", res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const content = json?.choices?.[0]?.message?.content;
    if (!content) return null;
    return JSON.parse(content);
  } catch (e) {
    console.error("AI summary parse", e);
    return null;
  }
}

function buildPrompt(c: Candidate, latestTitles: string[]): string {
  return [
    `Channel title: ${c.title}`,
    `Handle: ${c.handle ?? "n/a"}`,
    `Language: ${c.language_detected ?? "unknown"}`,
    `Subscribers: ${c.subscriber_count ?? "unknown"}`,
    `Category: ${c.category ?? "unknown"}`,
    `Description: ${(c.description ?? "").slice(0, 800)}`,
    `Latest video titles:\n${latestTitles.slice(0, 10).map((t) => `- ${t}`).join("\n")}`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Auth: admin JWT OR cron secret
    const cronSecret = req.headers.get("x-cron-secret");
    const isCron = cronSecret && cronSecret === Deno.env.get("CRON_SECRET");
    let actorId: string | null = null;
    if (!isCron) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
      );
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      const { data: isAdmin } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
      actorId = user.id;
    }

    const body = await req.json().catch(() => ({}));
    const candidateId: string | undefined = body.candidate_id;
    if (!candidateId) {
      return new Response(JSON.stringify({ error: "candidate_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: candidate, error: cErr } = await admin
      .from("channel_candidates")
      .select("id, youtube_channel_id, title, handle, description, category, subscriber_count, language_detected, evidence")
      .eq("id", candidateId)
      .single();
    if (cErr || !candidate) {
      return new Response(JSON.stringify({ error: "candidate not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const latestTitles: string[] = Array.isArray((candidate.evidence as any)?.latest_video_titles)
      ? ((candidate.evidence as any).latest_video_titles as string[])
      : [];
    const summary = await callAI(buildPrompt(candidate as Candidate, latestTitles));

    await admin
      .from("channel_candidates")
      .update({
        moderation_summary: summary,
        summary_generated_at: new Date().toISOString(),
      })
      .eq("id", candidateId);

    return new Response(JSON.stringify({ ok: true, summary, actor: actorId }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("moderate-channel-summary error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
