// Asmāʾ an-Nabī ﷺ — Names and titles of the Prophet Muḥammad ﷺ mentioned in the Qurʾān and Ḥadīth.

export type ProphetName = {
  slug: string;
  arabic: string;
  translit: string;
  meaning: string;
  explanation: string;
  reference: string;
};

export const PROPHET_NAMES: ProphetName[] = [
  {
    slug: "muhammad",
    arabic: "مُحَمَّدٌ",
    translit: "Muḥammad",
    meaning: "The Praised One",
    explanation:
      "The name given to him by his grandfather ʿAbd al-Muṭṭalib — the one who is praised repeatedly, in the heavens and on earth, by Allah, the angels, and the believers. Mentioned four times in the Qurʾān.",
    reference: "Sūrat Āl ʿImrān 3:144; Muḥammad 47:2; al-Fatḥ 48:29; al-Aḥzāb 33:40",
  },
  {
    slug: "ahmad",
    arabic: "أَحْمَدُ",
    translit: "Aḥmad",
    meaning: "The Most Praiseworthy",
    explanation:
      "The name by which ʿĪsā ﷺ prophesied his coming. It is the superlative form — more praised than any created being will ever be.",
    reference: "Sūrat aṣ-Ṣaff 61:6",
  },
  {
    slug: "al-mahi",
    arabic: "الْمَاحِي",
    translit: "Al-Māḥī",
    meaning: "The Eraser",
    explanation:
      "The one by whom Allah erases disbelief. Wherever his message reached, shirk was wiped away and replaced with the light of tawḥīd.",
    reference: "Bukhārī 3532, Muslim 2354",
  },
  {
    slug: "al-hashir",
    arabic: "الْحَاشِرُ",
    translit: "Al-Ḥāshir",
    meaning: "The Gatherer",
    explanation:
      "The one at whose feet mankind will be gathered on the Day of Resurrection — no prophet after him, and all creation is assembled behind his footsteps.",
    reference: "Bukhārī 3532, Muslim 2354",
  },
  {
    slug: "al-aqib",
    arabic: "الْعَاقِبُ",
    translit: "Al-ʿĀqib",
    meaning: "The Last (Seal of the Prophets)",
    explanation:
      "The one who came after and sealed all the prophets — there is no prophet after him. He is the final messenger to all of humanity until the Day of Judgement.",
    reference: "Bukhārī 3532, Muslim 2354",
  },
  {
    slug: "al-mustafa",
    arabic: "الْمُصْطَفَىٰ",
    translit: "Al-Muṣṭafā",
    meaning: "The Chosen One",
    explanation:
      "Chosen by Allah above all creation — chosen from Banū Hāshim, from Quraysh, from Kinānah, from the descendants of Ismāʿīl.",
    reference: "Muslim 2276",
  },
  {
    slug: "rasul-allah",
    arabic: "رَسُولُ اللَّهِ",
    translit: "Rasūlullāh",
    meaning: "The Messenger of Allah",
    explanation:
      "The one sent by Allah to all of creation — jinn and mankind — carrying the final revelation. His messengership is the second half of the Shahādah.",
    reference: "Qurʾān, mentioned throughout",
  },
  {
    slug: "khatam-an-nabiyyin",
    arabic: "خَاتَمُ النَّبِيِّينَ",
    translit: "Khātam an-Nabiyyīn",
    meaning: "The Seal of the Prophets",
    explanation:
      "The final prophet — no prophet will come after him. Anyone claiming prophethood after him is a liar and outside of Islam by consensus.",
    reference: "Sūrat al-Aḥzāb 33:40",
  },
  {
    slug: "rahmatan-lil-alamin",
    arabic: "رَحْمَةً لِلْعَالَمِينَ",
    translit: "Raḥmatan lil-ʿĀlamīn",
    meaning: "A Mercy to All the Worlds",
    explanation:
      "Sent not just for Arabs, not just for Muslims, but as a mercy for every world — human, jinn, animal, and every creation of Allah.",
    reference: "Sūrat al-Anbiyāʾ 21:107",
  },
  {
    slug: "as-siraj-al-munir",
    arabic: "السِّرَاجُ الْمُنِيرُ",
    translit: "As-Sirāj al-Munīr",
    meaning: "The Illuminating Lamp",
    explanation:
      "Called by Allah a shining lamp — bringing light to hearts drowning in the darkness of ignorance, shirk, and misguidance.",
    reference: "Sūrat al-Aḥzāb 33:46",
  },
  {
    slug: "an-nadhir-al-bashir",
    arabic: "النَّذِيرُ الْبَشِيرُ",
    translit: "An-Nadhīr al-Bashīr",
    meaning: "The Warner, The Bringer of Glad Tidings",
    explanation:
      "A warner of the Fire for those who reject, and a bringer of glad tidings of Jannah for those who believe and act righteously.",
    reference: "Sūrat al-Aḥzāb 33:45; al-Baqarah 2:119",
  },
  {
    slug: "an-nabi-al-ummi",
    arabic: "النَّبِيُّ الْأُمِّيُّ",
    translit: "An-Nabī al-Ummī",
    meaning: "The Unlettered Prophet",
    explanation:
      "He could neither read nor write — a living proof that the Qurʾān is not from him but from Allah. The unlettered Arab who brought a Book unmatched by all the scholars of the world.",
    reference: "Sūrat al-Aʿrāf 7:157–158",
  },
  {
    slug: "abu-al-qasim",
    arabic: "أَبُو الْقَاسِمِ",
    translit: "Abū-l-Qāsim",
    meaning: "Father of al-Qāsim",
    explanation:
      "His kunyah — named after his eldest son al-Qāsim, born of Khadījah رضي الله عنها. He forbade the Muslims from combining his name and kunyah for anyone else.",
    reference: "Bukhārī 3538",
  },
  {
    slug: "habib-allah",
    arabic: "حَبِيبُ اللَّهِ",
    translit: "Ḥabīb Allāh",
    meaning: "The Beloved of Allah",
    explanation:
      "The most beloved of the entire creation to Allah — more beloved to Him than Ibrāhīm ﷺ, who was Khalīl Allāh. His station of maḥabbah is unmatched.",
    reference: "Tirmidhī 3616 (ḥasan)",
  },
  {
    slug: "sayyid-walad-adam",
    arabic: "سَيِّدُ وَلَدِ آدَمَ",
    translit: "Sayyid Walad Ādam",
    meaning: "Master of the Children of Ādam",
    explanation:
      "He ﷺ said: I am the master of the children of Ādam on the Day of Resurrection — without boasting. The one who holds the Banner of Praise, whose intercession opens Jannah.",
    reference: "Muslim 2278",
  },
];
