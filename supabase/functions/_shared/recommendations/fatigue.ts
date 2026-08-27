/**
 * Repetition-fatigue curve, split out of `rerankV3.ts` so it is importable
 * from plain Node/vitest simulations (rerankV3 pulls in the Deno `npm:`
 * Supabase client, which cannot be typechecked by the web build).
 */

export interface ImpressionRow {
  video_id: string;
  seen_count: number;
  last_seen_at: string;
  last_action: string | null;
}

/** Impression decay curve. Returns [penalty, hardHide]. */
export function impressionPenalty(imp: ImpressionRow | undefined): [number, boolean] {
  if (!imp) return [0, false];
  // Positive action recently → treat as fresh (0 penalty)
  if (
    imp.last_action &&
    ["watch", "complete", "save", "share", "follow", "rewatch"].includes(imp.last_action)
  ) {
    return [0, false];
  }
  const n = imp.seen_count;
  if (n >= 8) return [10, true];
  const curve: Record<number, number> = { 1: 0.05, 2: 0.15, 3: 0.35, 4: 0.5, 5: 0.65, 6: 0.85, 7: 1.1 };
  return [curve[n] ?? 0, false];
}
