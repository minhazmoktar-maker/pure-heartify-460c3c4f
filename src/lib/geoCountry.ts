/**
 * Visitor country resolution for the pre-sign-in feed.
 *
 * Order of trust:
 *   1. `geo-country` edge function — the country the CDN resolved for this
 *      request. Accurate for travellers and for devices whose timezone is not
 *      in our map.
 *   2. `detectCountry()` — timezone guess, works offline and instantly.
 *
 * The network answer is cached locally so we make at most one request per
 * visitor per day, and the timezone guess is always available synchronously so
 * the first render never waits on the network.
 */
import { detectCountry } from "@/i18n/detect";

const CACHE_KEY = "heartify-geo-country";
const TTL_MS = 24 * 60 * 60 * 1000;

type Cached = { country: string | null; at: number };

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (!parsed || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(country: string | null) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ country, at: Date.now() } satisfies Cached));
  } catch {
    /* private mode — fall back to per-session resolution */
  }
}

/** Cached or timezone-derived country, available synchronously. */
export function cachedCountry(): string | null {
  return readCache()?.country ?? detectCountry();
}

/**
 * Resolves the visitor's country, preferring the CDN signal.
 * Never throws and never blocks longer than 2.5s.
 */
export async function resolveCountry(): Promise<string | null> {
  const cached = readCache();
  if (cached) return cached.country ?? detectCountry();

  const url = import.meta.env.VITE_SUPABASE_URL;
  if (!url) return detectCountry();

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`${url}/functions/v1/geo-country`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.warn(`[geo] geo-country ${res.status}: ${(await res.text()).slice(0, 200)}`);
      return detectCountry();
    }
    const body = (await res.json()) as { country?: string | null };
    const country = typeof body.country === "string" && /^[A-Z]{2}$/.test(body.country)
      ? body.country
      : null;
    // Cache the miss too: a null answer means this CDN adds no country header,
    // so retrying on every page load would be pure waste.
    writeCache(country);
    return country ?? detectCountry();
  } catch (err) {
    if (!(err instanceof DOMException && err.name === "AbortError")) {
      console.warn("[geo] country resolution failed", err);
    }
    return detectCountry();
  }
}
