import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock, Flame, TrendingUp, X, Users, Sparkles, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CURATED_SECTIONS } from "@/data/curatedSections";
import { getRecentSearches, addRecentSearch, clearRecentSearches } from "@/lib/recentSearches";
import { getRecentTopics } from "@/lib/recentTopics";
import { useLocale } from "@/contexts/LocaleContext";

/**
 * Trending queries per *content* language. Search intent is language-bound —
 * a viewer in Dhaka wants "তাফসীর" long before "Islamic finance" — so the
 * suggestion set is picked from the viewer's primary content language and
 * then widened with a global set. Every entry is a query we know the halal
 * corpus can answer.
 */
const TRENDING_BY_LANGUAGE: Record<string, string[]> = {
  bn: [
    "কুরআন তিলাওয়াত",
    "তাফসীর",
    "মিজানুর রহমান আজহারী",
    "রামাদান আমল",
    "নামাজ শেখা",
    "ইসলামিক মোটিভেশন",
  ],
  ur: [
    "قرآن تلاوت",
    "تفسیر",
    "نماز کا طریقہ",
    "رمضان بیان",
    "سیرت النبی",
    "اسلامی معلومات",
  ],
  ar: ["تلاوة القرآن", "تفسير القرآن", "السيرة النبوية", "أذكار الصباح", "خطبة الجمعة", "فقه الصلاة"],
  id: ["ceramah singkat", "murottal Al-Quran", "kajian tafsir", "sirah nabi", "adab Islam", "doa harian"],
  ms: ["kuliah agama", "bacaan Al-Quran", "tafsir ringkas", "sirah Rasulullah", "doa pilihan"],
  tr: ["Kuran tilaveti", "tefsir dersi", "siyer", "namaz nasıl kılınır", "İslami sohbet"],
  fr: ["récitation du Coran", "tafsir en français", "sîra du Prophète", "rappel islamique", "fiqh de la prière"],
  es: ["recitación del Corán", "tafsir en español", "sira del Profeta", "recordatorio islámico"],
  en: [
    "Quran recitation",
    "Seerah of the Prophet",
    "Tafseer explained",
    "Ramadan reminders",
    "Islamic finance",
    "Halal productivity",
    "Learning Arabic",
    "Prayer step by step",
  ],
};

/** Queries that travel across every market — the international backbone. */
const GLOBAL_TRENDING = [
  "Quran recitation",
  "Mufti Menk",
  "Nouman Ali Khan",
  "Omar Suleiman",
  "Islamic history",
  "Dawah",
];

/**
 * "People who searched X also search Y" — a hand-built follow-up graph so a
 * search never dead-ends. Keys are matched case-insensitively as substrings.
 */
const FOLLOW_UPS: Record<string, string[]> = {
  quran: ["Tafseer explained", "Tajweed basics", "Memorising Juz 30", "Beautiful recitation"],
  tafsir: ["Surah Kahf tafseer", "Surah Yaseen tafseer", "Tafseer for beginners"],
  tafseer: ["Surah Kahf tafseer", "Surah Yaseen tafseer", "Tafseer for beginners"],
  seerah: ["Battle of Badr", "Life in Madinah", "Companions of the Prophet"],
  ramadan: ["Taraweeh recitation", "Laylatul Qadr", "Fasting rulings", "Suhoor routine"],
  hadith: ["Sahih Bukhari explained", "40 Hadith Nawawi", "Hadith sciences"],
  finance: ["Halal investing", "Riba explained", "Zakat calculation"],
  productivity: ["Fajr routine", "Digital detox Islam", "Study with Quran"],
  arabic: ["Arabic alphabet", "Quranic Arabic grammar", "Arabic for beginners"],
  prayer: ["Wudu step by step", "Sunnah prayers", "Khushu in salah"],
  dua: ["Morning adhkar", "Evening adhkar", "Dua for anxiety"],
  parenting: ["Raising Muslim kids", "Tarbiyah tips", "Family halaqah"],
  history: ["Ottoman history", "Andalusia", "Muslim scientists"],
};

function followUpsFor(queries: string[]): string[] {
  const out: string[] = [];
  for (const q of queries) {
    const lower = q.toLowerCase();
    for (const [key, values] of Object.entries(FOLLOW_UPS)) {
      if (lower.includes(key)) out.push(...values);
    }
  }
  return Array.from(new Set(out)).slice(0, 8);
}

