import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, LifeBuoy, Mail, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const SupportChat = lazy(() => import("@/components/support/SupportChat"));

interface Article {
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  body: string;
}

/**
 * Help & Support — the AI assistant plus the browsable help articles it
 * answers from. Publishing the same corpus the assistant is grounded in keeps
 * answers auditable: anything it claims, a person can read for themselves.
 */
export default function Help() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("support_kb_documents")
        .select("slug, title, summary, category, body")
        .eq("status", "published")
        .order("category", { ascending: true });
      setArticles((data ?? []) as Article[]);
    })();
  }, []);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-6">
      <SEO
        title="Help & Support — Heartify"
        description="Get instant answers about your Heartify account, content standards, playback, reminders and privacy — or reach our team."
        path="/help"
      />

      <header className="mb-5">
        <div className="mb-2 flex items-center gap-2">
          <LifeBuoy aria-hidden className="h-5 w-5 text-primary" />
          <span className="text-micro font-semibold uppercase tracking-wide text-muted-foreground">
            Help &amp; Support
          </span>
        </div>
        <h1 className="font-heading text-heading font-bold text-foreground">How can we help?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Ask in your own words. Answers come from Heartify's own help articles and policies, with a link to the
          source so you can check them.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="h-64 animate-pulse rounded-card bg-muted" aria-hidden />
        }
      >
        <SupportChat />
      </Suspense>

      <section className="mt-10" aria-labelledby="help-articles">
        <h2 id="help-articles" className="mb-3 font-heading text-lg font-semibold text-foreground">
          Help articles
        </h2>
        <div className="divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
          {articles.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">Help articles are loading…</p>
          )}
          {articles.map((a) => {
            const isOpen = open === a.slug;
            return (
              <div key={a.slug}>
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : a.slug)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-start"
                >
                  <span>
                    <span className="block text-sm font-medium text-foreground">{a.title}</span>
                    {a.summary && <span className="block text-micro text-muted-foreground">{a.summary}</span>}
                  </span>
                  <ChevronDown
                    aria-hidden
                    className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isOpen && "rotate-180")}
                  />
                </button>
                {isOpen && (
                  <div className="whitespace-pre-wrap px-4 pb-4 text-sm leading-relaxed text-muted-foreground">
                    {a.body}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          to="/contact"
          className="flex min-h-11 items-center gap-3 rounded-card border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <Mail aria-hidden className="h-5 w-5 text-primary" />
          <span>
            <span className="block text-sm font-medium text-foreground">Contact our team</span>
            <span className="block text-micro text-muted-foreground">Billing, account recovery, data requests</span>
          </span>
        </Link>
        <Link
          to="/trust"
          className="flex min-h-11 items-center gap-3 rounded-card border border-border bg-card p-4 transition-colors hover:bg-muted"
        >
          <ShieldCheck aria-hidden className="h-5 w-5 text-primary" />
          <span>
            <span className="block text-sm font-medium text-foreground">Trust &amp; moderation</span>
            <span className="block text-micro text-muted-foreground">Content standards, reports and appeals</span>
          </span>
        </Link>
      </section>
    </main>
  );
}
