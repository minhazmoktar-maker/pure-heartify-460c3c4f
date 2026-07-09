export type Lesson = {
  id: string;
  title: string;
  minutes: number;
  body: string;
};

export type Course = {
  id: string;
  title: string;
  category: "Aqeedah" | "Fiqh" | "Quran" | "Seerah" | "Akhlaq";
  level: "Beginner" | "Intermediate";
  summary: string;
  lessons: Lesson[];
};

export const LEARNING_PATHS: Course[] = [
  {
    id: "aqeedah-basics",
    title: "Aqeedah Basics",
    category: "Aqeedah",
    level: "Beginner",
    summary: "The six pillars of iman and the foundations of Islamic belief.",
    lessons: [
      { id: "l1", title: "What is Aqeedah?", minutes: 4, body: "Aqeedah is the firm belief a Muslim holds in their heart about Allah, His angels, books, messengers, the Last Day, and divine decree. It is the foundation upon which all worship and action rests." },
      { id: "l2", title: "Belief in Allah — Tawhid", minutes: 6, body: "Tawhid is the affirmation of Allah's oneness in His lordship (rububiyyah), His right to be worshipped alone (uluhiyyah), and His names and attributes (asma wa sifat)." },
      { id: "l3", title: "Angels, Books, Messengers", minutes: 6, body: "Angels are created from light and always obey Allah. The revealed books (Torah, Zabur, Injeel, Qur'an) came through prophets, sealed by Muhammad ﷺ." },
      { id: "l4", title: "The Last Day", minutes: 5, body: "Belief in resurrection, judgment, the scale, the bridge, Paradise and the Fire — this belief shapes how a Muslim lives every day." },
      { id: "l5", title: "Divine Decree (Qadar)", minutes: 5, body: "Everything that happens is by Allah's knowledge, will, and creation — yet humans have real responsibility for their choices." },
    ],
  },
  {
    id: "fiqh-worship",
    title: "Fiqh of Worship",
    category: "Fiqh",
    level: "Beginner",
    summary: "Purification, prayer, fasting, zakat and hajj — the practical rulings.",
    lessons: [
      { id: "l1", title: "Wudu step by step", minutes: 5, body: "Intention, wash hands ×3, rinse mouth ×3, nose ×3, face ×3, arms to elbows ×3, wipe head, wipe ears, wash feet ×3. Break wudu with anything from private parts, deep sleep, or loss of consciousness." },
      { id: "l2", title: "Ghusl", minutes: 4, body: "Required after major impurity, menstruation, and post-natal bleeding. Intend, wash private parts, do wudu, pour water over the whole body." },
      { id: "l3", title: "Salah rulings", minutes: 6, body: "Five daily prayers are obligatory on every sane, mature Muslim. Conditions: purity, time, direction of qiblah, covering awrah, and intention." },
      { id: "l4", title: "Fasting Ramadan", minutes: 5, body: "Obligatory on every mature Muslim who is able. Abstain from food, drink and marital relations from Fajr to Maghrib with intention." },
      { id: "l5", title: "Zakat essentials", minutes: 5, body: "2.5% on wealth held one lunar year above nisab. Recipients are named in Surah At-Tawbah 9:60." },
    ],
  },
  {
    id: "quran-companion",
    title: "Quran Companion",
    category: "Quran",
    level: "Beginner",
    summary: "How the Qur'an came, how to read it, and how to live with it.",
    lessons: [
      { id: "l1", title: "Revelation of the Qur'an", minutes: 5, body: "Revealed to Prophet Muhammad ﷺ over 23 years through Jibril ﷺ, beginning in the cave of Hira in 610 CE." },
      { id: "l2", title: "Structure: Surah, Ayah, Juz", minutes: 4, body: "114 surahs, ~6,236 ayat, 30 ajza. Meccan surahs focus on belief; Medinan on legislation and community." },
      { id: "l3", title: "Adab of recitation", minutes: 4, body: "Wudu, isti'adhah, basmala, calm pace, tajweed, reflection. The Prophet ﷺ recited slowly and with feeling." },
      { id: "l4", title: "Building a daily habit", minutes: 4, body: "Even one page a day finishes the Qur'an in about 20 months. Pair recitation with a translation you understand." },
    ],
  },
  {
    id: "seerah-essentials",
    title: "Seerah Essentials",
    category: "Seerah",
    level: "Beginner",
    summary: "The life of the Prophet ﷺ in five short lessons.",
    lessons: [
      { id: "l1", title: "Arabia before Islam", minutes: 4, body: "Tribal society, idol worship at the Ka'bah, oral poetry, and a longing among the Hunafa for pure monotheism." },
      { id: "l2", title: "Early life and first revelation", minutes: 5, body: "Born ~570 CE, orphaned young, known as al-Amin. First revelation in Hira at age 40." },
      { id: "l3", title: "Meccan period", minutes: 5, body: "13 years of patient preaching, persecution of the weak, the boycott, the Year of Sorrow." },
      { id: "l4", title: "Hijrah and Medinan society", minutes: 5, body: "Migration to Madinah 622 CE, brotherhood between Muhajirun and Ansar, the Constitution of Madinah." },
      { id: "l5", title: "Farewell Hajj and legacy", minutes: 4, body: "The Farewell Sermon established universal rights. He ﷺ passed in 11 AH leaving the Qur'an and Sunnah." },
    ],
  },
  {
    id: "akhlaq-foundations",
    title: "Akhlaq Foundations",
    category: "Akhlaq",
    level: "Beginner",
    summary: "The Prophetic character — mercy, honesty, patience, and humility.",
    lessons: [
      { id: "l1", title: "Why character matters", minutes: 4, body: "'The best of you are the best in character.' — Bukhari. Akhlaq is the fruit of iman." },
      { id: "l2", title: "Sidq — truthfulness", minutes: 4, body: "Truthfulness leads to righteousness, and righteousness leads to Paradise. Lying corrodes trust and iman." },
      { id: "l3", title: "Sabr — patience", minutes: 4, body: "Patience in obedience, in avoiding sin, and in accepting decree. 'Indeed with hardship comes ease.'" },
      { id: "l4", title: "Rahmah — mercy", minutes: 4, body: "The Prophet ﷺ was 'a mercy to the worlds.' Mercy to family, neighbours, strangers, animals, and self." },
      { id: "l5", title: "Tawadu — humility", minutes: 4, body: "Whoever humbles himself for Allah, Allah raises him. Arrogance is the disease of Iblis." },
    ],
  },
];

export const LEARNING_CATEGORIES = ["All", "Aqeedah", "Fiqh", "Quran", "Seerah", "Akhlaq"] as const;
