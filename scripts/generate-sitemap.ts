// Chunked sitemap generator with hreflang alternates.
// Runs via `predev` and `prebuild` hooks; emits:
//   public/sitemap.xml                    → sitemap index
//   public/sitemaps/core.xml              → static routes
//   public/sitemaps/<category>.xml        → one child per entity family
//
// Data is imported directly from src/data/* so it stays in sync with the app.

import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

import { ASMA_UL_HUSNA } from "../src/data/asmaUlHusna";
import { HISNUL_DUAS } from "../src/data/hisnul";
import { PROPHETS } from "../src/data/prophets";
import { SAHABA } from "../src/data/sahaba";
import { PROPHET_NAMES } from "../src/data/prophetNames";
import { SIGNS_OF_HOUR } from "../src/data/signsOfHour";
import { MIRACLES } from "../src/data/miracles";
import { VIRTUES } from "../src/data/virtues";
import { SUNNAH_ACTS } from "../src/data/sunnahActs";
import { MADHAHIB } from "../src/data/madhahib";
import { SCHOLARS } from "../src/data/scholars";
import { SALAWAT } from "../src/data/salawat";
import { HIJRI_MONTHS } from "../src/data/hijriMonths";
import { ISLAMIC_EVENTS } from "../src/data/islamicEvents";
import { SACRED_MOSQUES } from "../src/data/sacredMosques";
import { QURAN_DUAS } from "../src/data/quranDuas";
import { ADHKAR } from "../src/data/adhkar";
import { BATTLES } from "../src/data/battles";
import { SEERAH_EVENTS } from "../src/data/seerah";
import { PILLARS, ARTICLES } from "../src/data/foundations";
import { KALIMAHS } from "../src/data/kalimahs";
import { JUZ } from "../src/data/juz";
import { DUROOD } from "../src/data/durood";
import { RECITERS } from "../src/data/reciters";
import { HALAL_TOPICS } from "../src/data/halalTopics";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BASE_URL = "https://heartifyapp.com";
const PUBLIC_DIR = resolve(__dirname, "../public");
const CHUNK_DIR = resolve(PUBLIC_DIR, "sitemaps");
const HREFLANGS = ["en", "ar", "bn", "de", "fr", "id", "tr"] as const;
const CHUNK_SIZE = 5000;

type Entry = {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
};

function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function urlNode(e: Entry): string {
  const loc = `${BASE_URL}${e.path}`;
  const alternates = HREFLANGS.map(
    (lng) =>
      `    <xhtml:link rel="alternate" hreflang="${lng}" href="${xmlEscape(loc)}?lang=${lng}"/>`
  ).join("\n");
  return [
    "  <url>",
    `    <loc>${xmlEscape(loc)}</loc>`,
    e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
    e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
    e.priority ? `    <priority>${e.priority}</priority>` : null,
    alternates,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(loc)}"/>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");
}

function writeUrlset(filePath: string, entries: Entry[]) {
  const body = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...entries.map(urlNode),
    `</urlset>`,
  ].join("\n");
  writeFileSync(filePath, body);
}

function writeChunked(name: string, entries: Entry[]): string[] {
  if (!existsSync(CHUNK_DIR)) mkdirSync(CHUNK_DIR, { recursive: true });
  if (entries.length <= CHUNK_SIZE) {
    const file = `sitemaps/${name}.xml`;
    writeUrlset(resolve(PUBLIC_DIR, file), entries);
    return [file];
  }
  const files: string[] = [];
  for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
    const idx = Math.floor(i / CHUNK_SIZE) + 1;
    const file = `sitemaps/${name}-${idx}.xml`;
    writeUrlset(resolve(PUBLIC_DIR, file), entries.slice(i, i + CHUNK_SIZE));
    files.push(file);
  }
  return files;
}

