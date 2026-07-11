// Server-computed prayer times. Pure function, no DB. Cacheable per (date, lat, lng, method).
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { enforceRateLimit, getClientIdentity } from "../_shared/rateLimit.ts";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  method: z.enum(["MWL", "ISNA", "Egypt", "Makkah", "Karachi", "Tehran", "Jafari"]).default("MWL"),
});

// Approximate solar-based prayer time calculation. Good enough as a shared
// reference; native clients may refine locally with the same inputs.
function julianDay(y: number, m: number, d: number) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

function sunPosition(jd: number) {
  const D = jd - 2451545.0;
  const g = ((357.529 + 0.98560028 * D) % 360) * Math.PI / 180;
  const q = (280.459 + 0.98564736 * D) % 360;
  const L = (q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * Math.PI / 180;
  const e = (23.439 - 0.00000036 * D) * Math.PI / 180;
  const RA = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L)) * 180 / Math.PI / 15;
  const decl = Math.asin(Math.sin(e) * Math.sin(L));
  const eqt = q / 15 - ((RA + 24) % 24);
  return { decl, eqt };
}

function T(alpha: number, lat: number, decl: number) {
  const a = alpha * Math.PI / 180;
  const cosH = (-Math.sin(a) - Math.sin(lat) * Math.sin(decl)) / (Math.cos(lat) * Math.cos(decl));
  return (Math.acos(Math.max(-1, Math.min(1, cosH))) * 180 / Math.PI) / 15;
}

const METHOD_ANGLES: Record<string, { fajr: number; isha: number | { minutes: number } }> = {
  MWL:     { fajr: 18,   isha: 17 },
  ISNA:    { fajr: 15,   isha: 15 },
  Egypt:   { fajr: 19.5, isha: 17.5 },
  Makkah:  { fajr: 18.5, isha: { minutes: 90 } },
  Karachi: { fajr: 18,   isha: 18 },
  Tehran:  { fajr: 17.7, isha: 14 },
  Jafari:  { fajr: 16,   isha: 14 },
};

function fmt(hours: number) {
  hours = ((hours % 24) + 24) % 24;
  const h = Math.floor(hours);
  const m = Math.floor((hours - h) * 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Cheap DoS defence: 120 req/min per identity (user or IP). Endpoint is
  // pure math but still consumes function invocations against the budget.
  const url = new URL(req.url);
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (supabaseUrl && serviceKey) {
    const admin = createClient(supabaseUrl, serviceKey);
    const limited = await enforceRateLimit(admin, {
      identity: getClientIdentity(req, null),
      action: "prayer-times",
      limit: 120,
      windowSeconds: 60,
    });
    if (limited) {
      return new Response(JSON.stringify({ error: "rate_limited" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  const parsed = QuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { lat, lng, method } = parsed.data;
  const date = parsed.data.date ? new Date(parsed.data.date + "T12:00:00Z") : new Date();
  const jd = julianDay(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()) - lng / (15 * 24);
  const { decl, eqt } = sunPosition(jd);
  const noon = 12 - lng / 15 - eqt;
  const latR = lat * Math.PI / 180;

  const angles = METHOD_ANGLES[method];
  const fajr = noon - T(angles.fajr, latR, decl);
  const sunrise = noon - T(0.833, latR, decl);
  const dhuhr = noon;
  const asrShadow = 1;
  const asrAlt = -Math.atan(1 / (asrShadow + Math.tan(Math.abs(latR - decl)))) * 180 / Math.PI;
  const asr = noon + T(-asrAlt, latR, decl);
  const maghrib = noon + T(0.833, latR, decl);
  const isha = typeof angles.isha === "object"
    ? maghrib + angles.isha.minutes / 60
    : noon + T(angles.isha, latR, decl);

  const body = {
    date: date.toISOString().slice(0, 10),
    method,
    coordinates: { lat, lng },
    times_utc: { fajr: fmt(fajr), sunrise: fmt(sunrise), dhuhr: fmt(dhuhr), asr: fmt(asr), maghrib: fmt(maghrib), isha: fmt(isha) },
  };

  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
});
