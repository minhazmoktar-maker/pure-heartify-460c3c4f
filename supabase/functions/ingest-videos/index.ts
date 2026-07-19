/**
 * Background ingestion edge function — high-throughput, quota-aware.
 *
 * Two ingestion tracks:
 *  1. CHANNELS track (cheap & strict):
 *     - Resolves trusted channel names -> channelId -> uploadsPlaylistId (cached in channels_state).
 *     - Pages through `playlistItems` to fetch up to 50 videos per channel per call (1 quota unit each).
 *     - Every video from a trusted channel auto-passes moderation (still keyword-screened).
 *  2. DISCOVERY track (legacy search):
 *     - Runs a small rotating set of section queries through `search.list` (100 quota units each).
 *     - Strict halalScore filter rejects anything questionable.
 *
 * Designed to be called by pg_cron every 3 hours. Targets ~15k new videos/day on a 10k quota.
 *
 * Body params:
 *   { mode?: "channels" | "discovery" | "both", channels_per_run?: number, discovery_queries?: number }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const YOUTUBE_API_KEYS: string[] = [
  Deno.env.get("YOUTUBE_API_KEY"),
  Deno.env.get("YOUTUBE_API_KEY_2"),
].filter((k): k is string => !!k && k.length > 0);
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const BASE_URL = "https://www.googleapis.com/youtube/v3";

// === API key rotation ===
// Round-robin across configured keys, auto-skip exhausted keys for the remainder of the run.
const exhaustedKeys = new Set<string>();
let keyCursor = 0;
function activeKeys(): string[] {
  return YOUTUBE_API_KEYS.filter((k) => !exhaustedKeys.has(k));
}
function currentKey(): string | null {
  const pool = activeKeys();
  if (!pool.length) return null;
  return pool[keyCursor % pool.length];
}
function rotateKey() {
  keyCursor++;
}
function markExhausted(k: string) {
  exhaustedKeys.add(k);
  console.warn(`[quota] key ending …${k.slice(-6)} exhausted; ${activeKeys().length} key(s) remain`);
}

/**
 * Fetch from YouTube with automatic key rotation on quotaExceeded.
 * Returns the parsed JSON or null if all keys are exhausted / hard error.
 */
async function ytFetch(
  endpoint: string,
  params: URLSearchParams,
): Promise<{ ok: boolean; status: number; data: unknown }> {
  for (let attempt = 0; attempt < YOUTUBE_API_KEYS.length + 1; attempt++) {
    const key = currentKey();
    if (!key) return { ok: false, status: 429, data: { error: "all_keys_exhausted" } };
    params.set("key", key);
    const res = await fetch(`${BASE_URL}/${endpoint}?${params}`);
    if (res.ok) {
      const data = await res.json();
      return { ok: true, status: 200, data };
    }
    const body = await res.text();
    const quotaExceeded = res.status === 403 && /quotaExceeded|dailyLimitExceeded/i.test(body);
    if (quotaExceeded) {
      markExhausted(key);
      rotateKey();
      continue;
    }
    console.error(`YouTube ${endpoint} ${res.status}: ${body.slice(0, 200)}`);
    return { ok: false, status: res.status, data: body };
  }
  return { ok: false, status: 429, data: { error: "all_keys_exhausted" } };
}

// === Halal scoring ===
const HARD_REJECT_KEYWORDS = [
  "music video", "official song", "official video", "remix", "mashup", "cover song",
  "lyrical video", "lyrics video", "audio track", "EP release", "DJ set", "beat drop",
  "trap music", "rap song", "hip hop song", "pop song", "dance music", "EDM",
  "concert", "live performance music", "stage performance", "karaoke",
  "dancing", "choreography", "tiktok dance", "viral dance", "trending dance",
  "dance challenge", "lip sync", "lip-sync",
  "sexy", "hot girl", "bikini", "swimsuit", "lingerie",
  "fashion show", "ramp walk", "seductive", "kissing", "romance scene",
  "love scene", "couple goals", "girlfriend prank", "boyfriend prank", "dating advice secular",
  "valentine party", "hookup", "only fan",
  "alcohol", "wine review", "beer review", "whisky", "vodka", "nightclub", "clubbing",
  "party night", "rave", "casino", "gambling", "betting tips", "poker game", "lottery",
  "fuck", "shit ", "bitch", "bastard",
  "gameplay", "battle royale gaming", "GTA gameplay",
  "prank gone wrong", "trolling", "celebrity gossip",
  "exposed scandal",
  // Additional strict halal reinforcements
  "porn", "porno", "pornography", "nude", "nudity", "nudes", "naked",
  "explicit", "xxx", "erotic", "erotica", "sex tape", "sex scene",
  "onlyfans", "only fans", "thirst trap", "twerk", "twerking",
  "stripper", "strip club", "escort", "brothel", "intimate scene",
  "boobs", "boob", "cleavage", "thicc", "thigh", "thighs",
  "asmr girl", "asmr mukbang", "tinder date", "bumble", "rizz",
  "drunk vlog", "vape", "weed review", "marijuana", "cannabis review",
];

// Hard-blocked creators (channel name OR mention in title/description triggers reject).
const BLOCKED_CREATORS: string[] = [
  "mia yilin", "mehreen", "leila hormozi", "layla hormozi",
  // Owner-blocked channels (secular / female-centric / non-halal framing)
  "tedx", "tedx talks", "chris williamson", "dr. daf show", "dr daf show",
  "womenofquran", "women of quran", "islamic reflections videos",
  "islamiclife", "hamza's den", "hamzas den", "muslim matters tv", "imaan phase",
  "healthy muslims", "healthymuslims", "zz brothers short", "zz brothers shorts", "zzbrothers", "zz brothers",
];

// Title/description patterns that hard-reject regardless of channel.
const BLOCKED_TITLE_TOKENS: string[] = [
  "women", "mujeres", "aurtain", "aurat", "female voice", "by women voice",
];


// Channels where ONLY female-free content should pass: if title/desc mentions woman/female/sister/her,
// reject. Used to keep e.g. Sami Yusuf and "Why They Converted" male-only.
const FEMALE_SENSITIVE_CHANNELS: string[] = [
  "sami yusuf", "sami yousuf", "why they converted",
];
const FEMALE_MENTION_RE = /\b(woman|women|female|girl|sister|her story|she |actress|songstress|hijabi)\b/i;


// Tracked separately so the moderation log can flag the exact reason.
const FEMALE_VISUAL_KEYWORDS = [
  "makeup tutorial", "makeup look", "hijab tutorial", "hijab style", "hijab fashion",
  "modest fashion", "modest outfit", "modest haul",
  "outfit of the day", "ootd", "get ready with me", "grwm", "vlogmas",
  "morning routine girl", "girls vlog", "sister vlog", "wife vlog", "mom vlog",
  "beauty haul", "fashion haul", "lookbook", "skincare routine",
  "my pregnancy", "bridal", "henna design", "mehndi design",
  "sister speaks", "muslimah vlog", "aunty vlog",
];

const SOFT_REJECT_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /you won't believe/i, label: "clickbait:you-wont-believe" },
  { re: /gone wrong/i, label: "clickbait:gone-wrong" },
  { re: /\#fyp/i, label: "tag:#fyp" },
];

