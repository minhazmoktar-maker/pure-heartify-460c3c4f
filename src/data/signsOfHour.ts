export type SignCategory = "minor" | "major";

export interface SignOfHour {
  slug: string;
  arabic: string;
  translit: string;
  title: string;
  category: SignCategory;
  status: "fulfilled" | "unfolding" | "awaited";
  summary: string;
  reference: string;
}

/**
 * Authentic Ashrāṭ as-Sāʿah (Signs of the Hour) — a curated selection from
 * Bukhārī, Muslim, Abū Dāwūd, Tirmidhī and Ibn Mājah. Ordered minor → major.
 */
export const SIGNS_OF_HOUR: SignOfHour[] = [
  {
    slug: "bethah-of-the-prophet",
    arabic: "بِعْثَةُ النَّبِيِّ ﷺ",
    translit: "Biʿthat an-Nabī ﷺ",
    title: "The sending of the Prophet ﷺ himself",
    category: "minor",
    status: "fulfilled",
    summary:
      "The Prophet ﷺ said: “I was sent, and the Hour is like these two” — joining his index and middle fingers. His very mission is the first sign that the Hour has drawn near.",
    reference: "Bukhārī 6504 · Muslim 2951",
  },
  {
    slug: "splitting-of-the-moon",
    arabic: "ٱنشِقَاقُ ٱلْقَمَرِ",
    translit: "Inshiqāq al-Qamar",
    title: "The splitting of the moon",
    category: "minor",
    status: "fulfilled",
    summary:
      "In Makkah the moon split into two halves as a public sign, recorded in Sūrat al-Qamar (54:1): “The Hour has drawn near and the moon has split.”",
    reference: "Qurʾān 54:1 · Bukhārī 3636",
  },
  {
    slug: "death-of-the-prophet",
    arabic: "وَفَاةُ النَّبِيِّ ﷺ",
    translit: "Wafāt an-Nabī ﷺ",
    title: "The passing of the Prophet ﷺ",
    category: "minor",
    status: "fulfilled",
    summary:
      "The Prophet ﷺ counted his own death among the six signs before the Hour, alongside the conquest of Jerusalem and a widespread plague.",
    reference: "Bukhārī 3176",
  },
  {
    slug: "conquest-of-jerusalem",
    arabic: "فَتْحُ بَيْتِ الْمَقْدِسِ",
    translit: "Fatḥ Bayt al-Maqdis",
    title: "The conquest of Bayt al-Maqdis",
    category: "minor",
    status: "fulfilled",
    summary:
      "The opening of Jerusalem under ʿUmar ibn al-Khaṭṭāb (raḍiyaLlāhu ʿanhu) — foretold by the Prophet ﷺ as one of the early signs.",
    reference: "Bukhārī 3176",
  },
  {
    slug: "loss-of-knowledge",
    arabic: "رَفْعُ الْعِلْمِ",
    translit: "Rafʿ al-ʿIlm",
    title: "Sacred knowledge is lifted with the death of scholars",
    category: "minor",
    status: "unfolding",
    summary:
      "“Allāh does not take away knowledge by pulling it from the servants, but by taking the scholars — until, when no scholar remains, people take the ignorant as leaders who give verdicts without knowledge.”",
    reference: "Bukhārī 100 · Muslim 2673",
  },
  {
    slug: "spread-of-riba",
    arabic: "ظُهُورُ الرِّبَا",
    translit: "Ẓuhūr ar-Ribā",
    title: "Ribā (usury) becomes widespread",
    category: "minor",
    status: "unfolding",
    summary:
      "The Prophet ﷺ said: “A time will come upon people when there will be no one who does not consume ribā — and whoever does not consume it, its dust will still reach him.”",
    reference: "Abū Dāwūd 3331 · Nasāʾī 4455",
  },
  {
    slug: "spread-of-zina",
    arabic: "ظُهُورُ الزِّنَا",
    translit: "Ẓuhūr az-Zinā",
    title: "Fornication becomes open and public",
    category: "minor",
    status: "unfolding",
    summary:
      "Among the signs: zinā appears openly, alcohol is drunk freely, and killing becomes common — so that a killer will not know why he killed, nor the killed why he was killed.",
    reference: "Bukhārī 80 · Muslim 2671",
  },
  {
    slug: "shepherds-in-tall-buildings",
    arabic: "تَطَاوُلُ الرُّعَاةِ فِي الْبُنْيَانِ",
    translit: "Taṭāwul ar-Ruʿāh fī al-Bunyān",
    title: "Barefoot shepherds compete in tall buildings",
    category: "minor",
    status: "unfolding",
    summary:
      "In the ḥadīth of Jibrīl ﷺ: a sign of the Hour is that “the barefoot, naked, destitute shepherds of sheep will compete in raising tall buildings.”",
    reference: "Bukhārī 50 · Muslim 8",
  },
  {
    slug: "slave-woman-gives-birth-to-her-mistress",
    arabic: "أَنْ تَلِدَ الْأَمَةُ رَبَّتَهَا",
    translit: "An talid al-amatu rabbatahā",
    title: "The slave woman gives birth to her mistress",
    category: "minor",
    status: "unfolding",
    summary:
      "Also from the ḥadīth of Jibrīl ﷺ — understood by scholars as children ruling over their own parents and a great inversion of authority in the home.",
    reference: "Bukhārī 50 · Muslim 8",
  },
  {
    slug: "time-contracts",
    arabic: "تَقَارُبُ الزَّمَانِ",
    translit: "Taqārub az-Zamān",
    title: "Time contracts — a year like a month, a day like an hour",
    category: "minor",
    status: "unfolding",
    summary:
      "“The Hour will not be established until time contracts: a year like a month, a month like a week, a week like a day, a day like an hour, and an hour like the flare of a torch.”",
    reference: "Tirmidhī 2332",
  },
  {
    slug: "trust-is-lost",
    arabic: "ضَيَاعُ الْأَمَانَةِ",
    translit: "Ḍayāʿ al-Amānah",
    title: "When trust is lost, await the Hour",
    category: "minor",
    status: "unfolding",
    summary:
      "A bedouin asked: “When is the Hour?” He ﷺ said: “When trust (amānah) is lost, expect the Hour.” “How is it lost?” “When affairs are given to those unfit for them.”",
    reference: "Bukhārī 59",
  },
  {
    slug: "arabian-peninsula-rivers",
    arabic: "عَوْدَةُ أَرْضِ الْعَرَبِ مُرُوجًا وَأَنْهَارًا",
    translit: "ʿAwdat Arḍ al-ʿArab murūjan wa anhāran",
    title: "The land of the Arabs returns to meadows and rivers",
    category: "minor",
    status: "awaited",
    summary:
      "“The Hour will not be established until the land of the Arabs returns to meadows and rivers.”",
    reference: "Muslim 157",
  },
  {
    slug: "mahdi",
    arabic: "خُرُوجُ الْمَهْدِيِّ",
    translit: "Khurūj al-Mahdī",
    title: "The appearance of al-Mahdī",
    category: "major",
    status: "awaited",
    summary:
      "A man from the family of the Prophet ﷺ, named Muḥammad ibn ʿAbdillāh, who will fill the earth with justice as it was filled with oppression — and lead the Muslims before the descent of ʿĪsā ﷺ.",
    reference: "Abū Dāwūd 4282 · Tirmidhī 2230",
  },
  {
    slug: "dajjal",
    arabic: "خُرُوجُ الْمَسِيحِ الدَّجَّالِ",
    translit: "Khurūj al-Masīḥ ad-Dajjāl",
    title: "The emergence of al-Masīḥ ad-Dajjāl",
    category: "major",
    status: "awaited",
    summary:
      "The false messiah — one-eyed, with كافر (kāfir) written between his eyes, read by every believer. Every prophet warned his nation of him. The first ten āyāt of Sūrat al-Kahf are protection against his fitnah.",
    reference: "Bukhārī 7131 · Muslim 2934",
  },
  {
    slug: "descent-of-isa",
    arabic: "نُزُولُ عِيسَى ابْنِ مَرْيَمَ",
    translit: "Nuzūl ʿĪsā ibn Maryam ﷺ",
    title: "The descent of ʿĪsā ibn Maryam ﷺ",
    category: "major",
    status: "awaited",
    summary:
      "ʿĪsā ﷺ will descend at the white minaret east of Damascus, break the cross, kill the pig, abolish the jizyah, kill the Dajjāl at the gate of Ludd, and rule by the Sharīʿah of Muḥammad ﷺ.",
    reference: "Bukhārī 2222 · Muslim 155",
  },
  {
    slug: "yajuj-majuj",
    arabic: "خُرُوجُ يَأْجُوجَ وَمَأْجُوجَ",
    translit: "Khurūj Yaʾjūj wa Maʾjūj",
    title: "The release of Yaʾjūj and Maʾjūj (Gog and Magog)",
    category: "major",
    status: "awaited",
    summary:
      "They will pour down from every height, drink the Sea of Ṭabariyyah dry, and be destroyed by a worm sent by Allāh in response to the duʿāʾ of ʿĪsā ﷺ and the believers on Mount Ṭūr.",
    reference: "Muslim 2937 · Qurʾān 18:94–99, 21:96",
  },
  {
    slug: "three-landslides",
    arabic: "الْخُسُوفُ الثَّلَاثَةُ",
    translit: "Al-Khusūf ath-Thalāthah",
    title: "Three great landslides — East, West, and Arabia",
    category: "major",
    status: "awaited",
    summary:
      "Ḥudhayfah ibn Asīd (raḍiyaLlāhu ʿanhu) reported that among the ten major signs are three landslides: one in the East, one in the West, and one in the Arabian Peninsula.",
    reference: "Muslim 2901",
  },
  {
    slug: "smoke",
    arabic: "الدُّخَانُ",
    translit: "Ad-Dukhān",
    title: "The great smoke (ad-Dukhān)",
    category: "major",
    status: "awaited",
    summary:
      "A smoke that will cover the earth, referenced in Sūrat ad-Dukhān (44:10–11): “Then watch for a Day when the sky will bring a visible smoke, covering the people — this is a painful punishment.”",
    reference: "Qurʾān 44:10–11 · Muslim 2901",
  },
  {
    slug: "sun-rising-from-west",
    arabic: "طُلُوعُ الشَّمْسِ مِنْ مَغْرِبِهَا",
    translit: "Ṭulūʿ ash-Shams min Maghribihā",
    title: "The sun rising from its place of setting",
    category: "major",
    status: "awaited",
    summary:
      "When it happens the door of repentance is closed — “no soul will benefit from its faith if it had not believed before, or earned good through its faith.”",
    reference: "Bukhārī 4635 · Qurʾān 6:158",
  },
  {
    slug: "beast-of-the-earth",
    arabic: "دَابَّةُ الْأَرْضِ",
    translit: "Dābbat al-Arḍ",
    title: "The emergence of the Beast of the Earth",
    category: "major",
    status: "awaited",
    summary:
      "A creature that will come forth and mark people — distinguishing the believer from the disbeliever, as mentioned in Sūrat an-Naml (27:82).",
    reference: "Qurʾān 27:82 · Muslim 2901",
  },
  {
    slug: "fire-from-yemen",
    arabic: "نَارٌ تَخْرُجُ مِنْ قَعْرِ عَدَنَ",
    translit: "Nār takhruju min qaʿri ʿAdan",
    title: "A fire that drives the people to their final gathering",
    category: "major",
    status: "awaited",
    summary:
      "The last of the ten major signs: a fire that will emerge from Yemen (from the depths of ʿAdan) and drive humanity to the place of their final assembly (al-Maḥshar).",
    reference: "Muslim 2901 · Bukhārī 7118",
  },
];

export const getSign = (slug: string) => SIGNS_OF_HOUR.find((s) => s.slug === slug);
