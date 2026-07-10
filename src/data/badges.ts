// Canonical badge metadata used for public share pages (/b/:handle/:badgeId).
// IDs must stay in sync with ACHIEVEMENTS in src/pages/Achievements.tsx.
export type BadgeTier = "bronze" | "silver" | "gold";

export interface BadgeMeta {
  id: string;
  title: string;
  description: string;
  tier: BadgeTier;
  category: "salah" | "dhikr" | "quran" | "adhkar";
  emoji: string;
}

export const BADGES: Record<string, BadgeMeta> = {
  "salah-3":       { id: "salah-3",       title: "Getting Started",       description: "3-day salah streak",             tier: "bronze", category: "salah",  emoji: "🕌" },
  "salah-7":       { id: "salah-7",       title: "One Full Week",         description: "7-day salah streak",             tier: "silver", category: "salah",  emoji: "🕌" },
  "salah-30":      { id: "salah-30",      title: "Consistent Servant",    description: "30-day salah streak",            tier: "gold",   category: "salah",  emoji: "🏆" },
  "ontime-50":     { id: "ontime-50",     title: "Answering the Call",    description: "50 on-time prayers in 30 days",  tier: "silver", category: "salah",  emoji: "🔥" },
  "dhikr-1k":      { id: "dhikr-1k",      title: "Remembering Allah",     description: "1,000 lifetime dhikr",           tier: "bronze", category: "dhikr",  emoji: "📿" },
  "dhikr-10k":     { id: "dhikr-10k",     title: "Rich Tongue",           description: "10,000 lifetime dhikr",          tier: "silver", category: "dhikr",  emoji: "📿" },
  "dhikr-100k":    { id: "dhikr-100k",    title: "Constant Remembrance",  description: "100,000 lifetime dhikr",         tier: "gold",   category: "dhikr",  emoji: "✨" },
  "dhikr-streak-7":{ id: "dhikr-streak-7",title: "Daily Dhikr",           description: "7-day dhikr streak",             tier: "bronze", category: "dhikr",  emoji: "🔥" },
  "quran-1":       { id: "quran-1",       title: "First Surah",           description: "Read your first surah",          tier: "bronze", category: "quran",  emoji: "📖" },
  "quran-10":      { id: "quran-10",      title: "Ten Surahs",            description: "Read 10 surahs",                 tier: "silver", category: "quran",  emoji: "📖" },
  "quran-114":     { id: "quran-114",     title: "Khatm al-Quran",        description: "Read all 114 surahs",            tier: "gold",   category: "quran",  emoji: "🏆" },
  "adhkar-7":      { id: "adhkar-7",      title: "Morning & Evening",     description: "7 days of adhkar",               tier: "bronze", category: "adhkar", emoji: "✨" },
  "adhkar-30":     { id: "adhkar-30",     title: "Fortress of the Muslim",description: "30 days of adhkar",              tier: "silver", category: "adhkar", emoji: "🏆" },
};

export function getBadge(id: string): BadgeMeta | null {
  return BADGES[id] ?? null;
}