// Title regexes that strongly indicate a female on-camera presenter
const FEMALE_PRESENTER_PATTERNS: Array<{ re: RegExp; label: string }> = [
  { re: /\bmiss\s+[a-z]+\b/i, label: "presenter:miss-name" },
  { re: /\b(her|she)\s+(story|journey|reverted|converted)\b/i, label: "presenter:her-story" },
  { re: /\bmuslimah\s+(vlog|diary|life)\b/i, label: "presenter:muslimah-vlog" },
  { re: /\bsisters?\s+(vlog|diary|haul|tag)\b/i, label: "presenter:sister-vlog" },
];

const BAD_EMOJIS_RE = /[💃🍺🍷🎰💋👙🩱🕺💄👯👩‍🦰💅]/;
const FEMALE_EMOJIS_RE = /[👩💃👯💄💅🤰👧]/;

// Trusted channels — keep in sync with src/data/trustedChannels.ts
const TRUSTED_CHANNELS: string[] = [
  // Core scholars & institutes
  "Mufti Menk", "Yaqeen Institute", "Bayyinah Institute", "MercifulServant",
  "Assim Al Hakeem", "Yasir Qadhi", "OnePath Network", "Omar Suleiman",
  "iLovUAllah", "The Deen Show", "Islamic Guidance", "FreeQuranEducation",
  "The Thinking Muslim", "Muslim Central", "Ink of Scholars", "The Prophets Path",
  "Towards Eternity", "About Islam", "Islamic Relief", "MuslimMatters",
  "Kalamullah", "Zaytuna College", "Al Madina Institute", "Simply Seerah",
  "Daily Reminder", "Message TV", "Islam on Demand", "Dr Zakir Naik",
  "Digital Mimbar", "One Islam Productions", "EPIC MASJID",
  "Quran Weekly", "Holy Quran World",
  // Dawah & intellectual
  "One Message Foundation", "Rational Believer", "Sapience Institute",
  "EFDawah", "SC Dawah", "Dawah Team", "L.A. Dawah", "Always Islam",
  "iERA", "DUS Dawah", "Darul Arqam Studios", "Mohammed Hijab", "Ali Dawah",
  "Smile2Jannah", "5Pillars", "The Muslim Vibe",
  // Academic & fiqh
  "Al-Kauthar Institute", "Mishkah University", "ZamZam Academy", "SeekersGuidance",
  "Roots Academy", "Islamic Online University", "AlMaghrib Institute",
  "IslamQA", "Sharia Program", "Madina Institute",
  // Lifestyle, podcasts, finance
  "Chai With My Bhai", "Productive Muslim", "Islamic Finance Guru",
  "Practical Islamic Finance", "Wahed Invest", "Zoya Finance",
  "Halal Kitchen", "Healthy Muslim", "Muslim Travelers",
  // Recitation
  "Mishary Rashid Alafasy", "Sheikh Shuraim", "Sudais", "Islam Sobhi",
  "Raad Al Kurdi", "Omar Hisham Al Arabi", "Fatih Seferagic",
  // Kids
  "Omar & Hana", "One 4 Kids", "Muslim Kids TV", "Noor Kids", "Iqra Cartoon",
  // Live streams
  "Makkah Live", "Madinah Live",
  // Live streams
  "Makkah Live", "Madinah Live",
  // Nasheeds (vocal-only emphasized)
  "Maher Zain", "Sami Yusuf", "Zain Bhikha", "Siedd", "Deen Squad", "Mishary Alafasy Nasheed",
  // Additional curated (recitation, podcasts, docs, dawah, lifestyle, nasheeds)
  "Quran Revolution TV", "Yasser Al-Dosari", "Maher Al-Muaiqly", "Abdul Rahman Al-Sudais",
  "IlmFeed Podcast", "IlmFeed", "Mind Heist Podcast", "Digital Sisterhood Podcast",
  "Freshly Grounded", "Ali Hammuda", "Al Jazeera Documentary", "TRT World",
  "Eman Channel", "Huda TV", "Islam Channel", "Hamza's Den", "Halal Chef",
  "Cooking with Ammar", "Sunnah Style", "Seerah of Prophet Muhammad",
  "Qalam Institute", "The Daily Reminder",
  // === Global expansion: Pacific, Mediterranean, Turkey, Africa, Asia, Europe, Americas ===
  // Pacific & Malta & Cyprus
  "Pacific Dawah Network", "Islamic Society of Fiji", "iERA Oceania", "Islam in the Pacific",
  "Oceania Quran", "The Message Pacific", "Malta Muslim Community", "Islamic Centre of Malta",
  "Dawah Malta", "Quran in Maltese", "Nour al-Islam Malta", "New Muslims Malta",
  "Diyanet Cyprus", "Turkish Cypriot Muftyat", "Larnaca Mosque Official", "Cyprus Quran",
  "Hidayah Cyprus",
  // Turkey
  "Hayalhanem", "Sözler Köşkü", "Diyanet TV", "Çınaraltı", "İhsan Şenocak",
  "Maksat 114", "Hidayet Mektebi", "Rehber TV",
  // Algeria / Sudan / Iraq / Afghanistan
  "Sheikh Shamsuddin", "Al-Bilad", "Al-Anis TV", "Quran Algeria", "Sunna Algeria",
  "Minhaj al-Nubuwwah", "Al-Jazaeriya Academy",
  "Zad TV", "Sudan TV", "Tayba TV", "Ansar al-Sunnah Sudan", "Quran Radio Sudan",
  "Al-Istiqama TV", "Dr. Abdul Hai Youssef",
  "Holy Shrine of Imam Hussain", "Sayed Ammar Nakshawani", "Al-Anwar TV", "Karbala TV",
  "Sunni Endowment", "Islamic Heritage", "Turaath", "Iraq Dawah",
  "Al-Emarah", "Dawat TV", "Eslah TV", "Pushto Bayan", "Quran and Sunnah Afghanistan",
  "Islamic University Kabul", "Noor TV",
  // Indonesia / Malaysia / Pakistan / Bangladesh
  "Yufid.TV", "Islam Populer", "Lampu Islam", "Adi Hidayat", "Ustadz Abdul Somad",
  "Khalid Basalamah", "Rodja TV", "Rumaysho TV", "Hidayah-Mu",
  "Youth Club", "Dr. Israr Ahmed", "Tariq Jamil", "Mufti Tariq Masood",
  "MessageTV", "I.R.C.", "The Right Path",
  "Mizanur Rahman Azhari", "Alor Poth", "Waz TV", "Islamic Talk",
  "Sayed Ahmad Kalapi", "Farhan Bin Nur", "Islamic Life",
  // Egypt / Arab World / Morocco
  "Ahmad Al-Shugairi", "Mustafa Hosny", "Amr Khaled", "Bridges Foundation",
  "Way2Allah", "Al-Rahma TV", "الطريق إلى الجنة", "Zikir",
  "Sheikh Saïd el Kamali", "Yassine El Amri", "Al-Aoula TV", "Quran Morocco",
  "Dawah Maroc", "Al-Huda Morocco",
  // Saudi & Gulf
  "Alafasy", "Zad Group", "Dalil TV", "Quran TV", "Sunnah TV",
  "Bader Al-Meshari", "Sheikh Saleh Al-Fawzan", "Anta Tastati'",
  // Uzbekistan / Yemen / Syria
  "Muslim.uz", "Islom.uz", "Azon TV", "Siyrat.uz", "Isomiddin Nur",
  "Zikr.uz", "Oliy Ma'had", "Ixlos.org", "Qalb nuri",
  "Al-Iman TV", "Habib Umar bin Hafiz", "Sheikh Al-Zindani", "Suhail TV",
  "Yemen Dawah", "Yemeni Quran Reciters",
  "Al-Hadi TV", "Nour Al-Sham", "Sheikh Muhammad al-Yaqoubi", "Dr. Muhammad Ratib al-Nabulsi",
  "Dawah Syria", "Sheikh Usama al-Rifa'i", "Zad al-Ma'ad", "Tafsir al-Nabulsi",
  "Syrian Orphans",
  // Malaysia & West Africa
  "Ustaz Azhar Idrus", "TV AlHijrah", "Zayan", "IKIMfm", "Ustaz Wadi Annuar", "Puad Al-Zarkashi",
  "Sunnah TV Niger", "Radio Islamique Mali", "Dawah Niger", "Mali Quran",
  "Islam au Niger", "Madrasah Mali", "Tawheed Niger", "Al-Huda Mali",
  "Asfiyahi Television", "Tanef Tv", "Dahira Moustarchidine", "Touba TV",
  "Tivaouane Official", "Al-Ameen TV", "Senegal Quran Recitation", "Sunna FM Senegal",
  "Islamic Youth Senegal", "Fayda TV",
  // Tunisia / Somalia / Azerbaijan / Tajikistan
  "Zitouna TV", "Sheikh Bechir Ben Hassen", "Al-Insen TV", "Quran Tunisia",
  "Tunisian Dawah", "Nour al-Huda Tunisia", "Sunna Tunisia", "Mishkat Tunisia",
  "Somali Islamic Reminders", "Sheikh Shariif Dhivow", "Al-Huda Somali",
  "Sheikh Mustafe", "Dawah Somali TV", "Somali Quran Recitations",
  "Mənəviyyat", "Milli Mənəvi Dəyərlər", "İslam Sesi", "Quran Azərbaycan",
  "Hacı Şahin", "İrfan TV Azerbaijan", "Mədrəsə AZ", "Dəyərlər TV", "AzeDawah",
  "Muslim.tj", "Nasimjoni Zikrullo", "Tojikon Islamic", "Dargohi Ilm",
  "Sheikh Temur", "Quran Tajikistan", "Pandu Nasihat", "Rushdi Islom",
  "Omuzishi Islom", "Zikrulloh TV",
  // Burkina / Jordan / UAE / Libya
  "Sunnah TV Burkina", "Radio Islamique Al-Houda", "Dawah Burkina", "AEEMB Media",
  "Burkina Quran", "Islam au Faso", "Madrasah Al-Falah", "Tawheed Burkina",
  "Yaheen Institute", "Sheikh Hamza Mansour", "Amman Message", "Darasheh Islamic",
  "Dr. Ammar Al-Shukry", "Jordanian Quran Reciters", "Nidal Al-Qasem",
  "Al-Huda Jordan", "Sabeel Jordan",
  "Awqaf UAE", "Daily Recitation TV HD", "Safas Islamic", "Sheikh Omar Abdelkafi",
  "Zayed House for Islamic Culture", "Al-Manar Centre", "Islamic Affairs Dubai",
  "Libya TV Quran", "Dawah Libya", "Nour al-Islam Libya", "Libyan Islamic Heritage",
  "Sunnah Libya", "Al-Istiqama Libya", "Tafsir Libya",
  // Central Asia / Djibouti / Comoros / Gambia / Guinea / Palestine / Maldives / Kosovo
  "Muftyatkz", "Azan.kz", "Asyl Arna", "Kuanysh Tapaev", "Halal Shariat",
  "Sabyrzhan Esimbay", "Islam Dini", "Quran Kazakhstan", "Yiman Nury", "Kazakhstan Islamic Center",
  "Nasaat Media", "Yiman", "Islam.kg", "Muftiyat.kg", "Chubak Aji",
  "Turkmen Islam", "Diyanet Turkmenistan", "Turkmen Quran", "Hikmet Media", "Ahl-i-Sunna Turkmenistan",
  "Dawah Djibouti", "Al-Huda Djibouti", "Djibouti Quran", "Muftiyat Djibouti", "Madrasah Djibouti",
  "Comoros Islamic Media", "Al-Fajr Comoros", "Nour al-Islam", "Sheikh Ahmed Abdallah", "Comoros Sunna",
  "Gambia Islamic Reminders", "Dawah Gambia", "Islamic Call Gambia",
  "Audio Islamique", "FEWDAARE FOUTA TV", "Guinea Quran", "Dawah Guinea Conakry", "Sunna Guinea",
  "Al-Aqsa TV", "Palestine Quran", "The Jerusalem Fund", "Dawah Palestine",
  "Sheikh Yousef Abu Snina", "Palestine Islamic Media", "Ahl-ul-Quds", "Zad al-Aqsa", "Sunna Palestine",
  "Ministry of Islamic Affairs", "Al Asr", "Naseyhai", "Ali Rameez", "Maldives Quran",
  "Islam.mv", "Sheikh Sameer", "Addu Dawah", "Hidayah Maldives", "Maldives Zikir",
  "Bashkësia Islame e Kosovës", "Hoxhë Ahmed Kalaja", "Radio Kontakt", "Paqja TV",
  "Hoxhë Enis Rama", "Albanian Quran", "Drita e Besimit", "Sira Albania", "Islamic Youth Kosovo",
  // Europe (Western)
  "Rappel à l'Islam", "Islam de France", "Ahl al-Bayt France", "Nour d'Islam",
  "Botschaft des Islam", "Marcel Krass", "Islam Tutorial", "Fokus Islam", "Abul Baraa",
  "Islam en Español", "Mezquita de Granada", "Islam para Todos",
  "Musulmani d'Italia", "Sesto San Giovanni Masjid", "Islam Italia TV",
  "Comunidade Islâmica de Lisboa", "Islam em Português", "A Luz do Islam",
  "Al-Yaqeen", "Dawah Groep", "Islam Color", "Iqra TV", "Dar al-Ilm",
  "Moskee el Fath", "Broeder Bilal", "De Weg naar het Paradijs", "Belgian Dawah Network",
  "Islamische Zentralrat", "Masjid al-Falah", "Islam in Österreich", "Iman Austria",
  "Dr. Tareq al-Suwaidan", "Dawah Switzerland", "Islamische Glaubensgemeinschaft",
  "Hikma TV", "Al-Huda Swiss", "Swiss Muslim Lifestyle",
  "Islam.se", "Islam Net", "Dansk Islamisk Center", "Suomen Islamilainen Yhdyskunta",
  "Halal i Sverige", "Norway Quran", "Muslimska Förbundet", "Islam Guide", "The Message", "Nordic Halal",
  // Russia & Caucasus & Asia
  "Islam.ru", "Shamil Alyautdinov", "Alif TV", "Dagestan Islamic", "Chechnya Today",
  "Huda Media", "Muslim TV Russia", "Quran Voice Russia", "Academy of Knowledge",
  "Japan Muslim Peace Federation", "Tokyo Camii", "Chiba Islamic Cultural Center",
  "Islam in Japanese", "Halal Media Japan", "Japanese Muslimah",
  "Arabic and Islam Japan", "Mosque Finder Japan", "Shukran Japan",
  "Chinese Muslim", "Islam in China", "Green Apple Islamic Media", "Learn Arabic",
  "CCTV-9 Documentary", "Al-Huda China", "Hui Soul", "Islamic Wisdom", "Masjid al-Noor", "The Great Wall Dawah",
  // India & Latin America
  "iRC TV", "Peace TV", "Islamic Research Foundation", "Dawat-e-Islami India",
  "Mufti Menk India Fans", "Ahlulbayt TV", "The Straight Path", "Quran in Hindi",
  "Mesquita Brasil", "Islam na Prática", "Sheikh Rodrigo Rodrigues",
  "Mezquita Al-Ahmad", "Centro Islámico de Chile", "Dawah Latin America",
  "Cultura Islâmica", "Musulmanes en Chile",
  "ICNA Canada",
  // Additional global picks
  "Al Hidaayah", "Belal Assaad", "Safina Society", "Utica Masjid", "Roots", "SonofAMamaJama",
  "Talk Islam", "One Islam TV", "Muslim Mastery", "Faithful Finance", "Ummahpreneur",
  "Salam Charity Media", "Islamic Relief Worldwide", "Qatar Charity", "Muslim Hands",
  "Zakat Foundation", "Human Appeal", "Darul Ifta Deoband", "Al Huda International",
  "Al Huda TV", "Al Ansar TV", "Madani Channel",
  "New Muslim Academy", "Convert Central", "Islamic Education Hub", "Quran Learning Center",
  "Arabic 101 for Muslims", "Muslim Scholars TV", "Deen Academy", "Barakah TV",
  "Halal Life Academy", "Muslim Wisdom", "Sunnah Studies", "Seerah Academy",
  "Tafsir Today", "Quran Journey", "The Muslim Classroom", "Fiqh Explained",
  "Muslim Family TV", "Islamic Parenting Hub", "Muslim Youth Network", "Deen and Dunya",
  "Muslim Motivation", "Barakah Mindset", "Halal Success", "Muslim Productivity",
  "Quran and Sunnah Academy", "Islamic Character", "Muslim Life Lessons", "Halal Habits",
  "Deen Tips", "Islamic Reflection", "Muslim Path", "Faith Steps", "Muslim Growth",
  "Deen First", "Halal Inspiration", "Muslim Goals", "Islam for Life", "Quran Light",
  "Sunnah Way", "Faith Forward", "Muslim Beacon", "Deen Guide", "Barakah Path", "The Clear Path",
  // === XXVII. Expanded library: News, Tech/AI, Entrepreneurship, Science, Personal Development ===
  // News & current affairs
  "Al Jazeera English", "Al Jazeera Documentary", "AJ+", "TRT World",
  "DW News", "DW Documentary", "BBC News", "Middle East Eye",
  // Tech & AI
  "Lex Fridman", "Two Minute Papers", "Yannic Kilcher", "Sentdex",
  "Fireship", "ThePrimeagen", "Theo - t3.gg", "MIT OpenCourseWare",
  "Stanford Online", "DeepLearningAI", "Google DeepMind",
  // Entrepreneurship & business (family-safe)
  "Y Combinator", "Startup Grind", "How I Built This", "a16z",
  "TED", "TEDx Talks", "Harvard Business Review", "Stanford Graduate School of Business",
  // Personal development & productivity (clean creators)
  "Ali Abdaal", "Thomas Frank", "Matt D'Avella", "Cal Newport",
  "Modern Wisdom", "James Clear",
  // Science documentaries & education
  "Kurzgesagt – In a Nutshell", "Veritasium", "3Blue1Brown", "MinutePhysics",
  "MinuteEarth", "SmarterEveryDay", "PBS Space Time", "PBS Eons",
  "Royal Institution", "World Science Festival", "BBC Earth",
  "National Geographic", "Smithsonian Channel", "Numberphile", "Computerphile",
  "Khan Academy", "CrashCourse", "TED-Ed",
  // Health/fitness (audio-led, no sexualized imagery)
  "Huberman Lab Clips", "Andrew Huberman",
];

