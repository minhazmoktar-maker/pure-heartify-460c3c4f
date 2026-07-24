import { supabase } from "@/integrations/supabase/client";
import { isTrustedChannel } from "@/data/trustedChannels";
import { videos as fallbackVideoSeed } from "@/data/videos";

const HARD_REJECT_KEYWORDS = [
  "music video", "official song", "official video", "remix", "mashup", "cover song",
  "lyrical video", "lyrics video", "audio track", "EP release", "DJ", "beat",
  "instrumental", "trap", "rap", "hip hop", "pop song", "dance music", "EDM",
  "concert", "live performance", "stage performance", "karaoke",
  "dance", "dancing", "choreography", "tiktok", "viral dance", "trending dance",
  "dance challenge", "lip sync", "lip-sync",
  "sexy", "hot girl", "beautiful girl", "model", "bikini", "swimsuit", "lingerie",
  "fashion show", "ramp walk", "bold", "seductive", "kissing", "romance scene",
  "love scene", "couple goals", "girlfriend", "boyfriend", "dating", "crush",
  "relationship goals", "valentine", "hookup", "only fan",
  "alcohol", "wine", "beer", "whisky", "vodka", "bar", "nightclub", "clubbing",
  "party night", "rave", "casino", "gambling", "betting", "poker", "lottery",
  "fuck", "shit", "bitch", "bastard",
  "gameplay", "gaming", "live stream gaming", "GTA", "shooting game", "battle royale",
  "prank", "trolling", "reaction video", "funny moments", "comedy skit",
  "meme compilation", "roast", "drama", "celebrity gossip", "controversy",
  "exposed", "viral clip", "shocking video",
  "pyar", "mohabbat", "ladki", "sharab", "jua", "nach",
  "حب", "اغنية", "رقص",
  // Blocked creators by name
  "mia yilin", "mehreen", "leila hormozi", "layla hormozi",
];

const FEMALE_SENSITIVE_CHANNELS = ["sami yusuf", "sami yousuf", "why they converted"];
const FEMALE_MENTION_RE = /\b(woman|women|female|girl|sister|her story|she |actress|songstress|hijabi)\b/i;

const SOFT_REJECT_PATTERNS = [
  /you won't believe/i, /shocking/i, /gone wrong/i,
  /\#viral/i, /\#fyp/i, /\#trending/i,
];

const BAD_EMOJIS = /[💃🍺🎉😍🔥🍷🎰💋👙🩱🕺]/;
const QUERY_CACHE_PREFIX = "halaltube-youtube-cache";
const QUERY_CACHE_TTL_MS = 30 * 60 * 1000;
const STALE_QUERY_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MULTI_QUERY_BUDGET = 3;

export function halalScore(title: string, description: string, channelTitle: string): number {
  const text = `${title} ${description} ${channelTitle}`.toLowerCase();
  const channelLower = channelTitle.toLowerCase();

  for (const sensitive of FEMALE_SENSITIVE_CHANNELS) {
    if (channelLower.includes(sensitive) && FEMALE_MENTION_RE.test(`${title} ${description}`)) {
      return 0;
    }
  }
  for (const kw of HARD_REJECT_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) return 0;
  }
  for (const pat of SOFT_REJECT_PATTERNS) {
    if (pat.test(text)) return 0;
  }
  if (BAD_EMOJIS.test(text)) return 0;

  let score = 0;

  const islamicKeywords = [
    "quran", "surah", "hadith", "sunnah", "prophet", "allah", "islam",
    "deen", "tafsir", "khutbah", "jummah", "ramadan", "eid", "hajj",
    "dawah", "nasheed", "dhikr", "dua", "salah", "prayer", "mosque",
    "scholar", "sheikh", "mufti", "imam", "fiqh", "aqeedah", "seerah",
    "islamic", "muslim", "ummah", "halal", "haram", "taqwa", "sabr",
    "shukr", "tawbah", "jannat", "jannah", "aakhirah",
    "education", "learn", "study", "motivation", "discipline",
    "self-improvement", "productivity", "business", "entrepreneur",
    "success", "mindset", "knowledge", "wisdom", "lecture", "reminder",
  ];
  if (islamicKeywords.some((k) => text.includes(k))) score += 40;

  score += 20;

  if (isTrustedChannel(channelTitle)) {
    score += 25;
  } else {
    score += 5;
  }

  score += 20;

  return Math.min(score, 85);
}

export type HalalCategory =
  | "All" | "Islamic" | "Education" | "Business"
  | "Self-Improvement" | "Nasheeds" | "Quran" | "Lectures";

