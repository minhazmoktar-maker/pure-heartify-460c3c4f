import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Adab = {
  id: string;
  title: string;
  category: "Speech" | "Eating" | "Sleeping" | "Travel" | "Gathering" | "Home" | "Masjid" | "Family";
  points: string[];
  source: string;
};

const ADAB: Adab[] = [
  { id: "salam", title: "Giving Salam", category: "Speech", points: ["Initiate: 'As-salamu alaykum wa rahmatullahi wa barakatuh'.", "The rider greets the walker, the walker the sitter, the smaller group the larger.", "Return with equal or better greeting (Qur'an 4:86)."], source: "Bukhari 6231; Qur'an 4:86" },
  { id: "eating", title: "Eating & Drinking", category: "Eating", points: ["Say 'Bismillah' before, 'Alhamdulillah' after.", "Eat with the right hand, from what is nearest.", "Never criticize food; if you like it eat, if not, leave it.", "Sit to drink; drink in three breaths."], source: "Bukhari 5376, 5409; Muslim 2024" },
  { id: "sleeping", title: "Sleeping", category: "Sleeping", points: ["Perform wudu before bed.", "Sleep on the right side, hand under cheek.", "Recite Ayat al-Kursi, last two of Baqarah, and the three Quls (blow in palms, wipe body).", "Wake with: 'Alhamdulillah alladhi ahyana ba'da ma amatana...'"], source: "Bukhari 247, 5017, 6320" },
  { id: "travel", title: "Travel", category: "Travel", points: ["Travel in a group of three or more.", "Appoint one as ameer (leader).", "Recite the du'a of travel when mounting.", "Return to family in daylight when possible."], source: "Abu Dawud 2608; Muslim 1342" },
  { id: "gathering", title: "Gatherings (Majlis)", category: "Gathering", points: ["Sit where a space opens; do not displace others.", "Do not whisper between two while a third is present.", "End with the kaffarat al-majlis: 'Subhanaka Allahumma wa bihamdika...'"], source: "Bukhari 6290; Tirmidhi 3433" },
  { id: "home-entry", title: "Entering the Home", category: "Home", points: ["Enter with the right foot.", "Say salam even if the house is empty (Qur'an 24:61).", "Recite: 'Bismillahi walajna, wa bismillahi kharajna, wa 'ala Rabbina tawakkalna'."], source: "Abu Dawud 5096" },
  { id: "seeking-permission", title: "Seeking Permission (Isti'dhan)", category: "Home", points: ["Knock or ring at most three times; leave if no answer.", "Stand to the side of the door, not facing it.", "State your name clearly when asked 'Who?'"], source: "Bukhari 6245; Muslim 2153" },
  { id: "masjid", title: "In the Masjid", category: "Masjid", points: ["Enter with right foot; recite: 'Allahumma iftah li abwaba rahmatik'.", "Pray two rak'ahs of tahiyyat al-masjid before sitting.", "Do not sell, announce lost items, or raise voices.", "Leave with the left foot: 'Allahumma inni as'aluka min fadlik'."], source: "Muslim 713; Nasa'i 729" },
  { id: "parents", title: "With Parents", category: "Family", points: ["Do not say 'uff' or raise voice (Qur'an 17:23).", "Lower the wing of humility out of mercy (Qur'an 17:24).", "Serve them, especially in old age; make du'a: 'Rabbi rham-huma kama rabbayani saghira'."], source: "Qur'an 17:23–24" },
  { id: "spouse", title: "With the Spouse", category: "Family", points: ["Speak with kindness and gentle jokes as the Prophet ﷺ did with Aisha.", "Announce return before entering the home at night.", "The best of you is the best to his family."], source: "Tirmidhi 3895; Bukhari 5243" },
  { id: "neighbor", title: "With Neighbors", category: "Home", points: ["Jibril kept enjoining care for the neighbor until the Prophet ﷺ thought they'd inherit.", "Do not fill your pot without sharing broth.", "The Muslim's neighbor is not safe from his harm — is not a believer."], source: "Bukhari 6014, 6018" },
  { id: "sneezing", title: "Sneezing & Yawning", category: "Speech", points: ["Sneezer says 'Alhamdulillah'; hearer replies 'Yarhamuk-Allah'; sneezer answers 'Yahdikumullah wa yuslih balakum'.", "Suppress yawning; it is from Shaytan."], source: "Bukhari 6224, 6223" },
  { id: "public-speech", title: "Speech in Public", category: "Speech", points: ["Speak good or remain silent.", "Avoid backbiting (ghibah), tale-carrying (namimah), and mockery.", "Do not swear by anything other than Allah."], source: "Bukhari 6018; Muslim 2589" },
  { id: "toilet", title: "Toilet Etiquette", category: "Home", points: ["Enter with the left foot: 'Allahumma inni a'udhu bika minal khubuthi wal khaba'ith'.", "Do not face or turn back to the qiblah.", "Use the left hand; do not speak inside.", "Leave with right foot: 'Ghufranak'."], source: "Bukhari 142; Abu Dawud 30" },
  { id: "clothing", title: "Clothing", category: "Home", points: ["Wear the right sleeve/shoe first; remove left first.", "Men: no silk or gold; garments above the ankles.", "Women: cover 'awrah, avoid fame-seeking (thawb ash-shuhrah)."], source: "Bukhari 5854; Abu Dawud 4029" },
  { id: "gift", title: "Giving Gifts", category: "Gathering", points: ["'Exchange gifts — you will love one another.'", "Do not disparage any gift, however small.", "Accept a gift if offered; refusal without reason is discouraged."], source: "Bukhari (Adab al-Mufrad) 594" },
];

const STORAGE_KEY = "adab.read";

const AdabPage = () => {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Adab["category"] | "All">("All");
  const [read, setRead] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const toggle = (id: string) => persist({ ...read, [id]: !read[id] });
  const reset = () => persist({});

  const cats: (Adab["category"] | "All")[] = ["All", "Speech", "Eating", "Sleeping", "Travel", "Gathering", "Home", "Masjid", "Family"];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ADAB.filter(a => {
      if (cat !== "All" && a.category !== cat) return false;
      if (!q) return true;
      return a.title.toLowerCase().includes(q) || a.points.some(p => p.toLowerCase().includes(q));
    });
  }, [query, cat]);

  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / ADAB.length) * 100);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Islamic Etiquette (Adab) — Heartify"
        description="Prophetic manners for daily life: speech, food, sleep, travel, home, masjid, and family."
        path="/adab"
      />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="h-7 w-7 text-primary" />
            <h1 className="text-title font-bold">Prophetic Manners (Adab)</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Islam is refined in the small moments. These are the everyday adab taught by the Prophet ﷺ.
          </p>
        </header>

        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm font-medium">Learned</span>
            <span className="text-sm text-muted-foreground">{readCount} / {ADAB.length}</span>
          </div>
          <Progress value={pct} />
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search adab…" className="pl-9" />
            </div>
            <Button variant="outline" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Reset
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {cats.map(c => (
              <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>
                {c}
              </Button>
            ))}
          </div>
        </Card>

        <div className="grid gap-4">
          {filtered.map(a => (
            <Card
              key={a.id}
              className={`p-5 cursor-pointer transition ${read[a.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`}
              onClick={() => toggle(a.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-heading font-semibold">{a.title}</h2>
                  <Badge variant="outline" className="mt-1">{a.category}</Badge>
                </div>
                {read[a.id] && <Badge className="shrink-0">Learned</Badge>}
              </div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                {a.points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
              <p className="mt-2 text-micro text-muted-foreground italic">Source: {a.source}</p>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">No adab match your filter.</Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdabPage;
