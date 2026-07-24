import { Link } from "react-router-dom";
import { Search, ListMusic, Radio, GraduationCap, ShieldCheck, BookOpen, Compass, Sparkles } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import { cn } from "@/lib/utils";

type Tile = {
  to: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRIMARY: Tile[] = [
  { to: "/listen", label: "Reciters & Scholars", hint: "Audio lectures & full Qur'an", icon: Radio },
  { to: "/channels", label: "Trusted channels", hint: "Every creator, vetted", icon: ShieldCheck },
  { to: "/creators", label: "Editor picks", hint: "Curated by our reviewers", icon: Sparkles },
  { to: "/scholars", label: "Scholars", hint: "Contemporary & classical", icon: GraduationCap },
  { to: "/quran", label: "Qur'an", hint: "Read, listen, memorize", icon: BookOpen },
  { to: "/trust", label: "Trust & moderation", hint: "How we keep it halal", icon: ShieldCheck },
];

const CATEGORIES = [
  "Qur'an", "Tafsir", "Sīrah", "Hadith", "History",
  "Science", "Family", "Productivity", "Language", "Du'a", "Kids",
];

export default function Explore() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Explore halal video — Heartify"
        description="Search halal content, browse trusted channels, discover editor-picked series and scholars — all in one place."
        canonicalPath="/explore"
      />
      <Navbar />
      <main id="main" className="mx-auto max-w-[1200px] px-4 py-6 md:px-6 md:py-10">
        <header className="mb-6">
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">Explore</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Search, discover, and browse the world's most trusted halal video library.
          </p>
        </header>

        {/* Search */}
        <div className="mb-8">
          <div className="rounded-card border border-border/60 bg-card/70 p-4 backdrop-blur md:p-5">
            <label htmlFor="explore-search" className="sr-only">Search halal content</label>
            <div className="flex items-center gap-3">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="flex-1">
                <SearchAutocomplete placeholder="Search halal videos, scholars, series…" />
              </div>
            </div>
          </div>
        </div>

        {/* Discovery tiles */}
        <section aria-labelledby="explore-primary" className="mb-10">
          <h2 id="explore-primary" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Discover
          </h2>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {PRIMARY.map(({ to, label, hint, icon: Icon }) => (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "group flex h-full min-h-[92px] flex-col justify-between rounded-card border border-border/60 bg-card/80 p-4 transition-colors",
                    "hover:border-primary/50 hover:bg-card focus-visible:border-primary focus-visible:outline-none",
                  )}
                >
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                  <div>
                    <div className="text-sm font-semibold text-foreground">{label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Categories */}
        <section aria-labelledby="explore-categories">
          <h2 id="explore-categories" className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Categories
          </h2>
          <ul className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <li key={cat}>
                <Link
                  to={`/search?q=${encodeURIComponent(cat)}`}
                  className="inline-flex min-h-11 items-center rounded-pill border border-border/60 bg-card px-4 py-1.5 text-sm text-foreground hover:border-primary/50 hover:bg-secondary"
                >
                  {cat}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
