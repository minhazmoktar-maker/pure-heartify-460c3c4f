/**
 * Semantic near-duplicate collapsing.
 *
 * `curated_videos.duplicate_group_id` is a normalized signature of the title
 * (see the `feed_dup_key` SQL function): re-uploads of the same lecture across
 * channels, "| Full Lecture", "[HD]", part markers and language tags all land
 * in the same group. The DB already marks one canonical row per group, but a
 * candidate pool can still contain two rows of the same group when the
 * canonical flag is mid-recompute or a non-RPC path supplied the rows.
 *
 * This pass is the last-mile guarantee: at most one item per group leaves the
 * wire, and the one kept is the *best* member of the group by the same
 * ordering the DB uses (trusted channel → halal score → view count → earliest).
 *
 * Pure and dependency-free so it can be unit tested outside Deno.
 */

export type DedupCandidate = Record<string, unknown>;

function quality(v: DedupCandidate): number {
  const trusted = v.is_trusted_channel === true ? 1 : 0;
  const halal = Number(v.halal_score ?? 0) || 0;
  const views = Number(v.view_count ?? 0) || 0;
  // Trust dominates, then halal score, then a compressed view-count term so a
  // viral upload cannot outrank a materially safer one.
  return trusted * 1000 + halal * 10 + Math.log10(1 + Math.max(0, views));
}

/**
 * Keep the best row per `duplicate_group_id`, preserving the incoming order of
 * the survivors. Rows without a group id are always kept (ungrouped backlog).
 *
 * @returns the deduplicated list plus how many rows were collapsed.
 */
export function collapseDuplicateGroups<T extends DedupCandidate>(
  items: T[],
  opts: { alreadyServedGroups?: Set<string> } = {},
): { items: T[]; collapsed: number } {
  const bestByGroup = new Map<string, T>();
  const served = opts.alreadyServedGroups;
  let collapsed = 0;

  for (const v of items) {
    const g = typeof v.duplicate_group_id === "string" ? v.duplicate_group_id : "";
    if (!g) continue;
    if (served?.has(g)) continue;
    const prev = bestByGroup.get(g);
    if (!prev) {
      bestByGroup.set(g, v);
    } else {
      collapsed++;
      if (quality(v) > quality(prev)) bestByGroup.set(g, v);
    }
  }

  const emitted = new Set<string>();
  const out: T[] = [];
  for (const v of items) {
    const g = typeof v.duplicate_group_id === "string" ? v.duplicate_group_id : "";
    if (!g) {
      out.push(v);
      continue;
    }
    if (served?.has(g)) {
      collapsed++;
      continue;
    }
    if (emitted.has(g)) continue;
    const best = bestByGroup.get(g);
    if (!best) continue;
    emitted.add(g);
    out.push(best);
  }
  return { items: out, collapsed };
}
