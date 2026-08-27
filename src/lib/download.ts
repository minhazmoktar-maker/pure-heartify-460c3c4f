/**
 * Client-side file download helpers for admin exports (audits, debugging).
 * Kept dependency-free: builds a Blob and clicks a temporary anchor.
 */
function save(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(data: unknown, filename: string) {
  save(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }), filename);
}

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Flat CSV from an array of records; column order follows the union of keys. */
export function downloadCsv(rows: Array<Record<string, unknown>>, filename: string) {
  const cols = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const body = [
    cols.join(","),
    ...rows.map((r) => cols.map((c) => cell(r[c])).join(",")),
  ].join("\n");
  save(new Blob([body], { type: "text/csv;charset=utf-8" }), filename);
}

export function timestampSlug(d = new Date()): string {
  return d.toISOString().replace(/[:.]/g, "-").slice(0, 19);
}
