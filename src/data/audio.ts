import albumQuran from "@/assets/album-quran.jpg";
import albumNasheed from "@/assets/album-nasheed.jpg";
import albumDua from "@/assets/album-dua.jpg";
import albumLecture from "@/assets/album-lecture.jpg";

/**
 * Halal audio catalog.
 *
 * Every URL in this file is either from the public mp3quran.net CDN
 * (freely streamable Qur'an recitations) or is marked `comingSoon: true`
 * so the player shows an honest placeholder instead of playing an unrelated
 * or copyrighted track. Placeholder / demo mp3s from third-party non-Islamic
 * sources have been removed.
 *
 * Adding a new track:
 *   - Choose a real, publicly hosted URL from an allow-listed source.
 *   - Provide accurate artist / speaker attribution.
 *   - Do NOT wire a demo/stub URL to a real title — that was the source of
 *     the "wrong track opens" bug.
 */

export type AudioCategory =
  | "All"
  | "Quran"
  | "Dua & Dhikr"
  | "Ruqya"
  | "Nasheeds"
  | "Lectures"
  | "Seerah"
  | "Kids"
  | "Podcasts";

export type AudioLanguage = "Arabic" | "English" | "Urdu" | "Mixed";

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  /** "m:ss" or "h:mm:ss"; kept as label — real duration comes from the audio element. */
  duration: string;
  cover: string;
  category: AudioCategory;
  isPremium: boolean;
  plays: string;
  /** Streamable audio URL. May be empty when `comingSoon` is true. */
  url: string;
  language: AudioLanguage;
  description: string;
  source: string;
  tags: string[];
  /** Show as "Coming soon" in UI and refuse to play. */
  comingSoon?: boolean;
  /** ISO date string used for "Recently added" sorting. */
  addedAt: string;
  /** Relative popularity score used for "Popular this week". */
  popularity: number;
}

export interface Playlist {
  id: string;
  title: string;
  description: string;
  cover: string;
  trackCount: number;
  isPremium: boolean;
  category?: AudioCategory;
  trackIds?: string[];
  accent?: string;
}

export const audioCategories: AudioCategory[] = [
  "All",
  "Quran",
  "Dua & Dhikr",
  "Ruqya",
  "Nasheeds",
  "Lectures",
  "Seerah",
  "Kids",
  "Podcasts",
];

// mp3quran.net serves complete Qur'an recitations by reciter.
// Verified reciter slugs (do not add unverified ones):
const AFS = (n: number) =>
  `https://server8.mp3quran.net/afs/${n.toString().padStart(3, "0")}.mp3`;
const SDS = (n: number) =>
  `https://server11.mp3quran.net/sds/${n.toString().padStart(3, "0")}.mp3`;
const QTM = (n: number) =>
  `https://server6.mp3quran.net/qtm/${n.toString().padStart(3, "0")}.mp3`;
const BASIT = (n: number) =>
  `https://server7.mp3quran.net/basit/${n.toString().padStart(3, "0")}.mp3`;
const MINSH = (n: number) =>
  `https://server10.mp3quran.net/minsh/${n.toString().padStart(3, "0")}.mp3`;
const YASSER = (n: number) =>
  `https://server11.mp3quran.net/yasser/${n.toString().padStart(3, "0")}.mp3`;

// ---------- Track catalog --------------------------------------------------