function isTrusted(channel: string): boolean {
  const lower = channel.toLowerCase();
  return TRUSTED_CHANNELS.some(c => lower.includes(c.toLowerCase()));
}

interface Verdict {
  ok: boolean;
  score: number;
  reason?: string;   // category: keyword | female_visual | soft_pattern | emoji | low_score
  rule?: string;     // exact matched token
}

function evaluateText(title: string, description: string, channelTitle: string, trusted: boolean): Verdict {
  const text = `${title} ${description} ${channelTitle}`.toLowerCase();
  const channelLower = channelTitle.toLowerCase();

  for (const blocked of BLOCKED_CREATORS) {
    if (channelLower.includes(blocked) || text.includes(blocked)) {
      return { ok: false, score: 0, reason: "blocked_creator", rule: blocked };
    }
  }
  for (const tok of BLOCKED_TITLE_TOKENS) {
    if (title.toLowerCase().includes(tok) || channelLower.includes(tok)) {
      return { ok: false, score: 0, reason: "blocked_title_token", rule: tok };
    }
  }
  for (const sensitive of FEMALE_SENSITIVE_CHANNELS) {
    if (channelLower.includes(sensitive) && FEMALE_MENTION_RE.test(`${title} ${description}`)) {
      return { ok: false, score: 0, reason: "female_in_sensitive_channel", rule: sensitive };
    }
  }

  for (const kw of HARD_REJECT_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      return { ok: false, score: 0, reason: "keyword", rule: kw };
    }
  }
  for (const kw of FEMALE_VISUAL_KEYWORDS) {
    if (text.includes(kw.toLowerCase())) {
      return { ok: false, score: 0, reason: "female_visual", rule: kw };
    }
  }
  for (const pat of SOFT_REJECT_PATTERNS) {
    if (pat.re.test(text)) {
      return { ok: false, score: 0, reason: "soft_pattern", rule: pat.label };
    }
  }
  for (const pat of FEMALE_PRESENTER_PATTERNS) {
    if (pat.re.test(text)) {
      return { ok: false, score: 0, reason: "female_presenter", rule: pat.label };
    }
  }
  if (BAD_EMOJIS_RE.test(text)) {
    return { ok: false, score: 0, reason: "emoji", rule: "bad_emoji" };
  }
  if (FEMALE_EMOJIS_RE.test(text)) {
    return { ok: false, score: 0, reason: "female_visual", rule: "female_emoji" };
  }

  let score = 0;
  const islamicKw = [
    "quran", "surah", "hadith", "sunnah", "prophet", "allah", "islam",
    "deen", "tafsir", "khutbah", "jummah", "ramadan", "eid", "hajj",
    "dawah", "nasheed", "dhikr", "dua", "salah", "prayer", "mosque",
    "scholar", "sheikh", "mufti", "imam", "fiqh", "aqeedah", "seerah",
    "islamic", "muslim", "ummah", "halal", "haram", "taqwa", "sabr",
    "education", "learn", "study", "motivation", "discipline",
    "self-improvement", "productivity", "ruqyah", "adhan", "tajweed",
    "tilawat", "recitation",
  ];
  if (islamicKw.some(k => text.includes(k))) score += 40;
  score += 20;
  score += trusted ? 25 : 5;
  score += 20;
  return { ok: true, score: Math.min(score, 85) };
}