function classifyCategory(title: string, description: string): HalalCategory {
  const t = `${title} ${description}`.toLowerCase();
  if (/quran|surah|recitation|tilawat|tafsir|tajweed/.test(t)) return "Quran";
  if (/nasheed|naat|anasheed/.test(t)) return "Nasheeds";
  if (/khutbah|lecture|reminder|jummah|friday/.test(t)) return "Lectures";
  if (/business|entrepreneur|startup|marketing|finance|money|invest/.test(t)) return "Business";
  if (/study|learn|education|school|university|science|math|history/.test(t)) return "Education";
  if (/motivation|discipline|self.?improvement|productivity|habit|mindset|success/.test(t)) {
    return "Self-Improvement";
  }
  return "Islamic";
}

export interface YouTubeVideo {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  channelTitle: string;
  category: HalalCategory;
  halalScore: number;
  publishedAt: string;
  /**
   * Wave M2 — Beneficial Intelligence Engine reason chip.
   * When present, the card explains why this specific video was recommended
   * (e.g. "Because you learn Fiqh", "Trusted source", "New voice worth hearing").
   */
  reason?: string | null;
}

interface YouTubeProxyResponse {
  items?: Array<{
    id?: { videoId?: string };
    snippet?: {
      title?: string;
      description?: string;
      channelTitle?: string;
      publishedAt?: string;
      thumbnails?: {
        high?: { url?: string };
        medium?: { url?: string };
        default?: { url?: string };
      };
    };
  }>;
  degraded?: boolean;
  code?: string;
  error?: string;
}

const SEARCH_QUERIES = [
  "Islamic reminder",
  "Quran recitation beautiful",
  "self improvement discipline Islam",
  "halal business motivation",
  "Quran tafsir",
  "nasheed no music",
  "Islamic lecture",
  "dua dhikr morning",
  "Muslim productivity",
  "seerah Prophet Muhammad",
];

function mapFallbackCategory(category: string): HalalCategory {
  const normalized = category.toLowerCase();
  if (normalized.includes("quran") || normalized.includes("dhikr")) return "Quran";
  if (normalized.includes("lecture")) return "Lectures";
  if (normalized.includes("nasheed")) return "Nasheeds";
  if (normalized.includes("history") || normalized.includes("cooking")) return "Education";
  if (normalized.includes("family")) return "Islamic";
  return "Islamic";
}

const FALLBACK_VIDEOS: YouTubeVideo[] = fallbackVideoSeed.map((video, index) => ({
  id: `fallback-${video.id}`,
  title: video.title,
  videoUrl: `https://www.youtube.com/results?search_query=${encodeURIComponent(`${video.title} ${video.channel}`)}`,
  thumbnailUrl: video.thumbnail,
  channelTitle: video.channel,
  category: mapFallbackCategory(video.category),
  halalScore: video.verified ? 85 : 78,
  publishedAt: new Date(Date.now() - index * 86400000).toISOString(),
}));

function getCacheKey(query: string, maxResults: number) {
  return `${QUERY_CACHE_PREFIX}:${query.toLowerCase()}:${maxResults}`;
}

function readCachedVideos(cacheKey: string, maxAgeMs = QUERY_CACHE_TTL_MS): YouTubeVideo[] | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(cacheKey);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as { at: number; videos: YouTubeVideo[] };
    if (!parsed?.at || !Array.isArray(parsed.videos)) return null;
    if (Date.now() - parsed.at > maxAgeMs) return null;

    return parsed.videos;
  } catch {
    return null;
  }
}

function writeCachedVideos(cacheKey: string, videos: YouTubeVideo[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), videos }));
  } catch {
    // Ignore storage failures
  }
}

function searchFallbackVideos(query: string, maxResults: number): YouTubeVideo[] {
  const normalized = query.toLowerCase();
  const terms = normalized.split(/\s+/).filter((term) => term.length > 2);

  const preferredCategory = [
    { pattern: /quran|surah|tafsir|tajweed|dhikr|dua/, category: "Quran" as HalalCategory },
    { pattern: /lecture|khutbah|reminder|seerah/, category: "Lectures" as HalalCategory },
    { pattern: /nasheed|naat|anasheed/, category: "Nasheeds" as HalalCategory },
    { pattern: /business|finance|money|invest/, category: "Business" as HalalCategory },
    { pattern: /study|education|history|learn/, category: "Education" as HalalCategory },
    { pattern: /productivity|discipline|motivation|habit/, category: "Self-Improvement" as HalalCategory },
  ].find(({ pattern }) => pattern.test(normalized))?.category;

  const scored = FALLBACK_VIDEOS.map((video) => {
    const haystack = `${video.title} ${video.channelTitle} ${video.category}`.toLowerCase();
    let score = 0;

    for (const term of terms) {
      if (haystack.includes(term)) score += 4;
    }

    if (preferredCategory && video.category === preferredCategory) score += 6;
    if (isTrustedChannel(video.channelTitle)) score += 2;

    return { video, score };
  }).filter((item) => item.score > 0);

  const pool = scored.length
    ? scored.sort((a, b) => b.score - a.score).map((item) => item.video)
    : FALLBACK_VIDEOS;

  return pool.slice(0, maxResults);
}

