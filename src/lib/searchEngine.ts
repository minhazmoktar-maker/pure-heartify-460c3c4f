/**
 * Intelligent search engine — typo-tolerant, synonym-aware, ranked.
 *
 * Modular pieces:
 *   - normalize(): canonicalize a query (lowercase, strip punctuation,
 *     unicode-fold, and map common Islamic spellings to a single form).
 *   - expandSynonyms(): expand a normalized query into an OR-set that
 *     includes topic/creator synonyms.
 *   - buildIndex(): build a Fuse.js index against title/channel/description/tags.
 *   - search(): run the fuzzy search against the index with weighted fields.
 *   - suggest(): autocomplete prefix suggestions from the index corpus.
 *   - didYouMean(): closest normalized token in the corpus when confidence
 *     is low.
 *
 * All moderation/filtering happens *upstream* (in the feed function / DB
 * blocked_creators + trigger). This engine never bypasses those guards —
 * it only ranks whatever the moderated pipeline gave us.
 */
import Fuse, { type IFuseOptions, type FuseResult } from "fuse.js";

export interface Searchable {
  id: string;
  title: string;
  channelTitle?: string | null;
  description?: string | null;
  tags?: string[] | null;
  category?: string | null;
}

// ---------- 1. Normalization ---------------------------------------------

const PUNCT_RE = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/g;
const SPACE_RE = /\s+/g;

/** Map of alternate Islamic/English spellings to a canonical form. */
const ISLAMIC_SPELLING: Record<string, string> = {
  quraan: "quran", qur_an: "quran", koran: "quran", "qur-an": "quran",
  muhammed: "muhammad", mohammad: "muhammad", mohammed: "muhammad", muhamad: "muhammad",
  ramadhan: "ramadan", ramadhaan: "ramadan", ramzan: "ramadan", ramadaan: "ramadan",
  eeman: "iman", imaan: "iman", eman: "iman", emaan: "iman", eemaan: "iman",
  dua: "dua", duaa: "dua", duas: "dua",
  islaam: "islam", isalm: "islam",
  muslmah: "muslim", muslimah: "muslim", musalman: "muslim", musulman: "muslim",

  shariah: "sharia", shareeah: "sharia",
  hadeeth: "hadith", ahadith: "hadith",
  seerat: "seerah", sirah: "seerah",
  nasheeds: "nasheed", naat: "nasheed",
  masjid: "mosque",
  salaah: "salah", salat: "salah", namaz: "salah",
  zakaat: "zakat",
  hajj: "hajj", hijj: "hajj",
};

