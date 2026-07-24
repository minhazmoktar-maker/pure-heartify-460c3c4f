import type { HalalCategory } from "@/services/youtube";

/**
 * R4 — Programmatic-SEO topic catalog powering /halal/:slug landings and
 * the /halal hub. Keep entries in sync with the categories exposed by
 * `useYouTubeVideos` so each landing renders a populated shelf.
 */
export interface HalalTopic {
  title: string;
  kicker: string;
  description: string;
  category: HalalCategory;
  reason: string;
}

export const HALAL_TOPICS: Record<string, HalalTopic> = {
  quran: {
    title: "Halal Qur'an Videos — Tafsir, Recitation & Reflection",
    kicker: "Qur'an",
    description:
      "Reviewed Qur'an tafsir, recitation, and reflection videos from trusted scholars — curated by Heartify Editors.",
    category: "Quran",
    reason: "Hand-picked tafsir and recitation series that respect the sciences of the Qur'an.",
  },
  seerah: {
    title: "Halal Seerah Videos — Life of the Prophet ﷺ",
    kicker: "Lectures",
    description:
      "Reviewed Seerah lectures and series about the life of the Prophet Muhammad ﷺ from trusted teachers.",
    category: "Lectures",
    reason: "A curated Seerah shelf covering childhood, Makkah, Madinah and the final sermon.",
  },
  parenting: {
    title: "Halal Islamic Parenting Videos",
    kicker: "Islamic",
    description:
      "Reviewed Islamic parenting videos from trusted educators — tarbiyah, discipline, du'a and household rhythm.",
    category: "Islamic",
    reason: "Practical parenting talks vetted for tone, sources, and tarbiyah quality.",
  },
  learning: {
    title: "Halal Islamic Learning — Fiqh, Aqeedah & Adab",
    kicker: "Education",
    description:
      "Reviewed Islamic learning videos on fiqh, aqeedah, hadith and adab from trusted scholars.",
    category: "Education",
    reason: "Structured learning content across the classical Islamic sciences.",
  },
  history: {
    title: "Halal Islamic History Videos",
    kicker: "Education",
    description:
      "Reviewed Islamic history videos — companions, dynasties, and civilizations — from trusted historians.",
    category: "Education",
    reason: "Rigorous history content that avoids sensationalism and cites its sources.",
  },
  motivation: {
    title: "Halal Islamic Motivation & Reminders",
    kicker: "Self-Improvement",
    description:
      "Reviewed Islamic reminders and short motivational lectures curated by Heartify Editors.",
    category: "Self-Improvement",
    reason: "Short, high-quality reminders that leave you closer to Allah, not more anxious.",
  },
  kids: {
    title: "Halal Islamic Videos for Kids",
    kicker: "Kids",
    description:
      "Reviewed kid-safe Islamic cartoons, stories of the Prophets, and learning videos vetted for the whole family.",
    category: "Islamic",
    reason: "Every video is safe for children — no music, no mixed content, no engagement bait.",
  },
  duas: {
    title: "Halal Du'a Videos — Sunnah Supplications",
    kicker: "Du'a",
    description:
      "Reviewed du'a videos covering morning and evening adhkar, prophetic supplications, and hisnul muslim.",
    category: "Islamic",
    reason: "Authentic prophetic du'a with clear sourcing — recorded and reviewed for accuracy.",
  },
  ramadan: {
    title: "Halal Ramadan Videos — Fasting, Qiyam & Tafsir",
    kicker: "Ramadan",
    description:
      "Reviewed Ramadan lectures, tafsir series, and reminders to accompany the blessed month.",
    category: "Lectures",
    reason: "A Ramadan shelf tuned for consistent daily benefit across the whole month.",
  },
  hajj: {
    title: "Halal Hajj & Umrah Videos",
    kicker: "Hajj",
    description:
      "Reviewed Hajj and Umrah walkthroughs, fiqh of pilgrimage, and reflections from the two sacred mosques.",
    category: "Lectures",
    reason: "Step-by-step Hajj and Umrah content vetted by teachers and pilgrims.",
  },
  productivity: {
    title: "Halal Productivity & Time Management",
    kicker: "Self-Improvement",
    description:
      "Reviewed videos on Islamic productivity, waqt, focus, and building beneficial habits.",
    category: "Self-Improvement",
    reason: "Productivity content rooted in barakah, not hustle — sourced from trusted teachers.",
  },
  finance: {
    title: "Halal Personal Finance & Zakat Videos",
    kicker: "Finance",
    description:
      "Reviewed videos on halal finance, zakat calculation, riba-free investing and household budgeting.",
    category: "Education",
    reason: "Practical halal finance content vetted for fiqh accuracy and applicability.",
  },
  marriage: {
    title: "Halal Marriage & Family Videos",
    kicker: "Family",
    description:
      "Reviewed videos on Islamic marriage, spouse rights, communication and building a Prophetic household.",
    category: "Islamic",
    reason: "Marriage content grounded in the Qur'an and Sunnah, free of tabloid drama.",
  },
  reverts: {
    title: "Halal Videos for Reverts to Islam",
    kicker: "New Muslims",
    description:
      "Reviewed videos for new Muslims — shahadah, prayer basics, ghusl, and the first months of practice.",
    category: "Education",
    reason: "Gentle, accurate onboarding content curated for reverts and new Muslims.",
  },
  hadith: {
    title: "Halal Hadith Videos — Sunnah Explained",
    kicker: "Hadith",
    description:
      "Reviewed hadith commentary and explanation series from Bukhari, Muslim, and the classical collections.",
    category: "Education",
    reason: "Hadith content taught by teachers with recognised chains and clear sourcing.",
  },
  arabic: {
    title: "Halal Arabic Language Videos",
    kicker: "Language",
    description:
      "Reviewed Arabic language and Qur'anic Arabic learning videos for beginners and intermediates.",
    category: "Education",
    reason: "Arabic content that pairs classical grammar with real Qur'anic examples.",
  },
};

export function halalTopicList(): Array<HalalTopic & { slug: string }> {
  return Object.entries(HALAL_TOPICS).map(([slug, t]) => ({ slug, ...t }));
}
