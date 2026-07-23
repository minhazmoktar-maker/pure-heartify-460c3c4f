// ============================================================
// Heartify — Reciter roster for the Listen section.
// Every reciter listed here either streams the whole Qur'an from
// mp3quran.net (a verified free CDN) or is marked comingSoon so the
// UI shows an honest placeholder instead of a wrong recording.
// ============================================================

export interface ReciterRecord {
  /** Stable slug used in URLs. */
  id: string;
  /** Display name (English). */
  name: string;
  /** City / country label shown under the card. */
  location: string;
  /**
   * mp3quran.net server subpath (e.g. "afs" → server8.mp3quran.net/afs/001.mp3).
   * When null the reciter is shown as `comingSoon`.
   */
  mp3quranSlug: string | null;
  /** Which mp3quran server hosts the recitation. */
  server?: number;
  /** True when we do not yet have a verified public mount. */
  comingSoon?: boolean;
}

export const RECITERS: ReciterRecord[] = [
  // Requested by name — Sheikh Ismail AlBatnuni (no public mount → coming soon).
  { id: "batnuni",       name: "Sheikh Ismail AlBatnuni",       location: "Cairo",         mp3quranSlug: null, comingSoon: true },

  { id: "yasser",        name: "Yasser Ad-Dossari",             location: "Riyadh",        mp3quranSlug: "yasser",       server: 11 },
  { id: "elsayed",       name: "Dr. Ahmed Elsayed",             location: "Ottawa",        mp3quranSlug: null, comingSoon: true },
  { id: "nummer",        name: "Suhayb Nummer",                 location: "Ottawa",        mp3quranSlug: null, comingSoon: true },
  { id: "nour",          name: "Muhammad Nour",                 location: "Ottawa",        mp3quranSlug: "nour",         server: 13 },
  { id: "abuquds",       name: "Sheikh Abu Quds",               location: "Ottawa",        mp3quranSlug: null, comingSoon: true },
  { id: "turki",         name: "Bader Al-Turki",                location: "Makkah",        mp3quranSlug: "bader/Rewayat-Hafs-A-n-Assem", server: 10 },
  { id: "ottawa",        name: "Recitations of Ottawa",         location: "Ottawa",        mp3quranSlug: null, comingSoon: true },
  { id: "nufais",        name: "Ahmad Al-Nufais",               location: "Kuwait City",   mp3quranSlug: "nufais",       server: 7  },
  { id: "maher",         name: "Maher Al-Muaiqly",              location: "Makkah",        mp3quranSlug: "maher",        server: 12 },
  { id: "hafidhabdalla", name: "Hafidh Abdalla Ibrahim",        location: "Ottawa",        mp3quranSlug: null, comingSoon: true },
  { id: "afs",           name: "Mishary Rashid Alafasy",        location: "Kuwait City",   mp3quranSlug: "afs",          server: 8  },
  { id: "humaid",        name: "Ahmad bin Talib bin Humaid",    location: "Madinah",       mp3quranSlug: "ahmed_huth",   server: 8  },
  { id: "sufi",          name: "Abdul Rashid Sufi",             location: "Doha",          mp3quranSlug: "sufi",         server: 7  },
  { id: "luhaidan",      name: "Muhammad Al-Luhaidan",          location: "Riyadh",        mp3quranSlug: "luhaidan_hafs",server: 6  },
  { id: "balushi",       name: "Hazza Al-Balushi",              location: "Liwa",          mp3quranSlug: "balushi",      server: 13 },
  { id: "minsh",         name: "Muhammad Siddiq Al-Minshawi",   location: "Cairo",         mp3quranSlug: "minsh",        server: 10 },
  { id: "basit",         name: "Abdul Basit Kazi",              location: "Toronto",       mp3quranSlug: "basit_mjwd",   server: 7  },
  { id: "salimi",        name: "Mansour Al-Salimi",             location: "Jeddah",        mp3quranSlug: "salimi",       server: 8  },
  { id: "okasha",        name: "Okasha Kameny",                 location: "Kumasi",        mp3quranSlug: "okasha/Rewayat-Albizi-A-n-Ibn-Katheer", server: 16 },
  { id: "dokhin",        name: "Haithm Aldokhin",               location: "Doha",          mp3quranSlug: "aldokhin",     server: 13 },
  { id: "qurafi",        name: "Abdullah Al-Qurafi",            location: "Madinah",       mp3quranSlug: "qurafi",       server: 12 },
  { id: "ayyub",         name: "Muhammad Ayyub",                location: "Madinah",       mp3quranSlug: "ayyub",        server: 6  },
  { id: "idris",         name: "Ibrahim Idris",                 location: "London",        mp3quranSlug: "idris",        server: 13 },
  { id: "ghailan",       name: "Abdul Badee Ghailan",           location: "Madinah",       mp3quranSlug: "ghailan",      server: 13 },
  { id: "ahmadhud",      name: "Ahmad Al-Hudhaify",             location: "Madinah",       mp3quranSlug: "a_hthfi",      server: 12 },
  { id: "shur",          name: "Sa'ud ash-Shuraim",             location: "Makkah",        mp3quranSlug: "shur",         server: 11 },
  { id: "majed",         name: "Abdulrahman Al-Majed",          location: "Riyadh",        mp3quranSlug: "majed",        server: 11 },
  { id: "raad",          name: "Raad Al-Kurdi",                 location: "Kirkuk",        mp3quranSlug: "raad",         server: 6  },
  { id: "bouchalkha",    name: "Tarek Bouchalkha",              location: "Ottawa",        mp3quranSlug: "bouchalkha",   server: 13 },
  { id: "jleel",         name: "Khalid Al-Jileel",              location: "Riyadh",        mp3quranSlug: "jleel",        server: 6  },
  { id: "ynoah",         name: "Yousef Bin Noah Ahmad",         location: "Makkah",        mp3quranSlug: "ynoah",        server: 13 },
  { id: "husr",          name: "Mahmoud Khalil Al-Husary",      location: "Tanta",         mp3quranSlug: "husr",         server: 6  },
  { id: "hsaleh",        name: "Hassan Saleh",                  location: "New York City", mp3quranSlug: "hsaleh",       server: 13 },
  { id: "qtm",           name: "Nasser Al-Qatami",              location: "Riyadh",        mp3quranSlug: "qtm",          server: 6  },
  { id: "sgmd",          name: "Saad Al-Ghamdi",                location: "Dammam",        mp3quranSlug: "s_gmd",        server: 8  },
  { id: "hthfi",         name: "Ali Al-Hudhaify",               location: "Madinah",       mp3quranSlug: "hthfi",        server: 6  },
  { id: "baleela",       name: "Bandar Baleelah",               location: "Makkah",        mp3quranSlug: "baleela",      server: 7  },
  { id: "nuaina",        name: "Ahmad Nuaina",                  location: "Cairo",         mp3quranSlug: "nuaina",       server: 8  },
  { id: "kndri",         name: "Fahad Al-Kandari",              location: "Kuwait City",   mp3quranSlug: "kndri",        server: 8  },
  { id: "emadi",         name: "Anas Al-Emadi",                 location: "Al-Hadd",       mp3quranSlug: "emadi",        server: 13 },
];

export const reciterById = (id: string) =>
  RECITERS.find((r) => r.id === id) ?? null;

/** Build the streamable mp3 URL for a given reciter + surah number (1–114). */
export const surahAudioUrl = (r: ReciterRecord, surah: number): string | null => {
  if (!r.mp3quranSlug || !r.server) return null;
  return `https://server${r.server}.mp3quran.net/${r.mp3quranSlug}/${surah
    .toString()
    .padStart(3, "0")}.mp3`;
};
