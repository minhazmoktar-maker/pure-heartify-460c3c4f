import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

export default defineTool({
  name: "get_prayer_times",
  title: "Get prayer times",
  description: "Return today's five daily prayer times for a location. Uses Heartify's public prayer-times endpoint.",
  inputSchema: {
    lat: z.number().min(-90).max(90).describe("Latitude in decimal degrees."),
    lng: z.number().min(-180).max(180).describe("Longitude in decimal degrees."),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null).describe("Date YYYY-MM-DD (defaults to today)."),
    method: z.enum(["MWL", "ISNA", "Egypt", "Makkah", "Karachi", "Tehran", "Jafari"]).default("MWL").describe("Calculation method."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: true },
  handler: async ({ lat, lng, date, method }) => {
    const base = process.env.SUPABASE_URL;
    if (!base) return { content: [{ type: "text", text: "SUPABASE_URL not configured" }], isError: true };
    const url = new URL(`${base}/functions/v1/prayer-times`);
    url.searchParams.set("lat", String(lat));
    url.searchParams.set("lng", String(lng));
    url.searchParams.set("method", method);
    if (date) url.searchParams.set("date", date);
    const res = await fetch(url.toString());
    const text = await res.text();
    if (!res.ok) return { content: [{ type: "text", text: `Upstream ${res.status}: ${text}` }], isError: true };
    let json: unknown;
    try { json = JSON.parse(text); } catch { json = text; }
    return {
      content: [{ type: "text", text: typeof json === "string" ? json : JSON.stringify(json, null, 2) }],
      structuredContent: { times: json },
    };
  },
});
