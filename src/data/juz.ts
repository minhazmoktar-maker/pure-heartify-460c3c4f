export interface Juz {
  n: number;
  name_ar: string;
  translit: string; // opening words
  start: string; // "Surah 1, Ayah 1"
  end: string;
  startRef: { surah: number; ayah: number };
  endRef: { surah: number; ayah: number };
  summary: string;
}

export const JUZ: Juz[] = [
  { n: 1, name_ar: "الم", translit: "Alif Lām Mīm", start: "Al-Fātiḥah 1:1", end: "Al-Baqarah 2:141", startRef: { surah: 1, ayah: 1 }, endRef: { surah: 2, ayah: 141 }, summary: "Opens the Qurʾān with al-Fātiḥah and moves into the great sūrah of guidance, al-Baqarah — the categories of people, Ādam, and Banū Isrāʾīl." },
  { n: 2, name_ar: "سيقول", translit: "Sayaqūl", start: "Al-Baqarah 2:142", end: "Al-Baqarah 2:252", startRef: { surah: 2, ayah: 142 }, endRef: { surah: 2, ayah: 252 }, summary: "Change of the qiblah, laws of fasting, ḥajj, marriage and divorce, and Āyat al-Kursī." },
  { n: 3, name_ar: "تلك الرسل", translit: "Tilka al-Rusul", start: "Al-Baqarah 2:253", end: "Āl ʿImrān 3:92", startRef: { surah: 2, ayah: 253 }, endRef: { surah: 3, ayah: 92 }, summary: "Preference of the messengers, ribā prohibited, and the story of Maryam and ʿĪsā عليهما السلام." },
  { n: 4, name_ar: "لن تنالوا", translit: "Lan tanālū", start: "Āl ʿImrān 3:93", end: "Al-Nisāʾ 4:23", startRef: { surah: 3, ayah: 93 }, endRef: { surah: 4, ayah: 23 }, summary: "Lessons of Uḥud and rules of family — women's rights, inheritance, and forbidden marriages." },
  { n: 5, name_ar: "والمحصنات", translit: "Wa'l-muḥṣanāt", start: "Al-Nisāʾ 4:24", end: "Al-Nisāʾ 4:147", startRef: { surah: 4, ayah: 24 }, endRef: { surah: 4, ayah: 147 }, summary: "Justice, arbitration, obedience to Allah and His Messenger, and the reality of hypocrisy." },
  { n: 6, name_ar: "لا يحب الله", translit: "Lā yuḥibbu-Llāh", start: "Al-Nisāʾ 4:148", end: "Al-Māʾidah 5:81", startRef: { surah: 4, ayah: 148 }, endRef: { surah: 5, ayah: 81 }, summary: "Completion of the dīn (5:3), laws of food, oaths, and covenants with Ahl al-Kitāb." },
  { n: 7, name_ar: "وإذا سمعوا", translit: "Wa idhā samiʿū", start: "Al-Māʾidah 5:82", end: "Al-Anʿām 6:110", startRef: { surah: 5, ayah: 82 }, endRef: { surah: 6, ayah: 110 }, summary: "Tawḥīd affirmed powerfully in al-Anʿām — Ibrāhīm's argument against his people." },
  { n: 8, name_ar: "ولو أننا", translit: "Wa law annanā", start: "Al-Anʿām 6:111", end: "Al-Aʿrāf 7:87", startRef: { surah: 6, ayah: 111 }, endRef: { surah: 7, ayah: 87 }, summary: "The stories of the prophets — Nūḥ, Hūd, Ṣāliḥ, Lūṭ, and Shuʿayb عليهم السلام." },
  { n: 9, name_ar: "قال الملأ", translit: "Qāla al-malaʾ", start: "Al-Aʿrāf 7:88", end: "Al-Anfāl 8:40", startRef: { surah: 7, ayah: 88 }, endRef: { surah: 8, ayah: 40 }, summary: "Mūsā and Firʿawn, the taking of the covenant, and the Battle of Badr in Sūrat al-Anfāl." },
  { n: 10, name_ar: "واعلموا", translit: "Wa'ʿlamū", start: "Al-Anfāl 8:41", end: "Al-Tawbah 9:92", startRef: { surah: 8, ayah: 41 }, endRef: { surah: 9, ayah: 92 }, summary: "Rulings of jihād, the abrogation of pagan pacts, and the sincerity of belief." },
  { n: 11, name_ar: "يعتذرون", translit: "Yaʿtadhirūn", start: "Al-Tawbah 9:93", end: "Hūd 11:5", startRef: { surah: 9, ayah: 93 }, endRef: { surah: 11, ayah: 5 }, summary: "The three left behind at Tabūk, the last two verses of al-Tawbah, and the opening of Yūnus and Hūd." },
  { n: 12, name_ar: "وما من دابة", translit: "Wa mā min dābbah", start: "Hūd 11:6", end: "Yūsuf 12:52", startRef: { surah: 11, ayah: 6 }, endRef: { surah: 12, ayah: 52 }, summary: "Provisions are with Allah alone; the beautiful story of Yūsuf عليه السلام begins." },
  { n: 13, name_ar: "وما أبرئ", translit: "Wa mā ubarriʾu", start: "Yūsuf 12:53", end: "Ibrāhīm 14:52", startRef: { surah: 12, ayah: 53 }, endRef: { surah: 14, ayah: 52 }, summary: "Completion of Yūsuf, then al-Raʿd and Ibrāhīm — the parable of the good word as a good tree." },
  { n: 14, name_ar: "ربما", translit: "Rubamā", start: "Al-Ḥijr 15:1", end: "Al-Naḥl 16:128", startRef: { surah: 15, ayah: 1 }, endRef: { surah: 16, ayah: 128 }, summary: "Al-Ḥijr and al-Naḥl — countless signs of Allah in creation and abundant favours (niʿam)." },
  { n: 15, name_ar: "سبحان الذي", translit: "Subḥāna alladhī", start: "Al-Isrāʾ 17:1", end: "Al-Kahf 18:74", startRef: { surah: 17, ayah: 1 }, endRef: { surah: 18, ayah: 74 }, summary: "Al-Isrāʾ opens with the Night Journey; al-Kahf brings the Cave, Mūsā and al-Khiḍr." },
  { n: 16, name_ar: "قال ألم", translit: "Qāla alam", start: "Al-Kahf 18:75", end: "Ṭā-Hā 20:135", startRef: { surah: 18, ayah: 75 }, endRef: { surah: 20, ayah: 135 }, summary: "Dhū al-Qarnayn, Maryam, and Mūsā عليهم السلام before Firʿawn." },
  { n: 17, name_ar: "اقترب للناس", translit: "Iqtaraba li'l-nās", start: "Al-Anbiyāʾ 21:1", end: "Al-Ḥajj 22:78", startRef: { surah: 21, ayah: 1 }, endRef: { surah: 22, ayah: 78 }, summary: "The universal message of all the prophets and the call to Ḥajj." },
  { n: 18, name_ar: "قد أفلح", translit: "Qad aflaḥa", start: "Al-Muʾminūn 23:1", end: "Al-Furqān 25:20", startRef: { surah: 23, ayah: 1 }, endRef: { surah: 25, ayah: 20 }, summary: "The traits of the successful believers, the light verse (24:35), and the criterion." },
  { n: 19, name_ar: "وقال الذين", translit: "Wa qāla alladhīna", start: "Al-Furqān 25:21", end: "Al-Naml 27:55", startRef: { surah: 25, ayah: 21 }, endRef: { surah: 27, ayah: 55 }, summary: "The servants of al-Raḥmān (25:63–77), the poets, and Sulaymān with the hoopoe and Bilqīs." },
  { n: 20, name_ar: "أمن خلق", translit: "A-man khalaqa", start: "Al-Naml 27:56", end: "Al-ʿAnkabūt 29:45", startRef: { surah: 27, ayah: 56 }, endRef: { surah: 29, ayah: 45 }, summary: "The rhetorical challenges of al-Naml, then al-Qaṣaṣ (Mūsā's story in full) and trials of belief." },
  { n: 21, name_ar: "اتل ما أوحي", translit: "Utlu mā ūḥiya", start: "Al-ʿAnkabūt 29:46", end: "Al-Aḥzāb 33:30", startRef: { surah: 29, ayah: 46 }, endRef: { surah: 33, ayah: 30 }, summary: "Al-Rūm, Luqmān's advice to his son, al-Sajdah, and the Battle of the Trench." },
  { n: 22, name_ar: "ومن يقنت", translit: "Wa man yaqnut", start: "Al-Aḥzāb 33:31", end: "Yā-Sīn 36:27", startRef: { surah: 33, ayah: 31 }, endRef: { surah: 36, ayah: 27 }, summary: "The Mothers of the Believers, then Sabaʾ, Fāṭir, and the opening of Yā-Sīn." },
  { n: 23, name_ar: "وما لي", translit: "Wa mā liya", start: "Yā-Sīn 36:28", end: "Al-Zumar 39:31", startRef: { surah: 36, ayah: 28 }, endRef: { surah: 39, ayah: 31 }, summary: "Yā-Sīn's parables of the ranks and the trumpet, then al-Ṣāffāt, Ṣād, and al-Zumar." },
  { n: 24, name_ar: "فمن أظلم", translit: "Fa-man aẓlamu", start: "Al-Zumar 39:32", end: "Fuṣṣilat 41:46", startRef: { surah: 39, ayah: 32 }, endRef: { surah: 41, ayah: 46 }, summary: "The verse of hope (39:53), Ghāfir's supplication, and Fuṣṣilat's mercy of the Qurʾān." },
  { n: 25, name_ar: "إليه يرد", translit: "Ilayhi yuraddu", start: "Fuṣṣilat 41:47", end: "Al-Jāthiyah 45:37", startRef: { surah: 41, ayah: 47 }, endRef: { surah: 45, ayah: 37 }, summary: "Al-Shūrā (mutual consultation), al-Zukhruf, al-Dukhān (Laylat al-Qadr referenced), and al-Jāthiyah." },
  { n: 26, name_ar: "حم", translit: "Ḥā-Mīm", start: "Al-Aḥqāf 46:1", end: "Al-Dhāriyāt 51:30", startRef: { surah: 46, ayah: 1 }, endRef: { surah: 51, ayah: 30 }, summary: "Al-Aḥqāf, Muḥammad, al-Fatḥ (the clear conquest), al-Ḥujurāt (adab of the community), Qāf, and al-Dhāriyāt." },
  { n: 27, name_ar: "قال فما خطبكم", translit: "Qāla fa-mā khaṭbukum", start: "Al-Dhāriyāt 51:31", end: "Al-Ḥadīd 57:29", startRef: { surah: 51, ayah: 31 }, endRef: { surah: 57, ayah: 29 }, summary: "Al-Ṭūr, al-Najm, al-Qamar, al-Raḥmān (the sūrah of Divine favours), al-Wāqiʿah, and al-Ḥadīd." },
  { n: 28, name_ar: "قد سمع الله", translit: "Qad samiʿa-Llāh", start: "Al-Mujādilah 58:1", end: "Al-Taḥrīm 66:12", startRef: { surah: 58, ayah: 1 }, endRef: { surah: 66, ayah: 12 }, summary: "Nine Madanī sūrahs — al-Ḥashr, al-Mumtaḥanah, al-Ṣaff, al-Jumuʿah, al-Munāfiqūn, and al-Ṭalāq." },
  { n: 29, name_ar: "تبارك", translit: "Tabāraka", start: "Al-Mulk 67:1", end: "Al-Mursalāt 77:50", startRef: { surah: 67, ayah: 1 }, endRef: { surah: 77, ayah: 50 }, summary: "Al-Mulk (recited every night), al-Qalam, al-Ḥāqqah, al-Muzzammil, al-Muddaththir, and the Day of Judgement." },
  { n: 30, name_ar: "عم", translit: "ʿAmma (Juz Tabāraka)", start: "Al-Nabaʾ 78:1", end: "Al-Nās 114:6", startRef: { surah: 78, ayah: 1 }, endRef: { surah: 114, ayah: 6 }, summary: "The final juzʾ — 37 short sūrahs ending with al-Ikhlāṣ, al-Falaq, and al-Nās." },
];
