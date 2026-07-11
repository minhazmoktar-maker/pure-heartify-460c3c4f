import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, Library } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

type Term = {
  term: string;
  arabic?: string;
  category: "Aqeedah" | "Fiqh" | "Salah" | "Hajj" | "Zakat" | "Quran" | "Hadith" | "Tasawwuf" | "General";
  definition: string;
};

const TERMS: Term[] = [
  { term: "Tawheed", arabic: "توحيد", category: "Aqeedah", definition: "The absolute oneness of Allah in His lordship, worship, and names & attributes." },
  { term: "Shirk", arabic: "شرك", category: "Aqeedah", definition: "Associating partners with Allah — the one sin Allah does not forgive if a person dies upon it." },
  { term: "Iman", arabic: "إيمان", category: "Aqeedah", definition: "Faith: belief in Allah, His angels, books, messengers, the Last Day, and divine decree." },
  { term: "Kufr", arabic: "كفر", category: "Aqeedah", definition: "Disbelief; rejection or concealment of the truth of Islam." },
  { term: "Nifaq", arabic: "نفاق", category: "Aqeedah", definition: "Hypocrisy — showing Islam outwardly while hiding disbelief inwardly." },
  { term: "Bid'ah", arabic: "بدعة", category: "Aqeedah", definition: "An innovation in matters of religion with no basis in the Qur'an or Sunnah." },
  { term: "Fitrah", arabic: "فطرة", category: "Aqeedah", definition: "The natural disposition upon which Allah created every human — inclined to Tawheed." },

  { term: "Halal", arabic: "حلال", category: "Fiqh", definition: "Permissible under Islamic law." },
  { term: "Haram", arabic: "حرام", category: "Fiqh", definition: "Forbidden under Islamic law." },
  { term: "Makruh", arabic: "مكروه", category: "Fiqh", definition: "Disliked — not sinful to do, but rewardable to avoid." },
  { term: "Mustahabb", arabic: "مستحب", category: "Fiqh", definition: "Recommended — rewardable to do, not sinful to leave." },
  { term: "Mubah", arabic: "مباح", category: "Fiqh", definition: "Neutral / permissible with no reward or blame." },
  { term: "Fard", arabic: "فرض", category: "Fiqh", definition: "Obligatory duty; abandoning it is sinful." },
  { term: "Sunnah", arabic: "سنة", category: "Fiqh", definition: "The way of the Prophet ﷺ — his sayings, actions, and approvals." },
  { term: "Ijma'", arabic: "إجماع", category: "Fiqh", definition: "Consensus of qualified scholars on a legal ruling." },
  { term: "Qiyas", arabic: "قياس", category: "Fiqh", definition: "Analogical reasoning applied by scholars to derive new rulings." },
  { term: "Fatwa", arabic: "فتوى", category: "Fiqh", definition: "A non-binding legal opinion issued by a qualified scholar." },
  { term: "Riba", arabic: "ربا", category: "Fiqh", definition: "Usury / interest — strictly forbidden in Islam." },

  { term: "Wudu", arabic: "وضوء", category: "Salah", definition: "Ritual ablution required before prayer, using clean water." },
  { term: "Ghusl", arabic: "غسل", category: "Salah", definition: "Full ritual bath required after major impurity." },
  { term: "Tayammum", arabic: "تيمم", category: "Salah", definition: "Dry ablution using clean earth when water is unavailable or harmful." },
  { term: "Adhan", arabic: "أذان", category: "Salah", definition: "The audible call announcing the time of each obligatory prayer." },
  { term: "Iqamah", arabic: "إقامة", category: "Salah", definition: "The second call, said immediately before the congregation begins prayer." },
  { term: "Qiblah", arabic: "قبلة", category: "Salah", definition: "The direction of the Ka'bah in Makkah, which Muslims face in prayer." },
  { term: "Rak'ah", arabic: "ركعة", category: "Salah", definition: "One complete unit of Islamic prayer (standing, bowing, prostrating)." },
  { term: "Sujud", arabic: "سجود", category: "Salah", definition: "Prostration — placing forehead, nose, palms, knees, and toes on the ground." },
  { term: "Witr", arabic: "وتر", category: "Salah", definition: "The odd-numbered voluntary prayer performed after Isha and before Fajr." },
  { term: "Tahajjud", arabic: "تهجد", category: "Salah", definition: "Voluntary night prayer performed after sleeping." },

  { term: "Hajj", arabic: "حج", category: "Hajj", definition: "The annual pilgrimage to Makkah, obligatory once in a lifetime if able." },
  { term: "Umrah", arabic: "عمرة", category: "Hajj", definition: "The 'lesser pilgrimage' — can be performed at any time of year." },
  { term: "Ihram", arabic: "إحرام", category: "Hajj", definition: "The sacred state (and its two white garments) entered before Hajj / Umrah." },
  { term: "Tawaf", arabic: "طواف", category: "Hajj", definition: "Circumambulation of the Ka'bah seven times." },
  { term: "Sa'i", arabic: "سعي", category: "Hajj", definition: "Walking seven times between the hills of Safa and Marwah." },
  { term: "Arafah", arabic: "عرفة", category: "Hajj", definition: "The plain where pilgrims stand on the 9th of Dhul-Hijjah — the greatest day of Hajj." },

  { term: "Zakat", arabic: "زكاة", category: "Zakat", definition: "Obligatory annual purifying charity — usually 2.5% of qualifying wealth." },
  { term: "Nisab", arabic: "نصاب", category: "Zakat", definition: "The minimum wealth threshold at which Zakat becomes obligatory." },
  { term: "Sadaqah", arabic: "صدقة", category: "Zakat", definition: "Voluntary charity, any amount, at any time." },
  { term: "Fitrah (Zakat)", arabic: "زكاة الفطر", category: "Zakat", definition: "The small charity paid before Eid al-Fitr per household member." },

  { term: "Ayah", arabic: "آية", category: "Quran", definition: "A verse of the Qur'an; also means 'sign'." },
  { term: "Surah", arabic: "سورة", category: "Quran", definition: "A chapter of the Qur'an — 114 in total." },
  { term: "Juz'", arabic: "جزء", category: "Quran", definition: "One of 30 approximately equal divisions of the Qur'an." },
  { term: "Tafsir", arabic: "تفسير", category: "Quran", definition: "Exegesis — scholarly explanation of the meaning of the Qur'an." },
  { term: "Tajweed", arabic: "تجويد", category: "Quran", definition: "The science of correct pronunciation of the Qur'an." },
  { term: "Hifz", arabic: "حفظ", category: "Quran", definition: "Memorization of the Qur'an; one who completes it is a Hafiz." },

  { term: "Hadith", arabic: "حديث", category: "Hadith", definition: "A narration of the sayings, actions, or approvals of the Prophet ﷺ." },
  { term: "Sahih", arabic: "صحيح", category: "Hadith", definition: "A hadith graded as authentic by hadith scholars." },
  { term: "Hasan", arabic: "حسن", category: "Hadith", definition: "A 'good' hadith — sound but slightly below Sahih." },
  { term: "Da'if", arabic: "ضعيف", category: "Hadith", definition: "A weak hadith due to defects in its chain or content." },
  { term: "Mawdu'", arabic: "موضوع", category: "Hadith", definition: "A fabricated hadith — impermissible to attribute to the Prophet ﷺ." },
  { term: "Isnad", arabic: "إسناد", category: "Hadith", definition: "The chain of narrators through which a hadith is transmitted." },

  { term: "Ihsan", arabic: "إحسان", category: "Tasawwuf", definition: "Spiritual excellence — to worship Allah as though you see Him." },
  { term: "Taqwa", arabic: "تقوى", category: "Tasawwuf", definition: "God-consciousness — mindful reverence that guards one from sin." },
  { term: "Ikhlas", arabic: "إخلاص", category: "Tasawwuf", definition: "Sincerity — doing deeds purely for Allah's sake." },
  { term: "Tawakkul", arabic: "توكل", category: "Tasawwuf", definition: "Complete reliance on Allah after taking the means." },
  { term: "Sabr", arabic: "صبر", category: "Tasawwuf", definition: "Patient perseverance through trials, obedience, and abstaining from sin." },
  { term: "Shukr", arabic: "شكر", category: "Tasawwuf", definition: "Gratitude — recognising Allah's favours with heart, tongue, and limbs." },
  { term: "Tawbah", arabic: "توبة", category: "Tasawwuf", definition: "Sincere repentance: regret, ceasing, resolve, and (if applicable) restoring rights." },

  { term: "Ummah", arabic: "أمة", category: "General", definition: "The global community of Muslims." },
  { term: "Masjid", arabic: "مسجد", category: "General", definition: "A place of prostration — a mosque." },
  { term: "Sahabah", arabic: "صحابة", category: "General", definition: "The companions of the Prophet Muhammad ﷺ." },
  { term: "Insha'Allah", arabic: "إن شاء الله", category: "General", definition: "'If Allah wills' — said when speaking of the future." },
  { term: "Alhamdulillah", arabic: "الحمد لله", category: "General", definition: "'All praise is for Allah' — said in gratitude." },
  { term: "Bismillah", arabic: "بسم الله", category: "General", definition: "'In the name of Allah' — said before beginning any action." },
  { term: "Jazak Allah khayr", arabic: "جزاك الله خيراً", category: "General", definition: "'May Allah reward you with good' — a Muslim's thanks." },
];

