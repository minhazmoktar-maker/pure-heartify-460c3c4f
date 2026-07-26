/**
 * Lightweight client diagnostics ring buffer.
 *
 * Purpose: pinpoint *why* a streak or a download fails on a given day on a
 * real device, where we have no console access. Every event is:
 *  - console.debug'd (always, not just DEV — these are cheap and low volume)
 *  - appended to a 200-entry ring buffer persisted in localStorage
 *  - readable from the device via `window.heartifyDiag()` / `heartifyDiagCopy()`
 *
 * No PII: we only record ids, durations, dates, and error codes/messages.
 */
export type DiagChannel = "streak" | "download";

export interface DiagEntry {
  t: string;            // ISO timestamp
  tz: number;           // minutes offset from UTC (streak boundary debugging)
  localDate: string;    // YYYY-MM-DD as the client computes it
  ch: DiagChannel;
  event: string;
  data?: Record<string, unknown>;
}

const KEY = "heartify.diag.v1";
const MAX = 200;

export function localDateISO(): string {
  return new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

function read(): DiagEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as DiagEntry[]) : [];
  } catch {
    return [];
  }
}

function write(entries: DiagEntry[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries.slice(-MAX)));
  } catch {
    /* quota / private mode — diagnostics must never break UX */
  }
}

export function diag(ch: DiagChannel, event: string, data?: Record<string, unknown>) {
  const entry: DiagEntry = {
    t: new Date().toISOString(),
    tz: -new Date().getTimezoneOffset(),
    localDate: localDateISO(),
    ch,
    event,
    data,
  };
  try {
    // eslint-disable-next-line no-console
    console.debug(`[diag:${ch}] ${event}`, data ?? "");
  } catch { /* noop */ }
  const all = read();
  all.push(entry);
  write(all);
}

export function readDiag(ch?: DiagChannel): DiagEntry[] {
  const all = read();
  return ch ? all.filter((e) => e.ch === ch) : all;
}

export function clearDiag() {
  try { localStorage.removeItem(KEY); } catch { /* noop */ }
}

export function formatDiag(ch?: DiagChannel): string {
  return readDiag(ch)
    .map((e) => `${e.t} tz${e.tz >= 0 ? "+" : ""}${e.tz} [${e.localDate}] ${e.ch}.${e.event} ${e.data ? JSON.stringify(e.data) : ""}`)
    .join("\n");
}

/** Exposed once at app boot so a real device can dump its own history. */
export function installDiagConsole() {
  if (typeof window === "undefined") return;
  const w = window as unknown as Record<string, unknown>;
  if (w.heartifyDiag) return;
  w.heartifyDiag = (ch?: DiagChannel) => readDiag(ch);
  w.heartifyDiagText = (ch?: DiagChannel) => formatDiag(ch);
  w.heartifyDiagClear = () => clearDiag();
  w.heartifyDiagCopy = async (ch?: DiagChannel) => {
    const text = formatDiag(ch);
    try { await navigator.clipboard.writeText(text); return "copied"; }
    catch { return text; }
  };
}
