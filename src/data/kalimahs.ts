// The Six Kalimahs — foundational statements of Islamic belief.

export type Kalimah = {
  n: number;
  slug: string;
  name_en: string;
  name_ar: string;
  translit: string;
  arabic: string;         // Full Arabic text
  transliteration: string;
  translation: string;
  note?: string;
};

export const KALIMAHS: Kalimah[] = [
  {
    n: 1,
    slug: "tayyibah",
    name_en: "The Word of Purity",
    name_ar: "الْكَلِمَة الطَّيِّبَة",
    translit: "Kalimat al-Ṭayyibah",
    arabic: "لَا إِلَٰهَ إِلَّا اللَّهُ مُحَمَّدٌ رَسُولُ اللَّهِ",
    transliteration: "Lā ilāha illā Allāh, Muḥammadun Rasūlullāh.",
    translation: "There is no god but Allah; Muḥammad is the Messenger of Allah.",
    note: "The declaration of Tawḥīd and Prophethood — the very entrance into Islam.",
  },
  {
    n: 2,
    slug: "shahadah",
    name_en: "The Testimony",
    name_ar: "الْكَلِمَة الشَّهَادَة",
    translit: "Kalimat al-Shahādah",
    arabic: "أَشْهَدُ أَنْ لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ وَأَشْهَدُ أَنَّ مُحَمَّدًا عَبْدُهُ وَرَسُولُهُ",
    transliteration: "Ashhadu an lā ilāha illā Allāh, waḥdahu lā sharīka lah, wa ashhadu anna Muḥammadan ʿabduhu wa rasūluh.",
    translation: "I bear witness that there is no god but Allah, alone with no partner, and I bear witness that Muḥammad is His servant and Messenger.",
    note: "The complete testimony every Muslim affirms.",
  },
  {
    n: 3,
    slug: "tamjeed",
    name_en: "The Word of Glorification",
    name_ar: "الْكَلِمَة التَّمْجِيد",
    translit: "Kalimat al-Tamjīd",
    arabic: "سُبْحَانَ اللَّهِ وَالْحَمْدُ لِلَّهِ وَلَا إِلَٰهَ إِلَّا اللَّهُ وَاللَّهُ أَكْبَرُ وَلَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
    transliteration: "Subḥānallāh, wa-l-ḥamdu lillāh, wa lā ilāha illā Allāh, wa-llāhu akbar, wa lā ḥawla wa lā quwwata illā billāh al-ʿaliyyi-l-ʿaẓīm.",
    translation: "Glory be to Allah, praise be to Allah, there is no god but Allah, and Allah is the Greatest. There is no might nor power except with Allah, the Most High, the Great.",
    note: "The Bāqiyāt al-Ṣāliḥāt — the enduring good words.",
  },
  {
    n: 4,
    slug: "tawheed",
    name_en: "The Word of Oneness",
    name_ar: "الْكَلِمَة التَّوْحِيد",
    translit: "Kalimat al-Tawḥīd",
    arabic: "لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ يُحْيِي وَيُمِيتُ وَهُوَ حَيٌّ لَا يَمُوتُ أَبَدًا أَبَدًا ذُو الْجَلَالِ وَالْإِكْرَامِ بِيَدِهِ الْخَيْرُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ",
    transliteration: "Lā ilāha illā Allāh, waḥdahu lā sharīka lah, lahu-l-mulk wa lahu-l-ḥamd, yuḥyī wa yumīt, wa huwa ḥayyun lā yamūtu abadan abadā, Dhū-l-Jalāli wa-l-Ikrām, bi-yadihi-l-khayr, wa huwa ʿalā kulli shayʾin qadīr.",
    translation: "There is no god but Allah, alone with no partner. His is the dominion and to Him is the praise. He gives life and causes death, and He is Ever-Living, never dying. Owner of Majesty and Honor — in His hand is all good, and He has power over all things.",
    note: "The most comprehensive proclamation of Allah's Oneness and attributes.",
  },
  {
    n: 5,
    slug: "istighfar",
    name_en: "The Word of Seeking Forgiveness",
    name_ar: "الْكَلِمَة الِاسْتِغْفَار",
    translit: "Kalimat al-Istighfār",
    arabic: "أَسْتَغْفِرُ اللَّهَ رَبِّي مِنْ كُلِّ ذَنْبٍ أَذْنَبْتُهُ عَمْدًا أَوْ خَطَأً سِرًّا أَوْ عَلَانِيَةً وَأَتُوبُ إِلَيْهِ مِنَ الذَّنْبِ الَّذِي أَعْلَمُ وَمِنَ الذَّنْبِ الَّذِي لَا أَعْلَمُ",
    transliteration: "Astaghfirullāha rabbī min kulli dhanbin adhnabtuhu ʿamdan aw khaṭaʾan, sirran aw ʿalāniyah, wa atūbu ilayhi mina-dh-dhanbi-lladhī aʿlam wa mina-dh-dhanbi-lladhī lā aʿlam.",
    translation: "I seek forgiveness from Allah my Lord for every sin I have committed — knowingly or unknowingly, secretly or openly — and I turn to Him from the sin I know and from the sin I do not know.",
    note: "A complete formula of tawbah, encompassing every kind of wrongdoing.",
  },
  {
    n: 6,
    slug: "radd-al-kufr",
    name_en: "The Word of Rejecting Disbelief",
    name_ar: "الْكَلِمَة رَدّ الْكُفْر",
    translit: "Kalimat Radd al-Kufr",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ أَنْ أُشْرِكَ بِكَ شَيْئًا وَأَنَا أَعْلَمُ وَأَسْتَغْفِرُكَ لِمَا لَا أَعْلَمُ إِنَّكَ أَنْتَ عَلَّامُ الْغُيُوبِ",
    transliteration: "Allāhumma innī aʿūdhu bika an ushrika bika shayʾan wa anā aʿlam, wa astaghfiruka limā lā aʿlam. Innaka anta ʿallāmu-l-ghuyūb.",
    translation: "O Allah, I seek refuge in You from associating anything with You knowingly, and I seek Your forgiveness for what I do not know. Indeed, You are the All-Knower of the unseen.",
    note: "A prayer of refuge from all forms of shirk — hidden and manifest.",
  },
];
