// Daily Sunnahs of the Prophet ﷺ — small acts anyone can revive.
export type SunnahAct = {
  slug: string;
  title: string;
  ar: string;
  reward: string;
  how: string;
  ref: string;
  category: "Wuḍūʾ" | "Ṣalāh" | "Food" | "Sleep" | "Speech" | "Home" | "Body" | "Travel" | "Masjid";
};

export const SUNNAH_ACTS: SunnahAct[] = [
  { slug: "miswak", title: "Use the Miswāk", ar: "السِّوَاك", reward: "Cleanser for the mouth and pleasing to the Lord.", how: "Before every prayer, upon entering the home, and when waking.", ref: "Bukhārī 887", category: "Body" },
  { slug: "right-side-sleep", title: "Sleep on the right side", ar: "النَّوْم عَلَى الْجَنْبِ الْأَيْمَن", reward: "Sunnah posture; the Prophet ﷺ preferred it and placed his right hand under his cheek.", how: "Lie on the right side, right palm beneath the right cheek, facing the qiblah.", ref: "Bukhārī 6314", category: "Sleep" },
  { slug: "bismillah-food", title: "Say Bismillāh before eating", ar: "بِسْمِ اللَّه", reward: "Prevents Shayṭān from partaking in your meal.", how: "Say 'Bismillāh' at the start; if forgotten, say 'Bismillāhi awwalahu wa ākhirah'.", ref: "Abū Dāwūd 3767", category: "Food" },
  { slug: "eat-with-right", title: "Eat and drink with the right hand", ar: "الْأَكْل بِالْيَمِين", reward: "Opposes Shayṭān, who eats and drinks with the left.", how: "Use the right hand for food, drink, giving and taking.", ref: "Muslim 2020", category: "Food" },
  { slug: "three-sips", title: "Drink water in three sips", ar: "الشُّرْب ثَلَاثًا", reward: "More wholesome, satisfying and healthier.", how: "Sit, say Bismillāh, drink in three separate breaths, end with al-ḥamdu lillāh.", ref: "Muslim 2028", category: "Food" },
  { slug: "enter-masjid-right", title: "Enter the masjid with the right foot", ar: "دُخُول الْمَسْجِد بِالْيُمْنَى", reward: "Following the prophetic order for honoured places.", how: "Right foot first entering, left foot first leaving; say the entry duʿāʾ.", ref: "Abū Dāwūd 465", category: "Masjid" },
  { slug: "two-rakah-masjid", title: "Two rakʿahs upon entering the masjid", ar: "تَحِيَّة الْمَسْجِد", reward: "Greeting of the masjid — do not sit until you pray them.", how: "Before sitting, pray two light rakʿahs (except in the forbidden times).", ref: "Bukhārī 1163", category: "Masjid" },
  { slug: "witr", title: "Pray Witr before sleeping", ar: "صَلَاة الْوِتْر", reward: "The Prophet ﷺ advised it as a lifelong habit.", how: "1, 3, 5, 7 or 9 rakʿahs — minimum one — before Fajr time enters.", ref: "Bukhārī 998", category: "Ṣalāh" },
  { slug: "duha", title: "Pray Ḍuḥā (Forenoon prayer)", ar: "صَلَاة الضُّحَى", reward: "Suffices as charity for every joint in the body.", how: "2 to 8 rakʿahs after sunrise has fully risen (≈15 min after) until before Ẓuhr.", ref: "Muslim 720", category: "Ṣalāh" },
  { slug: "salawat-friday", title: "Send abundant Ṣalawāt on Friday", ar: "الصَّلَاة عَلَى النَّبِيّ يَوْم الْجُمُعَة", reward: "Your Ṣalawāt is presented to the Prophet ﷺ.", how: "Repeat 'Allāhumma ṣalli ʿalā Muḥammad wa ʿalā āli Muḥammad' throughout Friday.", ref: "Abū Dāwūd 1047", category: "Speech" },
  { slug: "smile", title: "Smile at your brother", ar: "التَّبَسُّم فِي وَجْه أَخِيك", reward: "It is a ṣadaqah — an act of charity.", how: "Meet Muslims with a cheerful, open face.", ref: "Tirmidhī 1956", category: "Speech" },
  { slug: "salam-first", title: "Spread the salām", ar: "إِفْشَاء السَّلَام", reward: "You will not enter Paradise until you believe, and you will not believe until you love one another — spread salām.", how: "Give salām to those you know and those you don't; the one walking greets the one sitting.", ref: "Muslim 54", category: "Speech" },
  { slug: "wudu-before-sleep", title: "Perform Wuḍūʾ before sleeping", ar: "الْوُضُوء عِنْد النَّوْم", reward: "An angel is appointed to your bed — every time you turn, he asks Allah to forgive you.", how: "Make wuḍūʾ, lie on the right side, recite the sleep adhkār.", ref: "Ibn Ḥibbān 5533", category: "Sleep" },
  { slug: "dust-bed", title: "Dust the bed three times", ar: "نَفْض الْفِرَاش", reward: "You do not know what settled on it in your absence.", how: "Take the inside of your lower garment or a cloth and dust it three times before lying down.", ref: "Bukhārī 6320", category: "Sleep" },
  { slug: "sneeze-hamd", title: "Say al-ḥamdu lillāh after sneezing", ar: "حَمْد اللَّه عِنْد الْعُطَاس", reward: "The one hearing replies 'yarḥamuk-Allāh', and you reply 'yahdīkumu-llāhu wa yuṣliḥu bālakum'.", how: "Cover your mouth, lower your voice, then say 'al-ḥamdu lillāh'.", ref: "Bukhārī 6224", category: "Speech" },
  { slug: "yawn-suppress", title: "Suppress the yawn", ar: "كَظْم التَّثَاؤُب", reward: "Yawning is from Shayṭān — restrain it as much as you can.", how: "If it overcomes you, place your hand over your mouth.", ref: "Bukhārī 3289", category: "Body" },
  { slug: "enter-home-salam", title: "Give salām when entering the home", ar: "السَّلَام عِنْد دُخُول الْبَيْت", reward: "Blessing for you and your household.", how: "Say 'as-salāmu ʿalaykum' aloud even if no one is home (upon yourself).", ref: "Nasāʾī 10190", category: "Home" },
  { slug: "night-adhkar", title: "Recite the two verses of Sūrat al-Baqarah at night", ar: "آخِر آيَتَيْنِ مِنْ سُورَة الْبَقَرَة", reward: "Whoever recites them in a night, they suffice him.", how: "Recite 'Āmana-r-rasūlu…' to the end of Sūrat al-Baqarah before sleeping.", ref: "Bukhārī 4008", category: "Sleep" },
  { slug: "kahf-friday", title: "Read Sūrat al-Kahf on Friday", ar: "قِرَاءَة سُورَة الْكَهْف يَوْم الْجُمُعَة", reward: "Light between the two Fridays.", how: "Read on Thursday night or any time on Friday before Maghrib.", ref: "Ḥākim 3392 — Ṣaḥīḥ", category: "Speech" },
  { slug: "travel-dua", title: "The traveller's duʿāʾ upon mounting", ar: "دُعَاء السَّفَر", reward: "Preserves the traveller and his family until he returns.", how: "Say 'SubḥānAlladhī sakhkhara lanā hādhā…' then the full duʿāʾ of Ibn ʿUmar.", ref: "Muslim 1342", category: "Travel" },
];
