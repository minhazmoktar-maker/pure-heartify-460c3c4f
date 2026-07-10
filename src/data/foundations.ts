// The Five Pillars of Islam and Six Articles of Faith — foundational.

export type Pillar = {
  n: number;
  slug: string;
  en: string;
  ar: string;
  translit: string;
  summary: string;
};

export const PILLARS: Pillar[] = [
  { n: 1, slug: "shahadah", en: "Testimony of Faith", ar: "الشَّهَادَة",  translit: "Shahādah", summary: "To bear witness that there is no god but Allah and Muḥammad ﷺ is His Messenger — the gateway into Islam." },
  { n: 2, slug: "salah",    en: "Prescribed Prayer",  ar: "الصَّلَاة",    translit: "Ṣalāh",    summary: "The five daily prayers — the direct link between the servant and Allah, and the first deed asked about on the Day of Judgment." },
  { n: 3, slug: "zakah",    en: "Purifying Charity",  ar: "الزَّكَاة",    translit: "Zakāh",    summary: "An obligatory annual charity (typically 2.5%) that purifies wealth and sustains the poor, orphans, and the needy." },
  { n: 4, slug: "sawm",     en: "Fasting Ramadan",    ar: "الصَّوْم",     translit: "Ṣawm",     summary: "Abstaining from food, drink, and desires from dawn until sunset in Ramaḍān, cultivating taqwā." },
  { n: 5, slug: "hajj",     en: "Pilgrimage to Makkah", ar: "الْحَجّ",    translit: "Ḥajj",     summary: "Once in a lifetime for those who are able — a journey of ṭawāf, Ṣafā-Marwah, ʿArafah, and Muzdalifah, returning like a newborn from sin." },
];

export type Article = {
  n: number;
  slug: string;
  en: string;
  ar: string;
  translit: string;
  summary: string;
};

export const ARTICLES: Article[] = [
  { n: 1, slug: "allah",    en: "Belief in Allah",              ar: "الْإِيمَان بِاللَّه",           translit: "Al-Īmān bi-Allāh",         summary: "To believe in Allah — One, without partner — in His Lordship, His right to worship alone, and His perfect Names and Attributes." },
  { n: 2, slug: "malaikah", en: "Belief in the Angels",         ar: "الْإِيمَان بِالْمَلَائِكَة",    translit: "Al-Īmān bi-l-Malāʾikah",   summary: "To believe in the angels — created from light, honored servants who never disobey Allah and carry out His commands." },
  { n: 3, slug: "kutub",    en: "Belief in the Revealed Books", ar: "الْإِيمَان بِالْكُتُب",        translit: "Al-Īmān bi-l-Kutub",       summary: "To believe in all revealed scriptures — the Qur'ān, Injīl, Tawrāh, Zabūr, and the Scrolls — the Qur'ān being the final and preserved." },
  { n: 4, slug: "rusul",    en: "Belief in the Messengers",     ar: "الْإِيمَان بِالرُّسُل",        translit: "Al-Īmān bi-r-Rusul",       summary: "To believe in all the prophets and messengers of Allah, from Ādam to Muḥammad ﷺ — the seal of the prophets." },
  { n: 5, slug: "yawm-akhir", en: "Belief in the Last Day",     ar: "الْإِيمَان بِالْيَوْم الآخِر",  translit: "Al-Īmān bi-l-Yawm al-Ākhir", summary: "To believe in the Day of Resurrection, the reckoning, the reward of Paradise, and the punishment of the Fire." },
  { n: 6, slug: "qadar",    en: "Belief in Divine Decree",      ar: "الْإِيمَان بِالْقَدَر",        translit: "Al-Īmān bi-l-Qadar",       summary: "To believe that all that occurs is by Allah's knowledge, writing, will, and creation — its good and its trials — with the servant retaining choice and responsibility." },
];
