import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import SectionHeader from "@/components/SectionHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { BookText, Loader2, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { HADITH_COLLECTIONS, fetchArabicSection, fetchHadithSection, type Hadith } from "@/lib/hadithApi";
import { toast } from "sonner";

export default function HadithLibrary() {
  const [editionId, setEditionId] = useState<string>(HADITH_COLLECTIONS[0].id);
  const [section, setSection] = useState(1);
  const [hadiths, setHadiths] = useState<Hadith[]>([]);
  const [arabic, setArabic] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const edition = HADITH_COLLECTIONS.find((c) => c.id === editionId)!;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([fetchHadithSection(editionId, section), fetchArabicSection(edition.arabicId, section)])
      .then(([hs, ar]) => {
        if (cancelled) return;
        setHadiths(hs);
        setArabic(ar);
      })
      .catch(() => toast.error("Could not load this book. Try a different one."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [editionId, section, edition.arabicId]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return hadiths;
    return hadiths.filter(
      (h) => h.text.toLowerCase().includes(s) || String(h.hadithnumber).includes(s),
    );
  }, [hadiths, q]);

  const changeEdition = (id: string) => {
    setEditionId(id);
    setSection(1);
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Hadith Library — Heartify"
        description="Read the Six Books of Hadith (Kutub as-Sittah), 40 Nawawi, and 40 Qudsi with English and Arabic side-by-side."
        path="/hadith"
      />
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
        <SectionHeader
          title="Hadith Library"
          description="The Six Books, 40 Nawawi, and 40 Qudsi — English translation with Arabic source."
          icon={BookText}
          className="mb-6"
        />


        <Card className="mb-6">
          <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto]">
            <Select value={editionId} onValueChange={changeEdition}>
              <SelectTrigger aria-label="Collection">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HADITH_COLLECTIONS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Button size="icon" variant="outline" aria-label="Previous book" disabled={section <= 1} onClick={() => setSection((s) => Math.max(1, s - 1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="min-w-[90px] text-center text-sm">Book {section} / {edition.books}</span>
              <Button size="icon" variant="outline" aria-label="Next book" disabled={section >= edition.books} onClick={() => setSection((s) => Math.min(edition.books, s + 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search in this book…" className="pl-8" aria-label="Search hadith" />
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading hadith…
          </div>
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No hadith match your search in this book.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((h) => {
              const ar = arabic.get(h.hadithnumber);
              return (
                <Card key={h.hadithnumber}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <CardTitle className="text-base">
                      Hadith #{h.hadithnumber}
                    </CardTitle>
                    <div className="flex flex-wrap justify-end gap-1">
                      {(h.grades || []).slice(0, 2).map((g, i) => (
                        <Badge key={i} variant="secondary" className="text-[10px]">{g.grade}</Badge>
                      ))}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ar && (
                      <p dir="rtl" lang="ar" className="text-right text-2xl leading-loose">
                        {ar}
                      </p>
                    )}
                    <p className="text-sm leading-relaxed text-foreground/90">{h.text}</p>
                    {h.reference?.book && (
                      <p className="text-[11px] text-muted-foreground">
                        Reference: Book {h.reference.book}, Hadith {h.reference.hadith}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            <p className="text-center text-[11px] text-muted-foreground">Source: fawazahmed0/hadith-api (public CDN)</p>
          </div>
        )}
      </main>
    </div>
  );
}
