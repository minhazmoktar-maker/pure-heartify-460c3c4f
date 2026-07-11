import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { videoId } = await req.json();
    if (!videoId || typeof videoId !== "string") {
      return new Response(JSON.stringify({ error: "videoId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Rate limit: 30 completions/min. Dose has ≤3 videos, so this is 10x
    // headroom over legitimate use and stops scripted streak inflation.
    const limited = await enforceRateLimit(admin, {
      identity: userId, action: "complete-dose", limit: 30, windowSeconds: 60,
    });
    if (limited) return new Response(JSON.stringify({ error: "rate_limited" }), {
      status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const today = new Date().toISOString().slice(0, 10);

    // Find today's dose containing this video
    const { data: dose } = await admin
      .from("daily_dose")
      .select("*")
      .eq("user_id", userId)
      .eq("dose_date", today)
      .maybeSingle();

    if (!dose || !(dose.video_ids as string[]).includes(videoId)) {
      return new Response(JSON.stringify({ ok: true, inDose: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotent insert
    await admin
      .from("dose_completions")
      .upsert(
        { user_id: userId, dose_id: dose.id, video_id: videoId },
        { onConflict: "dose_id,video_id", ignoreDuplicates: true },
      );

    const { data: completions } = await admin
      .from("dose_completions")
      .select("video_id")
      .eq("dose_id", dose.id);

    const completedCount = completions?.length ?? 0;
    const total = (dose.video_ids as string[]).length;
    const justCompleted = completedCount >= total && !dose.completed_at;

    await admin
      .from("daily_dose")
      .update({
        completed_count: completedCount,
        completed_at: justCompleted ? new Date().toISOString() : dose.completed_at,
      })
      .eq("id", dose.id);

    let streak: any = null;
    let milestone: number | null = null;

    if (justCompleted) {
      const { data: existing } = await admin
        .from("streaks")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      let current = 1;
      let longest = 1;
      let total_doses = 1;

      if (existing) {
        if (existing.last_completed_date === today) {
          current = existing.current_streak;
        } else if (existing.last_completed_date === yesterday) {
          current = existing.current_streak + 1;
        } else {
          current = 1;
        }
        longest = Math.max(existing.longest_streak ?? 0, current);
        total_doses = (existing.total_doses_completed ?? 0) + 1;
      }

      const milestones = [3, 7, 14, 30, 60, 100, 365];
      if (milestones.includes(current)) milestone = current;

      const { data: upserted } = await admin
        .from("streaks")
        .upsert(
          {
            user_id: userId,
            current_streak: current,
            longest_streak: longest,
            last_completed_date: today,
            total_doses_completed: total_doses,
          },
          { onConflict: "user_id" },
        )
        .select()
        .single();
      streak = upserted;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        inDose: true,
        completedCount,
        total,
        justCompleted,
        streak,
        milestone,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
