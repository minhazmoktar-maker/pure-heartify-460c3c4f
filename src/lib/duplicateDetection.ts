/**
 * Client-side mirror of the SQL owner-key normalization used by
 * public.compute_owner_key and public.check_channel_duplicate.
 * Keep in sync with the SQL function.
 */

const SUFFIX_RE =
  /\s*(official|tv|hd|4k|backup|archive|channel|network|studio|productions?|media|[0-9]+)\s*$/g;

export function computeOwnerKey(name: string | null | undefined): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(SUFFIX_RE, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Trigram-style similarity between 0 and 1. */
export function titleSimilarity(a: string, b: string): number {
  const trigrams = (s: string): Set<string> => {
    const padded = `  ${s.toLowerCase()}  `;
    const set = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
    return set;
  };
  const A = trigrams(a);
  const B = trigrams(b);
  if (A.size === 0 || B.size === 0) return 0;
  let inter = 0;
  A.forEach((t) => B.has(t) && inter++);
  return inter / (A.size + B.size - inter);
}

export type DuplicateMatch =
  | { matchType: "exact_id"; score: 1 }
  | { matchType: "owner_key"; score: 0.95 }
  | { matchType: "title_similarity"; score: number }
  | null;

export function detectDuplicate(
  candidate: { youtube_channel_id: string; title: string; handle?: string | null },
  existing: Array<{ youtube_channel_id: string; title: string; owner_key: string }>,
): DuplicateMatch {
  const exact = existing.find((e) => e.youtube_channel_id === candidate.youtube_channel_id);
  if (exact) return { matchType: "exact_id", score: 1 };

  const ownerKey = computeOwnerKey(candidate.handle ?? candidate.title);
  if (ownerKey) {
    const owner = existing.find((e) => e.owner_key === ownerKey);
    if (owner) return { matchType: "owner_key", score: 0.95 };
  }

  let best = 0;
  for (const e of existing) {
    const s = titleSimilarity(e.title, candidate.title);
    if (s > best) best = s;
  }
  if (best > 0.7) return { matchType: "title_similarity", score: best };
  return null;
}

export function duplicateRiskLevel(match: DuplicateMatch): "low" | "medium" | "high" {
  if (!match) return "low";
  if (match.matchType === "title_similarity") return "medium";
  return "high";
}
