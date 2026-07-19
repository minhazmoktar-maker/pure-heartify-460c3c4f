/**
 * Heartify Information Architecture — the product spine.
 *
 * Every one of the app's 190+ routes is mapped to EXACTLY ONE of five
 * top-level spines. This file is the single source of truth for:
 *   - The mobile bottom tab bar (BottomTabBar)
 *   - "Smart back" fallback when history is empty
 *   - Breadcrumb / tab highlighting
 *   - Navbar mega-menu grouping
 *
 * Rules:
 *   1. Every route belongs to exactly one spine.
 *   2. Public share routes (/u/:handle, /d/:id, ...) inherit from the
 *      closest matching group.
 *   3. Auth pages, legal, and admin surfaces live in "system" (not a
 *      user-facing tab) but keep a home spine for smart-back.
 *
 * Adding a route: append the pattern here, then run
 *   `bunx vitest run src/lib/__tests__/navigation.test.ts` to verify
 *   coverage.
 */

export type SpineId = "home" | "quran" | "prayer" | "dhikr" | "you";

export interface SpineDefinition {
  id: SpineId;
  label: string;
  path: string;             // canonical entry route for the spine
  /** Route patterns owned by this spine. String = exact, RegExp = matcher. */
  owns: Array<string | RegExp>;
}

/**
 * The five spines. Order = display order in the bottom tab bar.
 * Icons are resolved at render-time by BottomTabBar to avoid a lucide
 * dependency at module-load.
 */
export const SPINES: readonly SpineDefinition[] = [
  {
    id: "home",
    label: "Home",
    path: "/",
    owns: [
      "/",
      "/today",
      "/search",
      "/channels",
      "/shorts",
      "/creators",
      "/creators/dashboard",
      "/playlists",
      /^\/section\//,
      /^\/watch\//,
      /^\/p\//,          // playlist detail share
      /^\/w\//,          // weekly recap shares
      /^\/b\//,          // badge shares
      /^\/s\//,          // streak shares
    ],
  },
  {
    id: "quran",
    label: "Quran",
    path: "/quran",
    owns: [
      "/quran", "/mushaf", "/hifz", "/tajweed", "/khatm", "/khatm/groups",
      /^\/quran\//, /^\/mushaf\//, /^\/khatm\//,
      /^\/ayah\//, /^\/surah\//, /^\/juz\//,
      /^\/k\//,          // khatm-group share
    ],
  },
  {
    id: "prayer",
    label: "Prayer",
    path: "/prayer",
    owns: [
      "/prayer", "/qibla", "/mosques",
      "/salah", "/salah-guide", "/adhan-iqamah", "/sunnah-prayers",
      "/wudu", "/ghusl", "/purification", "/janazah", "/ruqya",
      "/fasting", "/ramadan", "/hajj", "/umrah",
      "/zakat", "/sadaqah", "/wasiyyah", "/nikah",
      /^\/salah\/[^/]+$/, /^\/masjid\//, /^\/mosque\//,
    ],
  },
  {
    id: "dhikr",
    label: "Dhikr",
    path: "/dhikr",
    owns: [
      "/dhikr", "/adhkar", "/wird", "/hisnul",
      "/masnoon-duas", "/kids-duas",
      "/dua-wall", "/journal", "/reminders", "/challenges",
      "/dhikr/circles", "/teams", "/leaderboards",
      "/learn", "/library", "/hadith", "/seerah",
      "/names", "/quotes", "/glossary", "/quiz", "/stories",
      "/new-muslim", "/alphabet", "/hijri", "/events",
      "/prophets", "/sahaba", "/scholars", "/madhabs",
      "/pillars", "/sacred-mosques", "/aqeedah", "/akhlaq", "/history",
      "/miracles", "/battles", "/nawawi-40", "/farewell-sermon",
      "/ahlul-bayt", "/quran-sciences", "/hadith-sciences",
      "/tibb", "/adab", "/parenting", "/marriage-rights",
      "/parents-rights", "/muslim-rights", "/womens-fiqh", "/womens-purity",
      "/seeking-knowledge", "/major-sins", "/tawbah", "/jannah",
      "/kalimahs", "/travel-adab", "/eating-sunnah", "/means-of-reward",
      "/signs-of-hour", "/inheritance", "/islamic-finance",
      "/shared-economy", "/dreams", "/baby-names",
      "/fatwa", "/halal-check", "/digital-purification",
      /^\/library\//,
      /^\/hadith\//,
      /^\/c\//,          // dhikr circle share
      /^\/d\//,          // dua share
      /^\/t\//,          // team share
      /^\/name\//, /^\/prophet\//, /^\/sahabi\//, /^\/hijri-month\//,
      /^\/event\//, /^\/pillar\//, /^\/iman\//, /^\/madhhab\//,
      /^\/seerah\//, /^\/scholar\//, /^\/battle\//, /^\/miracle\//,
      /^\/prophet-name\//, /^\/sign-of-hour\//,
      /^\/virtue\//, /^\/hisn\//,
      /^\/adhkar-set\//, /^\/quran-dua\//, /^\/sunnah\//,
      /^\/durood\//, /^\/kalimah\//,
    ],
  },
  {
    id: "you",
    label: "You",
    path: "/profile",
    owns: [
      "/profile", "/bookmarks", "/achievements", "/recap",
      "/offline", "/onboarding", "/appeals", "/transparency",
      "/plus", "/plus/join", "/redeem", "/changelog",
      "/settings/notifications", "/account/export-data",
      "/security/mfa", "/security/mfa/verify",
      /^\/appeals\//,
      /^\/u\//,
    ],
  },
] as const;

