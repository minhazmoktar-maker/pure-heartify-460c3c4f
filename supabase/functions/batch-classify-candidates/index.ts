// Batch classifier: reads pending channel_candidates, computes tier,
// assigns cluster_id, generates AI summary if missing, and executes
// Tier A auto-approval / Tier D auto-rejection.
//
// Auth: admin JWT OR x-cron-secret. Idempotent.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const DRY_RUN_DEFAULT = (Deno.env.get("MODERATION_DRY_RUN") ?? "true").toLowerCase() === "true";
const BATCH_SIZE = 100;
const AI_SUMMARY_URL = `${Deno.env.get("SUPABASE_URL")}/functions/v1/moderate-channel-summary`;

type Candidate = {
  id: string;
  youtube_channel_id: string;
  title: string;
  handle: string | null;
  description: string | null;
  category: string | null;
  subscriber_count: number | null;
  language_detected: string | null;
  confidence: number | null;
  duplicate_risk: string | null;
  status: string;
  tier: string | null;
  auto_action: string | null;
  moderation_summary: Record<string, unknown> | null;
  evidence: Record<string, unknown> | null;
};

type Institution = { id: string; name: string; organization_type: string; match_pattern: string; weight: number };

function detectInstitution(text: string, institutions: Institution[]): Institution | null {
  const lower = text.toLowerCase();
  for (const inst of institutions) {
    try {
      const re = new RegExp(inst.match_pattern, "i");
      if (re.test(lower)) return inst;
    } catch {
      // ignore bad regex
    }
  }
  return null;
}

function detectMusicSignal(c: Candidate): boolean {
  const hay = `${c.title} ${c.description ?? ""} ${JSON.stringify(c.evidence?.latest_video_titles ?? "")}`.toLowerCase();
  return /\b(music|song|nasheed with music|instrumental|beat|melody|dance|remix|lyrical|karaoke|lo-?fi)\b/.test(hay);
}

function detectFemalePresenterSignal(c: Candidate, summary: Record<string, unknown> | null): boolean {
  const hay = `${c.title} ${c.description ?? ""}`.toLowerCase();
  if (/\b(sister|ustadha|hostess|actress|female|women.?only channel)\b/.test(hay)) return true;
  const pa = (summary?.presenter_analysis ?? "") as string;
  if (typeof pa === "string" && /\b(female|woman|women|mixed[- ]gender)\b/i.test(pa)) return true;
  return false;
}

function countExclusionHits(evidence: Record<string, unknown> | null): number {
  const hits = evidence?.exclusion_hits;
  return Array.isArray(hits) ? hits.length : 0;
}

function clusterKeyFor(c: Candidate, institution: Institution | null): { key: string; label: string; org: string | null } {
  const lang = c.language_detected ?? "und";
  const topic = c.category ?? "general";
  const org = institution?.organization_type ?? "individual";
  const label = institution?.name ? `${institution.name} · ${lang}` : `${topic} · ${lang} · ${org}`;
  return { key: `${lang}|${topic}|${org}`, label, org };
}

async function ensureCluster(admin: any, c: Candidate, institution: Institution | null): Promise<string | null> {
  const { key, label, org } = clusterKeyFor(c, institution);
  const { data: existing } = await admin
    .from("moderation_clusters").select("id").eq("cluster_key", key).maybeSingle();
  if (existing?.id) return existing.id as string;
  const { data: created } = await admin
    .from("moderation_clusters")
    .insert({ cluster_key: key, label, language: c.language_detected, primary_topic: c.category, organization_type: org })
    .select("id").single();
  return created?.id ?? null;
}

