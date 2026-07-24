import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  BookOpen,
  Atom,
  GraduationCap,
  Landmark,
  Briefcase,
  Sparkles,
  Languages,
  Leaf,
  ExternalLink,
  ShieldCheck,
  Newspaper,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type Source = {
  id: string;
  name: string;
  domain: string | null;
  organization_type: string | null;
  homepage_url: string | null;
  logo_url: string | null;
  description: string | null;
  language: string | null;
  country: string | null;
  verified_at: string | null;
};

const DOMAINS: { key: string; label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }[] = [
  { key: "Islamic", label: "Islamic scholarship", icon: BookOpen, blurb: "Seminaries, institutes and scholars grounded in mainstream Sunni orthodoxy." },
  { key: "Science", label: "Science & knowledge", icon: Atom, blurb: "Evidence-based science, engineering and mathematics explainers." },
  { key: "Education", label: "Universities & open courses", icon: GraduationCap, blurb: "Full courses and public lectures from the world's leading universities." },
  { key: "History", label: "History", icon: Landmark, blurb: "Long-form documentaries — per-video reviewed for halal compliance." },
  { key: "Business", label: "Business & entrepreneurship", icon: Briefcase, blurb: "Founder interviews, management research and startup school." },
  { key: "Productivity", label: "Productivity & self-development", icon: Sparkles, blurb: "Habits, focus and study skills — no engagement traps." },
  { key: "Language", label: "Arabic & language learning", icon: Languages, blurb: "Learn the language of the Qur'an and beyond." },
  { key: "Nature", label: "Nature & the signs of Allah", icon: Leaf, blurb: "Natural-history documentaries about the āyāt in creation." },
  { key: "News", label: "News", icon: Newspaper, blurb: "Vetted news outlets — individual reports still pass per-video moderation." },
];

export default function Sources() {
  const [sources, setSources] = useState<Source[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_beneficial_sources_directory", {
        _domain: null,
        _limit: 400,
      });
      if (cancelled) return;
      if (error) {
        setError(error.message);
        setSources([]);
      } else {
        setSources((data ?? []) as Source[]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Source[]>();
    for (const s of sources ?? []) {
      const key = s.domain ?? "Other";
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    return map;
  }, [sources]);

  const totalCount = sources?.length ?? 0;

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Beneficial sources — Heartify"
        description="Every institution, scholar and educational creator Heartify has verified — grouped by domain. The world's most trusted beneficial creator directory."
        path="/sources"
      />
      <Navbar />
      <main id="main" className="mx-auto max-w-[1200px] px-4 py-6 md:px-6 md:py-10">
        <header className="mb-8 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
            Verified beneficial creators
          </div>
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">
            Beneficial source ecosystem
          </h1>
          <p className="mt-2 text-sm text-muted-foreground md:text-base">
            {totalCount > 0 ? `${totalCount} institutions` : "Institutions"} across Islamic scholarship, science, education, history and more — each vetted by Heartify's moderation team. Per-video review still applies to every upload.
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm">
            <Link to="/trust" className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-muted-foreground hover:text-foreground">
              How we verify →
            </Link>
            <Link to="/channels" className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-muted-foreground hover:text-foreground">
              Browse channels
            </Link>
            <Link to="/scholars" className="rounded-full border border-border/60 bg-card/70 px-3 py-1 text-muted-foreground hover:text-foreground">
              Scholars
            </Link>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-card border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            Could not load sources. Please try again shortly.
          </div>
        )}

        {sources === null && (
          <div className="space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-card border border-border/60 bg-card/40" />
            ))}
          </div>
        )}

        {sources !== null && (
          <div className="space-y-10">
            {DOMAINS.map(({ key, label, icon: Icon, blurb }) => {
              const items = grouped.get(key) ?? [];
              if (items.length === 0) return null;
              return (
                <section key={key} aria-labelledby={`domain-${key}`}>
                  <div className="mb-4 flex items-start gap-3">
                    <span className="mt-1 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <div>
                      <h2 id={`domain-${key}`} className="font-heading text-xl font-semibold text-foreground md:text-2xl">
                        {label}
                        <span className="ml-2 text-sm font-normal text-muted-foreground">
                          {items.length}
                        </span>
                      </h2>
                      <p className="text-sm text-muted-foreground">{blurb}</p>
                    </div>
                  </div>
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((s) => (
                      <li key={s.id}>
                        <SourceCard source={s} />
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}

        <p className="mt-12 max-w-3xl text-xs text-muted-foreground">
          A source appearing here means the institution's mission is aligned with beneficial knowledge, not that every one of its videos is automatically approved. Heartify reviews each upload individually against strict halal standards.
        </p>
      </main>
    </div>
  );
}

function SourceCard({ source }: { source: Source }) {
  const href = source.homepage_url;
  const Wrapper: React.ElementType = href ? "a" : "div";
  const wrapperProps = href
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : {};
  return (
    <Wrapper
      {...wrapperProps}
      className={cn(
        "group flex h-full flex-col gap-2 rounded-card border border-border/60 bg-card/70 p-4 transition-colors",
        href && "hover:border-primary/40 hover:bg-card"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-medium text-foreground">{source.name}</h3>
          <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
            {source.organization_type ?? "verified source"}
            {source.country ? ` · ${source.country}` : ""}
          </p>
        </div>
        {href && (
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground opacity-70 group-hover:text-primary" aria-hidden />
        )}
      </div>
      {source.description && (
        <p className="text-sm text-muted-foreground line-clamp-3">{source.description}</p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
        Verified by Heartify moderation
      </div>
    </Wrapper>
  );
}
