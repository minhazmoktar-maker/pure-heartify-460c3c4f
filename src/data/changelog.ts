// Phase 10 — In-app changelog data.
// Update this list every release. `Navbar` shows an unread dot until the user
// visits /changelog, comparing the latest entry's `id` against a localStorage
// mark. Keep entries short and user-facing (no jargon).

export interface ChangelogEntry {
  id: string;           // stable slug (also used as the "seen" marker)
  date: string;         // ISO YYYY-MM-DD
  title: string;
  bullets: string[];
  tag?: "new" | "improved" | "fixed";
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    id: "2026-07-13-delight",
    date: "2026-07-13",
    title: "Delight & identity",
    tag: "new",
    bullets: [
      "New sounds and haptic feedback across dhikr, streaks and completions — mute anytime from Profile.",
      "Auto theme now follows sunrise and Maghrib in your location.",
      "Pick your own app icon variant on the home screen.",
      "Illustrated empty states and motion-matched skeletons for a calmer feel.",
      "In-app changelog so you never miss what's new.",
    ],
  },
  {
    id: "2026-07-10-reliability",
    date: "2026-07-10",
    title: "Reliability & performance",
    tag: "improved",
    bullets: [
      "Faster image loading through our new CDN proxy.",
      "Nightly load tests and per-release performance budgets.",
      "Weekly security scans and secret rotation reminders.",
    ],
  },
  {
    id: "2026-07-08-social",
    date: "2026-07-08",
    title: "Comments, follows & playlists",
    tag: "new",
    bullets: [
      "Comment on videos, follow reciters, and build playlists.",
      "Not-interested feedback now shapes your For You feed.",
      "Creator dashboard for verified channel owners.",
    ],
  },
];

const SEEN_KEY = "heartify.changelog.seen";

export function latestEntryId(): string {
  return CHANGELOG[0]?.id ?? "";
}

export function hasUnseenChangelog(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    return seen !== latestEntryId();
  } catch {
    return false;
  }
}

export function markChangelogSeen(): void {
  try { localStorage.setItem(SEEN_KEY, latestEntryId()); } catch { /* noop */ }
}
