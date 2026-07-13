import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const DEFAULT_INTERESTS = {
  primary: "islamic-knowledge",
  secondary: "intellectual",
  exploration: "short-reminders",
};

const ASSUMED_MIN_PER_VIDEO = 6;

interface Vid {
  video_id: string;
  title: string;
  channel_title: string;
  thumbnail_url: string;
  section_id: string | null;
  halal_score: number | null;
}

async function pickFromSection(
  admin: any,
  sectionId: string,
  excludeIds: string[],
  n: number,
  preferredLanguages: string[] = [],
): Promise<Vid[]> {
  const q = admin
    .from("curated_videos")
    .select("video_id,title,channel_title,thumbnail_url,section_id,halal_score,content_language")
    .eq("section_id", sectionId)
    .order("halal_score", { ascending: false })
    .limit(80);
  const { data } = await q;
  const pool: Vid[] = (data ?? []).filter((v: Vid) => !excludeIds.includes(v.video_id));
  // light shuffle of top pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  // Regional preference: float preferred-language videos first; untagged
  // videos are neutral so smaller markets never get an empty dose.
  if (preferredLanguages.length) {
    const langs = new Set(preferredLanguages.map((l) => l.toLowerCase()));
    const matches: Vid[] = [];
    const untagged: Vid[] = [];
    const others: Vid[] = [];
    for (const v of pool) {
      const cl = ((v as any).content_language as string | null)?.toLowerCase() ?? null;
      if (!cl) untagged.push(v);
      else if (langs.has(cl)) matches.push(v);
      else others.push(v);
    }
    return [...matches, ...untagged, ...others].slice(0, n);
  }
  return pool.slice(0, n);
}

/**
 * Resolve preferred content languages for a user. Priority:
 *   1. Explicit user_locale_preferences.content_languages
 *   2. regional_language_mix for user's country (top-weighted langs)
 *   3. Empty (no locale hint — global ranking)
 */
async function resolvePreferredLanguages(admin: any, userId: string): Promise<string[]> {
  const { data: prefs } = await admin
    .from("user_locale_preferences")
    .select("content_languages, country_code, detected_country")
    .eq("user_id", userId)
    .maybeSingle();
  const explicit = (prefs?.content_languages ?? []) as string[];
  if (explicit.length) return explicit.map((l) => l.toLowerCase());
  const country = (prefs?.country_code ?? prefs?.detected_country) as string | null;
  if (!country) return [];
  const { data: mix } = await admin
    .from("regional_language_mix")
    .select("language_mix, default_ui_language")
    .eq("country_code", country)
    .eq("is_active", true)
    .maybeSingle();
  if (!mix) return [];
  const entries = Object.entries((mix.language_mix ?? {}) as Record<string, number>)
    .sort((a, b) => (b[1] as number) - (a[1] as number))
    .map(([lang]) => lang.toLowerCase());
  return entries.length ? entries : [String(mix.default_ui_language ?? "en").toLowerCase()];
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const today = new Date().toISOString().slice(0, 10);

    // 1. Return existing dose if present
    const { data: existing } = await admin
      .from("daily_dose")
      .select("*")
      .eq("user_id", userId)
      .eq("dose_date", today)
      .maybeSingle();

    let dose = existing;

    if (!dose) {
      // 2. Load interests
      const { data: interests } = await admin
        .from("user_interests")
        .select("primary_interest,secondary_interest,exploration_interest")
        .eq("user_id", userId)
        .maybeSingle();

      const primary = interests?.primary_interest || DEFAULT_INTERESTS.primary;
      const secondary = interests?.secondary_interest || DEFAULT_INTERESTS.secondary;
      const exploration = interests?.exploration_interest || DEFAULT_INTERESTS.exploration;

      // 3. Exclude recently watched (last 30 days)
      const { data: history } = await admin
        .from("watch_history")
        .select("video_id")
        .eq("user_id", userId)
        .gte("watched_at", new Date(Date.now() - 30 * 86400000).toISOString())
        .limit(500);
      const exclude = (history ?? []).map((h: any) => h.video_id);

      // 4. Pick 70/20/10 → 2 primary, 1 secondary or exploration
      const p = await pickFromSection(admin, primary, exclude, 2);
      const exIds = [...exclude, ...p.map((v) => v.video_id)];
      const secondaryRoll = Math.random() < 0.67; // 70/(70+10) roughly → use secondary 67% of remaining slot
      const s = await pickFromSection(admin, secondaryRoll ? secondary : exploration, exIds, 1);
      const picks = [...p, ...s].filter(Boolean);

      // Fallback if pools were thin
      if (picks.length < 3) {
        const { data: top } = await admin
          .from("curated_videos")
          .select("video_id,title,channel_title,thumbnail_url,section_id,halal_score")
          .order("halal_score", { ascending: false })
          .limit(60);
        const fill = (top ?? []).filter(
          (v: Vid) => !exclude.includes(v.video_id) && !picks.find((p) => p.video_id === v.video_id),
        );
        while (picks.length < 3 && fill.length) {
          picks.push(fill.shift()!);
        }
      }

      const videoIds = picks.map((v) => v.video_id);
      const totalMinutes = picks.length * ASSUMED_MIN_PER_VIDEO;

      const { data: inserted, error: insErr } = await admin
        .from("daily_dose")
        .insert({
          user_id: userId,
          dose_date: today,
          video_ids: videoIds,
          total_minutes: totalMinutes,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      dose = inserted;
    }

    // 5. Hydrate video objects
    const { data: videos } = await admin
      .from("curated_videos")
      .select("video_id,title,channel_title,thumbnail_url,section_id,halal_score,category")
      .in("video_id", dose.video_ids);

    const orderedVideos = (dose.video_ids as string[])
      .map((id) => (videos ?? []).find((v: any) => v.video_id === id))
      .filter(Boolean);

    // 6. Completions + streak
    const { data: completions } = await admin
      .from("dose_completions")
      .select("video_id")
      .eq("dose_id", dose.id);

    const { data: streak } = await admin
      .from("streaks")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    return new Response(
      JSON.stringify({
        dose,
        videos: orderedVideos,
        completedVideoIds: (completions ?? []).map((c: any) => c.video_id),
        streak: streak ?? { current_streak: 0, longest_streak: 0, last_completed_date: null, total_doses_completed: 0 },
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
