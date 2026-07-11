import { useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sparkles } from "lucide-react";
import { ASMA_UL_HUSNA } from "@/data/asmaUlHusna";

export default function AsmaUlHusna() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return ASMA_UL_HUSNA;
    return ASMA_UL_HUSNA.filter(
      (n) =>
        n.translit.toLowerCase().includes(s) ||
        n.meaning.toLowerCase().includes(s) ||
        n.ar.includes(q) ||
        String(n.n) === s,
    );
  }, [q]);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="99 Names of Allah — Heartify"
        description="Asma ul-Husna: the 99 beautiful Names of Allah with Arabic, transliteration, and meanings. Searchable and shareable."
        path="/names"
      />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Sparkles className="h-7 w-7 text-primary" />
            99 Names of Allah
          </h1>
          <p className="mt-1 text-muted-foreground">
            Asma ul-Husna — the most beautiful Names. Search by name, meaning, or number.
          </p>
        </header>

        <div className="mb-4">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search e.g. Rahman, Merciful, 14…"
            aria-label="Search the 99 Names of Allah"
          />
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">No names match "{q}".</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((n) => (
              <Card key={n.n} className="transition hover:border-primary/60">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-xs font-mono text-muted-foreground">#{n.n}</span>
                    <span dir="rtl" lang="ar" className="text-2xl font-semibold leading-tight">
                      {n.ar}
                    </span>
                  </div>
                  <div className="mt-2 font-semibold text-primary">{n.translit}</div>
                  <div className="text-sm text-muted-foreground">{n.meaning}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