// === Optional vision-based thumbnail check (Lovable AI) ===
// Only used for DISCOVERY items (not for trusted-channel pulls) to keep cost low.
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
const ENABLE_VISION_CHECK = Deno.env.get("ENABLE_VISION_CHECK") !== "false"; // on by default if key present

async function thumbnailIsSafe(thumbnailUrl: string): Promise<{ ok: boolean; rule?: string }> {
  if (!LOVABLE_API_KEY || !ENABLE_VISION_CHECK || !thumbnailUrl) return { ok: true };
  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: "Reply with one word only: SAFE or REJECT. REJECT if the image shows any female face/body, any woman, dancing, alcohol, gambling, nudity, or musical instruments. Otherwise SAFE." },
            { type: "image_url", image_url: { url: thumbnailUrl } },
          ],
        }],
        max_tokens: 4,
      }),
    });
    if (!res.ok) return { ok: true }; // fail-open on quota/network
    const data = await res.json();
    const verdict = (data?.choices?.[0]?.message?.content ?? "").trim().toUpperCase();
    if (verdict.startsWith("REJECT")) return { ok: false, rule: "vision:female_or_unsafe_thumbnail" };
    return { ok: true };
  } catch {
    return { ok: true };
  }
}

function classifyCategory(title: string, description: string, channelTitle: string): string {
  const t = `${title} ${description} ${channelTitle}`.toLowerCase();
  if (/quran|surah|recitation|tilawat|tafsir|tajweed/.test(t)) return "Quran";
  if (/nasheed|naat|anasheed/.test(t)) return "Nasheeds";
  if (/adhan|call to prayer/.test(t)) return "Adhan";
  if (/ruqyah|healing|dhikr|dua/.test(t)) return "Spirituality";
  if (/dawah|debate|comparative|revert|convert/.test(t)) return "Dawah";
  if (/fiqh|aqeedah|creed|jurisprudence|fatwa/.test(t)) return "Fiqh";
  if (/khutbah|lecture|reminder|jummah|friday/.test(t)) return "Lectures";
  if (/business|entrepreneur|startup|finance|money|invest/.test(t)) return "Business";
  if (/study|learn|education|history/.test(t)) return "Education";
  if (/motivation|discipline|productivity|habit|mindset|success/.test(t)) return "Self-Improvement";
  if (/kids|children|cartoon|family|parenting/.test(t)) return "Kids & Family";
  if (/podcast|interview/.test(t)) return "Podcasts";
  if (/fitness|health|nutrition|workout/.test(t)) return "Health & Fitness";
  if (/travel|food|recipe|lifestyle|modest/.test(t)) return "Lifestyle";
  return "Islamic";
}

