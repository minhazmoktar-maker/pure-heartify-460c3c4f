// Curated Islamic inspirational quotes organized by theme.
// Sources: Qur'an, authentic hadith, and companions/scholars of the salaf.

export type Quote = {
  text: string;
  source: string;
  type: "quran" | "hadith" | "companion" | "scholar";
};

export type QuoteTheme = {
  slug: string;
  title: string;
  intro: string;
  quotes: Quote[];
};

export const QUOTE_THEMES: QuoteTheme[] = [
  {
    slug: "patience",
    title: "Patience (Ṣabr)",
    intro:
      "Steadiness of the heart when tested — restraint upon obedience, restraint from disobedience, and stillness under decree.",
    quotes: [
      { text: "And give glad tidings to the patient — those who, when disaster strikes them, say: 'Indeed to Allah we belong and to Him we shall return.'", source: "Sūrat al-Baqarah 2:155–156", type: "quran" },
      { text: "Indeed, Allah is with the patient.", source: "Sūrat al-Baqarah 2:153", type: "quran" },
      { text: "No one is granted a gift better and more comprehensive than patience.", source: "Bukhārī 1469 · Muslim 1053", type: "hadith" },
      { text: "The patient will be given their reward without measure.", source: "Sūrat az-Zumar 39:10", type: "quran" },
      { text: "Patience is at the first strike.", source: "Bukhārī 1283", type: "hadith" },
      { text: "How wonderful is the affair of the believer — if hardship befalls him he is patient and it is good for him.", source: "Muslim 2999", type: "hadith" },
      { text: "Whoever tries to be patient, Allah will make him patient.", source: "Bukhārī 1469", type: "hadith" },
      { text: "Nothing is heavier on the scale than good character and patience.", source: "Tirmidhī 2002", type: "hadith" },
    ],
  },
  {
    slug: "gratitude",
    title: "Gratitude (Shukr)",
    intro:
      "Recognition of every blessing — with the tongue, the heart, and the limbs. Gratitude multiplies what you already have.",
    quotes: [
      { text: "If you are grateful, I will surely increase you.", source: "Sūrat Ibrāhīm 14:7", type: "quran" },
      { text: "So remember Me; I will remember you. And be grateful to Me and do not deny Me.", source: "Sūrat al-Baqarah 2:152", type: "quran" },
      { text: "He has not thanked Allah who has not thanked people.", source: "Abū Dāwūd 4811", type: "hadith" },
      { text: "Look at those below you, and do not look at those above you — it is more suitable that you not belittle Allah's blessings upon you.", source: "Muslim 2963", type: "hadith" },
      { text: "O Muʿādh, by Allah I love you. Never leave saying after every prayer: 'O Allah, help me to remember You, thank You, and worship You well.'", source: "Abū Dāwūd 1522", type: "hadith" },
      { text: "Whoever is not grateful for the little will not be grateful for the abundant.", source: "Aḥmad 18449", type: "hadith" },
    ],
  },
  {
    slug: "hope",
    title: "Hope (Rajāʾ)",
    intro:
      "The believer's forward-looking trust in Allah's mercy — never despairing, never presuming, always walking between fear and hope.",
    quotes: [
      { text: "Do not despair of the mercy of Allah. Indeed, Allah forgives all sins.", source: "Sūrat az-Zumar 39:53", type: "quran" },
      { text: "And whoever relies upon Allah — He is sufficient for him.", source: "Sūrat aṭ-Ṭalāq 65:3", type: "quran" },
      { text: "Verily, with hardship comes ease. Verily, with hardship comes ease.", source: "Sūrat ash-Sharḥ 94:5–6", type: "quran" },
      { text: "Allah says: I am as My servant thinks of Me, and I am with him when he remembers Me.", source: "Bukhārī 7405 · Muslim 2675", type: "hadith" },
      { text: "None of you should die except while thinking positively of Allah.", source: "Muslim 2877", type: "hadith" },
      { text: "Allah's mercy prevails over His wrath.", source: "Bukhārī 7422 · Muslim 2751", type: "hadith" },
    ],
  },
  {
    slug: "trust",
    title: "Trust in Allah (Tawakkul)",
    intro:
      "Tie the camel — then rely on Allah. Effort with the limbs, dependence with the heart.",
    quotes: [
      { text: "And whoever relies upon Allah — then He is sufficient for him.", source: "Sūrat aṭ-Ṭalāq 65:3", type: "quran" },
      { text: "If you relied upon Allah with true reliance, He would provide for you as He provides for the birds — they leave in the morning hungry and return in the evening full.", source: "Tirmidhī 2344", type: "hadith" },
      { text: "Sufficient for us is Allah, and He is the best Disposer of affairs.", source: "Sūrat Āl ʿImrān 3:173", type: "quran" },
      { text: "Whoever holds fast to Allah has been guided to a straight path.", source: "Sūrat Āl ʿImrān 3:101", type: "quran" },
      { text: "Know that if the entire nation gathered to benefit you, they would not benefit you except with what Allah had already prescribed for you.", source: "Tirmidhī 2516", type: "hadith" },
    ],
  },
  {
    slug: "knowledge",
    title: "Seeking Knowledge (ʿIlm)",
    intro:
      "The traveler on the path of knowledge walks a path Allah paves toward Paradise.",
    quotes: [
      { text: "Say: 'My Lord, increase me in knowledge.'", source: "Sūrat Ṭā-Hā 20:114", type: "quran" },
      { text: "Are those who know equal to those who do not know?", source: "Sūrat az-Zumar 39:9", type: "quran" },
      { text: "Whoever travels a path in search of knowledge, Allah will make easy for him a path to Paradise.", source: "Muslim 2699", type: "hadith" },
      { text: "The best of you are those who learn the Qur'an and teach it.", source: "Bukhārī 5027", type: "hadith" },
      { text: "Seek knowledge from the cradle to the grave.", source: "Attributed — widely reported", type: "scholar" },
      { text: "Knowledge is what benefits — not what is memorized.", source: "Imām ash-Shāfiʿī", type: "scholar" },
    ],
  },
  {
    slug: "mercy",
    title: "Mercy (Raḥmah)",
    intro:
      "The Most Merciful shows mercy to the merciful — mercy is not weakness, it is strength wrapped in compassion.",
    quotes: [
      { text: "My mercy encompasses all things.", source: "Sūrat al-Aʿrāf 7:156", type: "quran" },
      { text: "And We have not sent you [O Muḥammad] except as a mercy to the worlds.", source: "Sūrat al-Anbiyāʾ 21:107", type: "quran" },
      { text: "Those who show mercy will be shown mercy by the Most Merciful. Show mercy to those on earth, the One above the heavens will show mercy to you.", source: "Abū Dāwūd 4941", type: "hadith" },
      { text: "He is not one of us who does not show mercy to our young and respect to our elders.", source: "Tirmidhī 1919", type: "hadith" },
      { text: "The most beloved of people to Allah are those most beneficial to people.", source: "Ṭabarānī — ḥasan", type: "hadith" },
    ],
  },
  {
    slug: "sincerity",
    title: "Sincerity (Ikhlāṣ)",
    intro:
      "The soul of every action — pure intention for Allah alone. Without it, the greatest deed is empty.",
    quotes: [
      { text: "And they were not commanded except to worship Allah, being sincere to Him in religion.", source: "Sūrat al-Bayyinah 98:5", type: "quran" },
      { text: "Actions are but by intentions, and every person shall have what he intended.", source: "Bukhārī 1 · Muslim 1907", type: "hadith" },
      { text: "Allah does not look at your bodies or your forms, but He looks at your hearts and your deeds.", source: "Muslim 2564", type: "hadith" },
      { text: "There is nothing heavier on the tongue, lighter on the scale, and more beloved to the Most Merciful than: subḥān Allāhi wa bi ḥamdih.", source: "Bukhārī 6682", type: "hadith" },
      { text: "How many small deeds are made great by intention, and how many great deeds are made small by intention.", source: "Ibn al-Mubārak", type: "scholar" },
    ],
  },
  {
    slug: "repentance",
    title: "Repentance (Tawbah)",
    intro:
      "Every child of Ādam errs — and the best of those who err are those who turn back. The door is open until the sun rises from the west.",
    quotes: [
      { text: "Indeed, Allah loves those who constantly repent and those who purify themselves.", source: "Sūrat al-Baqarah 2:222", type: "quran" },
      { text: "And turn to Allah in repentance, all of you, O believers, that you might succeed.", source: "Sūrat an-Nūr 24:31", type: "quran" },
      { text: "The one who repents from sin is like one who has no sin.", source: "Ibn Mājah 4250", type: "hadith" },
      { text: "By Allah, I seek Allah's forgiveness and turn to Him in repentance more than seventy times in a day.", source: "Bukhārī 6307", type: "hadith" },
      { text: "Allah is more delighted with the repentance of His servant than one of you who lost his camel in a barren land and then suddenly found it.", source: "Muslim 2747", type: "hadith" },
    ],
  },
  {
    slug: "brotherhood",
    title: "Brotherhood & Love",
    intro:
      "The believers are one body — when one limb hurts, the rest respond with fever and sleeplessness.",
    quotes: [
      { text: "The believers are but brothers.", source: "Sūrat al-Ḥujurāt 49:10", type: "quran" },
      { text: "None of you truly believes until he loves for his brother what he loves for himself.", source: "Bukhārī 13 · Muslim 45", type: "hadith" },
      { text: "The example of the believers in their mutual love, mercy, and compassion is like a single body — if one limb suffers, the whole body responds.", source: "Bukhārī 6011 · Muslim 2586", type: "hadith" },
      { text: "A believer to another believer is like a building — one part strengthening the other.", source: "Bukhārī 481", type: "hadith" },
      { text: "You will not enter Paradise until you believe, and you will not believe until you love one another. Shall I tell you of something that, if you do it, you will love one another? Spread salām among yourselves.", source: "Muslim 54", type: "hadith" },
    ],
  },
  {
    slug: "humility",
    title: "Humility (Tawāḍuʿ)",
    intro:
      "Walk gently upon the earth. No one lowers himself for Allah's sake except that Allah raises him.",
    quotes: [
      { text: "The servants of the Most Merciful are those who walk upon the earth in humility, and when the ignorant address them, they say 'Peace.'", source: "Sūrat al-Furqān 25:63", type: "quran" },
      { text: "No one humbles himself for Allah's sake except that Allah raises him.", source: "Muslim 2588", type: "hadith" },
      { text: "None shall enter Paradise who has an atom's weight of arrogance in his heart.", source: "Muslim 91", type: "hadith" },
      { text: "The strong is not the one who overpowers people — the strong is the one who controls himself when angry.", source: "Bukhārī 6114", type: "hadith" },
      { text: "Whoever knows himself best knows his Lord best.", source: "Yaḥyā ibn Muʿādh", type: "scholar" },
    ],
  },
  {
    slug: "hardship",
    title: "Hardship & Ease",
    intro:
      "No trial descends without Allah's knowledge, and no trial passes without leaving the believer polished and closer to Him.",
    quotes: [
      { text: "Allah does not burden a soul beyond that which it can bear.", source: "Sūrat al-Baqarah 2:286", type: "quran" },
      { text: "Verily, with hardship comes ease.", source: "Sūrat ash-Sharḥ 94:6", type: "quran" },
      { text: "And We will surely test you with something of fear and hunger, and loss of wealth and lives and fruits — but give good tidings to the patient.", source: "Sūrat al-Baqarah 2:155", type: "quran" },
      { text: "No fatigue, illness, sorrow, sadness, hurt, or distress befalls a Muslim — not even a thorn that pricks him — except that Allah expiates his sins by it.", source: "Bukhārī 5641 · Muslim 2573", type: "hadith" },
      { text: "When Allah loves a people, He tests them.", source: "Tirmidhī 2396", type: "hadith" },
    ],
  },
  {
    slug: "time",
    title: "The Value of Time",
    intro:
      "Two blessings people are cheated of: health and free time. Guard the moment — it will never return.",
    quotes: [
      { text: "By time, indeed mankind is in loss — except those who believe, do righteous deeds, enjoin truth, and enjoin patience.", source: "Sūrat al-ʿAṣr 103:1–3", type: "quran" },
      { text: "There are two blessings that many people are cheated out of: good health and free time.", source: "Bukhārī 6412", type: "hadith" },
      { text: "Take advantage of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before your busyness, and your life before your death.", source: "Ḥākim 7846", type: "hadith" },
      { text: "Time is like a sword — if you do not cut it, it will cut you.", source: "Imām ash-Shāfiʿī", type: "scholar" },
      { text: "The son of Ādam is nothing but a collection of days — whenever a day passes, part of him is gone.", source: "Ḥasan al-Baṣrī", type: "scholar" },
    ],
  },
];