export const tracks: Track[] = [
  // === Qur'an ===
  {
    id: "q-fatiha-afs",
    title: "Surah Al-Fatiha — The Opening",
    artist: "Mishary Rashid Alafasy",
    album: "Complete Qur'an — Alafasy",
    duration: "1:20",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "120M",
    url: AFS(1),
    language: "Arabic",
    description:
      "The Opening chapter, recited seventeen times a day in the ritual prayer.",
    source: "mp3quran.net",
    tags: ["fatiha", "prayer", "daily"],
    addedAt: "2026-06-01",
    popularity: 99,
  },
  {
    id: "q-yaseen-sds",
    title: "Surah Ya-Sin — The Heart of the Qur'an",
    artist: "Abdul Rahman Al-Sudais",
    album: "Complete Qur'an — Sudais",
    duration: "22:40",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "88M",
    url: SDS(36),
    language: "Arabic",
    description: "Called the heart of the Qur'an; recited for peace and mercy.",
    source: "mp3quran.net",
    tags: ["yaseen", "heart", "mercy"],
    addedAt: "2026-06-02",
    popularity: 95,
  },
  {
    id: "q-rahman-afs",
    title: "Surah Ar-Rahman — The Most Merciful",
    artist: "Mishary Rashid Alafasy",
    album: "Complete Qur'an — Alafasy",
    duration: "12:45",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "76M",
    url: AFS(55),
    language: "Arabic",
    description:
      "A rhythmic chapter that repeats: 'Which of the favours of your Lord will you deny?'",
    source: "mp3quran.net",
    tags: ["rahman", "mercy"],
    addedAt: "2026-06-02",
    popularity: 96,
  },
  {
    id: "q-mulk-afs",
    title: "Surah Al-Mulk — The Sovereignty",
    artist: "Mishary Rashid Alafasy",
    album: "Complete Qur'an — Alafasy",
    duration: "8:30",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "40M",
    url: AFS(67),
    language: "Arabic",
    description: "The Prophet ﷺ recommended reciting Al-Mulk every night.",
    source: "mp3quran.net",
    tags: ["mulk", "nightly"],
    addedAt: "2026-06-03",
    popularity: 92,
  },
  {
    id: "q-kahf-sds",
    title: "Surah Al-Kahf — The Cave",
    artist: "Abdul Rahman Al-Sudais",
    album: "Complete Qur'an — Sudais",
    duration: "42:10",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "35M",
    url: SDS(18),
    language: "Arabic",
    description: "Recited on Fridays; protection from the trial of the Dajjal.",
    source: "mp3quran.net",
    tags: ["kahf", "friday"],
    addedAt: "2026-06-04",
    popularity: 90,
  },
  {
    id: "q-waqia-qtm",
    title: "Surah Al-Waqi'ah — The Inevitable",
    artist: "Nasser Al-Qatami",
    album: "Complete Qur'an — Qatami",
    duration: "9:12",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "18M",
    url: QTM(56),
    language: "Arabic",
    description: "Recited daily; associated with sustenance and provision.",
    source: "mp3quran.net",
    tags: ["waqiah", "provision"],
    addedAt: "2026-06-05",
    popularity: 84,
  },
  {
    id: "q-sajda-basit",
    title: "Surah As-Sajdah — The Prostration",
    artist: "Abdul Basit Abdul Samad",
    album: "Complete Qur'an — Abdul Basit",
    duration: "10:45",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "22M",
    url: BASIT(32),
    language: "Arabic",
    description: "Classical mujawwad recitation from the master reciter.",
    source: "mp3quran.net",
    tags: ["sajdah", "classical"],
    addedAt: "2026-06-06",
    popularity: 82,
  },
  {
    id: "q-hashr-minsh",
    title: "Surah Al-Hashr — The Gathering",
    artist: "Muhammad Siddiq Al-Minshawi",
    album: "Complete Qur'an — Minshawi",
    duration: "16:04",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "12M",
    url: MINSH(59),
    language: "Arabic",
    description: "Its final verses list the beautiful names of Allah.",
    source: "mp3quran.net",
    tags: ["hashr", "names-of-allah"],
    addedAt: "2026-06-06",
    popularity: 78,
  },
  {
    id: "q-mudathir-yasser",
    title: "Surah Al-Muddathir — The Cloaked One",
    artist: "Yasser Al-Dossari",
    album: "Complete Qur'an — Yasser",
    duration: "9:50",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "8M",
    url: YASSER(74),
    language: "Arabic",
    description: "One of the earliest chapters revealed in Makkah.",
    source: "mp3quran.net",
    tags: ["muddathir", "makkan"],
    addedAt: "2026-06-07",
    popularity: 74,
  },
  {
    id: "q-nooh-afs",
    title: "Surah Nuh — Prophet Noah",
    artist: "Mishary Rashid Alafasy",
    album: "Complete Qur'an — Alafasy",
    duration: "6:50",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "9M",
    url: AFS(71),
    language: "Arabic",
    description: "The prayer of Prophet Nuh (AS) after 950 years of da'wah.",
    source: "mp3quran.net",
    tags: ["prophets", "nuh"],
    addedAt: "2026-06-08",
    popularity: 71,
  },
  {
    id: "q-insan-sds",
    title: "Surah Al-Insan — Man",
    artist: "Abdul Rahman Al-Sudais",
    album: "Complete Qur'an — Sudais",
    duration: "7:15",
    cover: albumQuran,
    category: "Quran",
    isPremium: false,
    plays: "6M",
    url: SDS(76),
    language: "Arabic",
    description: "Describes the reward of the righteous in paradise.",
    source: "mp3quran.net",
    tags: ["insan", "paradise"],
    addedAt: "2026-06-09",
    popularity: 68,
  },

  // === Dua & Dhikr (short surahs traditionally used as daily adhkar) ===
  {
    id: "d-ikhlas-afs",
    title: "Surah Al-Ikhlas — Sincerity (x3)",
    artist: "Mishary Rashid Alafasy",
    album: "Morning & Evening Adhkar",
    duration: "1:05",
    cover: albumDua,
    category: "Dua & Dhikr",
    isPremium: false,
    plays: "150M",
    url: AFS(112),
    language: "Arabic",
    description:
      "Equivalent to one third of the Qur'an. Read three times morning and evening.",
    source: "mp3quran.net",
    tags: ["ikhlas", "adhkar", "morning", "evening"],
    addedAt: "2026-06-10",
    popularity: 98,
  },
  {
    id: "d-falaq-afs",
    title: "Surah Al-Falaq — The Daybreak",
    artist: "Mishary Rashid Alafasy",
    album: "Morning & Evening Adhkar",
    duration: "0:55",
    cover: albumDua,
    category: "Dua & Dhikr",
    isPremium: false,
    plays: "140M",
    url: AFS(113),
    language: "Arabic",
    description: "Protection from the evil of the created things.",
    source: "mp3quran.net",
    tags: ["falaq", "adhkar", "protection"],
    addedAt: "2026-06-10",
    popularity: 97,
  },
  {
    id: "d-nas-afs",
    title: "Surah An-Nas — Mankind",
    artist: "Mishary Rashid Alafasy",
    album: "Morning & Evening Adhkar",
    duration: "1:00",
    cover: albumDua,
    category: "Dua & Dhikr",
    isPremium: false,
    plays: "138M",
    url: AFS(114),
    language: "Arabic",
    description: "Refuge in the Lord of Mankind from the whisperer.",
    source: "mp3quran.net",
    tags: ["nas", "adhkar", "protection"],
    addedAt: "2026-06-10",
    popularity: 96,
  },
  {
    id: "d-kafirun-afs",
    title: "Surah Al-Kafirun — The Disbelievers",
    artist: "Mishary Rashid Alafasy",
    album: "Morning & Evening Adhkar",
    duration: "1:10",
    cover: albumDua,
    category: "Dua & Dhikr",
    isPremium: false,
    plays: "45M",
    url: AFS(109),
    language: "Arabic",
    description: "Recite before sleeping for freedom from shirk.",
    source: "mp3quran.net",
    tags: ["kafirun", "night"],
    addedAt: "2026-06-11",
    popularity: 82,
  },
  // === Ruqya ===
  {
    id: "r-fatiha-basit",
    title: "Ruqya — Al-Fatiha (Healing)",
    artist: "Abdul Basit Abdul Samad",
    album: "Ruqya Shar'iyyah",
    duration: "1:15",
    cover: albumQuran,
    category: "Ruqya",
    isPremium: false,
    plays: "30M",
    url: BASIT(1),
    language: "Arabic",
    description: "Used as spiritual healing, on the authority of the Prophet ﷺ.",
    source: "mp3quran.net",
    tags: ["ruqya", "healing", "fatiha"],
    addedAt: "2026-06-13",
    popularity: 80,
  },
  {
    id: "r-baqarah-sds",
    title: "Ruqya — Surah Al-Baqarah (Complete)",
    artist: "Abdul Rahman Al-Sudais",
    album: "Ruqya Shar'iyyah",
    duration: "2:05:30",
    cover: albumQuran,
    category: "Ruqya",
    isPremium: false,
    plays: "42M",
    url: SDS(2),
    language: "Arabic",
    description:
      "Reciting Al-Baqarah in the home drives shaytan away for three nights.",
    source: "mp3quran.net",
    tags: ["ruqya", "baqarah", "home"],
    addedAt: "2026-06-13",
    popularity: 86,
  },
  {
    id: "r-jinn-qtm",
    title: "Ruqya — Surah Al-Jinn",
    artist: "Nasser Al-Qatami",
    album: "Ruqya Shar'iyyah",
    duration: "7:40",
    cover: albumQuran,
    category: "Ruqya",
    isPremium: false,
    plays: "14M",
    url: QTM(72),
    language: "Arabic",
    description: "Frequently recited within ruqya protocols.",
    source: "mp3quran.net",
    tags: ["ruqya", "jinn"],
    addedAt: "2026-06-14",
    popularity: 72,
  },

  // === Placeholders for expansion (marked coming soon; UI shows a friendly state) ===
  // These entries exist so category browsing/UI stays populated without playing
  // unrelated content. Provide real URLs before removing `comingSoon`.
  {
    id: "n-tala-al-badru",
    title: "Tala'al Badru Alayna",
    artist: "Community Munshid",
    album: "Classic Nasheeds",
    duration: "3:20",
    cover: albumNasheed,
    category: "Nasheeds",
    isPremium: false,
    plays: "—",
    url: "",
    language: "Arabic",
    description:
      "The nasheed sung by the people of Madinah on the arrival of the Prophet ﷺ.",
    source: "coming-soon",
    tags: ["nasheed", "madinah", "classic"],
    comingSoon: true,
    addedAt: "2026-06-15",
    popularity: 60,
  },
  {
    id: "n-hasbi-rabbi",
    title: "Hasbi Rabbi Jallallah",
    artist: "Community Munshid",
    album: "Classic Nasheeds",
    duration: "4:50",
    cover: albumNasheed,
    category: "Nasheeds",
    isPremium: false,
    plays: "—",
    url: "",
    language: "Mixed",
    description: "A traditional nasheed of remembrance.",
    source: "coming-soon",
    tags: ["nasheed", "dhikr"],
    comingSoon: true,
    addedAt: "2026-06-15",
    popularity: 58,
  },
  {
    id: "l-purification-heart",
    title: "Purification of the Heart",
    artist: "Featured Scholar",
    album: "Islamic Lectures",
    duration: "48:15",
    cover: albumLecture,
    category: "Lectures",
    isPremium: true,
    plays: "—",
    url: "",
    language: "English",
    description:
      "Diseases of the heart and their spiritual cures. Premium exclusive.",
    source: "coming-soon",
    tags: ["tazkiyah", "heart"],
    comingSoon: true,
    addedAt: "2026-06-16",
    popularity: 55,
  },
  {
    id: "l-tafsir-qadr",
    title: "Understanding Sūrat al-Qadr",
    artist: "Featured Scholar",
    album: "Premium Tafsir Series",
    duration: "55:00",
    cover: albumLecture,
    category: "Lectures",
    isPremium: true,
    plays: "—",
    url: "",
    language: "English",
    description: "Deep dive into the night of decree. Premium exclusive.",
    source: "coming-soon",
    tags: ["tafsir", "qadr"],
    comingSoon: true,
    addedAt: "2026-06-16",
    popularity: 52,
  },
  {
    id: "s-seerah-01",
    title: "Seerah — The Early Years of the Prophet ﷺ",
    artist: "Seerah Collective",
    album: "Life of the Prophet ﷺ",
    duration: "1:12:00",
    cover: albumLecture,
    category: "Seerah",
    isPremium: false,
    plays: "—",
    url: "",
    language: "English",
    description: "Episode 1 of a curated seerah series.",
    source: "coming-soon",
    tags: ["seerah", "prophet"],
    comingSoon: true,
    addedAt: "2026-06-17",
    popularity: 48,
  },
  {
    id: "k-kids-alphabet",
    title: "My Arabic Alphabet Adventure",
    artist: "Little Ummah Studio",
    album: "Islamic Audio for Kids",
    duration: "10:00",
    cover: albumDua,
    category: "Kids",
    isPremium: false,
    plays: "—",
    url: "",
    language: "English",
    description: "A playful audio journey through the Arabic letters.",
    source: "coming-soon",
    tags: ["kids", "arabic"],
    comingSoon: true,
    addedAt: "2026-06-18",
    popularity: 44,
  },
  {
    id: "p-podcast-01",
    title: "The Muslim Life — Episode 1",
    artist: "Barakah Culture",
    album: "The Muslim Life Podcast",
    duration: "45:20",
    cover: albumLecture,
    category: "Podcasts",
    isPremium: false,
    plays: "—",
    url: "",
    language: "English",
    description: "Faith, work, and family in the modern world.",
    source: "coming-soon",
    tags: ["podcast", "life"],
    comingSoon: true,
    addedAt: "2026-06-19",
    popularity: 40,
  },
];