// Loose mapping from channel keyword -> section_id (for ranking on homepage)
function inferSectionFromChannel(channelTitle: string): string {
  const c = channelTitle.toLowerCase();
  if (/menk|suleiman|yaqeen|bayyinah|qadhi|deen show|merciful/.test(c)) return "top-100";
  if (/alafasy|shuraim|sudais|sobhi|kurdi|hisham|fatih|holy quran/.test(c)) return "elite-recitation";
  if (/finance guru|practical islamic finance|wahed|zoya/.test(c)) return "halal-finance";
  if (/seekersguidance|al-?kauthar|mishkah|zamzam|almaghrib|roots|madina/.test(c)) return "academic-fiqh";
  if (/sapience|thinking muslim|rational believer|hijab|ali dawah|onepath|efdawah|sc dawah|iera/.test(c)) return "dawah";
  if (/omar.*hana|one 4 kids|muslim kids|noor kids|iqra/.test(c)) return "family-kids";
  if (/chai with my bhai|productive muslim/.test(c)) return "community-podcasts";
  if (/halal kitchen|halal eats|muslim travelers/.test(c)) return "halal-lifestyle";
  if (/healthy muslim|muslim fitness|faith.*fitness/.test(c)) return "health-fitness";
  if (/makkah live|madinah live/.test(c)) return "live-streams";
  if (/maher zain|sami yusuf|nasheed|qari hub|tranquil/.test(c)) return "nasheeds";
  return "islamic-knowledge";
}

const SECTION_QUERIES: Record<string, string[]> = {
  "top-100": ["best Islamic lectures", "Mufti Menk motivation", "Omar Suleiman reminder"],
  "daily-picks": ["Islamic reminder today", "morning dua adhkar"],
  "islamic-knowledge": ["Quran tafsir lecture", "seerah Prophet Muhammad", "hadith explanation"],
  "quran-recitations": ["surah rahman full", "beautiful Quran tilawat"],
  "business-money": ["halal investing", "Islamic Finance Guru"],
  "nasheeds": ["nasheed no music vocal only"],
  "family-kids": ["Islamic cartoons no music kids", "Muslim Kids TV"],
  "podcasts": ["The Thinking Muslim podcast", "Chai With My Bhai"],
  "dawah": ["Mohammed Hijab debate", "Sapience Institute dawah"],
  "intellectual": ["Sapience Institute philosophy", "Rational Believer"],
  "academic-fiqh": ["SeekersGuidance class", "AlMaghrib seminar"],
  "revert-stories": ["The Deen Show revert", "why I became Muslim"],
  "halal-lifestyle": ["halal food recipe no music", "Halal Eats food review"],
  "recitation-tranquility": ["Quran recitation peaceful sleep", "morning evening dhikr"],
  "halal-finance": ["Practical Islamic Finance portfolio", "Zoya Finance screening"],
  "elite-recitation": ["Mishary Rashid Alafasy full surah", "Omar Hisham Al Arabi Quran"],
  "advanced-learning": ["Arabic with Husna", "SeekersGuidance Global"],
  "live-streams": ["Makkah Live stream", "Madinah Live stream"],
  // === Expanded curated content sections ===
  "technology-ai": [
    "artificial intelligence explained", "machine learning tutorial",
    "AI safety lecture", "Lex Fridman AI", "Two Minute Papers AI",
    "computer science lecture MIT",
  ],
  "entrepreneurship": [
    "startup advice founder", "Y Combinator startup school",
    "halal entrepreneurship", "small business owner journey",
    "first principles thinking business",
  ],
  "personal-development": [
    "habit formation atomic habits", "deep work cal newport",
    "stoicism daily practice", "discipline mindset lecture",
    "productivity system explained",
  ],
  "science-documentaries": [
    "Kurzgesagt", "Veritasium experiment", "PBS Space Time",
    "BBC Earth documentary", "National Geographic explorer",
    "3Blue1Brown math",
  ],
  "news-current-affairs": [
    "Al Jazeera English news", "Al Jazeera Documentary",
    "TRT World analysis", "Middle East news report",
    "geopolitics explained",
  ],
  "huberman-health": [
    "Huberman Lab clips", "sleep science explained",
    "exercise physiology lecture", "nutrition science evidence based",
  ],
  "islamic-history": [
    "Islamic civilization history", "Ottoman empire documentary clean",
    "Andalusia Muslim Spain", "biography Companions of the Prophet",
  ],
};

function decodeHtml(html: string): string {
  return html.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'");
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// === Supabase REST helpers ===
async function sbFetch(path: string, init: RequestInit = {}) {
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "apikey": SUPABASE_SERVICE_ROLE_KEY!,
      ...(init.headers ?? {}),
    },
  });
}