export function normalize(input: string): string {
  const s = (input ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/['’`]/g, "") // drop apostrophes (qur'an -> quran) before splitting
    .replace(PUNCT_RE, " ")
    .replace(SPACE_RE, " ")
    .trim();

  return s
    .split(" ")
    .map((w) => ISLAMIC_SPELLING[w] ?? w)
    .join(" ");
}

// ---------- 2. Synonyms ---------------------------------------------------

/** Bi-directional synonym clusters. */
const SYNONYM_CLUSTERS: string[][] = [
  ["ai", "artificial intelligence", "machine learning", "ml"],
  ["gym", "fitness", "workout", "exercise", "training"],
  ["coding", "programming", "developer", "software", "engineering"],
  ["startup", "business", "entrepreneur", "founder"],
  ["islam", "muslim", "islamic", "deen"],
  ["quran", "koran", "quraan", "recitation", "tilawah", "tilawa"],
  ["iman", "faith", "belief", "aqeedah", "tawheed"],
  ["muslim", "muslimah", "islam", "ummah"],

  ["nasheed", "islamic song", "anasheed", "naat"],
  ["lecture", "bayan", "khutbah", "khutba", "sermon", "talk"],
  ["motivation", "productivity", "self improvement", "self-help"],
  ["focus", "concentration", "deep work", "attention", "dopamine"],
  ["neuroscience", "brain", "neural", "cognition", "psychology"],
  ["prayer", "salah", "salat", "namaz"],
  ["ramadan", "fasting", "sawm", "roza"],
  ["dawah", "outreach", "call to islam"],
  ["seerah", "prophet biography", "prophet muhammad life"],
  ["tafseer", "tafsir", "quran commentary", "exegesis"],
  ["finance", "money", "wealth", "halal investing"],
  ["reminder", "reminders", "reflection", "reflections"],
];

const SYNONYM_INDEX: Map<string, Set<string>> = (() => {
  const m = new Map<string, Set<string>>();
  for (const cluster of SYNONYM_CLUSTERS) {
    const set = new Set(cluster.map((t) => normalize(t)));
    for (const t of set) {
      const existing = m.get(t) ?? new Set<string>();
      for (const s of set) existing.add(s);
      m.set(t, existing);
    }
  }
  return m;
})();

/** Return the normalized query plus any known synonym expansions. */
export function expandSynonyms(normalized: string): string[] {
  const words = normalized.split(" ").filter(Boolean);
  const bag = new Set<string>([normalized]);

  // Word-level synonym expansion.
  for (const w of words) {
    const syns = SYNONYM_INDEX.get(w);
    if (!syns) continue;
    for (const s of syns) bag.add(s);
  }

  // Full-phrase synonym expansion (e.g. "islamic song" -> nasheed).
  const syns = SYNONYM_INDEX.get(normalized);
  if (syns) for (const s of syns) bag.add(s);

  return Array.from(bag);
}

// ---------- 3. Index + search --------------------------------------------

const FUSE_OPTIONS: IFuseOptions<Searchable> = {
  // Lower = stricter; 0.42 tolerates ~2-char typos on medium words.
  threshold: 0.42,
  ignoreLocation: true,
  minMatchCharLength: 2,
  includeScore: true,
  useExtendedSearch: true,
  keys: [
    { name: "title", weight: 0.55 },
    { name: "tags", weight: 0.2 },
    { name: "channelTitle", weight: 0.15 },
    { name: "description", weight: 0.1 },
  ],
};

export function buildIndex(items: Searchable[]): Fuse<Searchable> {
  return new Fuse(items, FUSE_OPTIONS);
}

export interface RankedResult<T extends Searchable> {
  item: T;
  score: number;
  matchType: "exact" | "fuzzy" | "synonym";
}

export function search<T extends Searchable>(
  fuse: Fuse<T>,
  rawQuery: string,
  limit = 40,
): RankedResult<T>[] {
  const q = normalize(rawQuery);
  if (!q) return [];
  const queries = expandSynonyms(q);

  const seen = new Map<string, RankedResult<T>>();
  for (const term of queries) {
    const results = fuse.search(term, { limit });
    for (const r of results as FuseResult<T>[]) {
      const score = r.score ?? 1;
      const existing = seen.get(r.item.id);
      const matchType: RankedResult<T>["matchType"] =
        score < 0.05 ? "exact" : term === q ? "fuzzy" : "synonym";
      if (!existing || score < existing.score) {
        seen.set(r.item.id, { item: r.item, score, matchType });
      }
    }
  }

  return Array.from(seen.values())
    .sort((a, b) => a.score - b.score)
    .slice(0, limit);
}

// ---------- 4. Autocomplete + Did You Mean -------------------------------

/** Cheap prefix autocomplete over titles + channel names. */
export function suggest(items: Searchable[], prefix: string, limit = 6): string[] {
  const p = normalize(prefix);
  if (p.length < 2) return [];
  const hits = new Map<string, number>();
  for (const it of items) {
    for (const source of [it.title, it.channelTitle ?? ""]) {
      const n = normalize(source);
      if (!n) continue;
      const idx = n.indexOf(p);
      if (idx === -1) continue;
      // Prefer prefix hits; word-boundary hits come next.
      const bonus = idx === 0 ? 3 : n[idx - 1] === " " ? 1 : 0;
      hits.set(source, (hits.get(source) ?? 0) + 1 + bonus);
    }
  }
  return Array.from(hits.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([s]) => s);
}

/** Levenshtein distance (iterative, O(n*m)) — small strings only. */
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let curr = i;
    let leftDiag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const next = Math.min(prev[j] + 1, curr + 1, leftDiag + cost);
      leftDiag = prev[j];
      prev[j] = next;
      curr = next;
    }
  }
  return prev[b.length];
}

/**
 * If the raw query has few or no strong hits, propose the closest
 * corpus token so the UI can render "Did you mean: X?".
 */
export function didYouMean(items: Searchable[], rawQuery: string): string | null {
  const q = normalize(rawQuery);
  if (q.length < 3) return null;

  const tokenCounts = new Map<string, number>();
  for (const it of items) {
    for (const t of normalize(`${it.title} ${it.channelTitle ?? ""}`).split(" ")) {
      if (t.length < 3) continue;
      tokenCounts.set(t, (tokenCounts.get(t) ?? 0) + 1);
    }
  }

  let best: { token: string; dist: number; freq: number } | null = null;
  for (const [token, freq] of tokenCounts) {
    if (Math.abs(token.length - q.length) > 3) continue;
    const d = editDistance(q, token);
    if (d === 0) return null; // exact token exists — no suggestion needed
    if (d > 2) continue;
    if (!best || d < best.dist || (d === best.dist && freq > best.freq)) {
      best = { token, dist: d, freq };
    }
  }
  return best?.token ?? null;
}