const inflight = new Map<string, Promise<YouTubeProxyResponse>>();
let rateLimitedUntil = 0;

async function callYouTubeProxy(query: string, maxResults: number): Promise<YouTubeProxyResponse> {
  if (Date.now() < rateLimitedUntil) {
    return { degraded: true, code: "RATE_LIMITED" };
  }
  // youtube-proxy requires a signed-in caller (protects paid API quota).
  // For anonymous visitors, silently degrade to curated/fallback content
  // instead of surfacing a 401 in the console on /watch, /shorts, /search.
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    return { degraded: true, code: "AUTH_REQUIRED" };
  }
  const key = `${query.toLowerCase()}::${maxResults}`;
  const existing = inflight.get(key);
  if (existing) return existing;

  const p = (async (): Promise<YouTubeProxyResponse> => {
    const { data, error } = await supabase.functions.invoke("youtube-proxy", {
      body: { query, maxResults },
    });

    if (error) {
      const context = (error as { context?: Response }).context;
      let bodyText = "";
      if (context) bodyText = await context.text().catch(() => "");
      if (context?.status === 429 || /RATE_LIMITED/i.test(bodyText)) {
        rateLimitedUntil = Date.now() + 60_000;
        return { degraded: true, code: "RATE_LIMITED" };
      }
      throw new Error(bodyText || error.message || "YouTube proxy error");
    }

    return (data ?? {}) as YouTubeProxyResponse;
  })();

  inflight.set(key, p);
  try {
    return await p;
  } finally {
    inflight.delete(key);
  }
}


export async function fetchHalalVideos(query?: string, maxResults = 20): Promise<YouTubeVideo[]> {
  const q = query || SEARCH_QUERIES[Math.floor(Math.random() * SEARCH_QUERIES.length)];
  const normalizedMax = Math.min(Math.max(maxResults, 1), 24);
  const cacheKey = getCacheKey(q, normalizedMax);

  const freshCached = readCachedVideos(cacheKey);
  if (freshCached?.length) {
    return freshCached.slice(0, normalizedMax);
  }

  try {
    const data = await callYouTubeProxy(q, Math.min(normalizedMax + 4, 20));

    if (data.degraded) {
      return readCachedVideos(cacheKey, STALE_QUERY_CACHE_TTL_MS) ?? searchFallbackVideos(q, normalizedMax);
    }

    const approved: YouTubeVideo[] = [];

    for (const item of data.items ?? []) {
      const snippet = item.snippet;
      const title: string = snippet?.title ?? "";
      const desc: string = snippet?.description ?? "";
      const channel: string = snippet?.channelTitle ?? "";
      const videoId: string | undefined = item.id?.videoId;

      if (!videoId) continue;

      const score = halalScore(title, desc, channel);
      if (score < 75) continue;

      approved.push({
        id: videoId,
        title: decodeHtml(title),
        videoUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl:
          snippet?.thumbnails?.high?.url ??
          snippet?.thumbnails?.medium?.url ??
          snippet?.thumbnails?.default?.url ?? "",
        channelTitle: channel,
        category: classifyCategory(title, desc),
        halalScore: score,
        publishedAt: snippet?.publishedAt ?? "",
      });

      if (approved.length >= normalizedMax) break;
    }

    if (approved.length) {
      writeCachedVideos(cacheKey, approved);
    }

    return approved;
  } catch (error) {
    // Silently fall back — this happens on rate limits / quota exhaustion
    // and the UX degrades gracefully to cached/seeded content.
    if (import.meta.env.DEV) console.debug("YouTube fallback:", error);
    return readCachedVideos(cacheKey, STALE_QUERY_CACHE_TTL_MS) ?? searchFallbackVideos(q, normalizedMax);
  }

}

export async function fetchMultiQueryVideos(maxTotal = 24): Promise<YouTubeVideo[]> {
  const selectedQueries = SEARCH_QUERIES.slice(0, MULTI_QUERY_BUDGET);
  const perQuery = Math.max(6, Math.ceil(maxTotal / selectedQueries.length));
  const allResults: YouTubeVideo[] = [];
  const seenIds = new Set<string>();

  for (const query of selectedQueries) {
    const videos = await fetchHalalVideos(query, perQuery);

    for (const video of videos) {
      if (!seenIds.has(video.id)) {
        seenIds.add(video.id);
        allResults.push(video);
      }
    }

    if (allResults.length >= maxTotal) break;
  }

  return allResults.slice(0, maxTotal).sort((a, b) => b.halalScore - a.halalScore);
}

function decodeHtml(html: string): string {
  const txt = document.createElement("textarea");
  txt.innerHTML = html;
  return txt.value;
}

export const halalCategories: HalalCategory[] = [
  "All", "Islamic", "Quran", "Lectures", "Nasheeds", "Education", "Business", "Self-Improvement",
];
