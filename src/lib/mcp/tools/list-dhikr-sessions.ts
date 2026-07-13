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
  name: "list_dhikr_sessions",
  title: "List recent dhikr sessions",
  description:
    "Return the signed-in user's recent dhikr sessions, most recent first. Supports pagination via limit + offset.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(25).describe("Max sessions to return (1–100)."),
    offset: z.number().int().min(0).max(10000).default(0).describe("Rows to skip for pagination."),
    dhikr_key: z.string().min(1).nullable().default(null).describe("Optional filter by dhikr key."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, offset, dhikr_key }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sb(ctx)
      .from("dhikr_sessions")
      .select("id, dhikr_key, count, target, source, completed_at", { count: "exact" })
      .eq("user_id", ctx.getUserId()!)
      .order("completed_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (dhikr_key) q = q.eq("dhikr_key", dhikr_key);
    const { data, error, count } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify({ total: count ?? rows.length, rows }, null, 2) }],
      structuredContent: { total: count ?? rows.length, limit, offset, sessions: rows },
    };
  },
});