// Static / core routes
const core: Entry[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/search", changefreq: "weekly", priority: "0.8" },
  { path: "/channels", changefreq: "weekly", priority: "0.8" },
  { path: "/quran", changefreq: "weekly", priority: "0.9" },
  { path: "/hisnul", changefreq: "weekly", priority: "0.9" },
  { path: "/names", changefreq: "weekly", priority: "0.9" },
  { path: "/kalimahs", changefreq: "weekly", priority: "0.9" },
  { path: "/pillars", changefreq: "weekly", priority: "0.9" },
  { path: "/aqeedah", changefreq: "weekly", priority: "0.9" },
  { path: "/prophets", changefreq: "weekly", priority: "0.9" },
  { path: "/sahaba", changefreq: "weekly", priority: "0.9" },
  { path: "/seerah", changefreq: "weekly", priority: "0.8" },
  { path: "/battles", changefreq: "weekly", priority: "0.8" },
  { path: "/miracles", changefreq: "weekly", priority: "0.8" },
  { path: "/scholars", changefreq: "weekly", priority: "0.8" },
  { path: "/madhabs", changefreq: "weekly", priority: "0.8" },
  { path: "/asma-ul-husna", changefreq: "weekly", priority: "0.8" },
  { path: "/adhkar", changefreq: "weekly", priority: "0.8" },
  { path: "/sunnah-acts", changefreq: "weekly", priority: "0.7" },
  { path: "/signs-of-hour", changefreq: "weekly", priority: "0.7" },
  { path: "/hijri-calendar", changefreq: "weekly", priority: "0.7" },
  { path: "/islamic-events", changefreq: "weekly", priority: "0.7" },
  { path: "/sacred-mosques", changefreq: "weekly", priority: "0.7" },
  { path: "/fatwa", changefreq: "weekly", priority: "0.8" },
  { path: "/digital-purification", changefreq: "monthly", priority: "0.8" },
  { path: "/guides/omar-suleiman-ramadan-series", changefreq: "monthly", priority: "0.7" },
  { path: "/guides/best-islamic-cartoons", changefreq: "monthly", priority: "0.7" },
  { path: "/guides/islamic-calendar-2026", changefreq: "monthly", priority: "0.8" },
  { path: "/about", changefreq: "monthly", priority: "0.6" },
  { path: "/contact", changefreq: "monthly", priority: "0.5" },
  { path: "/login", changefreq: "monthly", priority: "0.4" },
  { path: "/signup", changefreq: "monthly", priority: "0.5" },
  { path: "/privacy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms", changefreq: "yearly", priority: "0.3" },
  { path: "/halal", changefreq: "weekly", priority: "0.8" },
  // Authoritative pillar hubs + public trust and directory surfaces
  { path: "/islamic-learning", changefreq: "weekly", priority: "0.9" },
  { path: "/halal-video", changefreq: "weekly", priority: "0.9" },
  { path: "/quran-listening", changefreq: "weekly", priority: "0.9" },
  { path: "/directory", changefreq: "daily", priority: "0.8" },
  { path: "/verify", changefreq: "weekly", priority: "0.7" },
];