async function upsertVideos(rows: Record<string, unknown>[]): Promise<number> {
  if (!rows.length) return 0;
  // Chunk to keep each INSERT small enough that Postgres statement_timeout
  // doesn't cancel it (error 57014). Large single-shot upserts of a few
  // hundred rows were timing out under load; 50-row chunks are safe.
  const CHUNK = 50;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await sbFetch("curated_videos?on_conflict=video_id", {
      method: "POST",
      headers: { "Prefer": "resolution=ignore-duplicates,return=headers-only" },
      body: JSON.stringify(chunk),
    });
    if (!res.ok) {
      console.error(`upsert failed ${res.status} (chunk ${i}-${i + chunk.length}): ${await res.text()}`);
      continue; // skip the bad chunk, keep going with the rest
    }
    inserted += chunk.length;
    // Fire-and-forget embedding for this chunk.
    embedNewVideos(chunk).catch((e) => console.warn("[embed] batch failed:", e));
  }
  return inserted;
}

// Embed a batch of newly ingested rows and store the vectors on curated_videos.
// Idempotent: only rows whose `embedding` column is NULL are embedded, so
// re-ingesting the same video_id (ignore-duplicates upsert path) never
// re-embeds and re-charges the AI gateway.
async function embedNewVideos(rows: Record<string, unknown>[]) {
  const { embedTexts, toPgVector } = await import("../_shared/embed.ts");
  const candidates = rows
    .map((r) => ({
      video_id: String(r.video_id ?? ""),
      text: `${r.title ?? ""}\n${r.channel_title ?? ""}\n${r.category ?? ""}`.trim(),
    }))
    .filter((r) => r.video_id && r.text.length > 0);
  if (!candidates.length) return;

  // Idempotency guard: keep only rows without an existing embedding.
  const ids = candidates.map((c) => c.video_id);
  const inList = ids.map((id) => `"${id.replace(/"/g, '\\"')}"`).join(",");
  const existingRes = await sbFetch(
    `curated_videos?video_id=in.(${inList})&embedding=is.null&select=video_id`,
    { method: "GET" },
  ).catch(() => null);
  if (!existingRes || !existingRes.ok) return;
  const needing = new Set(
    ((await existingRes.json()) as Array<{ video_id: string }>).map((r) => r.video_id),
  );
  const items = candidates.filter((c) => needing.has(c.video_id));
  if (!items.length) return;

  // OpenAI text-embedding-3-small caps at 300k tokens/req; batch of 100 is safe.
  for (let i = 0; i < items.length; i += 100) {
    const slice = items.slice(i, i + 100);
    const vecs = await embedTexts(slice.map((s) => s.text));
    if (!vecs) continue;
    await Promise.all(
      slice.map((s, idx) =>
        sbFetch(`curated_videos?video_id=eq.${encodeURIComponent(s.video_id)}`, {
          method: "PATCH",
          headers: { "Prefer": "return=headers-only" },
          body: JSON.stringify({
            embedding: toPgVector(vecs[idx]),
            embedding_model: "openai/text-embedding-3-small",
            embedding_updated_at: new Date().toISOString(),
          }),
        }).catch(() => {}),
      ),
    );
  }
}

async function logIngestion(query: string, sectionId: string | null, found: number, added: number, quota: number) {
  await sbFetch("ingestion_log", {
    method: "POST",
    body: JSON.stringify({ query, section_id: sectionId, videos_found: found, videos_added: added, quota_used: quota }),
  }).catch(() => {});
}

// Buffer rejections so we batch-insert (cheaper than 50 round-trips)
const rejectionBuffer: Record<string, unknown>[] = [];
function queueRejection(row: {
  video_id: string; title: string; channel_title: string; thumbnail_url?: string;
  reject_reason: string; matched_rule?: string; halal_score?: number; source: string;
}) {
  rejectionBuffer.push(row);
}
async function flushRejections() {
  if (!rejectionBuffer.length) return;
  const batch = rejectionBuffer.splice(0, rejectionBuffer.length);
  await sbFetch("moderation_log", {
    method: "POST",
    headers: { "Prefer": "return=headers-only" },
    body: JSON.stringify(batch),
  }).catch((e) => console.error("moderation_log insert failed", e));
}


// === Channel resolution ===
async function ensureChannelsSeeded() {
  // Insert any missing trusted channels into channels_state
  const rows = TRUSTED_CHANNELS.map(name => ({ channel_name: name }));
  await sbFetch("channels_state?on_conflict=channel_name", {
    method: "POST",
    headers: { "Prefer": "resolution=ignore-duplicates,return=headers-only" },
    body: JSON.stringify(rows),
  }).catch((e) => console.error("seed channels error", e));
}

async function resolveChannel(channelName: string): Promise<{ channelId: string; uploadsPlaylistId: string; quota: number } | null> {
  let quota = 0;
  let channelId: string | undefined;

  // Cheap path: if name already looks like a YouTube channel ID or @handle, use channels.list (1 unit).
  const trimmed = channelName.trim();
  if (/^UC[A-Za-z0-9_-]{22}$/.test(trimmed)) {
    channelId = trimmed;
  } else if (trimmed.startsWith("@")) {
    const params = new URLSearchParams({ part: "contentDetails,id", forHandle: trimmed });
    const r = await ytFetch("channels", params);
    quota += 1;
    if (r.ok) {
      const d = r.data as { items?: Array<{ id?: string; contentDetails?: { relatedPlaylists?: { uploads?: string } } }> };
      const item = d.items?.[0];
      if (item?.id && item.contentDetails?.relatedPlaylists?.uploads) {
        return { channelId: item.id, uploadsPlaylistId: item.contentDetails.relatedPlaylists.uploads, quota };
      }
    }
  }

  if (!channelId) {
    // Expensive fallback: search.list (100 units) — only once per channel, then cached.
    const sParams = new URLSearchParams({ part: "snippet", q: channelName, type: "channel", maxResults: "1" });
    const sr = await ytFetch("search", sParams);
    quota += 100;
    if (!sr.ok) return null;
    const sd = sr.data as { items?: Array<{ id?: { channelId?: string } }> };
    channelId = sd.items?.[0]?.id?.channelId;
    if (!channelId) return null;
  }

  const cParams = new URLSearchParams({ part: "contentDetails", id: channelId });
  const cr = await ytFetch("channels", cParams);
  quota += 1;
  if (!cr.ok) return null;
  const cd = cr.data as { items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }> };
  const uploads = cd.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  if (!uploads) return null;
  return { channelId, uploadsPlaylistId: uploads, quota };
}

interface ChannelStateRow {
  id: string;
  channel_name: string;
  channel_id: string | null;
  uploads_playlist_id: string | null;
  next_page_token: string | null;
  total_pulled: number;
  last_pulled_at: string | null;
  consecutive_failures?: number;
}

async function pickStaleChannels(limit: number): Promise<ChannelStateRow[]> {
  // Scheduler: only rows whose backoff has elapsed and that aren't dead-lettered.
  // Ordering: priority ASC (approved channels have priority=10, catalog seeds=100),
  // then next_attempt_at ASC so due channels come first, breaking ties by oldest pull.
  const nowIso = new Date().toISOString();
  const url =
    `channels_state?select=id,channel_name,channel_id,uploads_playlist_id,next_page_token,total_pulled,last_pulled_at,consecutive_failures` +
    `&status=in.(pending,healthy,failing)` +
    `&next_attempt_at=lte.${encodeURIComponent(nowIso)}` +
    `&order=priority.asc,next_attempt_at.asc,last_pulled_at.asc.nullsfirst` +
    `&limit=${limit}`;
  const res = await sbFetch(url);
  if (!res.ok) return [];
  return await res.json();
}