// De-duplication guard (dev only) — mirrors the QA audit requirement.
if (import.meta.env.DEV) {
  const seenIds = new Set<string>();
  const seenUrl = new Set<string>();
  for (const t of tracks) {
    if (seenIds.has(t.id)) console.warn(`[audio] duplicate track id: ${t.id}`);
    seenIds.add(t.id);
    if (t.url && seenUrl.has(t.url)) {
      console.warn(`[audio] duplicate URL for ${t.id}: ${t.url}`);
    }
    if (t.url) seenUrl.add(t.url);
  }
}

// ---------- Playlists / Collections ---------------------------------------

export const playlists: Playlist[] = [
  {
    id: "pl-quran-daily",
    title: "Daily Qur'an — Cornerstone Surahs",
    description: "The chapters recommended for daily recitation.",
    cover: albumQuran,
    trackCount: 5,
    isPremium: false,
    trackIds: ["q-fatiha-afs", "q-yaseen-sds", "q-mulk-afs", "q-waqia-qtm", "q-kahf-sds"],
    accent: "from-emerald-600/40 to-teal-800/40",
  },
  {
    id: "pl-morning-adhkar",
    title: "Morning & Evening Adhkar",
    description: "The three protection surahs and daily remembrances.",
    cover: albumDua,
    trackCount: 4,
    isPremium: false,
    trackIds: ["d-ikhlas-afs", "d-falaq-afs", "d-nas-afs", "d-kafirun-afs"],
    accent: "from-amber-500/40 to-rose-700/40",
  },
  {
    id: "pl-ruqya",
    title: "Ruqya Shar'iyyah",
    description: "Qur'anic spiritual healing recited by master reciters.",
    cover: albumQuran,
    trackCount: 3,
    isPremium: false,
    category: "Ruqya",
    accent: "from-indigo-600/40 to-slate-800/40",
  },
  {
    id: "pl-friday",
    title: "Friday Companion — Al-Kahf",
    description: "Complete Surah Al-Kahf for the weekly Friday reading.",
    cover: albumQuran,
    trackCount: 1,
    isPremium: false,
    trackIds: ["q-kahf-sds"],
    accent: "from-sky-600/40 to-blue-900/40",
  },
  {
    id: "pl-classical",
    title: "Classical Mujawwad Masters",
    description: "Abdul Basit and Minshawi — the golden age of recitation.",
    cover: albumQuran,
    trackCount: 3,
    isPremium: false,
    trackIds: ["q-sajda-basit", "q-hashr-minsh", "r-fatiha-basit"],
    accent: "from-yellow-600/40 to-orange-800/40",
  },
  {
    id: "pl-nightly",
    title: "Before You Sleep",
    description: "Al-Mulk, Al-Ikhlas, and the two Mu'awwidhatayn.",
    cover: albumDua,
    trackCount: 4,
    isPremium: false,
    trackIds: ["q-mulk-afs", "d-ikhlas-afs", "d-falaq-afs", "d-nas-afs"],
    accent: "from-slate-700/40 to-slate-900/40",
  },
  {
    id: "pl-lectures-premium",
    title: "Premium Lectures & Tafsir",
    description: "In-depth series from featured scholars. Coming soon.",
    cover: albumLecture,
    trackCount: 2,
    isPremium: true,
    category: "Lectures",
    accent: "from-fuchsia-700/40 to-purple-900/40",
  },
  {
    id: "pl-kids",
    title: "For Little Believers",
    description: "Gentle, age-appropriate Islamic audio for children.",
    cover: albumDua,
    trackCount: 1,
    isPremium: false,
    category: "Kids",
    accent: "from-pink-500/40 to-rose-700/40",
  },
];

// Convenience lookup by id, used by the player context.
export const trackById = new Map(tracks.map((t) => [t.id, t]));
