import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "log_salah",
  title: "Log a prayer (salah)",
  description: "Record a completed prayer for the signed-in user.",
  inputSchema: {
    prayer: z.enum(["fajr", "dhuhr", "asr", "maghrib", "isha"]).describe("Which of the five daily prayers."),
    prayer_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe("Prayer date in YYYY-MM-DD."),
    on_time: z.boolean().default(true).describe("Whether the prayer was prayed on time."),
    notes: z.string().max(500).nullable().default(null).describe("Optional short notes."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ prayer, prayer_date, on_time, notes }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("salah_log")
      .insert({
        user_id: ctx.getUserId()!,
        prayer,
        prayer_date,
        on_time,
        notes,
        prayed_at: new Date().toISOString(),
        source: "mcp",
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged ${prayer} for ${prayer_date}.` }],
      structuredContent: { entry: data },
    };
  },
});
