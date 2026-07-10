// Notable Ṣaḥābah (companions) of the Prophet ﷺ — for public shareable pages.
// Titles and summaries are widely reported in classical sources.

export type Sahabi = {
  slug: string;
  en: string;
  ar: string;
  translit: string;
  title?: string;
  summary: string;
};

export const SAHABA: Sahabi[] = [
  { slug: "abu-bakr",       en: "Abu Bakr",              ar: "أَبُو بَكْر الصِّدِّيق", translit: "Abū Bakr al-Ṣiddīq",   title: "As-Ṣiddīq · 1st Caliph",        summary: "The first man to accept Islam, companion in the cave, and first rightly-guided caliph." },
  { slug: "umar",           en: "Umar ibn al-Khattab",   ar: "عُمَر بْن الْخَطَّاب",    translit: "ʿUmar ibn al-Khaṭṭāb", title: "Al-Fārūq · 2nd Caliph",         summary: "Whose acceptance of Islam strengthened it publicly; a just caliph whose rule expanded the ummah." },
  { slug: "uthman",         en: "Uthman ibn Affan",      ar: "عُثْمَان بْن عَفَّان",    translit: "ʿUthmān ibn ʿAffān",   title: "Dhū al-Nūrayn · 3rd Caliph",    summary: "Married to two daughters of the Prophet ﷺ; compiled the Qur'ān into one standard muṣḥaf." },
  { slug: "ali",            en: "Ali ibn Abi Talib",     ar: "عَلِيّ بْن أَبِي طَالِب",  translit: "ʿAlī ibn Abī Ṭālib",   title: "Abū al-Ḥasan · 4th Caliph",     summary: "Cousin and son-in-law of the Prophet ﷺ; known for knowledge, courage, and piety." },
  { slug: "khadijah",       en: "Khadijah bint Khuwaylid", ar: "خَدِيجَة بِنْت خُوَيْلِد", translit: "Khadījah bint Khuwaylid", title: "Umm al-Muʾminīn",           summary: "First wife of the Prophet ﷺ and the first person to believe in his message." },
  { slug: "aisha",          en: "Aisha bint Abi Bakr",   ar: "عَائِشَة بِنْت أَبِي بَكْر", translit: "ʿĀʾishah bint Abī Bakr", title: "Umm al-Muʾminīn",           summary: "Beloved wife of the Prophet ﷺ and one of the greatest transmitters of ḥadīth and fiqh." },
  { slug: "fatimah",        en: "Fatimah az-Zahra",      ar: "فَاطِمَة الزَّهْرَاء",    translit: "Fāṭimah al-Zahrāʾ",    title: "Sayyidat Nisāʾ al-Jannah",     summary: "Daughter of the Prophet ﷺ and mother of al-Ḥasan and al-Ḥusayn." },
  { slug: "hasan",          en: "Al-Hasan ibn Ali",      ar: "الْحَسَن بْن عَلِيّ",     translit: "Al-Ḥasan ibn ʿAlī",    title: "Sayyid Shabāb Ahl al-Jannah",  summary: "Grandson of the Prophet ﷺ who reconciled the ummah by relinquishing the caliphate." },
  { slug: "husayn",         en: "Al-Husayn ibn Ali",     ar: "الْحُسَيْن بْن عَلِيّ",   translit: "Al-Ḥusayn ibn ʿAlī",   title: "Sayyid Shabāb Ahl al-Jannah",  summary: "Grandson of the Prophet ﷺ, martyred at Karbalāʾ standing for justice." },
  { slug: "hamza",          en: "Hamza ibn Abd al-Muttalib", ar: "حَمْزَة بْن عَبْد الْمُطَّلِب", translit: "Ḥamzah ibn ʿAbd al-Muṭṭalib", title: "Asad Allāh · Sayyid al-Shuhadāʾ", summary: "Uncle of the Prophet ﷺ, called the Lion of Allah; martyred at Uḥud." },
  { slug: "bilal",          en: "Bilal ibn Rabah",       ar: "بِلَال بْن رَبَاح",       translit: "Bilāl ibn Rabāḥ",      title: "Muʾadhdhin al-Rasūl",           summary: "Freed slave whose steadfastness under torture became a symbol, and the first muʾadhdhin of Islam." },
  { slug: "khalid",         en: "Khalid ibn al-Walid",   ar: "خَالِد بْن الْوَلِيد",   translit: "Khālid ibn al-Walīd",  title: "Sayf Allāh al-Maslūl",          summary: "The Drawn Sword of Allah — undefeated general in the campaigns of the early caliphate." },
  { slug: "abu-hurairah",   en: "Abu Hurairah",          ar: "أَبُو هُرَيْرَة",         translit: "Abū Hurayrah",         title: "Rāwī al-Islām",                 summary: "The companion who narrated the most ḥadīth, having devoted himself to the Prophet's ﷺ service." },
  { slug: "ibn-abbas",      en: "Abdullah ibn Abbas",    ar: "عَبْدُ اللَّه بْن عَبَّاس", translit: "ʿAbdullāh ibn ʿAbbās", title: "Ḥibr al-Ummah · Tarjumān al-Qurʾān", summary: "Cousin of the Prophet ﷺ and a foundational scholar of Qur'ānic exegesis." },
  { slug: "ibn-masud",      en: "Abdullah ibn Mas'ud",   ar: "عَبْدُ اللَّه بْن مَسْعُود", translit: "ʿAbdullāh ibn Masʿūd", title: "Ṣāḥib al-Nāl wa al-Wisād",     summary: "Among the earliest Muslims and a leading authority in Qur'ān recitation and fiqh." },
  { slug: "ibn-umar",       en: "Abdullah ibn Umar",     ar: "عَبْدُ اللَّه بْن عُمَر",  translit: "ʿAbdullāh ibn ʿUmar",  title: "Al-Muqtadī",                    summary: "Son of ʿUmar, known for meticulously following every sunnah of the Prophet ﷺ." },
  { slug: "muadh",          en: "Mu'adh ibn Jabal",      ar: "مُعَاذ بْن جَبَل",         translit: "Muʿādh ibn Jabal",     title: "Aʿlam al-Ummah bi-al-Ḥalāl wa al-Ḥarām", summary: "Sent by the Prophet ﷺ to teach the people of Yemen; a foremost jurist among the companions." },
  { slug: "zayd",           en: "Zayd ibn Thabit",       ar: "زَيْد بْن ثَابِت",         translit: "Zayd ibn Thābit",      title: "Kātib al-Waḥy",                 summary: "Scribe of revelation who led the compilation of the Qur'ān into one muṣḥaf." },
  { slug: "salman",         en: "Salman al-Farisi",      ar: "سَلْمَان الْفَارِسِيّ",   translit: "Salmān al-Fārisī",     title: "Min ahl al-bayt",              summary: "The Persian seeker of truth who found Islam and proposed the trench at the Battle of the Khandaq." },
  { slug: "abu-dharr",      en: "Abu Dharr al-Ghifari",  ar: "أَبُو ذَرّ الْغِفَارِيّ", translit: "Abū Dharr al-Ghifārī", title: "Al-Zāhid",                      summary: "Renowned ascetic and truth-speaker; one of the earliest to accept Islam." },
  { slug: "sad",            en: "Sa'd ibn Abi Waqqas",   ar: "سَعْد بْن أَبِي وَقَّاص",  translit: "Saʿd ibn Abī Waqqāṣ",  title: "Fāris al-Islām",                summary: "The first to shoot an arrow in defense of Islam; commander at the Battle of al-Qādisiyyah." },
  { slug: "talhah",         en: "Talhah ibn Ubaydullah", ar: "طَلْحَة بْن عُبَيْد اللَّه", translit: "Ṭalḥah ibn ʿUbaydillāh", title: "Ṭalḥat al-Khayr",           summary: "Shielded the Prophet ﷺ at Uḥud with his own body; among the ten promised paradise." },
  { slug: "zubayr",         en: "Az-Zubayr ibn al-Awwam", ar: "الزُّبَيْر بْن الْعَوَّام", translit: "Al-Zubayr ibn al-ʿAwwām", title: "Ḥawārī Rasūl Allāh",        summary: "Cousin of the Prophet ﷺ and his devoted disciple in battle and faith." },
  { slug: "abdurrahman",    en: "Abdur-Rahman ibn Awf",  ar: "عَبْدُ الرَّحْمَٰن بْن عَوْف", translit: "ʿAbd al-Raḥmān ibn ʿAwf", title: "Al-Mubāshshir bi-l-Jannah", summary: "Wealthy merchant of Madinah whose generosity in the cause of Allah was unmatched." },
  { slug: "abu-ubaydah",    en: "Abu Ubaydah ibn al-Jarrah", ar: "أَبُو عُبَيْدَة بْن الْجَرَّاح", translit: "Abū ʿUbaydah ibn al-Jarrāḥ", title: "Amīn hādhihi al-Ummah", summary: "Called by the Prophet ﷺ the trustee of this ummah; commander of the Levant campaigns." },
  { slug: "said-ibn-zayd",  en: "Sa'id ibn Zayd",        ar: "سَعِيد بْن زَيْد",         translit: "Saʿīd ibn Zayd",       title: "Al-Mubāshshir bi-l-Jannah",     summary: "Early Muslim through whose family ʿUmar accepted Islam; among the ten promised paradise." },
  { slug: "ummu-salamah",   en: "Umm Salamah",           ar: "أُمّ سَلَمَة",             translit: "Umm Salamah",          title: "Umm al-Muʾminīn",              summary: "Wife of the Prophet ﷺ known for her wisdom, patience, and counsel at Ḥudaybiyyah." },
  { slug: "hafsah",         en: "Hafsah bint Umar",      ar: "حَفْصَة بِنْت عُمَر",     translit: "Ḥafṣah bint ʿUmar",   title: "Umm al-Muʾminīn",              summary: "Daughter of ʿUmar and wife of the Prophet ﷺ; kept the first compiled muṣḥaf of the Qur'ān." },
  { slug: "sumayyah",       en: "Sumayyah bint Khayyat", ar: "سُمَيَّة بِنْت خَيَّاط",  translit: "Sumayyah bint Khayyāṭ",title: "Awwal Shahīdah fī al-Islām",   summary: "The first martyr of Islam, who died refusing to renounce her faith under torture." },
  { slug: "musab",          en: "Mus'ab ibn Umayr",      ar: "مُصْعَب بْن عُمَيْر",     translit: "Muṣʿab ibn ʿUmayr",   title: "Suwar al-Islām",                summary: "First ambassador of Islam, sent to Madinah; martyred at Uḥud carrying the banner." },
];
