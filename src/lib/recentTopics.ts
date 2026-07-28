/**
 * Recently played topics — a lightweight, privacy-safe cold-start signal.
 *
 * Stored in sessionStorage (per session, never leaves the device except as
 * a list of category names on feed requests). Used by the surfaces edge
 * function to diversify feeds before any server-side taste profile exists.
 */

const KEY = "heartify:recentTopics";
const MAX = 8;

export function recordRecentTopic(topic?: string | null): void {
  if (!topic || typeof window === "undefined") return;
  const clean = String(topic).trim().slice(0, 48);
  if (!clean || clean.toLowerCase() === "all") return;
  try {
    const list = getRecentTopics().filter((t) => t !== clean);
    list.unshift(clean);
    sessionStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    /* storage unavailable — signal is optional */
  }
}

export function getRecentTopics(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}
