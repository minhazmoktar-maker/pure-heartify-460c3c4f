// ============================================================
// Heartify — Reciter roster for the Listen section.
// Every reciter streams the whole Qur'an from a verified public CDN
// (mp3quran.net or QuranicAudio.com). Every URL below was probed and
// returned HTTP 200 at the time of writing. Reciters without a
// verified public mount are marked comingSoon so the UI never plays
// the wrong recording.
// ============================================================

export interface ReciterRecord {
  /** Stable slug used in URLs. */
  id: string;
  /** Display name (English). */
  name: string;
  /** City / country label shown under the card. */
  location: string;
  /**
   * mp3quran.net path suffix (e.g. "afs" or "salamah/Rewayat-Hafs-A-n-Assem").
   * Combined with `server` to build https://server{N}.mp3quran.net/{slug}/001.mp3.
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

// ------------------------------------------------------------
// Ottawa / community reciters we still need to source. Kept as
// comingSoon so the UI never guesses a wrong URL.
// ------------------------------------------------------------
const COMING_SOON: ReciterRecord[] = [
  { id: "batnuni",       name: "Sheikh Ismail AlBatnuni",  location: "Cairo",  comingSoon: true },
  { id: "elsayed",       name: "Dr. Ahmed Elsayed",        location: "Ottawa", comingSoon: true },
  { id: "nummer",        name: "Suhayb Nummer",            location: "Ottawa", comingSoon: true },
  { id: "abuquds",       name: "Sheikh Abu Quds",          location: "Ottawa", comingSoon: true },
  { id: "ottawa",        name: "Recitations of Ottawa",    location: "Ottawa", comingSoon: true },
  { id: "hafidhabdalla", name: "Hafidh Abdalla Ibrahim",   location: "Ottawa", comingSoon: true },
  { id: "nour",          name: "Muhammad Nour",            location: "Ottawa", comingSoon: true },
  { id: "bouchalkha",    name: "Tarek Bouchalkha",         location: "Ottawa", comingSoon: true },
  { id: "sufi",          name: "Abdul Rashid Sufi",        location: "Doha",   comingSoon: true },
  { id: "dokhin",        name: "Haithm Aldokhin",          location: "Doha",   comingSoon: true },
  { id: "nuaina",        name: "Ahmad Nuaina",             location: "Cairo",  comingSoon: true },
  { id: "idris",         name: "Ibrahim Idris",            location: "London", comingSoon: true },
];

// ------------------------------------------------------------
// Verified full mus'haf recitations from mp3quran.net (Hafs A'n
// Assem – Murattal, except where the id says otherwise).
// ------------------------------------------------------------
const MP3QURAN: ReciterRecord[] = [
  { id: "sudais",        name: "Abdur-Rahman As-Sudais",         location: "Makkah",       server: 11, mp3quranSlug: "sds" },
  { id: "shur",          name: "Sa'ud Ash-Shuraim",              location: "Makkah",       server: 7,  mp3quranSlug: "shur" },
  { id: "maher",         name: "Maher Al-Muaiqly",               location: "Makkah",       server: 12, mp3quranSlug: "maher" },
  { id: "thubaity",      name: "AbdulBari Ath-Thubaity",         location: "Madinah",     server: 6,  mp3quranSlug: "thubti" },
  { id: "juhany",        name: "Abdullah Awad Al-Juhany",        location: "Makkah",       server: 0,  baseUrl: QA("abdullaah_3awwaad_al-juhaynee") },
  { id: "baleela",       name: "Bandar Baleelah",                location: "Makkah",       server: 6,  mp3quranSlug: "balilah" },
  { id: "afs",           name: "Mishary Rashid Alafasy",         location: "Kuwait City",  server: 8,  mp3quranSlug: "afs" },
  { id: "kndri",         name: "Fahad Al-Kandari",               location: "Kuwait City",  server: 11, mp3quranSlug: "kndri" },
  { id: "akandari",      name: "Abdullah Al-Kandari",            location: "Kuwait City",  server: 10, mp3quranSlug: "Abdullahk" },
  { id: "yasser",        name: "Yasser Ad-Dossari",              location: "Riyadh",       server: 11, mp3quranSlug: "yasser" },
  { id: "qtm",           name: "Nasser Al-Qatami",               location: "Riyadh",       server: 6,  mp3quranSlug: "qtm" },
  { id: "sgmd",          name: "Saad Al-Ghamdi",                 location: "Dammam",       server: 7,  mp3quranSlug: "s_gmd" },
  { id: "hthfi",         name: "Ali Al-Hudhaify",                location: "Madinah",     server: 9,  mp3quranSlug: "hthfi" },
  { id: "ahmadhud",      name: "Ahmad Al-Hudhaify",              location: "Madinah",     server: 8,  mp3quranSlug: "ahmad_huth" },
  { id: "humaid",        name: "Ahmad bin Talib bin Humaid",     location: "Madinah",     server: 16, mp3quranSlug: "a_binhameed/Rewayat-Hafs-A-n-Assem" },
  { id: "ayyub",         name: "Muhammad Ayyub",                 location: "Madinah",     server: 8,  mp3quranSlug: "ayyub" },
  { id: "shatri",        name: "Abu Bakr Ash-Shatri",            location: "Jeddah",       server: 11, mp3quranSlug: "shatri" },
  { id: "hani",          name: "Hani Ar-Rifai",                  location: "Jeddah",       server: 8,  mp3quranSlug: "hani" },
  { id: "ajaber",        name: "Ali Jaber",                      location: "Madinah",     server: 11, mp3quranSlug: "a_jbr" },
  { id: "abkr",          name: "Idrees Abkar",                   location: "Riyadh",       server: 6,  mp3quranSlug: "abkr" },
  { id: "ajmy",          name: "Ahmad Al-Ajmi",                  location: "Riyadh",       server: 10, mp3quranSlug: "ajm" },
  { id: "sbud",          name: "Salah Al-Budair",                location: "Madinah",     server: 6,  mp3quranSlug: "s_bud" },
  { id: "kalbani",       name: "Adel Al-Kalbani",                location: "Riyadh",       server: 8,  mp3quranSlug: "a_klb" },
  { id: "qahtani",       name: "Khalid Al-Qahtani",              location: "Riyadh",       server: 10, mp3quranSlug: "qht" },
  { id: "majed",         name: "Abdulrahman Al-Majed",           location: "Riyadh",       server: 10, mp3quranSlug: "a_majed" },
  { id: "matroud",       name: "Abdullah Al-Matroud",            location: "Ta'if",        server: 8,  mp3quranSlug: "mtrod" },
  { id: "qurashi",       name: "Yasser Al-Qurashi",              location: "Riyadh",       server: 9,  mp3quranSlug: "qurashi" },
  { id: "rashad",        name: "Muhammad Rashad Al-Shareef",     location: "Riyadh",       server: 10, mp3quranSlug: "rashad" },
  { id: "zahrani",       name: "Abdulaziz Az-Zahrani",           location: "Riyadh",       server: 9,  mp3quranSlug: "zahrani" },
  { id: "nabilrifai",    name: "Nabil Al-Rifai",                 location: "Jeddah",       server: 9,  mp3quranSlug: "nabil" },
  { id: "salamah",       name: "Yasser Salamah",                 location: "Riyadh",       server: 12, mp3quranSlug: "salamah/Rewayat-Hafs-A-n-Assem" },
  { id: "mqren",         name: "Saad Al-Muqren",                 location: "Riyadh",       server: 16, mp3quranSlug: "saad/Rewayat-Hafs-A-n-Assem" },
  { id: "tunaiji",       name: "Khalifa Al-Tunaiji",             location: "Abu Dhabi",    server: 12, mp3quranSlug: "tnjy" },
  { id: "bukhatir",      name: "Salah Bukhatir",                 location: "Sharjah",      server: 8,  mp3quranSlug: "bu_khtr" },
  { id: "turki",         name: "Bader Al-Turki",                 location: "Makkah",       server: 10, mp3quranSlug: "bader/Rewayat-Hafs-A-n-Assem" },
  { id: "salimi",        name: "Mansour Al-Salimi",              location: "Jeddah",       server: 14, mp3quranSlug: "mansor" },
  { id: "muhaisany",     name: "Muhammad Al-Muhaisany",          location: "Riyadh",       server: 11, mp3quranSlug: "mhsny" },
  { id: "luhaidan",      name: "Muhammad Al-Luhaidan",           location: "Riyadh",       server: 8,  mp3quranSlug: "lhdan" },
  { id: "nufais",        name: "Ahmad Al-Nufais",                location: "Kuwait City",  server: 16, mp3quranSlug: "nufais/Rewayat-Hafs-A-n-Assem" },
  { id: "emadi",         name: "Anas Al-Emadi",                  location: "Al-Hadd",      server: 16, mp3quranSlug: "a_alemadi/Rewayat-Hafs-A-n-Assem" },
  { id: "qurafi",        name: "Abdullah Al-Qurafi",             location: "Madinah",     server: 16, mp3quranSlug: "a_alqrafi/Rewayat-Hafs-A-n-Assem" },
  { id: "hsaleh",        name: "Hassan Saleh",                   location: "New York City",server: 16, mp3quranSlug: "h_saleh/Rewayat-Hafs-A-n-Assem" },
  { id: "balushi",       name: "Hazza Al-Balushi",               location: "Liwa",         server: 11, mp3quranSlug: "hazza" },
  { id: "raad",          name: "Raad Al-Kurdi",                  location: "Kirkuk",       server: 6,  mp3quranSlug: "kurdi" },
  { id: "jleel",         name: "Khalid Al-Jileel",               location: "Riyadh",       server: 10, mp3quranSlug: "jleel" },
  { id: "ynoah",         name: "Yousef Bin Noah Ahmad",          location: "Makkah",       server: 8,  mp3quranSlug: "noah" },
  { id: "ghailan",       name: "Abdul Badee Ghailan",            location: "Madinah",     server: 16, mp3quranSlug: "A-Ghailan/Rewayat-Hafs-A-n-Assem" },
  { id: "fares",         name: "Fares Abbad",                    location: "Sana'a",       server: 8,  mp3quranSlug: "frs_a" },
  { id: "idossari",      name: "Ibrahim Al-Dossary",             location: "Riyadh",       server: 10, mp3quranSlug: "ibrahim_dosri/Rewayat-Hafs-A-n-Assem" },
  { id: "okasha",        name: "Okasha Kameny",                  location: "Kumasi",       server: 16, mp3quranSlug: "okasha/Rewayat-Albizi-A-n-Ibn-Katheer" },
  // Egyptian classical / Mujawwad tradition
  { id: "husr",          name: "Mahmoud Khalil Al-Husary",       location: "Tanta",        server: 13, mp3quranSlug: "husr" },
  { id: "minsh",         name: "Muhammad Siddiq Al-Minshawi",    location: "Cairo",        server: 10, mp3quranSlug: "minsh" },
  // Al-Mus'haf Al-Mu'allim — the beloved teaching mus'haf where Minshawi
  // recites and a child repeats after him. Full 114 surahs, verified 200.
  { id: "minsh-muallim", name: "Al-Minshawi — Al-Mus'haf Al-Mu'allim (child repeats)", location: "Cairo", server: 10, mp3quranSlug: "minsh/Almusshaf-Al-Mo-lim" },
  { id: "minsh-mujawwad", name: "Al-Minshawi — Mujawwad",         location: "Cairo",        server: 10, mp3quranSlug: "minsh/Almusshaf-Al-Mojawwad" },
  { id: "basit",         name: "AbdulBasit AbdusSamad",          location: "Cairo",        server: 7,  mp3quranSlug: "basit" },
  { id: "banna",         name: "Mahmoud Ali Al-Banna",           location: "Cairo",        server: 8,  mp3quranSlug: "bna" },
  { id: "mustafa",       name: "Mustafa Ismail",                 location: "Cairo",        server: 8,  mp3quranSlug: "mustafa" },
  { id: "jbrl",          name: "Muhammad Jibreel",               location: "Cairo",        server: 8,  mp3quranSlug: "jbrl" },
  { id: "tblawi",        name: "Muhammad Al-Tablawi",            location: "Cairo",        server: 12, mp3quranSlug: "tblawi" },
  { id: "trabulsi",      name: "Ahmed Al-Trabulsi",              location: "Kuwait City",  server: 10, mp3quranSlug: "trabulsi" },
  { id: "akdar",         name: "Ibrahim Al-Akhdar",              location: "Madinah",     server: 6,  mp3quranSlug: "akdr" },
  { id: "refat",         name: "Muhammad Rifat",                 location: "Cairo",        server: 14, mp3quranSlug: "refat" },
  { id: "mrifai",        name: "Mahmoud Al-Rifai",               location: "Madinah",     server: 11, mp3quranSlug: "mrifai" },
];

// ------------------------------------------------------------
// QuranicAudio.com mounts — verified 114-surah complete records
// used only for reciters that mp3quran doesn't (fully) publish.
// ------------------------------------------------------------
const QURANIC_AUDIO: ReciterRecord[] = [
  { id: "basfar",     name: "Abdullah Basfar",                    location: "Jeddah",  baseUrl: QA("abdullaah_basfar") },
  { id: "abdulbaset", name: "AbdulBaset AbdusSamad (Mujawwad)",   location: "Cairo",   baseUrl: QA("abdulbaset_mujawwad") },
  { id: "alqasim",    name: "AbdulMuhsin Al-Qasim",               location: "Madinah", baseUrl: QA("abdul_muhsin_alqasim") },
  { id: "ayyub_qa",   name: "Muhammad Ayyub (Alt. Recording)",    location: "Madinah", baseUrl: QA("muhammad_ayyoob") },
];

export const RECITERS: ReciterRecord[] = [
  ...MP3QURAN,
  ...QURANIC_AUDIO,
  ...COMING_SOON,
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
