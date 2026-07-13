import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function sb(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_streak",
  title: "Get daily-dose streak",
  description: "Return the signed-in user's current streak, longest streak, and total daily doses completed.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    const { data, error } = await sb(ctx)
      .from("streaks")
      .select("current_streak, longest_streak, total_doses_completed, last_completed_date")
      .eq("user_id", ctx.getUserId()!)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const row = data ?? { current_streak: 0, longest_streak: 0, total_doses_completed: 0, last_completed_date: null };
    return {
      content: [{ type: "text", text: JSON.stringify(row, null, 2) }],
      structuredContent: { streak: row },
    };
  },
});
