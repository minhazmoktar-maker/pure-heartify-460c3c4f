/**
 * Heartify Information Architecture — the product spine.
 *
 * Heartify has ONE identity: halal-first video & content discovery.
 * The bottom tab bar surfaces the 4 spines that serve that mission.
 * Every one of the app's ~200 routes still maps to exactly one spine
 * (for smart-back, breadcrumbs, and analytics), but supporting Islamic
 * tools live *inside* Profile → More rather than competing for tab
 * real-estate with the video experience.
 *
 * Consumed by:
 *   - The mobile bottom tab bar (BottomTabBar)
 *   - "Smart back" fallback when history is empty
 *   - Route-owning tests
 */

export type SpineId = "home" | "explore" | "library" | "profile";

export interface SpineDefinition {
  id: SpineId;
  label: string;
  path: string;             // canonical entry route for the spine
  /** Route patterns owned by this spine. String = exact, RegExp = matcher. */
  owns: Array<string | RegExp>;
}

/**
 * The four spines. Order = display order in the bottom tab bar.
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
      "/shorts",
      /^\/watch\//,
      /^\/w\//,          // weekly recap shares
      /^\/b\//,          // badge shares
      /^\/s\//,          // streak shares
    ],
  },
  {
    id: "explore",
    label: "Explore",
    path: "/explore",
    owns: [
      "/explore",
      "/search",
      "/listen",
      "/channels",
      "/creators",
      "/scholars",
      "/trust",
      /^\/section\//,
      /^\/scholar\//,
      // Supporting Islamic study/discovery surfaces live under Explore too.
      "/quran", "/mushaf", "/hifz", "/tajweed", "/khatm", "/khatm/groups",
      "/hadith", "/seerah", "/names", "/hisnul", "/adhkar", "/masnoon-duas",
      "/kids-duas", "/dua-wall", "/dhikr", "/wird", "/learn", "/library",
      "/quotes", "/glossary", "/quiz", "/stories",
      "/prophets", "/sahaba", "/madhabs", "/pillars", "/sacred-mosques",
      "/aqeedah", "/akhlaq", "/history", "/miracles", "/battles",
      "/nawawi-40", "/farewell-sermon", "/ahlul-bayt",
      "/quran-sciences", "/hadith-sciences", "/tibb", "/adab",
      "/parenting", "/marriage-rights", "/parents-rights", "/muslim-rights",
      "/womens-fiqh", "/womens-purity", "/seeking-knowledge",
      "/major-sins", "/tawbah", "/jannah", "/kalimahs", "/travel-adab",
      "/eating-sunnah", "/means-of-reward", "/signs-of-hour",
      "/inheritance", "/islamic-finance", "/shared-economy", "/dreams",
      "/baby-names", "/fatwa", "/halal-check", "/digital-purification",
      "/prayer", "/qibla", "/mosques", "/salah", "/salah-guide",
      "/adhan-iqamah", "/sunnah-prayers", "/wudu", "/ghusl",
      "/purification", "/janazah", "/ruqya", "/fasting", "/ramadan",
      "/hajj", "/umrah", "/zakat", "/sadaqah", "/wasiyyah", "/nikah",
      "/hijri", "/events", "/alphabet", "/new-muslim",
      "/dhikr/circles", "/teams", "/leaderboards", "/reminders",
      "/challenges", "/journal",
      /^\/quran\//, /^\/mushaf\//, /^\/khatm\//,
      /^\/ayah\//, /^\/surah\//, /^\/juz\//,
      /^\/k\//,          // khatm-group share
      /^\/library\//,
      /^\/hadith\//,
      /^\/c\//, /^\/d\//, /^\/t\//,
      /^\/name\//, /^\/prophet\//, /^\/sahabi\//, /^\/hijri-month\//,
      /^\/event\//, /^\/pillar\//, /^\/iman\//, /^\/madhhab\//,
      /^\/seerah\//, /^\/battle\//, /^\/miracle\//,
      /^\/prophet-name\//, /^\/sign-of-hour\//,
      /^\/virtue\//, /^\/hisn\//,
      /^\/adhkar-set\//, /^\/quran-dua\//, /^\/sunnah\//,
      /^\/durood\//, /^\/kalimah\//,
      /^\/salah\/[^/]+$/, /^\/masjid\//, /^\/mosque\//,
    ],
  },
  {
    id: "library",
    label: "Library",
    path: "/me",
    owns: [
      "/me",
      "/playlists",
      "/bookmarks",
      "/offline",
      "/creators/dashboard",
      "/profile?tab=history",
      "/profile?tab=favorites",
      "/profile?tab=continue",
      /^\/p\//,          // playlist share
    ],
  },
  {
    id: "profile",
    label: "Profile",
    path: "/profile",
    owns: [
      "/profile", "/achievements", "/recap", "/onboarding",
      "/connections",
      "/appeals", "/transparency", "/plus", "/plus/join",
      "/redeem", "/changelog", "/salah", "/salah-tracker",
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
  "/privacy", "/terms", "/about", "/status", "/contact",
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
