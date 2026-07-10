// The five daily prescribed prayers — for public shareable pages.

export type Salah = {
  slug: string;
  en: string;
  ar: string;
  translit: string;
  when: string;
  fard: number;      // Obligatory rakʿahs
  sunnah: string;    // Regular sunan (mu'akkadah + ghayr mu'akkadah, brief)
  virtue: string;
};

export const SALAWAT: Salah[] = [
  {
    slug: "fajr",
    en: "Dawn Prayer",
    ar: "صَلَاة الْفَجْر",
    translit: "Ṣalāt al-Fajr",
    when: "From true dawn until sunrise",
    fard: 2,
    sunnah: "2 rakʿahs sunnah muʾakkadah before the farḍ",
    virtue: "Whoever prays Fajr is under Allah's protection that day. Its two sunnah rakʿahs are better than the world and all it contains.",
  },
  {
    slug: "dhuhr",
    en: "Noon Prayer",
    ar: "صَلَاة الظُّهْر",
    translit: "Ṣalāt al-Ẓuhr",
    when: "From when the sun passes zenith until an object's shadow equals itself",
    fard: 4,
    sunnah: "4 rakʿahs before + 2 after (muʾakkadah)",
    virtue: "The Prophet ﷺ said: whoever preserves four rakʿahs before Ẓuhr and four after, Allah will forbid the Fire for him.",
  },
  {
    slug: "asr",
    en: "Afternoon Prayer",
    ar: "صَلَاة الْعَصْر",
    translit: "Ṣalāt al-ʿAṣr",
    when: "From when a shadow equals its object until the sun begins to yellow",
    fard: 4,
    sunnah: "4 rakʿahs before (ghayr muʾakkadah)",
    virtue: "Called al-ṣalāt al-wusṭā — the middle prayer. Whoever misses it, it is as if his family and wealth have been taken.",
  },
  {
    slug: "maghrib",
    en: "Sunset Prayer",
    ar: "صَلَاة الْمَغْرِب",
    translit: "Ṣalāt al-Maghrib",
    when: "From sunset until the red twilight disappears",
    fard: 3,
    sunnah: "2 rakʿahs sunnah muʾakkadah after the farḍ",
    virtue: "Prayed without delay at its beginning; the time when the fast is broken and hearts turn to Allah at day's end.",
  },
  {
    slug: "isha",
    en: "Night Prayer",
    ar: "صَلَاة الْعِشَاء",
    translit: "Ṣalāt al-ʿIshāʾ",
    when: "From when the red twilight disappears until midnight (preferred), and until true dawn (permitted)",
    fard: 4,
    sunnah: "2 rakʿahs sunnah muʾakkadah after + witr to close the night",
    virtue: "Whoever prays ʿIshāʾ in congregation, it is as if he stood in prayer half the night; and Fajr with it — the whole night.",
  },
];
