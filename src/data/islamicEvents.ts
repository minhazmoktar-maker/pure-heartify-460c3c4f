// Major Islamic events and blessed days — for public shareable pages.

export type IslamicEvent = {
  slug: string;
  en: string;
  ar: string;
  translit: string;
  when: string;        // Hijri date / period
  category: "sacred-night" | "fast" | "eid" | "historical" | "day";
  summary: string;
};

export const ISLAMIC_EVENTS: IslamicEvent[] = [
  { slug: "laylat-al-qadr", en: "Night of Decree",       ar: "لَيْلَة الْقَدْر",   translit: "Laylat al-Qadr",  when: "Odd nights of last 10 of Ramaḍān", category: "sacred-night", summary: "Better than a thousand months. In it the Qur'ān was sent down; angels and the Spirit descend by the permission of their Lord." },
  { slug: "isra-and-miraj", en: "Isra and Mi'raj",       ar: "الْإِسْرَاء وَالْمِعْرَاج", translit: "Al-Isrāʾ wa-l-Miʿrāj", when: "27 Rajab (traditional)", category: "historical", summary: "The night journey of the Prophet ﷺ from Makkah to al-Aqṣā and his ascension through the heavens, when the five daily prayers were prescribed." },
  { slug: "laylat-al-baraah", en: "Night of Bara'ah",    ar: "لَيْلَة الْبَرَاءَة", translit: "Laylat al-Barāʾah", when: "15th of Shaʿbān",         category: "sacred-night", summary: "A night in which Allah looks upon His creation and forgives all except the mushrik and one harboring hatred toward a brother." },
  { slug: "ramadan-start",  en: "Start of Ramadan",      ar: "بِدَايَة رَمَضَان",  translit: "Bidāyat Ramaḍān", when: "1 Ramaḍān",                       category: "fast",         summary: "The month of the Qur'ān begins. Fasting is prescribed upon the believers as it was upon those before them, that they may attain taqwā." },
  { slug: "eid-al-fitr",    en: "Eid al-Fitr",           ar: "عِيد الْفِطْر",       translit: "ʿĪd al-Fiṭr",      when: "1 Shawwāl",                       category: "eid",          summary: "The festival marking the end of Ramaḍān — a day of ṣadaqat al-fiṭr, ʿĪd prayer, gratitude, and joy." },
  { slug: "six-of-shawwal", en: "Six Fasts of Shawwal",  ar: "سِتّ مِن شَوَّال",   translit: "Sitt min Shawwāl", when: "Any six days of Shawwāl",          category: "fast",         summary: "Whoever fasts Ramaḍān and follows it with six from Shawwāl, it is as if he fasted the whole year." },
  { slug: "day-of-arafah",  en: "Day of Arafah",         ar: "يَوْم عَرَفَة",       translit: "Yawm ʿArafah",     when: "9 Dhū al-Ḥijjah",                 category: "day",          summary: "The greatest day of the year; fasting it expiates the previous and the coming year for those not on Ḥajj." },
  { slug: "first-ten-dhul-hijjah", en: "First Ten of Dhu al-Hijjah", ar: "الْعَشْر مِن ذِي الْحِجَّة", translit: "Al-ʿAshr min Dhī al-Ḥijjah", when: "1–10 Dhū al-Ḥijjah", category: "day",   summary: "The most beloved days to Allah — increase in takbīr, tahlīl, taḥmīd, dhikr, ṣiyām, and ṣadaqah." },
  { slug: "eid-al-adha",    en: "Eid al-Adha",           ar: "عِيد الْأَضْحَىٰ",    translit: "ʿĪd al-Aḍḥā",      when: "10 Dhū al-Ḥijjah",                category: "eid",          summary: "The festival of sacrifice, commemorating Ibrāhīm's ﷺ obedience; the greatest day in the sight of Allah." },
  { slug: "days-of-tashriq",en: "Days of Tashriq",       ar: "أَيَّام التَّشْرِيق", translit: "Ayyām al-Tashrīq", when: "11–13 Dhū al-Ḥijjah",             category: "day",          summary: "Days of eating, drinking, and remembrance of Allah. Fasting them is forbidden except for pilgrims lacking the sacrifice." },
  { slug: "day-of-ashura",  en: "Day of Ashura",         ar: "يَوْم عَاشُورَاء",    translit: "Yawm ʿĀshūrāʾ",    when: "10 Muḥarram",                     category: "day",          summary: "Allah saved Mūsā and his people on this day. Fasting it expiates the sins of the previous year; fast the 9th with it." },
  { slug: "hijrah",         en: "The Hijrah",            ar: "الْهِجْرَة",           translit: "Al-Hijrah",        when: "1 Muḥarram (era begins)",         category: "historical",   summary: "The migration of the Prophet ﷺ from Makkah to Madinah — the beginning of the Islamic era and the establishment of the first Muslim society." },
  { slug: "mawlid",         en: "Birth of the Prophet ﷺ", ar: "مَوْلِد النَّبِيّ ﷺ", translit: "Mawlid al-Nabī ﷺ", when: "12 Rabīʿ al-Awwal (traditional)", category: "historical",   summary: "The blessed birth of the final Messenger ﷺ — a mercy to all the worlds. The Prophet ﷺ himself fasted Mondays in gratitude for his birth." },
  { slug: "friday",         en: "Friday · Yawm al-Jumu'ah", ar: "يَوْم الْجُمُعَة", translit: "Yawm al-Jumuʿah",  when: "Every Friday",                    category: "day",          summary: "The best day upon which the sun has risen. The Jumuʿah prayer, sending ṣalawāt on the Prophet ﷺ, and reciting Sūrat al-Kahf are its hallmarks." },
  { slug: "conquest-of-makkah", en: "Conquest of Makkah", ar: "فَتْح مَكَّة",       translit: "Fatḥ Makkah",      when: "20 Ramaḍān, 8 AH",                category: "historical",   summary: "The peaceful conquest of Makkah, when the Prophet ﷺ entered his beloved city and declared universal amnesty: 'Go, for you are free.'" },
];
