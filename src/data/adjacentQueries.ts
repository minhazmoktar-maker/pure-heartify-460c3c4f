// Fallback queries used to backfill a For You section when its own
// queries + DB feed don't produce enough unique halal videos to hit 100.
// Keyed by section.id; sections without an entry fall back to
// GENERIC_HALAL_QUERIES.

export const GENERIC_HALAL_QUERIES: string[] = [
  "islamic reminder short",
  "quran recitation beautiful",
  "seerah of the prophet lecture",
  "halal podcast",
  "islamic lecture english",
  "tafsir quran",
  "mufti menk short reminder",
  "nouman ali khan lecture",
  "omar suleiman lecture",
  "yasir qadhi lecture",
  "islamic productivity",
  "sheikh assim al hakeem",
  "islamic history documentary",
  "hadith explained",
  "islamic wisdom",
];

export const ADJACENT_QUERIES: Record<string, string[]> = {
  "study-focus-mode": [
    "islamic study motivation",
    "productive muslim study",
    "quran study session",
    "focus with quran",
    "islamic student motivation",
  ],
  "educational-deep-dives": [
    "islamic history documentary",
    "seerah lecture full",
    "quran tafsir deep dive",
    "islamic civilization",
    "muslim scientists history",
  ],
  "podcasts-clean-beneficial": [
    "muslim podcast",
    "islamic podcast english",
    "halal podcast interview",
    "muslim entrepreneur podcast",
  ],
  "podcasts-intellectual-shows": [
    "islamic intellectual discussion",
    "muslim thinker podcast",
    "shaykh hamza yusuf podcast",
    "islamic philosophy talk",
  ],
  "health-fitness-halal": [
    "muslim fitness motivation",
    "halal nutrition",
    "islamic health lifestyle",
    "prophetic medicine",
    "muslim athlete",
  ],
  "vocal-only-nasheeds": [
    "vocals only nasheed",
    "acapella nasheed",
    "nasheed no music",
    "muhammad al muqit nasheed",
    "maher zain vocals only",
  ],
  "money-mindset-halal": [
    "halal wealth mindset",
    "islamic finance mindset",
    "muslim entrepreneur mindset",
    "barakah in wealth",
  ],
  "elite-quran-recitation": [
    "mishary rashid alafasy",
    "abdul basit recitation",
    "saad al ghamdi quran",
    "maher al muaiqly recitation",
    "yasser al dosari recitation",
  ],
  "lectures-top-scholars": [
    "sheikh ibn uthaymeen lecture",
    "sheikh bin baz lecture",
    "sheikh assim al hakeem",
    "yasir qadhi lecture",
    "omar suleiman khutbah",
  ],
  "seerah-prophetic-stories": [
    "seerah of prophet muhammad",
    "stories of the prophets",
    "companions of the prophet",
    "prophet muhammad biography",
  ],
  "short-reminders-60s": [
    "islamic short reminder",
    "60 second islamic reminder",
    "mufti menk short",
    "islamic quote short",
  ],
  "discipline-success-halal": [
    "muslim discipline",
    "islamic success mindset",
    "productive muslim",
    "muslim self improvement",
  ],
  "productivity-growth-podcasts": [
    "muslim productivity podcast",
    "islamic growth mindset",
    "productive muslim podcast",
  ],
  "community-podcasts": [
    "muslim community podcast",
    "islamic community talk",
    "muslim youth podcast",
  ],
};
