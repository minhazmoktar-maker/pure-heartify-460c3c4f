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
  name: "log_dhikr_session",
  title: "Log a dhikr session",
  description: "Record a dhikr (remembrance) session for the signed-in user. Use for tasbih counts like SubhanAllah, Alhamdulillah, Allahu Akbar.",
  inputSchema: {
    dhikr_key: z.string().min(1).describe("Dhikr identifier, e.g. 'subhanallah', 'alhamdulillah', 'allahu-akbar'."),
    count: z.number().int().min(1).max(10000).describe("Number of repetitions completed."),
    target: z.number().int().min(1).max(10000).nullable().default(null).describe("Optional target count for the session."),
  },
  annotations: { readOnlyHint: false, openWorldHint: false },
  handler: async ({ dhikr_key, count, target }, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("dhikr_sessions")
      .insert({
        user_id: ctx.getUserId()!,
        dhikr_key,
        count,
        target,
        source: "mcp",
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: `Logged ${count}× ${dhikr_key}.` }],
      structuredContent: { session: data },
    };
  },
});
