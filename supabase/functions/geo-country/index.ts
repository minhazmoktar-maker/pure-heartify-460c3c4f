/**
 * geo-country — resolves the visitor's country so a signed-out first feed can
 * already feel local (Bangla content in Dhaka, Turkish in Istanbul, and so on).
 *
 * Resolution order:
 *   1. A CDN-supplied country header, when the platform provides one.
 *   2. A geo-IP lookup on the caller's IP (short timeout, memoised per /24 so
 *      repeat visitors and shared networks cost nothing).
 *   3. The Cloudflare edge colo in `cf-ray` mapped to its country — coarse but
 *      free and always present.
 * If all three fail we return null and the client falls back to the device
 * timezone.
 *
 * Privacy: no IP address is stored, logged, or returned — only a two-letter
 * country code. The memo cache is keyed by a truncated network prefix and lives
 * only in the instance's memory. Public on purpose: it must answer before
 * sign-in.
 */
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

/** Headers CDNs/proxies use for an already-resolved country, best first. */
const COUNTRY_HEADERS = [
  "cf-ipcountry",
  "x-vercel-ip-country",
  "x-country-code",
  "x-geo-country",
  "fly-client-country",
  "x-appengine-country",
];

/** Cloudflare colo (IATA) → country, for the colos that serve our audiences. */
const COLO_COUNTRY: Record<string, string> = {
  DAC: "BD", CGP: "BD", JSR: "BD",
  KHI: "PK", LHE: "PK", ISB: "PK",
  BOM: "IN", DEL: "IN", MAA: "IN", CCU: "IN", BLR: "IN", HYD: "IN", AMD: "IN",
  CMB: "LK", KTM: "NP", MLE: "MV",
  IST: "TR", ADB: "TR",
  CGK: "ID", SUB: "ID", DPS: "ID", MES: "ID",
  KUL: "MY", JHB: "MY", SIN: "SG", BKK: "TH", HAN: "VN", SGN: "VN", MNL: "PH",
  DXB: "AE", SHJ: "AE", DOH: "QA", KWI: "KW", BAH: "BH", MCT: "OM",
  JED: "SA", RUH: "SA", DMM: "SA", AMM: "JO", BEY: "LB", BGW: "IQ", BSR: "IQ",
  CAI: "EG", TUN: "TN", ALG: "DZ", CMN: "MA", RBA: "MA", TIP: "LY", KRT: "SD",
  LOS: "NG", ABV: "NG", KAN: "NG", ACC: "GH", NBO: "KE", DAR: "TZ", KGL: "RW",
  JNB: "ZA", CPT: "ZA", DUR: "ZA",
  LHR: "GB", MAN: "GB", LON: "GB", DUB: "IE",
  FRA: "DE", MUC: "DE", DUS: "DE", HAM: "DE", BER: "DE", TXL: "DE",
  CDG: "FR", MRS: "FR", AMS: "NL", BRU: "BE", ZRH: "CH", GVA: "CH", VIE: "AT",
  MAD: "ES", BCN: "ES", LIS: "PT", MXP: "IT", FCO: "IT", ARN: "SE", CPH: "DK",
  OSL: "NO", HEL: "FI", WAW: "PL", PRG: "CZ", BUD: "HU", OTP: "RO", SOF: "BG",
  KBP: "UA", DME: "RU", SVO: "RU", LED: "RU", TAS: "UZ", ALA: "KZ", BAK: "AZ",
  IAD: "US", EWR: "US", JFK: "US", ATL: "US", ORD: "US", DFW: "US", LAX: "US",
  SJC: "US", SFO: "US", SEA: "US", MIA: "US", DEN: "US", PHX: "US", BOS: "US",
  IAH: "US", MCI: "US", MSP: "US", DTW: "US", PDX: "US", SLC: "US", TPA: "US",
  YYZ: "CA", YUL: "CA", YVR: "CA", MEX: "MX", GRU: "BR", GIG: "BR", EZE: "AR",
  SCL: "CL", BOG: "CO", LIM: "PE",
  SYD: "AU", MEL: "AU", PER: "AU", BNE: "AU", AKL: "NZ",
  NRT: "JP", KIX: "JP", ICN: "KR", HKG: "HK", TPE: "TW", KHH: "TW",
};

/** country → resolved-at, keyed by /24 (v4) or /48 (v6). */
const memo = new Map<string, { country: string | null; at: number }>();
const MEMO_TTL_MS = 60 * 60 * 1000;

function networkKey(ip: string): string {
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":");
  return ip.split(".").slice(0, 3).join(".");
}

function validCountry(raw: string | null | undefined): string | null {
  const c = raw?.trim().toUpperCase();
  // "XX"/"T1" are placeholders for unknown networks and Tor exit nodes.
  if (!c || !/^[A-Z]{2}$/.test(c) || c === "XX" || c === "T1") return null;
  return c;
}

function clientIp(req: Request): string | null {
  const direct = req.headers.get("cf-connecting-ip")?.trim();
  if (direct) return direct;
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || null;
}

function coloCountry(req: Request): string | null {
  // cf-ray looks like "8f2c...-DAC"; the suffix is the edge colo.
  const colo = req.headers.get("cf-ray")?.split("-").pop()?.trim().toUpperCase();
  return colo ? COLO_COUNTRY[colo] ?? null : null;
}

async function lookupIp(ip: string): Promise<string | null> {
  const key = networkKey(ip);
  const hit = memo.get(key);
  if (hit && Date.now() - hit.at < MEMO_TTL_MS) return hit.country;

  let country: string | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1800);
    const res = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/country/`, {
      headers: { "User-Agent": "heartify-geo/1.0" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (res.ok) {
      country = validCountry(await res.text());
    } else {
      // Rate limits are expected on the free tier; colo fallback covers it.
      console.warn(`[geo] ipapi ${res.status}`);
    }
  } catch (err) {
    console.warn("[geo] ip lookup failed", err instanceof Error ? err.message : err);
  }

  memo.set(key, { country, at: Date.now() });
  return country;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let country: string | null = null;
  let source: string | null = null;

  for (const h of COUNTRY_HEADERS) {
    const c = validCountry(req.headers.get(h));
    if (c) {
      country = c;
      source = "cdn";
      break;
    }
  }

  if (!country) {
    const ip = clientIp(req);
    if (ip) {
      country = await lookupIp(ip);
      if (country) source = "ip";
    }
  }

  if (!country) {
    country = coloCountry(req);
    if (country) source = "colo";
  }

  return new Response(JSON.stringify({ country, source }), {
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      // Per-visitor answer: browser may reuse it, shared caches must not.
      "Cache-Control": "private, max-age=900",
    },
  });
});
