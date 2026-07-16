import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, RotateCcw, Landmark, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import SEO from "@/components/SEO";

type Topic = {
  id: string;
  title: string;
  category: "Foundations" | "Haram" | "Halal Alternatives" | "Contracts" | "Practical";
  ruling: "halal" | "haram" | "guidance";
  summary: string;
  detail: string;
  reference: string;
};

const TOPICS: Topic[] = [
  { id: "riba", title: "Riba (Interest)", category: "Haram", ruling: "haram", summary: "All forms of interest — giving, taking, witnessing, or recording — are strictly forbidden.", detail: "Riba includes conventional bank interest, credit card interest, and interest on savings. Allah declares war on those who persist in it (Al-Baqarah 2:278–279).", reference: "Qur'an 2:275–279; Muslim 1598" },
  { id: "gharar", title: "Gharar (Excessive Uncertainty)", category: "Foundations", ruling: "haram", summary: "Contracts with major unknowns in price, subject, or delivery are invalid.", detail: "Selling fish still in the sea or fruit before it ripens are classical examples. Modern parallels: speculative derivatives without underlying assets.", reference: "Muslim 1513" },
  { id: "maysir", title: "Maysir (Gambling)", category: "Haram", ruling: "haram", summary: "Any zero-sum wager where wealth transfers by chance alone is forbidden.", detail: "Includes lottery, casino games, sports betting, and speculative day-trading modeled on chance rather than ownership.", reference: "Qur'an 5:90–91" },
  { id: "murabaha", title: "Murabaha (Cost-plus Sale)", category: "Contracts", ruling: "halal", summary: "The bank buys an asset, then resells it to you at a disclosed markup, payable in installments.", detail: "Ownership must genuinely transfer to the financier first. Common structure for Islamic home and car finance.", reference: "AAOIFI Shari'ah Standard 8" },
  { id: "ijarah", title: "Ijarah (Leasing)", category: "Contracts", ruling: "halal", summary: "The bank owns the asset and leases usage to you for a rental fee.", detail: "Risk of ownership (repairs, insurance of the asset itself) stays with the lessor. Ijarah wa Iqtina ends with transfer of ownership.", reference: "AAOIFI Shari'ah Standard 9" },
  { id: "musharakah", title: "Musharakah (Partnership)", category: "Contracts", ruling: "halal", summary: "Two or more parties contribute capital and share profits by agreement, losses by capital ratio.", detail: "The purest form of Islamic finance — real risk-sharing rather than guaranteed return.", reference: "AAOIFI Shari'ah Standard 12" },
  { id: "mudarabah", title: "Mudarabah (Profit-sharing)", category: "Contracts", ruling: "halal", summary: "One party provides capital, the other provides expertise; profits shared, losses borne by the financier.", detail: "Basis for Islamic savings/investment accounts. The bank as mudarib invests depositor funds in halal ventures.", reference: "AAOIFI Shari'ah Standard 13" },
  { id: "sukuk", title: "Sukuk (Islamic Bonds)", category: "Halal Alternatives", ruling: "halal", summary: "Certificates representing ownership in a tangible asset, project, or service — returns come from real cash flows.", detail: "Unlike bonds, sukuk holders share asset risk. Structure must avoid interest-like fixed guarantees.", reference: "AAOIFI Shari'ah Standard 17" },
  { id: "takaful", title: "Takaful (Islamic Insurance)", category: "Halal Alternatives", ruling: "halal", summary: "A cooperative pool where members contribute to help one another against defined risks.", detail: "Free from riba, gharar, and maysir. Surplus returns to participants, not shareholders alone.", reference: "AAOIFI Shari'ah Standard 26" },
  { id: "zakat-wealth", title: "Zakat on Wealth", category: "Foundations", ruling: "guidance", summary: "2.5% annually on savings above the nisab held for a lunar year.", detail: "Nisab equals the value of 85g of gold or 595g of silver (use the lower, silver, to include more of the poor).", reference: "Qur'an 9:60; Bukhari 1395" },
  { id: "halal-stocks", title: "Screening Stocks", category: "Practical", ruling: "guidance", summary: "Company must have halal core business and pass financial ratios (debt, interest income, cash).", detail: "Common thresholds: interest-bearing debt < 33% of market cap; non-permissible income < 5% (purify by donating that share).", reference: "AAOIFI Shari'ah Standard 21" },
  { id: "crypto", title: "Cryptocurrency", category: "Practical", ruling: "guidance", summary: "Contested. Scholars differ; many permit ownership of established coins avoiding leverage, staking-interest, and speculation.", detail: "Avoid margin trading, interest-bearing lending platforms, and coins tied to haram utilities (gambling, adult content).", reference: "AMJA, IFA rulings (varies)" },
  { id: "credit-cards", title: "Credit Cards", category: "Practical", ruling: "guidance", summary: "Permissible only if paid in full every cycle so no interest is ever charged.", detail: "Rewards from an interest-based card are debated; safer to use debit or halal charge-card alternatives.", reference: "Contemporary fatwa" },
  { id: "mortgages", title: "Conventional Mortgages", category: "Haram", ruling: "haram", summary: "Standard interest-bearing home loans are riba and forbidden.", detail: "Seek Murabaha, diminishing Musharakah, or Ijarah wa Iqtina from an Islamic financier. Necessity fatwas exist but are narrow.", reference: "AAOIFI; ECFR rulings" },
  { id: "salary-in-haram", title: "Working in a Haram Industry", category: "Practical", ruling: "haram", summary: "Direct work in riba, alcohol, gambling, or interest-bearing lending is not permitted.", detail: "Auxiliary roles (IT, cleaning) at conventional banks are debated. Prefer halal employment; transition planfully.", reference: "Qur'an 5:2" },
  { id: "wasiyyah-finance", title: "Wasiyyah & Inheritance", category: "Foundations", ruling: "guidance", summary: "Distribute up to 1/3 by will to non-heirs; the remainder follows Qur'anic shares.", detail: "Every Muslim with assets should have a written, Shari'ah-compliant will. Interest-bearing accounts should be closed.", reference: "Qur'an 4:11–12; Bukhari 2738" },
];

