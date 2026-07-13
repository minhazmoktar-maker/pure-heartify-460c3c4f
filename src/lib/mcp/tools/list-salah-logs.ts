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
  name: "list_salah_logs",
  title: "List recent salah logs",
  description:
    "Return the signed-in user's recent salah (prayer) logs, most recent first. Supports pagination and optional prayer-name filter.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).default(25).describe("Max rows to return (1–100)."),
    offset: z.number().int().min(0).max(10000).default(0).describe("Rows to skip for pagination."),
    prayer: z
      .enum(["fajr", "dhuhr", "asr", "maghrib", "isha"])
      .nullable()
      .default(null)
      .describe("Optional filter by prayer name."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, offset, prayer }, ctx) => {
    if (!ctx.isAuthenticated())
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    let q = sb(ctx)
      .from("salah_log")
      .select("*", { count: "exact" })
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (prayer) q = q.eq("prayer", prayer);
    const { data, error, count } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const rows = data ?? [];
    return {
      content: [{ type: "text", text: JSON.stringify({ total: count ?? rows.length, rows }, null, 2) }],
      structuredContent: { total: count ?? rows.length, limit, offset, logs: rows },
    };
  },
});
