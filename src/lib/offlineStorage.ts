/**
 * Pure helpers for the offline Storage screen.
 *
 * Kept React- and IndexedDB-free so the aggregation maths can be unit tested.
 * Track ids follow `q-<reciterId>-<surahNumber>` (see `data/reciterCatalog`).
 */
import type { OfflineUsageRow } from "@/lib/audioOffline";

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 MB";
  const mb = bytes / 1_048_576;
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

export interface ParsedTrackId {
  reciterId: string;
  surah: number;
}

export function parseSurahTrackId(id: string): ParsedTrackId | null {
  const m = /^q-(.+)-(\d{1,3})$/.exec(id);
  if (!m) return null;
  const surah = Number(m[2]);
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return null;
  return { reciterId: m[1], surah };
}

export interface UsageGroup {
  /** Reciter id, or `other` for non-Qur'an tracks. */
  reciterId: string;
  bytes: number;
  count: number;
  rows: OfflineUsageRow[];
}

export function totalOfflineBytes(rows: OfflineUsageRow[]): number {
  return rows.reduce((sum, r) => sum + (r.bytes || 0), 0);
}

/** Groups usage rows per reciter, largest group first. */
export function groupUsageByReciter(rows: OfflineUsageRow[]): UsageGroup[] {
  const groups = new Map<string, UsageGroup>();
  for (const row of rows) {
    const key = parseSurahTrackId(row.id)?.reciterId ?? "other";
    const g = groups.get(key) ?? { reciterId: key, bytes: 0, count: 0, rows: [] };
    g.bytes += row.bytes || 0;
    g.count += 1;
    g.rows.push(row);
    groups.set(key, g);
  }
  const list = [...groups.values()];
  for (const g of list) {
    g.rows.sort(
      (a, b) => (parseSurahTrackId(a.id)?.surah ?? 0) - (parseSurahTrackId(b.id)?.surah ?? 0),
    );
  }
  return list.sort((a, b) => b.bytes - a.bytes);
}
