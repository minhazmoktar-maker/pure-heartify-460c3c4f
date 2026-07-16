import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, HeartHandshake } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Right = { id: string; title: string; who: "Husband" | "Wife" | "Mutual"; points: string[]; source: string };

const RIGHTS: Right[] = [
  { id: "mahr", who: "Wife", title: "Mahr (Bridal Gift)", points: ["A gift owed to the wife by the husband, agreed at the nikah.", "Belongs to her alone — parents may not take it without her consent.", "Can be paid immediately (muqaddam) or deferred (mu'akhkhar)."], source: "Qur'an 4:4" },
  { id: "nafaqah", who: "Wife", title: "Nafaqah (Maintenance)", points: ["Husband must provide food, clothing, and shelter suitable to his means.", "Applies even if the wife is wealthy.", "Failure without excuse is grounds for legal recourse."], source: "Qur'an 2:233; 65:7" },
  { id: "kindness", who: "Wife", title: "Kind Treatment", points: ["'Live with them in kindness' — even in dislike, Allah may put much good therein.", "'The best of you is the best to his wife' — Tirmidhi 3895.", "Do not strike the face, insult, or abandon except within the house."], source: "Qur'an 4:19; Abu Dawud 2142" },
  { id: "obedience", who: "Husband", title: "Cooperation in Ma'ruf", points: ["Wife cooperates with husband in what is good and lawful — never in sin.", "No obedience to any created being in disobedience to Allah.", "She should not admit to the home those he dislikes without excuse."], source: "Bukhari 5195; Muslim 1840" },
  { id: "intimacy", who: "Mutual", title: "Intimacy", points: ["A mutual right; neither may prolong avoidance without valid reason.", "Foreplay is sunnah; the Prophet ﷺ warned against 'rushing like animals'.", "Anal intercourse and intercourse during menses are forbidden."], source: "Ibn Majah 1853; Qur'an 2:222" },
  { id: "privacy", who: "Mutual", title: "Privacy & Secrets", points: ["The worst of people on Qiyamah is the one who spreads what happens between spouses.", "Do not disclose faults, arguments, or intimate details to family or friends."], source: "Muslim 1437" },
  { id: "home-service", who: "Wife", title: "Household Help", points: ["Not strictly obligatory on the wife by contract; classical scholars differ.", "The Prophet ﷺ mended his own sandals and helped his family — model of shared home life.", "Cultural norms may bind, but kindness overrides technicality."], source: "Bukhari 676" },
  { id: "gender-just", who: "Husband", title: "Justice in Polygyny", points: ["If unable to be just among wives, marry only one (4:3).", "Equality in time, provision, and housing — not in feelings, which are involuntary.", "Announce and rotate nights fairly."], source: "Qur'an 4:3, 4:129" },
  { id: "walimah", who: "Mutual", title: "Walimah (Wedding Feast)", points: ["Sunnah to hold a walimah after consummation, however modest.", "Invite the poor with the rich; a feast that excludes the poor is the worst.", "Attending when invited is a right upon the guest."], source: "Bukhari 5177" },
  { id: "khul", who: "Wife", title: "Khul' (Wife-initiated Divorce)", points: ["Wife may end the marriage by returning the mahr if she can no longer live with him.", "Judge must facilitate if reconciliation fails.", "Not sinful when the reason is genuine, not frivolous."], source: "Bukhari 5273" },
  { id: "talaq", who: "Husband", title: "Talaq (Divorce)", points: ["Most disliked of the permissible acts to Allah.", "Must be pronounced in a period of purity, without intercourse in that tuhr.", "Three pronouncements in one sitting count as one per the stronger opinion; reconciliation is encouraged during 'iddah."], source: "Abu Dawud 2178" },
  { id: "iddah", who: "Wife", title: "'Iddah (Waiting Period)", points: ["Divorce: three menstrual cycles.", "Widow: four months and ten days.", "Pregnant: until delivery.", "Wife remains in the marital home; husband owes housing and, in revocable divorce, full nafaqah."], source: "Qur'an 2:228; 2:234; 65:6" },
];

const STORAGE_KEY = "marriage.read";

const Marriage = () => {
  const [q, setQ] = useState("");
  const [who, setWho] = useState<"All" | Right["who"]>("All");
  const [read, setRead] = useState<Record<string, boolean>>(() => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; } });
  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const toggle = (id: string) => persist({ ...read, [id]: !read[id] });
  const filtered = useMemo(() => RIGHTS.filter(r => (who === "All" || r.who === who) && (!q.trim() || r.title.toLowerCase().includes(q.toLowerCase()) || r.points.some(p => p.toLowerCase().includes(q.toLowerCase())))), [q, who]);
  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / RIGHTS.length) * 100);
  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Marriage Rights in Islam — Heartify" description="Rights and duties of spouses: mahr, nafaqah, intimacy, khul', talaq, and 'iddah." path="/marriage-rights" />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Back</Link>
        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3"><HeartHandshake className="h-7 w-7 text-primary" /><h1 className="text-title font-bold">Marriage Rights in Islam</h1></div>
          <p className="mt-2 text-muted-foreground">A concise guide to spousal rights and duties from the Qur'an and Sunnah.</p>
        </header>
        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3"><span className="text-sm font-medium">Read</span><span className="text-sm text-muted-foreground">{readCount} / {RIGHTS.length}</span></div>
          <Progress value={pct} />
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search rights…" className="pl-9" /></div>
            <Button variant="outline" onClick={() => persist({})}><RotateCcw className="h-4 w-4 mr-2" />Reset</Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{(["All","Husband","Wife","Mutual"] as const).map(w => <Button key={w} size="sm" variant={who === w ? "default" : "outline"} onClick={() => setWho(w)}>{w}</Button>)}</div>
        </Card>
        <div className="grid gap-4">
          {filtered.map(r => (
            <Card key={r.id} className={`p-5 cursor-pointer transition ${read[r.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`} onClick={() => toggle(r.id)}>
              <div className="flex items-start justify-between gap-4"><div><h2 className="text-heading font-semibold">{r.title}</h2><Badge variant="outline" className="mt-1">{r.who}</Badge></div>{read[r.id] && <Badge>Read</Badge>}</div>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground list-disc pl-5">{r.points.map((p,i) => <li key={i}>{p}</li>)}</ul>
              <p className="mt-2 text-micro text-muted-foreground italic">Source: {r.source}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
export default Marriage;
