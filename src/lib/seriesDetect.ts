// Series detection — recognizes multi-part video titles so we can group
// "Part 3 of 12" style content into a continuous, playable series rail.
//
// Supported patterns (case-insensitive):
//   • "Title — Part 3"           / "Title Part 3" / "Title - Pt 3"
//   • "Title — Episode 3"        / "Title Ep. 3" / "Title Ep 3"
//   • "Title (3/12)"             / "Title [3 of 12]"
//   • "Title #3"                 / "Title No. 3"
//   • "S1E3" / "S1 E3"           (season/episode)
//   • "الجزء 3" / "الحلقة 3"       (Arabic Part/Episode)
//   • "درس ۳"                     (Arabic/Farsi lesson number w/ Eastern digits)
//
// Returns `null` when no episode marker is found. The `base` is the title with
// the episode marker and surrounding separators trimmed so two episodes of the
// same series produce identical bases and can be grouped.

const EASTERN_TO_LATIN: Record<string, string> = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4", "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4", "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
};

function normalizeDigits(input: string): string {
  return input.replace(/[٠-٩۰-۹]/g, (d) => EASTERN_TO_LATIN[d] ?? d);
}

// Ordered so the most specific patterns match first (season/episode before
// plain "3" style markers). Each regex must expose the episode number in the
// last numeric capture group.
const PATTERNS: RegExp[] = [
  /\bs(\d{1,2})\s*[·\-\s]*e(\d{1,3})\b/i,                       // S1E3 / S1 E3
  /\bseason\s*(\d{1,2})\s*[·\-\s]*episode\s*(\d{1,3})\b/i,
  /\b(?:part|pt\.?|ep(?:isode|\.)?|chapter|ch\.?|lesson|day|class|lecture|session)\s*#?\s*(\d{1,3})\b/i,
  /[\[(\s]\s*(\d{1,3})\s*(?:\/|of|\|)\s*(\d{1,3})\s*[\])\s]/i,   // (3/12) or [3 of 12]
  /\b#\s*(\d{1,3})\b/,                                          // #3
  /\bno\.?\s*(\d{1,3})\b/i,                                     // No. 3
  /(?:الحلقة|الجزء|الدرس|درس|حلقة|جزء)\s*(\d{1,3})/,             // Arabic markers
];

const TRIM_CHARS = " -–—•·|:،/\\[](){}";

function trimSeparators(text: string): string {
  let s = text.trim();
  while (s.length && TRIM_CHARS.includes(s[0])) s = s.slice(1);
  while (s.length && TRIM_CHARS.includes(s[s.length - 1])) s = s.slice(0, -1);
  return s.replace(/\s{2,}/g, " ").trim();
}

export interface SeriesInfo {
  base: string;
  episode: number;
}

export function detectSeries(title: string): SeriesInfo | null {
  if (!title) return null;
  const normalized = normalizeDigits(title);
  for (const re of PATTERNS) {
    const m = normalized.match(re);
    if (!m) continue;
    // Last numeric capture wins (handles season/episode and X/Y patterns).
    const nums = m.slice(1).filter((g): g is string => !!g && /^\d+$/.test(g));
    if (!nums.length) continue;
    const episode = parseInt(nums[nums.length - 1], 10);
    if (!Number.isFinite(episode) || episode <= 0 || episode > 999) continue;
    const base = trimSeparators(normalized.replace(m[0], " "));
    if (base.length < 3) continue;
    return { base, episode };
  }
  return null;
}

// Two titles belong to the same series if they share a channel *and* their
// bases match after lowercasing and collapsing whitespace / diacritics.
export function seriesKey(channelTitle: string, base: string): string {
  const norm = base
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return `${channelTitle.toLowerCase().trim()}::${norm}`;
}
