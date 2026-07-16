import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Search, BookOpen, Check, RotateCcw } from "lucide-react";

type Hadith = {
  n: number;
  narrator: string;
  english: string;
  theme: string;
};

// Concise summaries of the classical 40 Hadith of Imam an-Nawawi (rahimahullah).
const HADITHS: Hadith[] = [
  { n: 1, narrator: "Umar ibn al-Khattab", theme: "Intentions", english: "Actions are but by intentions, and every person will have only what they intended. Whoever migrated for Allah and His Messenger, his migration is for Allah and His Messenger." },
  { n: 2, narrator: "Umar ibn al-Khattab", theme: "Iman & Ihsan", english: "Jibril came and asked about Islam, Iman, and Ihsan — Islam is the five pillars; Iman is belief in Allah, His angels, books, messengers, the Last Day, and divine decree; Ihsan is to worship Allah as though you see Him." },
  { n: 3, narrator: "Ibn Umar", theme: "Pillars", english: "Islam is built on five: testifying that none has the right to be worshipped but Allah and Muhammad is His Messenger, establishing prayer, giving zakat, Hajj, and fasting Ramadan." },
  { n: 4, narrator: "Ibn Mas'ud", theme: "Decree", english: "Each of you is formed in the womb 40 days as a drop, then a clot, then a lump; then an angel writes his provision, lifespan, deeds, and whether wretched or blessed." },
  { n: 5, narrator: "'A'ishah", theme: "Innovation", english: "Whoever introduces into this affair of ours what is not from it, it is rejected." },
  { n: 6, narrator: "an-Nu'man ibn Bashir", theme: "Halal & Haram", english: "The halal is clear and the haram is clear; between them are doubtful matters. Whoever avoids the doubtful preserves his religion and honour." },
  { n: 7, narrator: "Tamim ad-Dari", theme: "Sincere counsel", english: "The religion is naseeha (sincere advice) — to Allah, His Book, His Messenger, the leaders of the Muslims, and their common folk." },
  { n: 8, narrator: "Ibn Umar", theme: "Sanctity", english: "I have been ordered to fight the people until they testify to the shahadah, establish prayer, and pay zakat; if they do, their blood and property are protected except by the right of Islam." },
  { n: 9, narrator: "Abu Hurayrah", theme: "Capacity", english: "What I have forbidden you, avoid; what I have ordered you, do as much of it as you can. Those before you were destroyed by excessive questioning and disagreement with their prophets." },
  { n: 10, narrator: "Abu Hurayrah", theme: "Purity of provision", english: "Allah is Pure and accepts only what is pure. He has commanded the believers as He commanded the messengers: eat of the good things and act righteously." },
  { n: 11, narrator: "al-Hasan ibn 'Ali", theme: "Scruples", english: "Leave that which makes you doubt for that which does not make you doubt." },
  { n: 12, narrator: "Abu Hurayrah", theme: "Excellence", english: "Part of the perfection of a person's Islam is leaving that which does not concern him." },
  { n: 13, narrator: "Anas ibn Malik", theme: "Brotherhood", english: "None of you truly believes until he loves for his brother what he loves for himself." },
  { n: 14, narrator: "Ibn Mas'ud", theme: "Sanctity of life", english: "The blood of a Muslim is not lawful except in three cases: the adulterer who has been married, a life for a life, and one who abandons his religion and separates from the community." },
  { n: 15, narrator: "Abu Hurayrah", theme: "Manners", english: "Whoever believes in Allah and the Last Day: let him speak good or be silent; let him honour his neighbour; let him honour his guest." },
  { n: 16, narrator: "Abu Hurayrah", theme: "Anger", english: "Do not become angry — and the Prophet ﷺ repeated it several times." },
  { n: 17, narrator: "Shaddad ibn Aws", theme: "Ihsan", english: "Allah has prescribed excellence (ihsan) in everything. If you kill, kill well; if you slaughter, slaughter well — sharpen the blade and spare the animal suffering." },
  { n: 18, narrator: "Abu Dharr & Mu'adh", theme: "Taqwa", english: "Fear Allah wherever you are; follow a bad deed with a good deed to erase it; and treat people with good character." },
  { n: 19, narrator: "Ibn 'Abbas", theme: "Reliance", english: "Guard the limits of Allah and He will guard you. When you ask, ask of Allah; when you seek help, seek help from Allah. The pen has been lifted and the pages dried." },
  { n: 20, narrator: "Abu Mas'ud", theme: "Modesty", english: "Among the sayings of the earlier prophets that reached the people is: 'If you feel no shame, do as you wish.'" },
  { n: 21, narrator: "Sufyan ibn 'Abdullah", theme: "Steadfastness", english: "Say: 'I believe in Allah,' then be steadfast." },
  { n: 22, narrator: "Jabir", theme: "Path to paradise", english: "A man asked: 'If I pray the obligatory prayers, fast Ramadan, treat as halal what is halal and as haram what is haram, and add nothing more — shall I enter Paradise?' The Prophet ﷺ said: 'Yes.'" },
  { n: 23, narrator: "Abu Malik al-Ash'ari", theme: "Worship", english: "Purity is half of iman; alhamdulillah fills the scales; subhanallah and alhamdulillah fill what is between the heavens and earth; prayer is light; charity is proof; patience is illumination; and the Qur'an is a proof for or against you." },
  { n: 24, narrator: "Abu Dharr (Qudsi)", theme: "Divine mercy", english: "Allah says: 'O My servants, I have forbidden oppression upon Myself and made it forbidden among you, so do not oppress one another... O My servants, it is only your deeds I record for you, then recompense you for them.'" },
  { n: 25, narrator: "Abu Dharr", theme: "Charity", english: "Every tasbih is charity, every takbir is charity, every tahmid is charity, every tahlil is charity; enjoining good is charity, forbidding evil is charity; even intimacy with your spouse is charity." },
  { n: 26, narrator: "Abu Hurayrah", theme: "Reconciliation", english: "Every joint of a person owes charity every day: reconcile justly between two, help a man onto his mount, a good word is charity, every step to prayer is charity, and removing harm from the road is charity." },
  { n: 27, narrator: "an-Nawwas & Wabisah", theme: "Righteousness", english: "Righteousness is good character; sin is what wavers in your soul and you dislike people finding out about." },
  { n: 28, narrator: "al-'Irbad ibn Sariyah", theme: "Sunnah", english: "Hold fast to my Sunnah and the sunnah of the Rightly-Guided Caliphs after me; cling to it with your molar teeth. Beware of newly-invented matters." },
  { n: 29, narrator: "Mu'adh ibn Jabal", theme: "Paradise", english: "The head of the matter is Islam, its pillar is prayer, and its peak is jihad — restrain this (the tongue), for people are thrown on their faces into the Fire only because of the harvests of their tongues." },
  { n: 30, narrator: "Abu Tha'labah", theme: "Limits", english: "Allah has laid down obligations, do not neglect them; set limits, do not transgress them; forbidden things, do not violate them; and remained silent on things as mercy — do not question them." },
  { n: 31, narrator: "Sahl ibn Sa'd", theme: "Zuhd", english: "Detach from this world and Allah will love you; detach from what people have and people will love you." },
  { n: 32, narrator: "Ibn 'Abbas & others", theme: "No harm", english: "There should be neither harming nor reciprocating harm." },
  { n: 33, narrator: "Ibn 'Abbas", theme: "Evidence", english: "The burden of proof is on the claimant, and the oath is on the one who denies." },
  { n: 34, narrator: "Abu Sa'id al-Khudri", theme: "Changing evil", english: "Whoever sees an evil, let him change it with his hand; if unable, then with his tongue; if unable, then with his heart — and that is the weakest of iman." },
  { n: 35, narrator: "Abu Hurayrah", theme: "Brotherhood", english: "Do not envy one another, do not inflate prices, do not hate one another, do not turn away from one another; be, O servants of Allah, brothers." },
  { n: 36, narrator: "Abu Hurayrah", theme: "Relief", english: "Whoever relieves a believer's distress in this world, Allah will relieve his distress on the Day of Judgement; whoever eases a hardship, Allah will ease his hardship; Allah is in the aid of His servant so long as the servant is in the aid of his brother." },
  { n: 37, narrator: "Ibn 'Abbas (Qudsi)", theme: "Divine mercy", english: "Allah has written good and evil deeds; whoever intends a good deed and does not do it, Allah records it as complete; whoever intends and does it, Allah records ten to seven hundred times over." },
  { n: 38, narrator: "Abu Hurayrah (Qudsi)", theme: "Nearness", english: "Allah says: 'Whoever shows enmity to a friend of Mine, I declare war upon him. My servant draws near to Me by nothing more beloved than what I have made obligatory upon him; and he continues to draw near by the nawafil until I love him.'" },
  { n: 39, narrator: "Ibn 'Abbas", theme: "Concessions", english: "Allah has pardoned for my ummah mistakes, forgetfulness, and what they are forced to do." },
  { n: 40, narrator: "Ibn 'Umar", theme: "This world", english: "Be in this world as if you were a stranger or a wayfarer. When evening comes, do not expect the morning; when morning comes, do not expect the evening. Take from your health before your sickness and from your life before your death." },
];