interface Creator {
  channel_title: string;
  count: number;
}

export default function SearchSuggestions({ onPick }: { onPick?: (q: string) => void }) {
  const navigate = useNavigate();
  const { preferences } = useLocale();
  const [recent, setRecent] = useState<string[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);

  useEffect(() => {
    setRecent(getRecentSearches());
    setTopics(getRecentTopics());
  }, []);

  const trending = useMemo(() => {
    const primary = (preferences.content_languages?.[0] ?? "en").toLowerCase();
    const secondary = (preferences.content_languages?.[1] ?? "en").toLowerCase();
    const local = TRENDING_BY_LANGUAGE[primary] ?? [];
    const near = primary === secondary ? [] : TRENDING_BY_LANGUAGE[secondary] ?? [];
    return Array.from(new Set([...local, ...near.slice(0, 3), ...GLOBAL_TRENDING])).slice(0, 12);
  }, [preferences.content_languages]);

  const nextSteps = useMemo(
    () => followUpsFor([...recent, ...topics]).filter((q) => !recent.includes(q)),
    [recent, topics],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("curated_videos")
        .select("channel_title")
        .eq("is_trusted_channel", true)
        .limit(400);
      if (cancelled || !data) return;
      const counts = new Map<string, number>();
      for (const row of data) {
        const name = (row as { channel_title: string | null }).channel_title;
        if (!name) continue;
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
      const top = Array.from(counts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12)
        .map(([channel_title, count]) => ({ channel_title, count }));
      setCreators(top);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const go = (q: string) => {
    addRecentSearch(q);
    if (onPick) onPick(q);
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const chip =
    "rounded-pill border border-border bg-card px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-accent min-h-11 inline-flex items-center";

  return (
    <div className="space-y-8">
      {recent.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Clock className="h-4 w-4 text-muted-foreground" /> Recent
            </h2>
            <button
              onClick={() => {
                clearRecentSearches();
                setRecent([]);
              }}
              className="text-micro text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((q) => (
              <button key={q} onClick={() => go(q)} className={`${chip} gap-1.5`}>
                {q}
                <X
                  className="h-3 w-3 text-muted-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    const next = recent.filter((r) => r !== q);
                    setRecent(next);
                    try {
                      localStorage.setItem("heartify-recent-searches", JSON.stringify(next));
                    } catch {
                      /* noop */
                    }
                  }}
                />
              </button>
            ))}
          </div>
        </section>
      )}

      {nextSteps.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-primary" /> Go deeper
          </h2>
          <div className="flex flex-wrap gap-2">
            {nextSteps.map((q) => (
              <button key={q} onClick={() => go(q)} className={chip}>
                {q}
              </button>
            ))}
          </div>
        </section>
      )}

      {topics.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Compass className="h-4 w-4 text-muted-foreground" /> Continue exploring
          </h2>
          <div className="flex flex-wrap gap-2">
            {topics.map((t) => (
              <button key={t} onClick={() => go(t)} className={chip}>
                {t}
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Flame className="h-4 w-4 text-[hsl(var(--gold))]" /> Trending
        </h2>
        <div className="flex flex-wrap gap-2">
          {trending.map((q) => (
            <button key={q} onClick={() => go(q)} className={chip}>
              {q}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <TrendingUp className="h-4 w-4 text-primary" /> Browse by topic
        </h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CURATED_SECTIONS.slice(0, 12).map((s) => (
            <button
              key={s.id}
              onClick={() => navigate(`/section/${s.id}`)}
              className="flex min-h-11 items-center gap-2 rounded-card border border-border bg-card px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-accent"
            >
              <span className="text-heading">{s.icon}</span>
              <span className="line-clamp-1 font-medium">{s.title}</span>
            </button>
          ))}
        </div>
      </section>

      {creators.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
            <Users className="h-4 w-4 text-primary" /> Popular trusted creators
          </h2>
          <div className="flex flex-wrap gap-2">
            {creators.map((c) => (
              <button key={c.channel_title} onClick={() => go(c.channel_title)} className={chip}>
                {c.channel_title}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
