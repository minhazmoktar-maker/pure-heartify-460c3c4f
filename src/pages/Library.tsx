import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import EmptyState from "@/components/EmptyState";
import libraryData from "@/data/library.json";

type Entry = {
  slug: string;
  title: string;
  description: string;
  category: string;
  sections: string[];
  legacyPath: string;
};

const ENTRIES = libraryData as Entry[];
const CATEGORIES = ["All", ...Array.from(new Set(ENTRIES.map((e) => e.category))).sort()];
const PAGE_SIZE = 24;

export default function Library() {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ENTRIES.filter((e) => {
      if (cat !== "All" && e.category !== cat) return false;
      if (!needle) return true;
      return (
        e.title.toLowerCase().includes(needle) ||
        e.description.toLowerCase().includes(needle) ||
        e.sections.join(" ").toLowerCase().includes(needle)
      );
    });
  }, [q, cat]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const slice = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Heartify Library — Halal Knowledge Hub"
        description="Searchable library of Islamic topics: worship, ethics, family, finance, theology, history."
        path="/library"
      />
      <div className="container mx-auto px-4 pt-4">
        <PageHeader title="Library" subtitle="Searchable halal knowledge hub." icon={BookOpen} backHref="/" />
      </div>
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Search topics…"
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <Badge
                key={c}
                variant={cat === c ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => {
                  setCat(c);
                  setPage(1);
                }}
              >
                {c}
              </Badge>
            ))}
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {filtered.length} {filtered.length === 1 ? "entry" : "entries"}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {slice.map((e) => (
            <Link key={e.slug} to={`/library/${e.slug}`}>
              <Card className="p-4 h-full hover:shadow-md transition-shadow">
                <Badge variant="secondary" className="mb-2 text-micro">
                  {e.category}
                </Badge>
                <h2 className="font-semibold mb-1">{e.title}</h2>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {e.description || e.sections[0] || ""}
                </p>
              </Card>
            </Link>
          ))}
        </div>

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-8">
            <Button
              variant="outline"
              disabled={current === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <span className="px-4 py-2 text-sm">
              Page {current} of {pages}
            </span>
            <Button
              variant="outline"
              disabled={current === pages}
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}

        {filtered.length === 0 && (
          <EmptyState
            illustration="no-search-results"
            icon={Search}
            title="No entries match"
            description={
              q
                ? `Nothing in the library matches "${q}". Try a different keyword or clear the category filter.`
                : "No entries match this category yet."
            }
            actionLabel="Clear filters"
            onAction={() => {
              setQ("");
              setCat("All");
              setPage(1);
            }}
          />
        )}
      </div>
    </div>
  );
}
