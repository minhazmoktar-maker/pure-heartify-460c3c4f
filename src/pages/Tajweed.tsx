import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";

type Rule = {
  category: "Nun Sakinah & Tanwin" | "Mim Sakinah" | "Madd (Prolongation)" | "Qalqalah" | "Lam & Ra";
  name: string;
  arabic?: string;
  letters?: string;
  description: string;
  example: string;
  exampleTranslit: string;
};

const RULES: Rule[] = [
  { category: "Nun Sakinah & Tanwin", name: "Idhhar (Clear)", arabic: "إظهار",
    letters: "ء ه ع ح غ خ",
    description: "Pronounce nun sakinah / tanwin clearly with no nasalization when followed by a throat letter.",
    example: "مِنْ هَادٍ", exampleTranslit: "min haad" },
  { category: "Nun Sakinah & Tanwin", name: "Idgham (Merging)", arabic: "إدغام",
    letters: "ي ر م ل و ن (yarmalūn)",
    description: "Merge nun into the next letter. With ي و م ن → with ghunnah; with ل ر → without ghunnah.",
    example: "مَن يَقُولُ", exampleTranslit: "may-yaqūl" },
  { category: "Nun Sakinah & Tanwin", name: "Iqlab (Conversion)", arabic: "إقلاب",
    letters: "ب",
    description: "Nun sakinah / tanwin is converted to a hidden mim with ghunnah when followed by ب.",
    example: "مِنۢ بَعْدِ", exampleTranslit: "mim-baʿdi" },
  { category: "Nun Sakinah & Tanwin", name: "Ikhfa (Hiding)", arabic: "إخفاء",
    letters: "the remaining 15 letters",
    description: "Partial nasalization for 2 counts — sound is between clear and merged.",
    example: "أَنْتُمْ", exampleTranslit: "antum (nasalized)" },

  { category: "Mim Sakinah", name: "Ikhfa Shafawi", arabic: "إخفاء شفوي",
    letters: "ب",
    description: "Hide the mim sakinah with light nasalization when followed by ب.",
    example: "تَرْمِيهِم بِحِجَارَةٍ", exampleTranslit: "tarmīhim-bi-ḥijārah" },
  { category: "Mim Sakinah", name: "Idgham Shafawi", arabic: "إدغام شفوي",
    letters: "م",
    description: "Merge mim sakinah into a following mim with ghunnah.",
    example: "لَهُم مَّا", exampleTranslit: "lahum-mā" },
  { category: "Mim Sakinah", name: "Idhhar Shafawi", arabic: "إظهار شفوي",
    letters: "all others",
    description: "Pronounce mim sakinah clearly — no nasalization or merging.",
    example: "أَلَمْ تَرَ", exampleTranslit: "alam tara" },

  { category: "Madd (Prolongation)", name: "Madd Tabi'i (Natural)", arabic: "مد طبيعي",
    description: "Basic 2-count elongation on a vowel letter (ا و ي) with no hamzah or sukun after.",
    example: "قَالَ", exampleTranslit: "qaala" },
  { category: "Madd (Prolongation)", name: "Madd Muttasil", arabic: "مد متصل",
    description: "Obligatory 4-5 count madd when a hamzah follows a madd letter in the same word.",
    example: "جَاءَ", exampleTranslit: "jaaaa'a" },
  { category: "Madd (Prolongation)", name: "Madd Munfasil", arabic: "مد منفصل",
    description: "Permissible 2, 4 or 5 count madd when hamzah is in the next word.",
    example: "بِمَا أُنزِلَ", exampleTranslit: "bimaa unzila" },
  { category: "Madd (Prolongation)", name: "Madd Lazim", arabic: "مد لازم",
    description: "Obligatory 6-count madd when a permanent sukun follows a madd letter.",
    example: "الضَّالِّينَ", exampleTranslit: "aḍ-ḍaaaaaaallīn" },

  { category: "Qalqalah", name: "Qalqalah Sughra (Minor)", arabic: "قلقلة صغرى",
    letters: "ق ط ب ج د (qutbu jad)",
    description: "Light echo/bounce on a qalqalah letter carrying a sukun in the middle of a word.",
    example: "يَقْطَعُونَ", exampleTranslit: "yaq(ᵃ)ṭaʿūn" },
  { category: "Qalqalah", name: "Qalqalah Kubra (Major)", arabic: "قلقلة كبرى",
    description: "Stronger echo when a qalqalah letter is at the end of a word and you stop on it.",
    example: "أَحَدْ", exampleTranslit: "aḥad(d)" },

  { category: "Lam & Ra", name: "Lam Shamsiyyah", arabic: "لام شمسية",
    description: "The lam in ال is silent and the next letter is doubled when it is a 'sun letter'.",
    example: "الشَّمْسُ", exampleTranslit: "ash-shams" },
  { category: "Lam & Ra", name: "Lam Qamariyyah", arabic: "لام قمرية",
    description: "The lam in ال is pronounced clearly before a 'moon letter'.",
    example: "الْقَمَرُ", exampleTranslit: "al-qamar" },
  { category: "Lam & Ra", name: "Tafkhim of Ra", arabic: "تفخيم الراء",
    description: "Ra is pronounced heavy when it carries fathah or dammah, or is sakinah after them.",
    example: "رَبِّ", exampleTranslit: "Rabbi (heavy)" },
  { category: "Lam & Ra", name: "Tarqiq of Ra", arabic: "ترقيق الراء",
    description: "Ra is light when it carries kasrah, or is sakinah after a kasrah.",
    example: "رِزْقًا", exampleTranslit: "rizqan (light)" },
];

const CATS = Array.from(new Set(RULES.map((r) => r.category)));

export default function Tajweed() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("All");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return RULES.filter((r) => {
      if (cat !== "All" && r.category !== cat) return false;
      if (!s) return true;
      return (
        r.name.toLowerCase().includes(s) ||
        r.description.toLowerCase().includes(s) ||
        (r.arabic ?? "").includes(s) ||
        (r.letters ?? "").toLowerCase().includes(s)
      );
    });
  }, [q, cat]);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <SEO
        title="Tajweed Rules Guide | Heartify"
        description="A concise, searchable reference of Tajweed rules: Nun Sakinah, Mim Sakinah, Madd, Qalqalah, and Lam & Ra — with Arabic examples."
        path="/tajweed"
      />
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Button asChild variant="ghost" size="icon">
            <Link to="/" aria-label="Back"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <BookOpen className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Tajweed Rules</h1>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-6">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search rules (idgham, madd, qalqalah…)"
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

        {filtered.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">No rules match.</Card>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <Card key={r.name} className="p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold">{r.name}</h3>
                    <Badge variant="secondary" className="mt-1">{r.category}</Badge>
                  </div>
                  {r.arabic && (
                    <div className="text-2xl" dir="rtl" lang="ar">{r.arabic}</div>
                  )}
                </div>
                {r.letters && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Letters:</span> {r.letters}
                  </div>
                )}
                <p className="mt-2 text-sm">{r.description}</p>
                <div className="mt-3 rounded-md border border-border/60 bg-muted/40 p-3">
                  <div className="text-2xl leading-loose" dir="rtl" lang="ar">{r.example}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{r.exampleTranslit}</div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