// ---------------------------------------------------------------------------
// Non-spine surfaces (still routed, still valid, but not in the bottom bar)
// ---------------------------------------------------------------------------

/** Auth, legal, admin, and OAuth surfaces. Not tab-worthy but tracked. */
export const SYSTEM_ROUTES = [
  "/login", "/signup", "/forgot-password", "/reset-password", "/verify-email",
  "/privacy", "/terms", "/about", "/trust", "/status", "/contact",
  "/.lovable/oauth/consent",
  /^\/admin(\/|$)/,
] as const;

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

function matches(pattern: string | RegExp, path: string): boolean {
  return typeof pattern === "string" ? pattern === path : pattern.test(path);
}

/**
 * Resolve which spine a pathname belongs to.
 * Falls back to "home" so `smartBack()` always has somewhere to go.
 */
export function resolveSpine(pathname: string): SpineId {
  // Normalise trailing slash
  const p = pathname !== "/" && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  for (const spine of SPINES) {
    for (const pattern of spine.owns) {
      if (matches(pattern, p)) return spine.id;
    }
  }
  return "home";
}

/** Is this route part of a system (non-tab) surface? */
export function isSystemRoute(pathname: string): boolean {
  return SYSTEM_ROUTES.some((r) => matches(r, pathname));
}

/** Should the mobile bottom tab bar be visible for this route? */
export function shouldShowBottomBar(pathname: string): boolean {
  // Hide on immersive surfaces
  const HIDDEN = [
    /^\/watch\//,      // full-bleed video
    /^\/shorts/,       // vertical feed
    /^\/mushaf/,       // reading immersion
    /^\/login/, /^\/signup/, /^\/onboarding/,
    /^\/forgot-password/, /^\/reset-password/, /^\/verify-email/,
    /^\/security\/mfa/,
    /^\/\.lovable\/oauth/,
  ];
  return !HIDDEN.some((r) => r.test(pathname));
}

/** Entry path for a spine — used by smartBack() and BottomTabBar. */
export function spinePath(id: SpineId): string {
  return SPINES.find((s) => s.id === id)?.path ?? "/";
}