// Entity families → chunked child sitemaps
const families: Array<{ name: string; entries: Entry[] }> = [
  { name: "names", entries: ASMA_UL_HUSNA.map((n) => ({ path: `/name/${n.n}`, changefreq: "monthly", priority: "0.7" })) },
  { name: "hisnul", entries: HISNUL_DUAS.map((d) => ({ path: `/hisn/${d.id}`, changefreq: "monthly", priority: "0.7" })) },
  { name: "prophets", entries: PROPHETS.map((p) => ({ path: `/prophet/${p.slug}`, changefreq: "monthly", priority: "0.8" })) },
  { name: "sahaba", entries: SAHABA.map((s) => ({ path: `/sahabi/${s.slug}`, changefreq: "monthly", priority: "0.7" })) },
  { name: "prophet-names", entries: PROPHET_NAMES.map((p) => ({ path: `/prophet-name/${p.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "signs-of-hour", entries: SIGNS_OF_HOUR.map((s) => ({ path: `/sign-of-hour/${s.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "miracles", entries: MIRACLES.map((m) => ({ path: `/miracle/${m.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "virtues", entries: VIRTUES.map((v) => ({ path: `/virtue/${v.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "sunnah", entries: SUNNAH_ACTS.map((s) => ({ path: `/sunnah/${s.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "madhahib", entries: MADHAHIB.map((m) => ({ path: `/madhhab/${m.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "scholars", entries: SCHOLARS.map((s) => ({ path: `/scholar/${s.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "salawat", entries: SALAWAT.map((s) => ({ path: `/salah/${s.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "hijri-months", entries: HIJRI_MONTHS.map((h) => ({ path: `/hijri-month/${h.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "islamic-events", entries: ISLAMIC_EVENTS.map((e) => ({ path: `/event/${e.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "sacred-mosques", entries: SACRED_MOSQUES.map((m) => ({ path: `/masjid/${m.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "quran-duas", entries: QURAN_DUAS.map((q) => ({ path: `/quran-dua/${q.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "adhkar-sets", entries: Array.from(new Set(ADHKAR.map((a: { id: string }) => a.id))).map((id) => ({ path: `/adhkar-set/${id}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "battles", entries: BATTLES.map((b) => ({ path: `/battle/${b.slug}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "seerah", entries: SEERAH_EVENTS.map((s) => ({ path: `/seerah/${s.id}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "pillars", entries: PILLARS.map((p) => ({ path: `/pillar/${p.n}`, changefreq: "monthly", priority: "0.7" })) },
  { name: "iman", entries: ARTICLES.map((a) => ({ path: `/iman/${a.n}`, changefreq: "monthly", priority: "0.7" })) },
  { name: "kalimahs", entries: KALIMAHS.map((k) => ({ path: `/kalimah/${k.n}`, changefreq: "monthly", priority: "0.7" })) },
  { name: "juz", entries: JUZ.map((j) => ({ path: `/juz/${j.n}`, changefreq: "monthly", priority: "0.6" })) },
  { name: "durood", entries: (DUROOD as Array<{ slug: string }>).map((d) => ({ path: `/durood/${d.slug}`, changefreq: "monthly", priority: "0.6" })) },
  // Qur'an surahs 1..114 and juz 1..30 (surah pages are generated on demand)
  { name: "surahs", entries: Array.from({ length: 114 }, (_, i) => ({ path: `/surah/${i + 1}`, changefreq: "monthly", priority: "0.7" })) },
  { name: "reciters", entries: RECITERS.map((r) => ({ path: `/reciter/${r.id}`, changefreq: "monthly", priority: "0.7" })) },
  { name: "halal-topics", entries: Object.keys(HALAL_TOPICS).map((slug) => ({ path: `/halal/${slug}`, changefreq: "weekly", priority: "0.7" })) },
];

// ---------------------------------------------------------------------------
// Watch URLs (deep-link friendly).
//
// `/watch/:id` is the canonical share target and the same path Android App
// Links and iOS Universal Links open natively (see the `.well-known` files), so
// indexing it gives crawlers *and* link-verification tooling a real URL list to
// walk. Videos live in the database, so they are fetched at build time from the
// public read policy with a hard cap — publish output limits make a file per
// video impossible at corpus scale, and only the highest-quality clean videos
// deserve an indexable URL anyway. If the backend is unreachable (offline CI),
// the sitemap is still written without this family instead of failing the build.
const MAX_WATCH_URLS = Number(process.env.SITEMAP_MAX_WATCH_URLS ?? 5000);

/** Minimal .env reader — the generator runs outside Vite, so import.meta.env is empty. */
function envFromDotenv(name: string): string | undefined {
  if (process.env[name]) return process.env[name];
  try {
    const raw = readFileSync(resolve(__dirname, "../.env"), "utf8");
    const line = raw.split(/\r?\n/).find((l) => l.trim().startsWith(`${name}=`));
    return line?.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return undefined;
  }
}

async function fetchWatchEntries(): Promise<Entry[]> {
  const url = envFromDotenv("VITE_SUPABASE_URL");
  const key = envFromDotenv("VITE_SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key || MAX_WATCH_URLS <= 0) return [];
  // PostgREST caps every response at 1000 rows, so page through the RPC with an
  // explicit offset until the cap is reached or the backend runs out of rows.
  const PAGE = 1000;
  const ids: string[] = [];
  try {
    for (let offset = 0; offset < MAX_WATCH_URLS; offset += PAGE) {
      const res = await fetch(`${url}/rest/v1/rpc/sitemap_watch_urls`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ p_limit: PAGE, p_offset: offset }),
      });
      if (!res.ok) break;
      const rows = (await res.json()) as Array<{ video_id: string }>;
      if (!rows.length) break;
      for (const r of rows) {
        if (typeof r.video_id === "string" && /^[\w-]{6,32}$/.test(r.video_id)) ids.push(r.video_id);
      }
      if (rows.length < PAGE) break;
    }
  } catch {
    return [];
  }
  return Array.from(new Set(ids))
    .slice(0, MAX_WATCH_URLS)
    .map((id) => ({ path: `/watch/${id}`, changefreq: "weekly" as const, priority: "0.6" }));
}

const watchEntries = await fetchWatchEntries();
if (watchEntries.length) families.push({ name: "watch", entries: watchEntries });

const coreFiles = writeChunked("core", core);
const familyFiles = families.flatMap((f) => (f.entries.length ? writeChunked(f.name, f.entries) : []));
const allFiles = [...coreFiles, ...familyFiles];

const now = new Date().toISOString();
const indexBody = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...allFiles.map(
    (f) => `  <sitemap>\n    <loc>${BASE_URL}/${f}</loc>\n    <lastmod>${now}</lastmod>\n  </sitemap>`
  ),
  `</sitemapindex>`,
].join("\n");
writeFileSync(resolve(PUBLIC_DIR, "sitemap.xml"), indexBody);

const totalEntries = core.length + families.reduce((n, f) => n + f.entries.length, 0);
// eslint-disable-next-line no-console
console.log(
  `sitemap: index + ${allFiles.length} child sitemap(s), ${totalEntries} URLs (× ${HREFLANGS.length} hreflang alternates)`
);
