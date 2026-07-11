import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Sahabi = {
  id: string;
  name: string;
  arabic: string;
  title: string;
  role: string;
  summary: string;
  lesson: string;
};

const SAHABA: Sahabi[] = [
  { id: "abu-bakr", name: "Abu Bakr as-Siddiq", arabic: "أبو بكر الصديق", title: "The Truthful", role: "1st Caliph", summary: "Closest friend of the Prophet ﷺ, first adult male to embrace Islam, companion of the cave, and first caliph who preserved the ummah after the Prophet's death.", lesson: "Unshakable trust (siddiqiyyah) in Allah and His Messenger." },
  { id: "umar", name: "Umar ibn al-Khattab", arabic: "عمر بن الخطاب", title: "Al-Faruq (The Distinguisher)", role: "2nd Caliph", summary: "Feared enemy turned devoted servant. Expanded Islam across Persia, Levant, Egypt. Established the Hijri calendar, the diwan, and night patrols.", lesson: "Justice above self, even against one's own family." },
  { id: "uthman", name: "Uthman ibn Affan", arabic: "عثمان بن عفان", title: "Dhun-Nurayn (Two Lights)", role: "3rd Caliph", summary: "Wealthy merchant who funded the army of Tabuk and bought Bi'r Rumah for the ummah. Compiled the Qur'an into a single authoritative mushaf.", lesson: "Generosity and modesty as acts of worship." },
  { id: "ali", name: "Ali ibn Abi Talib", arabic: "علي بن أبي طالب", title: "Bab al-'Ilm (Gate of Knowledge)", role: "4th Caliph", summary: "Raised by the Prophet ﷺ, first youth to embrace Islam, hero of Badr, Uhud, and Khaybar. Renowned for wisdom, eloquence, and juristic depth.", lesson: "Courage paired with knowledge and humility." },
  { id: "khadija", name: "Khadijah bint Khuwaylid", arabic: "خديجة بنت خويلد", title: "Umm al-Mu'minin", role: "First Believer", summary: "First person to accept Islam. Comforted the Prophet ﷺ after the first revelation and spent her wealth entirely in the path of Allah.", lesson: "Steadfast support and belief when others doubt." },
  { id: "aisha", name: "Aisha bint Abi Bakr", arabic: "عائشة بنت أبي بكر", title: "As-Siddiqah", role: "Mother of the Believers", summary: "Narrated over 2,000 hadith. A leading jurist and teacher of the Sahaba after the Prophet's ﷺ passing.", lesson: "Sacred knowledge is a lifelong pursuit." },
  { id: "fatima", name: "Fatimah az-Zahra", arabic: "فاطمة الزهراء", title: "Sayyidah Nisa' al-Jannah", role: "Prophet's Daughter", summary: "Beloved daughter of the Prophet ﷺ, mother of Hasan and Husayn, model of patience, contentment, and household worship.", lesson: "Contentment with little is true richness." },
  { id: "bilal", name: "Bilal ibn Rabah", arabic: "بلال بن رباح", title: "The First Mu'adhin", role: "Freed slave", summary: "Enslaved and tortured for saying 'Ahad, Ahad' (One, One). Freed by Abu Bakr, chosen by the Prophet ﷺ to call the first adhan.", lesson: "Nobility is by taqwa, not lineage." },
  { id: "hamza", name: "Hamza ibn Abd al-Muttalib", arabic: "حمزة بن عبد المطلب", title: "Sayyid ash-Shuhada'", role: "Uncle of the Prophet ﷺ", summary: "Fierce protector of the Prophet ﷺ, hero of Badr, martyred at Uhud.", lesson: "Defend truth even at the cost of one's life." },
  { id: "khalid", name: "Khalid ibn al-Walid", arabic: "خالد بن الوليد", title: "Sayfullah (Sword of Allah)", role: "Commander", summary: "Undefeated general who led armies at Mu'tah, Yamamah, and against Byzantium and Persia. Never lost a battle.", lesson: "Victory belongs to Allah — the servant only strives." },
  { id: "abu-hurayrah", name: "Abu Hurayrah", arabic: "أبو هريرة", title: "The Prolific Narrator", role: "Companion", summary: "Accompanied the Prophet ﷺ intensely for the last years of his life. Narrated over 5,000 ahadith through sheer devotion to memorization.", lesson: "Constant company with the righteous transforms the heart." },
  { id: "ibn-abbas", name: "Abdullah ibn Abbas", arabic: "عبد الله بن عباس", title: "Turjuman al-Qur'an", role: "Scholar of Tafsir", summary: "Cousin of the Prophet ﷺ, for whom he made du'a for understanding of the Qur'an. Foundational figure in tafsir.", lesson: "Sincere du'a for knowledge opens divine doors." },
  { id: "ibn-masud", name: "Abdullah ibn Mas'ud", arabic: "عبد الله بن مسعود", title: "Master Reciter", role: "Companion & Jurist", summary: "One of the first to recite the Qur'an publicly in Makkah. Founded the Kufan school of qira'ah and fiqh.", lesson: "The Qur'an is honored by those who honor it." },
  { id: "muadh", name: "Mu'adh ibn Jabal", arabic: "معاذ بن جبل", title: "Most Knowledgeable of Halal & Haram", role: "Judge in Yemen", summary: "Sent by the Prophet ﷺ to teach and judge in Yemen. Praised as leader of scholars on the Day of Judgment.", lesson: "Judge and teach with independent reasoning grounded in revelation." },
  { id: "salman", name: "Salman al-Farsi", arabic: "سلمان الفارسي", title: "One of the Household", role: "Persian seeker", summary: "Journeyed across faiths and lands seeking the awaited Prophet. Suggested the trench strategy at Khandaq.", lesson: "The sincere seeker will always find guidance." },
  { id: "abu-dharr", name: "Abu Dharr al-Ghifari", arabic: "أبو ذر الغفاري", title: "The Truthful Ascetic", role: "Companion", summary: "Fifth to embrace Islam. Known for zuhd, outspokenness against wealth hoarding, and love for the poor.", lesson: "Speak the truth even when alone." },
  { id: "zayd", name: "Zayd ibn Harithah", arabic: "زيد بن حارثة", title: "The Beloved", role: "Freed son of the Prophet ﷺ", summary: "Only Sahabi named in the Qur'an. Freed and adopted, then chose the Prophet ﷺ over his own family. Martyred at Mu'tah.", lesson: "Love of the Prophet ﷺ outweighs blood ties." },
  { id: "usamah", name: "Usamah ibn Zayd", arabic: "أسامة بن زيد", title: "The Beloved Son of the Beloved", role: "Young Commander", summary: "Appointed commander over an army including senior Sahaba while still a teenager.", lesson: "Merit is by capability, not age." },
  { id: "sad", name: "Sa'd ibn Abi Waqqas", arabic: "سعد بن أبي وقاص", title: "First to Shoot an Arrow for Islam", role: "One of the Ten Promised Paradise", summary: "Conqueror of Persia at al-Qadisiyyah. Founder of Kufa. Known for accepted du'as.", lesson: "Strive with what you have; Allah grants the outcome." },
  { id: "zubayr", name: "Az-Zubayr ibn al-Awwam", arabic: "الزبير بن العوام", title: "Hawari of the Prophet ﷺ", role: "One of the Ten Promised Paradise", summary: "Cousin of the Prophet ﷺ. First to draw his sword in defense of Islam. Present at every major battle.", lesson: "Every prophet has a helper — be a helper of truth." },
];