async function requestAISummary(candidateId: string): Promise<void> {
  try {
    await fetch(AI_SUMMARY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": Deno.env.get("CRON_SECRET") ?? "",
      },
      body: JSON.stringify({ candidate_id: candidateId }),
    });
  } catch (e) {
    console.error("summary trigger failed", e);
  }
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
    const cronToken = req.headers.get("x-cron-token");
    const isCron =
      (!!cronSecret && cronSecret === Deno.env.get("CRON_SECRET")) ||
      (!!cronToken && cronToken === Deno.env.get("INGEST_CRON_TOKEN"));
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
    const dryRun: boolean = typeof body.dry_run === "boolean" ? body.dry_run : DRY_RUN_DEFAULT;
    const limit: number = Math.min(BATCH_SIZE, Number(body.limit ?? BATCH_SIZE));

    const [{ data: candidates }, { data: institutions }] = await Promise.all([
      admin.from("channel_candidates")
        .select("id, youtube_channel_id, title, handle, description, category, subscriber_count, language_detected, confidence, duplicate_risk, status, tier, auto_action, moderation_summary, evidence")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(limit),
      admin.from("trusted_institutions").select("id, name, organization_type, match_pattern, weight"),
    ]);

    const inst = (institutions ?? []) as Institution[];
    const stats = { processed: 0, tierA: 0, tierB: 0, tierC: 0, tierD: 0, auto_approved: 0, auto_rejected: 0, summaries_requested: 0 };
    const results: any[] = [];

    for (const raw of (candidates ?? []) as Candidate[]) {
      stats.processed++;
      const searchText = `${raw.title} ${raw.handle ?? ""} ${raw.description ?? ""}`;
      const institution = detectInstitution(searchText, inst);
      const summary = raw.moderation_summary;
      const musicSignal = detectMusicSignal(raw);
      const femaleSignal = detectFemalePresenterSignal(raw, summary);
      const exclusionHits = countExclusionHits(raw.evidence);
      const confidence = raw.confidence ?? 0;
      const subs = raw.subscriber_count ?? 0;
      const dupRisk = raw.duplicate_risk ?? "low";

      const { data: tierRow } = await admin.rpc("compute_candidate_tier", {
        _confidence: confidence,
        _duplicate_risk: dupRisk,
        _exclusion_hits: exclusionHits,
        _has_music_signal: musicSignal,
        _has_female_presenter_signal: femaleSignal,
        _institution_match: !!institution,
        _subs: subs,
      });
      const tier: "S" | "A" | "B" | "C" | "D" = (tierRow as any) ?? "D";
      const reasons: string[] = [];
      if (institution) reasons.push(`institution:${institution.name}`);
      if (musicSignal) reasons.push("music_signal");
      if (femaleSignal) reasons.push("female_presenter_signal");
      if (exclusionHits > 0) reasons.push(`exclusion_hits:${exclusionHits}`);
      reasons.push(`confidence:${confidence}`, `subs:${subs}`, `dup:${dupRisk}`);

      const clusterId = await ensureCluster(admin, raw, institution);
      const riskScore = Math.max(0, Math.min(100, 100 - confidence + exclusionHits * 15 + (musicSignal ? 25 : 0) + (femaleSignal ? 25 : 0)));

      // NEW POLICY (safety invariant #1 + #7):
      //   Tier S/A ─► `pre_approved`; a channel MUST clear the video sampling
      //               pipeline before it becomes `approved`.
      //   Tier B/C ─► human queue (fast / full review).
      //   Tier D   ─► auto_rejected.
      // We never mirror rows into `approved_channels` from here — that only
      // happens when the sampling trigger promotes the candidate.
      const autoAction:
        "queued_pre_approve" | "queued_fast" | "queued_full" | "auto_rejected" =
          tier === "S" || tier === "A" ? "queued_pre_approve"
          : tier === "B" ? "queued_fast"
          : tier === "C" ? "queued_full"
          : "auto_rejected";

      let newStatus = raw.status;
      if (!dryRun) {
        if (tier === "S" || tier === "A") { newStatus = "pre_approved"; stats.auto_approved++; }
        // Tier D is NOT auto-rejected — leave it pending for human review via magic link.
      }

      await admin.from("channel_candidates").update({
        tier, tier_reason: reasons, auto_action: autoAction, risk_score: riskScore,
        cluster_id: clusterId, status: newStatus,
        pre_approved_at: !dryRun && (tier === "S" || tier === "A") ? new Date().toISOString() : null,
      }).eq("id", raw.id);

      await admin.from("channel_moderation_decisions").insert({
        candidate_id: raw.id,
        youtube_channel_id: raw.youtube_channel_id,
        tier, action: dryRun ? `dry_run_${autoAction}` : autoAction,
        actor: null, is_bulk: true, cluster_id: clusterId,
        reason: reasons.join(", "),
        evidence: { institution: institution?.name ?? null, musicSignal, femaleSignal, exclusionHits, confidence, subs, dupRisk, riskScore, dryRun },
        previous_status: raw.status, new_status: newStatus, reversible: true,
      });

      // Kick off video sampling for pre-approved candidates. Fire-and-forget;
      // the DB trigger promotes them only after enough clean samples land.
      if (!dryRun && (tier === "S" || tier === "A")) {
        fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/sample-channel-videos`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-cron-secret": Deno.env.get("CRON_SECRET") ?? "",
          },
          body: JSON.stringify({ candidate_id: raw.id }),
        }).catch(() => {});
      }

      if (!summary && tier !== "D") {
        stats.summaries_requested++;
        requestAISummary(raw.id);
      }

      if (tier === "S") (stats as any).tierS = ((stats as any).tierS ?? 0) + 1;
      else if (tier === "A") stats.tierA++;
      else if (tier === "B") stats.tierB++;
      else if (tier === "C") stats.tierC++;
      else stats.tierD++;

      results.push({ id: raw.id, tier, autoAction, riskScore });
    }

    // Update cluster candidate counts + dominant tier
    const clusters = Array.from(new Set(results.map((r) => r.clusterId).filter(Boolean)));
    for (const cid of clusters) {
      const { count } = await admin.from("channel_candidates").select("id", { count: "exact", head: true }).eq("cluster_id", cid);
      await admin.from("moderation_clusters").update({ candidate_count: count ?? 0 }).eq("id", cid);
    }

    return new Response(JSON.stringify({ ok: true, dryRun, stats, actor: actorId, sample: results.slice(0, 10) }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("batch-classify-candidates error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
