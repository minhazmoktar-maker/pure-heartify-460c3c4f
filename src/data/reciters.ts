// ============================================================
// Heartify — Reciter roster for the Listen section.
// Every reciter streams the whole Qur'an from a verified public CDN
// (mp3quran.net or QuranicAudio.com). Reciters without a verified
// public mount are marked comingSoon so the UI never plays the
// wrong recording.
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
   * When null and no `baseUrl` is set, the reciter is shown as `comingSoon`.
   */
  mp3quranSlug?: string | null;
  /** Which mp3quran server hosts the recitation. */
  server?: number;
  /**
   * Absolute base URL ending in `/`. When set, surah audio resolves to
   * `${baseUrl}${surah.padStart(3,'0')}.mp3`. Used for QuranicAudio.com and
   * any other verified public mount that isn't on mp3quran.net.
   */
  baseUrl?: string;
  /** True when we do not yet have a verified public mount. */
  comingSoon?: boolean;
}

const QA = (path: string) => `https://download.quranicaudio.com/quran/${path}/`;

export const RECITERS: ReciterRecord[] = [
  // Ottawa / community — awaiting a verified public mount.
  { id: "batnuni",       name: "Sheikh Ismail AlBatnuni",       location: "Cairo",         mp3quranSlug: null, comingSoon: true },
  { id: "elsayed",       name: "Dr. Ahmed Elsayed",             location: "Ottawa",        mp3quranSlug: null, comingSoon: true },
  { id: "nummer",        name: "Suhayb Nummer",                 location: "Ottawa",        mp3quranSlug: null, comingSoon: true },
  { id: "abuquds",       name: "Sheikh Abu Quds",               location: "Ottawa",        mp3quranSlug: null, comingSoon: true },
  { id: "ottawa",        name: "Recitations of Ottawa",         location: "Ottawa",        mp3quranSlug: null, comingSoon: true },
  { id: "hafidhabdalla", name: "Hafidh Abdalla Ibrahim",        location: "Ottawa",        mp3quranSlug: null, comingSoon: true },

  // mp3quran.net mounts — Hafs A'n Assem unless noted.
  { id: "yasser",        name: "Yasser Ad-Dossari",             location: "Riyadh",        mp3quranSlug: "yasser",       server: 11 },
  { id: "nour",          name: "Muhammad Nour",                 location: "Ottawa",        mp3quranSlug: "nour",         server: 13 },
  { id: "turki",         name: "Bader Al-Turki",                location: "Makkah",        mp3quranSlug: "bader/Rewayat-Hafs-A-n-Assem", server: 10 },
  { id: "nufais",        name: "Ahmad Al-Nufais",               location: "Kuwait City",   mp3quranSlug: "nufais",       server: 7  },
  { id: "maher",         name: "Maher Al-Muaiqly",              location: "Makkah",        mp3quranSlug: "maher",        server: 12 },
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
  { id: "shur",          name: "Sa'ud Ash-Shuraim",             location: "Makkah",        mp3quranSlug: "shur",         server: 11 },
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

  // Additional world-famous reciters added from mp3quran.net.
  { id: "shatri",        name: "Abu Bakr Ash-Shatri",           location: "Jeddah",        mp3quranSlug: "shatri",       server: 11 },
  { id: "ajmy",          name: "Ahmad Al-Ajmi",                 location: "Riyadh",        mp3quranSlug: "ajm",          server: 10 },
  { id: "sbud",          name: "Salah Al-Budair",               location: "Madinah",       mp3quranSlug: "s_bud",        server: 6  },
  { id: "bukhatir",      name: "Salah Bukhatir",                location: "Sharjah",       mp3quranSlug: "bu_khtr",      server: 8  },
  { id: "hani",          name: "Hani Ar-Rifai",                 location: "Jeddah",        mp3quranSlug: "hani",         server: 8  },
  { id: "ajaber",        name: "Ali Jaber",                     location: "Madinah",       mp3quranSlug: "a_jbr",        server: 11 },
  { id: "abkr",          name: "Idrees Abkar",                  location: "Riyadh",        mp3quranSlug: "abkr",         server: 6  },
  { id: "akdar",         name: "Ibrahim Al-Akhdar",             location: "Madinah",       mp3quranSlug: "akdr",         server: 6  },
  { id: "banna",         name: "Mahmoud Ali Al-Banna",          location: "Cairo",         mp3quranSlug: "bna",          server: 8  },
  { id: "mustafa",       name: "Mustafa Ismail",                location: "Cairo",         mp3quranSlug: "mustafa",      server: 8  },
  { id: "kalbani",       name: "Adel Al-Kalbani",               location: "Riyadh",        mp3quranSlug: "a_klb",        server: 8  },
  { id: "qahtani",       name: "Khalid Al-Qahtani",             location: "Riyadh",        mp3quranSlug: "qht",          server: 10 },
  { id: "trabulsi",      name: "Ahmed Al-Trabulsi",             location: "Kuwait City",   mp3quranSlug: "trabulsi",     server: 10 },
  { id: "jbrl",          name: "Muhammad Jibreel",              location: "Cairo",         mp3quranSlug: "jbrl",         server: 8  },
  { id: "tblawi",        name: "Muhammad Al-Tablawi",           location: "Cairo",         mp3quranSlug: "tblawi",       server: 12, baseUrl: "https://server12.mp3quran.net/tblawi/" },
  { id: "idossari",      name: "Ibrahim Al-Dossary",            location: "Riyadh",        mp3quranSlug: "ibrahim_dosri/Rewayat-Hafs-A-n-Assem", server: 10 },

  // QuranicAudio.com mounts — verified 114-surah complete recordings.
  { id: "sudais",        name: "Abdur-Rahman As-Sudais",        location: "Makkah",        baseUrl: QA("abdurrahmaan_as-sudays") },
  { id: "basfar",        name: "Abdullah Basfar",               location: "Jeddah",        baseUrl: QA("abdullaah_basfar") },
  { id: "thubaity",      name: "AbdulBari Ath-Thubaity",        location: "Madinah",       baseUrl: QA("thubaity") },
  { id: "juhany",        name: "Abdullah Awad Al-Juhany",       location: "Makkah",        baseUrl: QA("abdullaah_3awwaad_al-juhaynee") },
  { id: "abdulbaset",    name: "Abdul Basit Abdus-Samad (Mujawwad)", location: "Cairo",    baseUrl: QA("abdulbaset_mujawwad") },
  { id: "mikhan",        name: "AbdulMuhsin Al-Qasim",          location: "Madinah",       baseUrl: QA("abdul_muhsin_alqasim") },
  { id: "fares",         name: "Fares Abbad",                   location: "Sana'a",        baseUrl: QA("fares") },
  { id: "husary_qa",     name: "Mahmoud Khalil Al-Husary (Murattal)", location: "Tanta",   baseUrl: QA("mahmood_khaleel_al-husaree") },
];

export const reciterById = (id: string) =>
  RECITERS.find((r) => r.id === id) ?? null;

/** Build the streamable mp3 URL for a given reciter + surah number (1–114). */
export const surahAudioUrl = (r: ReciterRecord, surah: number): string | null => {
  const nnn = surah.toString().padStart(3, "0");
  if (r.baseUrl) return `${r.baseUrl}${nnn}.mp3`;
  if (!r.mp3quranSlug || !r.server) return null;
  return `https://server${r.server}.mp3quran.net/${r.mp3quranSlug}/${nnn}.mp3`;
};