const STORAGE_KEY = "heartify-nawawi-progress";

const Nawawi40 = () => {
  const [query, setQuery] = useState("");
  const [read, setRead] = useState<Record<number, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });

  const persist = (next: Record<number, boolean>) => {
    setRead(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* noop */ }
  };

  const toggle = (n: number) => persist({ ...read, [n]: !read[n] });
  const reset = () => persist({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return HADITHS;
    return HADITHS.filter(
      (h) =>
        h.english.toLowerCase().includes(q) ||
        h.theme.toLowerCase().includes(q) ||
        h.narrator.toLowerCase().includes(q) ||
        String(h.n).includes(q),
    );
  }, [query]);

  const doneCount = HADITHS.filter((h) => read[h.n]).length;
  const progress = Math.round((doneCount / HADITHS.length) * 100);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <Helmet>
        <title>40 Hadith of Imam an-Nawawi — Study & Track | Heartify</title>
        <meta
          name="description"
          content="Read and track the classical 40 Hadith of Imam an-Nawawi with themes, narrators, and personal progress."
        />
        <link rel="canonical" href="https://pure-heartify.lovable.app/nawawi-40" />
      </Helmet>

      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-title font-bold tracking-tight">
              <BookOpen className="h-7 w-7 text-primary" />
              40 Hadith of Imam an-Nawawi
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              A curated foundation of prophetic teachings covering ‘aqidah, ‘ibadah, akhlaq, and mu‘amalat.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={reset} className="shrink-0">
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium">Read {doneCount} of {HADITHS.length}</span>
              <span className="text-muted-foreground">{progress}%</span>
            </div>
            <Progress value={progress} />
          </CardContent>
        </Card>

        <div className="relative mb-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search hadith, theme, narrator, or number…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <p className="mb-3 text-micro text-muted-foreground">
          Showing {filtered.length} hadith{filtered.length === 1 ? "" : "s"}
        </p>

        <div className="space-y-4">
          {filtered.map((h) => {
            const done = !!read[h.n];
            return (
              <Card key={h.n} className={done ? "border-primary/40 bg-primary/5" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">
                        Hadith {h.n} — <span className="text-muted-foreground font-normal">Narrated by {h.narrator}</span>
                      </CardTitle>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{h.theme}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm leading-relaxed">{h.english}</p>
                  <Button
                    size="sm"
                    variant={done ? "default" : "outline"}
                    onClick={() => toggle(h.n)}
                    className="w-full"
                  >
                    <Check className="mr-2 h-4 w-4" />
                    {done ? "Marked as read" : "Mark as read"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <p className="py-12 text-center text-sm text-muted-foreground">No hadith match your search.</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default Nawawi40;
