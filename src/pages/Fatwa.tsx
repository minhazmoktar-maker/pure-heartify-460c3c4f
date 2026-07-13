import { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, BookOpen } from "lucide-react";

type Fatwa = {
  id: string;
  q: string;
  a: string;
  category: string;
  scholar?: string;
};

const FATWAS: Fatwa[] = [
  { id: "f1", category: "Salah", q: "Can I combine Dhuhr and Asr while travelling?", a: "Yes. The Prophet ﷺ combined Dhuhr and Asr and Maghrib and Isha during travel (Muslim). You may combine at the time of the earlier or later prayer (jam' taqdim / ta'khir). Shortening (qasr) is also a confirmed sunnah on journeys beyond the customary distance.", scholar: "Majority" },
  { id: "f2", category: "Salah", q: "What if I miss a Fard prayer intentionally?", a: "You must repent sincerely and pray it as qada immediately. Deliberately abandoning prayer is among the gravest sins; scholars differ on whether qada is accepted, but the safer view is to make it up while repenting." },
  { id: "f3", category: "Wudu", q: "Does touching a woman break wudu?", a: "The stronger opinion (Hanafi, and many Malikis/Hanbalis) is that simple touching does not break wudu; only touching with desire or emission does. The verse 'or you have touched women' (4:43) is interpreted as intercourse per Ibn Abbas." },
  { id: "f4", category: "Fasting", q: "Does using an inhaler break the fast?", a: "The majority contemporary view (European Council for Fatwa, AMJA) permits medicinal inhalers for asthmatics as the substance is a fine mist for the lungs, not food/drink to the stomach. Necessity also applies." },
  { id: "f5", category: "Fasting", q: "I forgot and ate while fasting — is my fast valid?", a: "Yes. The Prophet ﷺ said: 'Whoever forgets while fasting and eats or drinks, let him complete his fast; Allah has fed him and given him drink' (Bukhari, Muslim). Stop as soon as you remember." },
  { id: "f6", category: "Zakat", q: "Do I pay zakat on my 401k / retirement account?", a: "The dominant contemporary fatwa (AMJA) is: zakat is due on the accessible portion. If withdrawal is restricted, calculate on the vested balance minus taxes/penalties at 2.5% annually, or defer until withdrawal — but the yearly approach is more precautionary." },
  { id: "f7", category: "Zakat", q: "Can I give zakat to my parents or children?", a: "No. Zakat cannot be given to usul (parents, grandparents) or furu' (children, grandchildren) because supporting them is already your financial obligation. You may give sadaqah freely." },
  { id: "f8", category: "Marriage", q: "Is a nikah valid without the wali (guardian)?", a: "Majority (Maliki, Shafi'i, Hanbali): no — a woman's nikah requires her wali per the hadith 'No marriage without a wali' (Abu Dawud, Tirmidhi). Hanafi allows an adult woman to contract without wali but discourages it and grants wali the right to object if the match is unequal." },
  { id: "f9", category: "Marriage", q: "Is mahr obligatory even if the wife waives it?", a: "Mahr is an obligation on the husband as part of the contract (Qur'an 4:4). She may gift part or all of it back after receiving it (4:4), but it cannot be omitted from the contract itself." },
  { id: "f10", category: "Finance", q: "Are conventional mortgages permissible?", a: "The dominant view is impermissible due to riba. Recognized exceptions permit necessity (darura) for a first primary residence when no halal alternative exists in the country (AMJA, ECFR). Halal murabaha/ijara/musharaka mutanaqisa products should be sought first." },
  { id: "f11", category: "Finance", q: "Is trading stocks halal?", a: "Yes, provided (1) the underlying business is halal (no alcohol, gambling, riba, pork, adult content); (2) financial ratios: interest income < 5%, debt/market cap < 33%, cash+interest-bearing securities/market cap < 33% (AAOIFI). Purify any incidental haram income by donating that portion." },
  { id: "f12", category: "Food", q: "Is machine-slaughtered chicken halal?", a: "Scholars differ. Many contemporary councils (ECFR, some AMJA) permit it if bismillah is pronounced (recorded or by an operator), the blade severs the required vessels, and the chicken dies from the cut. The stricter view requires per-bird human tasmiyah." },
  { id: "f13", category: "Food", q: "Is seafood entirely halal?", a: "Majority (Shafi'i, Hanbali, Maliki): all sea creatures are halal per 5:96. Hanafi restricts to fish only, excluding crustaceans and shellfish. Follow the fatwa of your madhhab of practice." },
  { id: "f14", category: "Purification", q: "Is a small amount of blood on clothes a barrier to salah?", a: "Small amounts (less than roughly a dirham per Hanafi, or generally 'ma yu'fa 'anh' — pardoned quantities) do not invalidate salah. Large flowing blood should be washed off." },
  { id: "f15", category: "Purification", q: "Do I need ghusl after a wet dream?", a: "Yes, if you find fluid (mani) upon waking, ghusl is obligatory even if you don't remember the dream. If there is no fluid, no ghusl is required (Bukhari)." },
  { id: "f16", category: "Interaction", q: "Can I greet non-Muslims with 'Assalamu alaykum'?", a: "The Prophet ﷺ instructed not to initiate salam with non-Muslims but to return greetings with 'wa alaykum' (Bukhari). Contemporary scholars permit initiating a general greeting like 'good morning' to build good relations." },
  { id: "f17", category: "Interaction", q: "Is shaking hands with the opposite gender permissible?", a: "Majority: not permissible with a non-mahram of the opposite gender, based on the Prophet's ﷺ statement 'I do not shake hands with women' (Nasa'i). Necessity (medical, elderly relative) may relax this." },
  { id: "f18", category: "Salah", q: "Is the Fajr sunnah more important than the fard?", a: "The Prophet ﷺ said the two rak'ahs of Fajr are better than the world and all it contains (Muslim). It is the most emphasized nafl, but the fard itself remains the greater obligation — the sunnah's virtue is *among* nawafil." },
  { id: "f19", category: "Marriage", q: "Can I marry a Christian or Jewish woman?", a: "A Muslim man may marry a chaste Kitabiyya (5:5) — though contemporary scholars strongly discourage it when religious upbringing of children or spousal deen may suffer. A Muslim woman may only marry a Muslim man." },
  { id: "f20", category: "Zakat", q: "When is the nisab for gold today?", a: "Nisab for gold is 85 grams (20 mithqal). For silver it is 595 grams. Once wealth reaches nisab and a lunar year passes, 2.5% zakat is due. Most contemporary scholars recommend the silver nisab for cash to benefit more poor recipients." },
];

