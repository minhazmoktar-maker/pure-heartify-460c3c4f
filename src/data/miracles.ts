export type Miracle = {
  slug: string;
  name_ar: string;
  translit: string;
  category: "Qurʾānic" | "Cosmic" | "Physical" | "Provision" | "Prophecy" | "Healing";
  place: string;
  summary: string;
  source: string; // primary reference
};

export const MIRACLES: Miracle[] = [
  {
    slug: "the-quran",
    name_ar: "الْقُرْآنُ الْكَرِيمُ",
    translit: "The Qurʾān — the greatest and lasting miracle",
    category: "Qurʾānic",
    place: "Makkah & Madīnah",
    summary:
      "The eternal miracle of the Prophet ﷺ — inimitable in language, meaning, law, unseen news, and guidance. Challenged all humanity to produce a single sūrah like it and none could.",
    source: "Qurʾān 2:23; 17:88",
  },
  {
    slug: "splitting-of-the-moon",
    name_ar: "انْشِقَاقُ الْقَمَرِ",
    translit: "Inshiqāq al-Qamar — the splitting of the moon",
    category: "Cosmic",
    place: "Makkah, near Mount Ḥirāʾ",
    summary:
      "When Quraysh demanded a sign, the moon split into two visible halves and then rejoined — witnessed by many companions.",
    source: "Qurʾān 54:1–2; al-Bukhārī 3636; Muslim 2802",
  },
  {
    slug: "isra-and-miraj",
    name_ar: "الْإِسْرَاءُ وَالْمِعْرَاجُ",
    translit: "al-Isrāʾ wa-l-Miʿrāj — the Night Journey & Ascension",
    category: "Cosmic",
    place: "Makkah → al-Aqṣā → the Heavens",
    summary:
      "In a single night the Prophet ﷺ was taken from al-Masjid al-Ḥarām to al-Masjid al-Aqṣā, then ascended through the seven heavens, met the prophets, and received the five daily prayers.",
    source: "Qurʾān 17:1; al-Bukhārī 3887; Muslim 162",
  },
  {
    slug: "water-from-fingers",
    name_ar: "نَبْعُ الْمَاءِ مِنْ بَيْنِ أَصَابِعِهِ ﷺ",
    translit: "Water flowing from between his fingers ﷺ",
    category: "Provision",
    place: "al-Ḥudaybiyyah & other expeditions",
    summary:
      "On more than one occasion the Companions ran out of water; the Prophet ﷺ placed his hand in a vessel and water gushed from between his blessed fingers, giving drink and wuḍūʾ to hundreds.",
    source: "al-Bukhārī 3572; Muslim 1856",
  },
  {
    slug: "food-multiplied",
    name_ar: "تَكْثِيرُ الطَّعَامِ",
    translit: "Multiplication of food",
    category: "Provision",
    place: "Madīnah & al-Khandaq",
    summary:
      "A small meal — a handful of dates, a lamb, a little barley — fed a large gathering by the Prophet's ﷺ blessing, with food remaining afterwards.",
    source: "al-Bukhārī 4101; Muslim 2039",
  },
  {
    slug: "crying-palm-trunk",
    name_ar: "حَنِينُ الْجِذْعِ",
    translit: "Ḥanīn al-Jidhʿ — the weeping palm trunk",
    category: "Physical",
    place: "al-Masjid al-Nabawī, Madīnah",
    summary:
      "When a minbar was built and the Prophet ﷺ left the palm trunk he used to lean on, it wept audibly like a child until he ﷺ came and consoled it.",
    source: "al-Bukhārī 3583",
  },
  {
    slug: "healing-of-ali",
    name_ar: "شِفَاءُ عَيْنِ عَلِيٍّ رضي الله عنه",
    translit: "Healing the eye of ʿAlī رضي الله عنه at Khaybar",
    category: "Healing",
    place: "Khaybar",
    summary:
      "ʿAlī ibn Abī Ṭālib was suffering from a severe eye ailment on the day of Khaybar. The Prophet ﷺ applied his saliva to it and it was healed instantly, as if he had never had any pain.",
    source: "al-Bukhārī 4210; Muslim 2406",
  },
  {
    slug: "conquest-of-persia-rome",
    name_ar: "الْإِخْبَارُ بِفَتْحِ فَارِسَ وَالرُّومِ",
    translit: "Foretelling the conquest of Persia and Rome",
    category: "Prophecy",
    place: "Madīnah",
    summary:
      "At al-Khandaq, while digging in poverty and fear, the Prophet ﷺ struck a rock and foretold the fall of the palaces of Kisrā and Qayṣar — fulfilled within a generation.",
    source: "Musnad Aḥmad 18694; al-Nasāʾī 3176",
  },
  {
    slug: "trees-obeying",
    name_ar: "طَاعَةُ الشَّجَرِ لَهُ ﷺ",
    translit: "Trees moving at his command ﷺ",
    category: "Physical",
    place: "Outskirts of Madīnah",
    summary:
      "A bedouin asked for a sign; the Prophet ﷺ called a tree, which uprooted itself, came to him, and returned to its place — after which the man embraced Islam.",
    source: "Sunan al-Dārimī 16; Musnad Aḥmad 2483",
  },
  {
    slug: "stones-glorifying",
    name_ar: "تَسْبِيحُ الْحَصَى",
    translit: "Pebbles glorifying Allāh in his hand ﷺ",
    category: "Physical",
    place: "Makkah",
    summary:
      "Pebbles were heard glorifying Allāh in the blessed palm of the Prophet ﷺ, then in the hands of Abū Bakr, ʿUmar and ʿUthmān رضي الله عنهم.",
    source: "Reported by al-Bayhaqī in Dalāʾil al-Nubuwwah",
  },
  {
    slug: "cave-of-thawr",
    name_ar: "غَارُ ثَوْرٍ",
    translit: "The Cave of Thawr — the spider and the dove",
    category: "Physical",
    place: "Jabal Thawr, near Makkah",
    summary:
      "During the Hijrah, Quraysh reached the mouth of the cave, but Allāh caused a spider to spin its web and a dove to nest at the entrance, and the pursuers turned back.",
    source: "Qurʾān 9:40; classical sīrah works",
  },
  {
    slug: "shepherd-wolf-speaks",
    name_ar: "كَلَامُ الذِّئْبِ",
    translit: "The speaking of the wolf",
    category: "Physical",
    place: "Outskirts of Madīnah",
    summary:
      "A wolf spoke to a shepherd, telling him of a Prophet in Madīnah calling to the truth; the shepherd came, believed, and reported it — the Prophet ﷺ confirmed it as a sign of the last days approaching.",
    source: "Musnad Aḥmad 11792; classed ṣaḥīḥ by Aḥmad Shākir",
  },
  {
    slug: "shade-of-the-cloud",
    name_ar: "تَظْلِيلُ الْغَمَامَةِ",
    translit: "The cloud shading the Prophet ﷺ in his youth",
    category: "Cosmic",
    place: "Road to Shām (Syria)",
    summary:
      "The monk Baḥīrā observed that a cloud continually shaded the young Muḥammad ﷺ on the caravan journey and warned Abū Ṭālib to protect him — an early sign of prophethood.",
    source: "al-Tirmidhī 3620",
  },
  {
    slug: "foretelling-uthmans-martyrdom",
    name_ar: "الْإِخْبَارُ بِشَهَادَةِ عُثْمَانَ",
    translit: "Foretelling the martyrdom of ʿUthmān رضي الله عنه",
    category: "Prophecy",
    place: "Madīnah",
    summary:
      "The Prophet ﷺ ascended Uḥud with Abū Bakr, ʿUmar and ʿUthmān; the mountain shook and he ﷺ said: 'Be still, Uḥud — upon you is a Prophet, a Ṣiddīq, and two martyrs' — fulfilled exactly as foretold.",
    source: "al-Bukhārī 3675",
  },
  {
    slug: "poisoned-lamb-at-khaybar",
    name_ar: "الشَّاةُ الْمَسْمُومَةُ بِخَيْبَرَ",
    translit: "The poisoned lamb of Khaybar speaking",
    category: "Physical",
    place: "Khaybar",
    summary:
      "A Jewish woman poisoned a roasted lamb; the shoulder informed the Prophet ﷺ that it was poisoned, so he warned his Companions — Bishr ibn al-Barāʾ رضي الله عنه who had already swallowed a piece died a martyr.",
    source: "Abū Dāwūd 4508; al-Dārimī 68",
  },
];
