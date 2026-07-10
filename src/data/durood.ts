// Ṣalawāt ʿalā an-Nabī ﷺ — Different authentic forms of sending blessings on the Prophet ﷺ.

export type Durood = {
  slug: string;
  title: string;
  arabic: string;
  translit: string;
  meaning: string;
  virtue: string;
  reference: string;
  category: "Ibrāhīmiyyah" | "Short" | "Qurʾānic" | "Friday" | "Comprehensive";
};

export const DUROOD: Durood[] = [
  {
    slug: "ibrahimiyyah",
    title: "Ṣalāt al-Ibrāhīmiyyah",
    arabic:
      "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا صَلَّيْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ. اللَّهُمَّ بَارِكْ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، كَمَا بَارَكْتَ عَلَىٰ إِبْرَاهِيمَ وَعَلَىٰ آلِ إِبْرَاهِيمَ، إِنَّكَ حَمِيدٌ مَجِيدٌ.",
    translit:
      "Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā ṣallayta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka Ḥamīdun Majīd. Allāhumma bārik ʿalā Muḥammadin wa ʿalā āli Muḥammad, kamā bārakta ʿalā Ibrāhīma wa ʿalā āli Ibrāhīm, innaka Ḥamīdun Majīd.",
    meaning:
      "O Allah, send prayers upon Muḥammad and the family of Muḥammad, as You sent prayers upon Ibrāhīm and the family of Ibrāhīm; You are Praiseworthy, Glorious. O Allah, bless Muḥammad and the family of Muḥammad, as You blessed Ibrāhīm and the family of Ibrāhīm; You are Praiseworthy, Glorious.",
    virtue:
      "The complete form taught by the Prophet ﷺ himself when the Ṣaḥābah asked how to send blessings upon him. Recited in every tashahhud of every prayer.",
    reference: "Bukhārī 3370, Muslim 406",
    category: "Ibrāhīmiyyah",
  },
  {
    slug: "short-sallallahu",
    title: "The Short Ṣalawāt",
    arabic: "صَلَّى اللَّهُ عَلَيْهِ وَسَلَّمَ",
    translit: "Ṣallā-Llāhu ʿalayhi wa sallam",
    meaning: "May Allah's peace and blessings be upon him.",
    virtue:
      "Whoever sends one ṣalāh upon me, Allah sends ten upon him, ten sins are erased, and he is raised ten degrees. Said whenever the Prophet's ﷺ name is mentioned.",
    reference: "Muslim 408, Nasāʾī 1297",
    category: "Short",
  },
  {
    slug: "allahumma-salli",
    title: "Allāhumma ṣalli ʿalā Muḥammad",
    arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ",
    translit: "Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad",
    meaning: "O Allah, send prayers upon Muḥammad and upon the family of Muḥammad.",
    virtue:
      "A concise complete form counted among the accepted ṣalawāt. Excellent as a repeated dhikr throughout the day and night.",
    reference: "Muslim 405",
    category: "Short",
  },
  {
    slug: "quranic-33-56",
    title: "The Qurʾānic Command",
    arabic:
      "إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا",
    translit:
      "Inna-Llāha wa malāʾikatahu yuṣallūna ʿalā-n-Nabiyy, yā ayyuha-lladhīna āmanū ṣallū ʿalayhi wa sallimū taslīmā.",
    meaning:
      "Indeed Allah and His angels send blessings upon the Prophet. O you who believe, send blessings upon him and greet him with a worthy greeting.",
    virtue:
      "The very āyah (33:56) that made ṣalawāt an eternal command upon every believer until the Day of Judgement.",
    reference: "Sūrat al-Aḥzāb 33:56",
    category: "Qurʾānic",
  },
  {
    slug: "friday-abundance",
    title: "The Friday Ṣalawāt",
    arabic: "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَىٰ سَيِّدِنَا مُحَمَّدٍ وَعَلَىٰ آلِهِ وَصَحْبِهِ أَجْمَعِينَ",
    translit:
      "Allāhumma ṣalli wa sallim wa bārik ʿalā sayyidinā Muḥammadin wa ʿalā ālihi wa ṣaḥbihi ajmaʿīn.",
    meaning:
      "O Allah, send prayers, peace, and blessings upon our master Muḥammad, and upon all his family and companions.",
    virtue:
      "The Prophet ﷺ said: Send abundant ṣalawāt upon me on Friday and on the night of Friday — your ṣalawāt is presented to me.",
    reference: "Abū Dāwūd 1047, Nasāʾī 1374",
    category: "Friday",
  },
  {
    slug: "worry-remover",
    title: "The Ṣalawāt That Removes Worry",
    arabic: "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ عَبْدِكَ وَنَبِيِّكَ وَرَسُولِكَ النَّبِيِّ الْأُمِّيِّ",
    translit:
      "Allāhumma ṣalli ʿalā Muḥammadin ʿabdika wa nabiyyika wa rasūlika-n-nabiyyi-l-ummī.",
    meaning:
      "O Allah, send prayers upon Muḥammad, Your servant, Your Prophet, and Your Messenger — the unlettered Prophet.",
    virtue:
      "Ubayy ibn Kaʿb asked: How much of my duʿāʾ shall I make for you? The Prophet ﷺ said: If you make all of it for me, your worries will be sufficed and your sins forgiven.",
    reference: "Tirmidhī 2457 (ḥasan ṣaḥīḥ)",
    category: "Comprehensive",
  },
  {
    slug: "sayyidul-fatih",
    title: "Ṣalāt al-Fātiḥ",
    arabic:
      "اللَّهُمَّ صَلِّ عَلَىٰ سَيِّدِنَا مُحَمَّدٍ الْفَاتِحِ لِمَا أُغْلِقَ، وَالْخَاتِمِ لِمَا سَبَقَ، نَاصِرِ الْحَقِّ بِالْحَقِّ، وَالْهَادِي إِلَىٰ صِرَاطِكَ الْمُسْتَقِيمِ، وَعَلَىٰ آلِهِ حَقَّ قَدْرِهِ وَمِقْدَارِهِ الْعَظِيمِ",
    translit:
      "Allāhumma ṣalli ʿalā sayyidinā Muḥammadin-il-Fātiḥi limā ughliq, wa-l-Khātimi limā sabaq, Nāṣiri-l-ḥaqqi bi-l-ḥaqq, wa-l-Hādī ilā ṣirāṭika-l-mustaqīm, wa ʿalā ālihi ḥaqqa qadrihi wa miqdārihi-l-ʿaẓīm.",
    meaning:
      "O Allah, send prayers upon our master Muḥammad — the opener of what was closed, the seal of what came before, the helper of truth by truth, and the guide to Your Straight Path — and upon his family, according to his great worth and rank.",
    virtue:
      "A widely-recited form loved by the scholars for its comprehensive meanings of the Prophet's ﷺ mission.",
    reference: "Transmitted forms; well-known among the ʿulamāʾ",
    category: "Comprehensive",
  },
  {
    slug: "greeting-in-grave",
    title: "The Ṣalawāt of the Angels' Reply",
    arabic:
      "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَأَنْزِلْهُ الْمَقْعَدَ الْمُقَرَّبَ عِنْدَكَ يَوْمَ الْقِيَامَةِ",
    translit:
      "Allāhumma ṣalli ʿalā Muḥammadin wa anzilhu-l-maqʿada-l-muqarraba ʿindaka yawma-l-qiyāmah.",
    meaning:
      "O Allah, send prayers upon Muḥammad and grant him the nearest seat with You on the Day of Resurrection.",
    virtue:
      "Whoever says it, my intercession becomes binding for him — a promise of the Prophet's ﷺ shafāʿah on Yawm al-Qiyāmah.",
    reference: "Al-Bayhaqī in Shuʿab al-Īmān",
    category: "Comprehensive",
  },
  {
    slug: "adad-khalq",
    title: "By the Number of His Creation",
    arabic:
      "اللَّهُمَّ صَلِّ عَلَىٰ مُحَمَّدٍ وَعَلَىٰ آلِ مُحَمَّدٍ، عَدَدَ خَلْقِكَ، وَرِضَا نَفْسِكَ، وَزِنَةَ عَرْشِكَ، وَمِدَادَ كَلِمَاتِكَ",
    translit:
      "Allāhumma ṣalli ʿalā Muḥammadin wa ʿalā āli Muḥammad, ʿadada khalqik, wa riḍā nafsik, wa zinata ʿarshik, wa midāda kalimātik.",
    meaning:
      "O Allah, send prayers upon Muḥammad and the family of Muḥammad, by the number of Your creation, the pleasure of Your Self, the weight of Your Throne, and the ink of Your words.",
    virtue:
      "Modeled on the tasbīḥ that the Prophet ﷺ taught Juwayriyyah — a single recitation outweighs hours of remembrance in reward.",
    reference: "Muslim 2726 (structure)",
    category: "Comprehensive",
  },
  {
    slug: "wasilah-dua",
    title: "The Waṣīlah Duʿāʾ After Adhān",
    arabic:
      "اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ",
    translit:
      "Allāhumma Rabba hādhihi-d-daʿwati-t-tāmmah wa-ṣ-ṣalāti-l-qāʾimah, āti Muḥammadan-il-Wasīlata wa-l-Faḍīlah, wa-bʿathhu maqāman maḥmūdan-illadhī waʿadtah.",
    meaning:
      "O Allah, Lord of this perfect call and this established prayer, grant Muḥammad al-Wasīlah and al-Faḍīlah, and raise him to the Praised Station that You promised him.",
    virtue:
      "Whoever says it after hearing the adhān — my intercession becomes binding for him on the Day of Resurrection.",
    reference: "Bukhārī 614",
    category: "Comprehensive",
  },
];