const CATEGORIES = ["All", ...Array.from(new Set(FATWAS.map((f) => f.category)))];

const Fatwa = () => {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return FATWAS.filter((f) => {
      if (cat !== "All" && f.category !== cat) return false;
      if (!term) return true;
      return (
        f.q.toLowerCase().includes(term) ||
        f.a.toLowerCase().includes(term) ||
        f.category.toLowerCase().includes(term)
      );
    });
  }, [q, cat]);

  return (
    <>
      <Helmet>
        <title>Fatwa Q&A Library | Heartify</title>
        <meta name="description" content="Curated fatwas across salah, fasting, zakat, marriage, finance, food, and daily interaction." />
        <link rel="canonical" href="https://pure-heartify.lovable.app/fatwa" />
        <meta property="og:url" content="https://pure-heartify.lovable.app/fatwa" />
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FATWAS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.scholar ? `${f.a} — ${f.scholar}` : f.a,
            },
          })),
        })}</script>
      </Helmet>


      <main className="container mx-auto max-w-3xl px-4 py-8">
        <header className="mb-6 flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Fatwa Q&A Library</h1>
            <p className="text-sm text-muted-foreground">Curated answers from mainstream Sunni scholarship. For personal cases, consult a qualified local scholar.</p>
          </div>
        </header>

        <div className="mb-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fatwas…" className="pl-9" />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Button key={c} size="sm" variant={cat === c ? "default" : "outline"} onClick={() => setCat(c)}>
                {c}
              </Button>
            ))}
          </div>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">{filtered.length} result{filtered.length === 1 ? "" : "s"}</p>

        <div className="space-y-3">
          {filtered.map((f) => (
            <Card key={f.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-base leading-snug">{f.q}</CardTitle>
                  <Badge variant="secondary" className="shrink-0">{f.category}</Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground">{f.a}</p>
                {f.scholar && <p className="mt-2 text-xs text-muted-foreground/70">— {f.scholar}</p>}
              </CardContent>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">No fatwas match your search.</CardContent></Card>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Disclaimer: This library is for general education. Rulings can vary by madhhab and personal circumstance.
        </p>
      </main>
    </>
  );
};

export default Fatwa;
