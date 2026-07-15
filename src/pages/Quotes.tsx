import { useMemo, useState } from "react";
import { Quote as QuoteIcon, Share2, Copy, Check } from "lucide-react";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { QUOTE_THEMES } from "@/data/quotes";
import { toast } from "@/hooks/use-toast";

const ALL_QUOTES = QUOTE_THEMES.flatMap((t) =>
  t.quotes.map((q) => ({ ...q, theme: t.title, themeSlug: t.slug })),
);

function pickDailyIndex(len: number) {
  const now = new Date();
  const dayOfYear = Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) /
      86_400_000,
  );
  return dayOfYear % len;
}

export default function Quotes() {
  const [activeTheme, setActiveTheme] = useState<string>("all");
  const [copied, setCopied] = useState<string | null>(null);

  const daily = useMemo(() => ALL_QUOTES[pickDailyIndex(ALL_QUOTES.length)], []);
  const themes =
    activeTheme === "all"
      ? QUOTE_THEMES
      : QUOTE_THEMES.filter((t) => t.slug === activeTheme);

  const copyQuote = async (text: string, source: string, id: string) => {
    const payload = `"${text}"\n— ${source}\n\nvia Heartify · https://pure-heartify.lovable.app/quotes`;
    try {
      if (navigator.share) {
        await navigator.share({ text: payload });
      } else {
        await navigator.clipboard.writeText(payload);
        setCopied(id);
        setTimeout(() => setCopied(null), 1800);
        toast({ title: "Copied", description: "Quote copied to clipboard." });
      }
    } catch {
      /* user cancelled */
    }
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Islamic Inspirational Quotes",
    description:
      "A curated library of Islamic inspirational quotes from the Qur'an, hadith, and pious predecessors — organized by theme for daily reflection.",
    url: "https://pure-heartify.lovable.app/quotes",
    hasPart: QUOTE_THEMES.map((t) => ({
      "@type": "CreativeWork",
      name: t.title,
      description: t.intro,
      url: `https://pure-heartify.lovable.app/quotes#${t.slug}`,
    })),
  };

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Islamic Inspirational Quotes — Daily Reflection Library"
        description="A curated library of Islamic inspirational quotes from the Qur'an, hadith, and companions — organized by patience, gratitude, hope, mercy, and more."
        path="/quotes"
        keywords="islamic quotes, islamic inspirational quotes, quotes for islamic, quran quotes, hadith quotes, daily islamic reminder"
        jsonLd={jsonLd}
      />
      <div className="container mx-auto max-w-5xl px-4 pt-4">
        <PageHeader
          title="Islamic Quotes"
          subtitle="A daily library of reminders from the Qur'an, ḥadīth, and the pious predecessors."
          icon={QuoteIcon}
          backHref="/"
        />
      </div>

      <div className="container mx-auto max-w-5xl px-4 pb-16">
        {/* Daily reflection */}
        <Card className="mb-8 overflow-hidden border-primary/30 bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
          <Badge variant="secondary" className="mb-3">Today's reflection</Badge>
          <blockquote className="font-heading text-xl leading-relaxed text-foreground sm:text-2xl">
            "{daily.text}"
          </blockquote>
          <p className="mt-4 text-sm text-muted-foreground">
            — {daily.source} · <span className="italic">{daily.theme}</span>
          </p>
          <div className="mt-5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyQuote(daily.text, daily.source, "daily")}
            >
              {copied === "daily" ? (
                <Check className="mr-2 h-4 w-4" />
              ) : (
                <Share2 className="mr-2 h-4 w-4" />
              )}
              Share
            </Button>
          </div>
        </Card>

        {/* Theme filter */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Badge
            variant={activeTheme === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setActiveTheme("all")}
          >
            All themes
          </Badge>
          {QUOTE_THEMES.map((t) => (
            <Badge
              key={t.slug}
              variant={activeTheme === t.slug ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setActiveTheme(t.slug)}
            >
              {t.title}
            </Badge>
          ))}
        </div>

        {/* Themes */}
        <div className="space-y-10">
          {themes.map((theme) => (
            <section key={theme.slug} id={theme.slug} className="scroll-mt-20">
              <h2 className="font-heading text-2xl font-bold text-foreground">
                {theme.title}
              </h2>
              <p className="mb-5 mt-1 text-sm text-muted-foreground sm:text-base">
                {theme.intro}
              </p>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {theme.quotes.map((q, i) => {
                  const id = `${theme.slug}-${i}`;
                  return (
                    <Card key={id} className="flex flex-col p-5">
                      <QuoteIcon className="h-5 w-5 text-primary/60" />
                      <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed text-foreground">
                        "{q.text}"
                      </blockquote>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">
                            {q.source}
                          </p>
                          <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wide">
                            {q.type}
                          </Badge>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label="Copy quote"
                          onClick={() => copyQuote(q.text, q.source, id)}
                        >
                          {copied === id ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