const STORAGE_KEY = "finance.read";

const rulingBadge = (r: Topic["ruling"]) => {
  if (r === "halal") return <Badge className="bg-emerald-600 hover:bg-emerald-600"><CheckCircle2 className="h-3 w-3 mr-1" />Halal</Badge>;
  if (r === "haram") return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Haram</Badge>;
  return <Badge variant="secondary">Guidance</Badge>;
};

const IslamicFinance = () => {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<Topic["category"] | "All">("All");
  const [read, setRead] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); } catch { return {}; }
  });

  const persist = (n: Record<string, boolean>) => { setRead(n); localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
  const toggle = (id: string) => persist({ ...read, [id]: !read[id] });
  const reset = () => persist({});

  const cats: (Topic["category"] | "All")[] = ["All", "Foundations", "Haram", "Halal Alternatives", "Contracts", "Practical"];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOPICS.filter(t => {
      if (cat !== "All" && t.category !== cat) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.detail.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  const readCount = Object.values(read).filter(Boolean).length;
  const pct = Math.round((readCount / TOPICS.length) * 100);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Islamic Finance Guide — Heartify"
        description="Riba, gharar, halal contracts (Murabaha, Ijarah, Musharakah, Mudarabah, Sukuk, Takaful) and practical guidance on cards, stocks, and mortgages."
        path="/islamic-finance"
      />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>

        <header className="mt-4 mb-6">
          <div className="flex items-center gap-3">
            <Landmark className="h-7 w-7 text-primary" />
            <h1 className="text-title font-bold">Islamic Finance Guide</h1>
          </div>
          <p className="mt-2 text-muted-foreground">
            Foundations of muamalat: what riba, gharar, and maysir are, and the Shari'ah-compliant contracts that replace them.
          </p>
        </header>

        <Card className="p-4 mb-6">
          <div className="flex items-center justify-between gap-3 mb-3">
            <span className="text-sm font-medium">Read progress</span>
            <span className="text-sm text-muted-foreground">{readCount} / {TOPICS.length}</span>
          </div>
          <Progress value={pct} />
          <div className="mt-3 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search topics…" className="pl-9" />
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
          {filtered.map(t => (
            <Card
              key={t.id}
              className={`p-5 cursor-pointer transition ${read[t.id] ? "bg-primary/5 border-primary/40" : "hover:bg-muted/40"}`}
              onClick={() => toggle(t.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-heading font-semibold">{t.title}</h2>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {rulingBadge(t.ruling)}
                    <Badge variant="outline">{t.category}</Badge>
                  </div>
                </div>
                {read[t.id] && <Badge className="shrink-0">Read</Badge>}
              </div>
              <p className="mt-3 font-medium">{t.summary}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{t.detail}</p>
              <p className="mt-2 text-micro text-muted-foreground italic">Reference: {t.reference}</p>
            </Card>
          ))}
          {filtered.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">No topics match your filter.</Card>
          )}
        </div>

        <p className="mt-6 text-micro text-muted-foreground text-center">
          Educational summary — consult a qualified scholar or certified Shari'ah advisor for personal rulings.
        </p>
      </div>
    </div>
  );
};

export default IslamicFinance;