const CATS = Array.from(new Set(TERMS.map((t) => t.category)));

export default function Glossary() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return TERMS.filter((t) => {
      if (cat !== "All" && t.category !== cat) return false;
      if (!s) return true;
      return (
        t.term.toLowerCase().includes(s) ||
        t.definition.toLowerCase().includes(s) ||
        (t.arabic ?? "").includes(s)
      );
    }).sort((a, b) => a.term.localeCompare(b.term));
  }, [q, cat]);

  return (
    <div className="min-h-dvh bg-background text-foreground pb-20">
      <SEO
        title="Islamic Terms Glossary | Heartify"
        description="Searchable dictionary of essential Islamic terms across Aqeedah, Fiqh, Salah, Hajj, Zakat, Qur'an, Hadith, and more."
        path="/glossary"
      />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <Library className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Islamic Glossary</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search terms (tawheed, wudu, riba…)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {["All", ...CATS].map((c) => (
            <Button
              key={c}
              size="sm"
              variant={cat === c ? "default" : "outline"}
              onClick={() => setCat(c)}
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="text-xs text-muted-foreground">
          {filtered.length} term{filtered.length === 1 ? "" : "s"}
        </div>

        {filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No terms match.</Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <Card key={t.term} className="p-4">
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold">{t.term}</h3>
                    <Badge variant="secondary" className="mt-1">{t.category}</Badge>
                  </div>
                  {t.arabic && (
                    <div className="text-xl" dir="rtl" lang="ar">{t.arabic}</div>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{t.definition}</p>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