const STORAGE_KEY = "sahaba.read";

const Sahaba = () => {
  const [query, setQuery] = useState("");
  const [read, setRead] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });

  const persist = (next: Record<string, boolean>) => {
    setRead(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const toggle = (id: string) => persist({ ...read, [id]: !read[id] });
  const reset = () => persist({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SAHABA;
    return SAHABA.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.arabic.includes(q) ||
      s.title.toLowerCase().includes(q) ||
      s.role.toLowerCase().includes(q) ||
      s.summary.toLowerCase().includes(q)
    );
  }, [query]);

  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / SAHABA.length) * 100);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Companions of the Prophet ﷺ — Heartify"
        description="Learn from the lives of 20 leading Sahaba: bios, roles, and enduring lessons."
        path="/sahaba"
        
      />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <Users className="h-7 w-7 text-primary" />
            <h1 className="text-3xl font-bold">Companions of the Prophet ﷺ</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            The Sahaba are the generation that saw the Prophet ﷺ, believed in him, and died upon Islam. Their lives are living tafsir of the Qur'an.
          </p>
        </header>

        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm font-medium">Read progress</span>
            <span className="text-sm text-muted-foreground">{readCount} / {SAHABA.length}</span>
          </div>
          <Progress value={pct} />
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by name, title, or role…"
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
        </Card>

        <div className="grid gap-4">
          {filtered.map(s => (
            <Card
              key={s.id}
              className={`p-5 cursor-pointer transition ${read[s.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`}
              onClick={() => toggle(s.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h2 className="text-xl font-semibold">{s.name}</h2>
                    <span className="text-xl font-arabic" dir="rtl">{s.arabic}</span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    <Badge variant="secondary">{s.title}</Badge>
                    <Badge variant="outline">{s.role}</Badge>
                  </div>
                </div>
                {read[s.id] && <Badge className="shrink-0">Read</Badge>}
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{s.summary}</p>
              <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">Lesson</div>
                <p className="text-sm">{s.lesson}</p>
              </div>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">No companions match your search.</Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sahaba;
