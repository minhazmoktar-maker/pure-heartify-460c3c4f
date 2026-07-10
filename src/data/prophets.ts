// The 25 prophets named in the Qur'an (peace be upon them all).
// Lightweight data used for public shareable landing pages.

export type Prophet = {
  slug: string;
  en: string;         // Common English name
  ar: string;         // Arabic name
  translit: string;   // Transliteration
  bible?: string;     // Comparable Biblical name (context only)
  summary: string;    // 1–2 sentence overview
};

export const PROPHETS: Prophet[] = [
  { slug: "adam",       en: "Adam",       ar: "آدَم",       translit: "Ādam",       bible: "Adam",     summary: "The first human and prophet, honored by Allah and taught the names of all things." },
  { slug: "idris",      en: "Idris",      ar: "إِدْرِيس",    translit: "Idrīs",      bible: "Enoch",    summary: "A truthful prophet raised to a high station, known for patience and knowledge." },
  { slug: "nuh",        en: "Nuh",        ar: "نُوح",       translit: "Nūḥ",        bible: "Noah",     summary: "Called his people for centuries and was saved with the believers in the ark." },
  { slug: "hud",        en: "Hud",        ar: "هُود",       translit: "Hūd",        summary: "Sent to the people of ʿĀd, calling them to worship Allah alone." },
  { slug: "salih",      en: "Salih",      ar: "صَالِح",     translit: "Ṣāliḥ",      summary: "Sent to Thamūd with the sign of the she-camel; his people were destroyed for their rejection." },
  { slug: "ibrahim",    en: "Ibrahim",    ar: "إِبْرَاهِيم",  translit: "Ibrāhīm",    bible: "Abraham",  summary: "Khalīlullāh — the friend of Allah, father of prophets, and builder of the Kaʿbah with Ismāʿīl." },
  { slug: "lut",        en: "Lut",        ar: "لُوط",       translit: "Lūṭ",        bible: "Lot",      summary: "Called his people away from grave transgressions and was saved with his believing family." },
  { slug: "ismail",     en: "Ismail",     ar: "إِسْمَاعِيل", translit: "Ismāʿīl",    bible: "Ishmael",  summary: "Son of Ibrāhīm, patient and true to his promise; ancestor of the Arabs and the Prophet ﷺ." },
  { slug: "ishaq",      en: "Ishaq",      ar: "إِسْحَاق",   translit: "Isḥāq",      bible: "Isaac",    summary: "Son of Ibrāhīm, a prophet from a blessed lineage of prophets." },
  { slug: "yaqub",      en: "Yaqub",      ar: "يَعْقُوب",   translit: "Yaʿqūb",     bible: "Jacob",    summary: "Also called Isrāʾīl; father of the twelve tribes and the prophet Yūsuf." },
  { slug: "yusuf",      en: "Yusuf",      ar: "يُوسُف",     translit: "Yūsuf",      bible: "Joseph",   summary: "His story is called the most beautiful of stories — patience through betrayal to authority in Egypt." },
  { slug: "ayyub",      en: "Ayyub",      ar: "أَيُّوب",    translit: "Ayyūb",      bible: "Job",      summary: "The exemplar of ṣabr — patient through great trials, then restored by Allah." },
  { slug: "shuayb",     en: "Shuayb",     ar: "شُعَيْب",    translit: "Shuʿayb",    bible: "Jethro",   summary: "Sent to Madyan, calling them to justice in weights and measures and to worship Allah alone." },
  { slug: "musa",       en: "Musa",       ar: "مُوسَىٰ",    translit: "Mūsā",       bible: "Moses",    summary: "Kalīmullāh — spoken to by Allah; freed Banī Isrāʾīl from Pharaoh and received the Tawrāh." },
  { slug: "harun",      en: "Harun",      ar: "هَارُون",    translit: "Hārūn",      bible: "Aaron",    summary: "Brother and supporter of Mūsā, granted eloquence and prophethood." },
  { slug: "dhulkifl",   en: "Dhul-Kifl",  ar: "ذُو الْكِفْل", translit: "Dhū al-Kifl", summary: "Counted among the patient and the righteous." },
  { slug: "dawud",      en: "Dawud",      ar: "دَاوُد",     translit: "Dāwūd",      bible: "David",    summary: "A prophet-king given the Zabūr; the mountains and birds glorified Allah with him." },
  { slug: "sulayman",   en: "Sulayman",   ar: "سُلَيْمَان",  translit: "Sulaymān",   bible: "Solomon",  summary: "Son of Dāwūd; given a kingdom none after him would have — commanded winds, jinn, and understood birds." },
  { slug: "ilyas",      en: "Ilyas",      ar: "إِلْيَاس",   translit: "Ilyās",      bible: "Elijah",   summary: "A truthful messenger who called his people away from Baʿl to Allah alone." },
  { slug: "alyasa",     en: "Al-Yasa",    ar: "الْيَسَع",   translit: "Al-Yasaʿ",   bible: "Elisha",   summary: "Chosen and favored by Allah — among the best." },
  { slug: "yunus",      en: "Yunus",      ar: "يُونُس",     translit: "Yūnus",      bible: "Jonah",    summary: "Dhu al-Nūn — swallowed by the fish, saved by his tasbīḥ: 'lā ilāha illā anta, subḥānaka innī kuntu min al-ẓālimīn.'" },
  { slug: "zakariya",   en: "Zakariya",   ar: "زَكَرِيَّا",  translit: "Zakariyyā",  bible: "Zechariah",summary: "Prayed to Allah in his old age and was granted his son Yaḥyā." },
  { slug: "yahya",      en: "Yahya",      ar: "يَحْيَىٰ",   translit: "Yaḥyā",      bible: "John",     summary: "Given wisdom as a child; truthful, chaste, and a prophet from the righteous." },
  { slug: "isa",        en: "Isa",        ar: "عِيسَىٰ",    translit: "ʿĪsā",       bible: "Jesus",    summary: "The Messiah, son of Maryam — a word from Allah and a spirit from Him, raised to the heavens." },
  { slug: "muhammad",   en: "Muhammad ﷺ", ar: "مُحَمَّد",   translit: "Muḥammad ﷺ", summary: "The final Messenger, sent as a mercy to all the worlds, with the Qur'ān as his lasting sign." },
];
