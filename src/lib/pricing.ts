/**
 * Purchasing-power-adjusted (PPP) pricing.
 *
 * Heartify's largest markets cannot bear US pricing, so each region has its own
 * price list denominated in the local currency — these are the amounts a member
 * is actually charged, not an FX conversion of the USD price. The merchant of
 * record (Paddle) collects in the same currency and handles local tax.
 *
 * Region is inferred from the browser locale's region subtag (no IP lookup, no
 * tracking) and can be overridden by the member.
 */

export type PlanId = "plus" | "family" | "lifetime";

export type RegionPricing = {
  /** ISO 3166-1 alpha-2 codes this price list applies to. */
  countries: string[];
  label: string;
  currency: string;
  /** Locale used for currency formatting. */
  locale: string;
  prices: Record<PlanId, number>;
  /** Rough PPP discount vs the USD list price, for the "fair price" badge. */
  discountPct?: number;
};

export const PRICING_REGIONS: Record<string, RegionPricing> = {
  global: {
    countries: [],
    label: "Global (USD)",
    currency: "USD",
    locale: "en-US",
    prices: { plus: 4.99, family: 8.99, lifetime: 149 },
  },
  bd: {
    countries: ["BD"],
    label: "Bangladesh (BDT)",
    currency: "BDT",
    locale: "bn-BD",
    prices: { plus: 249, family: 449, lifetime: 6900 },
    discountPct: 60,
  },
  pk: {
    countries: ["PK"],
    label: "Pakistan (PKR)",
    currency: "PKR",
    locale: "ur-PK",
    prices: { plus: 699, family: 1299, lifetime: 19900 },
    discountPct: 55,
  },
  in: {
    countries: ["IN"],
    label: "India (INR)",
    currency: "INR",
    locale: "en-IN",
    prices: { plus: 179, family: 329, lifetime: 4999 },
    discountPct: 55,
  },
  id: {
    countries: ["ID"],
    label: "Indonesia (IDR)",
    currency: "IDR",
    locale: "id-ID",
    prices: { plus: 29000, family: 55000, lifetime: 799000 },
    discountPct: 55,
  },
  ng: {
    countries: ["NG", "KE", "TZ", "GH"],
    label: "Nigeria & East Africa",
    currency: "NGN",
    locale: "en-NG",
    prices: { plus: 1900, family: 3500, lifetime: 49000 },
    discountPct: 55,
  },
  eg: {
    countries: ["EG", "MA", "DZ", "TN", "JO", "LB", "IQ", "YE", "SD"],
    label: "Egypt & North Africa",
    currency: "EGP",
    locale: "ar-EG",
    prices: { plus: 89, family: 159, lifetime: 2400 },
    discountPct: 55,
  },
  tr: {
    countries: ["TR"],
    label: "Türkiye (TRY)",
    currency: "TRY",
    locale: "tr-TR",
    prices: { plus: 79, family: 149, lifetime: 2200 },
    discountPct: 45,
  },
};

export const REGION_OVERRIDE_KEY = "heartify.pricing_region";

function countryFromLocale(): string | null {
  const langs = typeof navigator !== "undefined" ? [navigator.language, ...(navigator.languages ?? [])] : [];
  for (const tag of langs) {
    if (!tag) continue;
    const parts = tag.split("-");
    const region = parts.find((p) => /^[A-Z]{2}$/.test(p));
    if (region) return region;
  }
  return null;
}

/** Region key for this visitor: stored override → locale region → global. */
export function detectRegionKey(): string {
  try {
    const stored = localStorage.getItem(REGION_OVERRIDE_KEY);
    if (stored && PRICING_REGIONS[stored]) return stored;
  } catch {
    /* storage blocked — fall through to detection */
  }
  const country = countryFromLocale();
  if (country) {
    const hit = Object.entries(PRICING_REGIONS).find(([, r]) => r.countries.includes(country));
    if (hit) return hit[0];
  }
  return "global";
}

export function setRegionOverride(key: string) {
  try {
    localStorage.setItem(REGION_OVERRIDE_KEY, key);
  } catch {
    /* ignore */
  }
}

/** Format a plan price in the region's own currency. */
export function formatPlanPrice(region: RegionPricing, plan: PlanId | "free"): string {
  if (plan === "free") return "Free";
  const amount = region.prices[plan];
  const zeroDecimal = ["IDR", "NGN", "BDT", "PKR"].includes(region.currency);
  return new Intl.NumberFormat(region.locale, {
    style: "currency",
    currency: region.currency,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
    minimumFractionDigits: zeroDecimal ? 0 : Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
