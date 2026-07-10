export type Madhhab = {
  slug: string;
  arabic: string;
  name: string;
  founder: string;
  founderArabic: string;
  lifespan: string;
  origin: string;
  regions: string;
  summary: string;
  method: string;
};

export const MADHAHIB: Madhhab[] = [
  {
    slug: "hanafi",
    arabic: "الحنفي",
    name: "Ḥanafī",
    founder: "Imām Abū Ḥanīfah al-Nuʿmān",
    founderArabic: "أبو حنيفة النعمان بن ثابت",
    lifespan: "80–150 AH / 699–767 CE",
    origin: "Kūfah, Iraq",
    regions:
      "Turkey, Balkans, Levant, Egypt, Central Asia, Afghanistan, Pakistan, India, Bangladesh, China",
    summary:
      "The oldest of the four surviving Sunni schools, known for its systematic use of qiyās (analogical reasoning) and istiḥsān (juristic preference), historically the madhhab of the ʿAbbāsid, Seljuq, Mughal, and Ottoman states.",
    method:
      "Qurʾān → Sunnah → consensus of the Companions → individual Companion opinion → qiyās → istiḥsān → ʿurf (custom).",
  },
  {
    slug: "maliki",
    arabic: "المالكي",
    name: "Mālikī",
    founder: "Imām Mālik ibn Anas",
    founderArabic: "مالك بن أنس الأصبحي",
    lifespan: "93–179 AH / 711–795 CE",
    origin: "Madīnah",
    regions:
      "North Africa, West Africa, Sudan, Upper Egypt, parts of the Gulf",
    summary:
      "Rooted in the living practice of the people of Madīnah (ʿamal ahl al-Madīnah), authored al-Muwaṭṭaʾ — one of the earliest compiled works of ḥadīth and fiqh.",
    method:
      "Qurʾān → Sunnah → ʿamal ahl al-Madīnah → consensus → qiyās → istiḥsān → sadd al-dharāʾiʿ → ʿurf.",
  },
  {
    slug: "shafii",
    arabic: "الشافعي",
    name: "Shāfiʿī",
    founder: "Imām Muḥammad ibn Idrīs al-Shāfiʿī",
    founderArabic: "محمد بن إدريس الشافعي",
    lifespan: "150–204 AH / 767–820 CE",
    origin: "Studied under Mālik in Madīnah and Muḥammad al-Shaybānī in Iraq; matured in Egypt",
    regions:
      "Egypt, Yemen, East Africa, Kurdistan, southern India, Sri Lanka, Southeast Asia (Indonesia, Malaysia, Philippines)",
    summary:
      "The imām who founded the classical science of uṣūl al-fiqh through his Risālah, giving Islamic jurisprudence its formal methodological structure.",
    method:
      "Qurʾān → Sunnah → consensus → qiyās; rejected istiḥsān as a source; emphasized the authority of the ḥadīth of the Prophet ﷺ.",
  },
  {
    slug: "hanbali",
    arabic: "الحنبلي",
    name: "Ḥanbalī",
    founder: "Imām Aḥmad ibn Ḥanbal",
    founderArabic: "أحمد بن حنبل الشيباني",
    lifespan: "164–241 AH / 780–855 CE",
    origin: "Baghdād",
    regions: "Arabian Peninsula (Saudi Arabia, Qatar, UAE), parts of the Levant",
    summary:
      "The imām of Ahl al-Sunnah in the miḥnah (inquisition), compiler of the Musnad, known for adherence to narrated evidence and caution toward speculative reasoning.",
    method:
      "Qurʾān → Sunnah → fatwās of the Companions → weak ḥadīth in preference to pure qiyās → qiyās when necessary.",
  },
];

export const findMadhhab = (slug?: string) =>
  MADHAHIB.find((m) => m.slug === slug?.toLowerCase());