function backoffMinutes(consecutiveFailures: number): number {
  // 5,10,20,40,80,160,320 min. 6+ failures → dead-lettered by caller.
  const step = Math.max(0, Math.min(consecutiveFailures, 8));
  return 5 * Math.pow(2, step);
}

async function updateChannelState(id: string, patch: Record<string, unknown>) {
  await sbFetch(`channels_state?id=eq.${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).catch(() => {});
}

async function markChannelSuccess(id: string, extra: Record<string, unknown> = {}) {
  const nextIso = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
  await updateChannelState(id, {
    status: "healthy",
    consecutive_failures: 0,
    last_error: null,
    last_success_at: new Date().toISOString(),
    last_pulled_at: new Date().toISOString(),
    next_attempt_at: nextIso,
    ...extra,
  });
}

async function markChannelFailure(state: ChannelStateRow, reason: string) {
  const failures = (state.consecutive_failures ?? 0) + 1;
  const dead = failures >= 6;
  const nextIso = new Date(Date.now() + backoffMinutes(failures) * 60 * 1000).toISOString();
  await updateChannelState(state.id, {
    status: dead ? "dead" : "failing",
    consecutive_failures: failures,
    last_error: reason.slice(0, 500),
    last_pulled_at: new Date().toISOString(),
    next_attempt_at: nextIso,
  });
  if (dead) {
    // Dead-letter mirror so operators see it in /admin/ops.
    await sbFetch("dead_letter_queue", {
      method: "POST",
      headers: { "Prefer": "return=headers-only" },
      body: JSON.stringify([{
        job_type: "channel_ingest",
        payload: { channel_state_id: state.id, channel_id: state.channel_id, channel_name: state.channel_name },
        error: reason.slice(0, 1000),
        failure_count: failures,
      }]),
    }).catch(() => {});
  }
}

// === CHANNELS TRACK: pull uploads playlist ===
async function ingestChannel(state: ChannelStateRow): Promise<{ added: number; quota: number }> {
  let quota = 0;
  let channelId = state.channel_id;
  let uploadsId = state.uploads_playlist_id;

  if (!channelId || !uploadsId) {
    // Fast path: we already have the UC id from approved_channels backfill —
    // just fetch the uploads playlist (1 quota unit). Avoids the 100-unit search.
    if (channelId && !uploadsId) {
      const cr = await ytFetch("channels", new URLSearchParams({ part: "contentDetails", id: channelId }));
      quota += 1;
      const cd = cr.ok ? (cr.data as { items?: Array<{ contentDetails?: { relatedPlaylists?: { uploads?: string } } }> }) : null;
      const up = cd?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
      if (up) {
        uploadsId = up;
        await updateChannelState(state.id, { uploads_playlist_id: up, resolved_at: new Date().toISOString() });
      } else {
        await markChannelFailure(state, `uploads_playlist_missing:${channelId}`);
        return { added: 0, quota };
      }
    } else {
      const resolved = await resolveChannel(state.channel_name);
      if (!resolved) {
        await markChannelFailure(state, `resolve_failed:${state.channel_name}`);
        return { added: 0, quota };
      }
      quota += resolved.quota;
      channelId = resolved.channelId;
      uploadsId = resolved.uploadsPlaylistId;
      await updateChannelState(state.id, {
        channel_id: channelId,
        uploads_playlist_id: uploadsId,
        resolved_at: new Date().toISOString(),
      });
    }
  }

  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    playlistId: uploadsId,
    maxResults: "50",
  });
  if (state.next_page_token) params.set("pageToken", state.next_page_token);

  const r = await ytFetch("playlistItems", params);
  quota += 1;
  if (!r.ok) {
    const reason = `playlistItems_${r.status}:${String((r.data as any)?.error ?? "").slice(0, 200)}`;
    console.error(`playlistItems failed for ${state.channel_name}: ${r.status}`);
    await markChannelFailure(state, reason);
    return { added: 0, quota };
  }
  const data = r.data as { items?: Array<Record<string, unknown>>; nextPageToken?: string };
  const items = data.items ?? [];
  const nextToken = data.nextPageToken ?? null;

  const rows: Record<string, unknown>[] = [];
  for (const item of items) {
    const snippet = item.snippet;
    const videoId = item.contentDetails?.videoId;
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) continue;
    const title = decodeHtml(snippet?.title ?? "");
    if (title === "Private video" || title === "Deleted video") continue;
    const desc = snippet?.description ?? "";
    const channel = snippet?.videoOwnerChannelTitle ?? snippet?.channelTitle ?? state.channel_name;
    const thumb =
      snippet?.thumbnails?.high?.url ??
      snippet?.thumbnails?.medium?.url ??
      snippet?.thumbnails?.default?.url ?? "";

    const verdict = evaluateText(title, desc, channel, true);
    if (!verdict.ok) {
      queueRejection({
        video_id: videoId, title, channel_title: channel, thumbnail_url: thumb,
        reject_reason: verdict.reason!, matched_rule: verdict.rule, halal_score: 0,
        source: `channel:${state.channel_name}`,
      });
      continue;
    }
    if (verdict.score < 75) {
      queueRejection({
        video_id: videoId, title, channel_title: channel, thumbnail_url: thumb,
        reject_reason: "low_score", matched_rule: `score=${verdict.score}<75`, halal_score: verdict.score,
        source: `channel:${state.channel_name}`,
      });
      continue;
    }

    rows.push({
      video_id: videoId,
      title,
      channel_title: channel,
      thumbnail_url: thumb,
      published_at: snippet?.publishedAt ?? null,
      category: classifyCategory(title, desc, channel),
      halal_score: verdict.score,
      section_id: inferSectionFromChannel(channel),
      is_trusted_channel: true,
      moderation_state: "approved",
    });
  }

  const added = await upsertVideos(rows);
  await markChannelSuccess(state.id, {
    next_page_token: nextToken,
    total_pulled: state.total_pulled + added,
  });
  await logIngestion(`channel:${state.channel_name}`, null, items.length, added, quota);
  return { added, quota };
}

// === DISCOVERY TRACK: keyword search ===
async function ingestDiscoveryQuery(sectionId: string, query: string): Promise<{ added: number; quota: number }> {
  const params = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: "25",
    safeSearch: "strict",
    relevanceLanguage: "en",
    order: "relevance",
    videoEmbeddable: "true",
    videoSyndicated: "true",
  });
  const r = await ytFetch("search", params);
  if (!r.ok) return { added: 0, quota: 100 };
  const data = r.data as { items?: Array<Record<string, any>> };

  const rows: Record<string, unknown>[] = [];
  for (const item of data.items ?? []) {
    const snippet = item.snippet;
    const videoId = item.id?.videoId;
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) continue;
    const title = decodeHtml(snippet?.title ?? "");
    const desc = snippet?.description ?? "";
    const channel = snippet?.channelTitle ?? "";
    const trusted = isTrusted(channel);
    const thumb = snippet?.thumbnails?.high?.url ?? snippet?.thumbnails?.medium?.url ?? "";

    const verdict = evaluateText(title, desc, channel, trusted);
    if (!verdict.ok) {
      queueRejection({
        video_id: videoId, title, channel_title: channel, thumbnail_url: thumb,
        reject_reason: verdict.reason!, matched_rule: verdict.rule, halal_score: 0,
        source: `discovery:${query}`,
      });
      continue;
    }
    const minScore = trusted ? 75 : 80;
    if (verdict.score < minScore) {
      queueRejection({
        video_id: videoId, title, channel_title: channel, thumbnail_url: thumb,
        reject_reason: "low_score", matched_rule: `score=${verdict.score}<${minScore}`,
        halal_score: verdict.score, source: `discovery:${query}`,
      });
      continue;
    }

    // Vision check: only for untrusted discovery items (where female-presenting risk is highest)
    if (!trusted) {
      const visionVerdict = await thumbnailIsSafe(thumb);
      if (!visionVerdict.ok) {
        queueRejection({
          video_id: videoId, title, channel_title: channel, thumbnail_url: thumb,
          reject_reason: "thumbnail_unsafe", matched_rule: visionVerdict.rule,
          halal_score: verdict.score, source: `discovery:${query}`,
        });
        continue;
      }
    }

    rows.push({
      video_id: videoId,
      title,
      channel_title: channel,
      thumbnail_url: thumb,
      published_at: snippet?.publishedAt ?? null,
      category: classifyCategory(title, desc, channel),
      halal_score: verdict.score,
      section_id: sectionId,
      is_trusted_channel: trusted,
    });
  }

  const added = await upsertVideos(rows);
  await logIngestion(query, sectionId, data.items?.length ?? 0, added, 100);
  return { added, quota: 100 };
}

async function isAuthorizedCaller(req: Request): Promise<boolean> {
  const cronToken = Deno.env.get("AUDIT_CRON_TOKEN");
  if (cronToken && req.headers.get("x-cron-token") === cronToken) return true;
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ") || !SUPABASE_URL) return false;
  try {
    const { createClient } = await import("npm:@supabase/supabase-js@2");
    const anon = Deno.env.get("SUPABASE_ANON_KEY");
    if (!anon) return false;
    const sb = createClient(SUPABASE_URL, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await sb.auth.getUser();
    if (!userData?.user) return false;
    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY!);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    return !!isAdmin;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (!YOUTUBE_API_KEYS.length || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Missing configuration: at least one YOUTUBE_API_KEY required" }, 500);
  }
  if (!(await isAuthorizedCaller(req))) {
    return json({ error: "unauthorized" }, 401);
  }

  try {
    const body = await req.json().catch(() => ({}));
    const mode: "channels" | "discovery" | "both" = body?.mode ?? "both";
    // Quota math with N keys (N * 10,000/day total, 8 runs/day → N * 1,250/run):
    //   - channels track: ~1 unit per channel after one-time resolve (handle path = 1 unit, search path = 101)
    //   - discovery track: 100 units per query
    // With 2 keys ⇒ 20k/day budget, target ~2,500/run.
    const keyMultiplier = Math.max(activeKeys().length, 1);
    const channelsPerRun = Math.min(body?.channels_per_run ?? 80 * keyMultiplier, 300);
    // Discovery uses search.list (100 units/call) — the primary cause of
    // "Quota exceeded" 429s. Default down from 10→4 per key and cap at 20
    // so a cron run can't drain the daily budget on its own; approved
    // channels (1 unit each) do the heavy lifting.
    const discoveryQueries = Math.min(body?.discovery_queries ?? 4 * keyMultiplier, 20);
    // Hard safety cap: leave ~10% headroom of total daily budget per run.
    const perRunQuotaCap = 1200 * keyMultiplier;

    let totalAdded = 0;
    let totalQuota = 0;

    // Bounded parallelism (concurrency=3) keeps latency down without blowing
    // through the daily quota — each worker still respects the shared caps.
    const CONCURRENCY = 3;
    async function runPool<T>(items: T[], worker: (item: T) => Promise<{ added: number; quota: number }>, quotaCap: number) {
      let cursor = 0;
      let stop = false;
      async function next() {
        while (!stop) {
          const i = cursor++;
          if (i >= items.length) return;
          if (!activeKeys().length) { stop = true; return; }
          if (totalQuota > quotaCap) { stop = true; return; }
          const r = await worker(items[i]);
          totalAdded += r.added;
          totalQuota += r.quota;
        }
      }
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, items.length) }, next));
    }

    // Explicit channel_ids target: honor caller (e.g. admin-review auto-ingest).
    // Seeds/updates channels_state with resolved YouTube channel IDs, then
    // processes ONLY those channels this run — no staleness scan, no discovery.
    const explicitChannelIds: string[] = Array.isArray(body?.channel_ids)
      ? (body.channel_ids as unknown[])
          .filter((x): x is string => typeof x === "string" && /^UC[A-Za-z0-9_-]{22}$/.test(x))
          .slice(0, 200)
      : [];

    if (explicitChannelIds.length > 0) {
      // Look up display names from approved_channels (fallback to raw ID).
      const idList = explicitChannelIds.map(encodeURIComponent).join(",");
      const acRes = await sbFetch(
        `approved_channels?select=youtube_channel_id,channel_title,handle&youtube_channel_id=in.(${idList})`,
      ).catch(() => null);
      const nameByYtId = new Map<string, string>();
      if (acRes?.ok) {
        for (const r of (await acRes.json()) as Array<{ youtube_channel_id: string; channel_title?: string | null; handle?: string | null }>) {
          nameByYtId.set(r.youtube_channel_id, r.channel_title || r.handle || r.youtube_channel_id);
        }
      }
      // Upsert channels_state so we have a stable row per channel.
      const seedRows = explicitChannelIds.map((ytId) => ({
        channel_name: nameByYtId.get(ytId) ?? ytId,
        channel_id: ytId,
      }));
      await sbFetch("channels_state?on_conflict=channel_name", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=headers-only" },
        body: JSON.stringify(seedRows),
      }).catch((e) => console.error("seed explicit channels error", e));

      // Fetch the state rows back for the ids we care about.
      const stateRes = await sbFetch(
        `channels_state?select=id,channel_name,channel_id,uploads_playlist_id,next_page_token,total_pulled,last_pulled_at&channel_id=in.(${idList})`,
      );
      const targetRows: ChannelStateRow[] = stateRes.ok ? await stateRes.json() : [];
      await runPool(targetRows, ingestChannel, perRunQuotaCap);
    } else if (mode === "channels" || mode === "both") {
      await ensureChannelsSeeded();
      const stale = await pickStaleChannels(channelsPerRun);
      await runPool(stale, ingestChannel, perRunQuotaCap * 0.75);
    }

    if (explicitChannelIds.length === 0 && (mode === "discovery" || mode === "both")) {
      const allQueries: Array<[string, string]> = [];
      for (const [sec, qs] of Object.entries(SECTION_QUERIES)) {
        for (const q of qs) allQueries.push([sec, q]);
      }
      allQueries.sort(() => Math.random() - 0.5);
      const slice = allQueries.slice(0, discoveryQueries);
      await runPool(slice, ([sec, q]) => ingestDiscoveryQuery(sec, q), perRunQuotaCap);
    }

    const rejectedCount = rejectionBuffer.length;
    await flushRejections();

    return json({
      success: true,
      mode,
      totalAdded,
      totalQuota,
      rejectedCount,
      keysConfigured: YOUTUBE_API_KEYS.length,
      keysActive: activeKeys().length,
      message: `Ingested ${totalAdded} new videos (~${totalQuota} quota units, ${activeKeys().length}/${YOUTUBE_API_KEYS.length} keys active). Rejected ${rejectedCount} this run.`,
    });
  } catch (error) {
    console.error("Ingestion error:", error);
    return json({ error: String(error) }, 500);
  }
});
