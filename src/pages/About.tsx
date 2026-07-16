import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Sparkles, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";

export default function About() {
  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="About Heartify — Halal Video App"
        description="Learn how Heartify curates halal video and audio with trusted channels, moderation, reports, and owner-reviewed safety controls."
        path="/about"
      />
      <Navbar />
      <main className="mx-auto max-w-4xl px-4 py-10 md:px-6">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <header className="prose-heartify mb-10">
          <h1>About Heartify</h1>
          <p className="text-muted-foreground">
            Heartify is a curated halal video and audio experience built around trusted
            channels, clean recommendations, user reports, and administrator review.
          </p>
        </header>

        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ShieldCheck,
              title: "Trusted sources",
              body: "Channels and videos are screened before they are promoted across core surfaces.",
            },
            {
              icon: Sparkles,
              title: "Moderated discovery",
              body: "Search, feed, and recommendations are filtered through the same safety pipeline.",
            },
            {
              icon: Users,
              title: "Community reports",
              body: "Signed-in members can report non-halal content or suggest better channels for review.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <section key={title} className="rounded-card border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h2 className="mt-4 text-base font-semibold text-foreground">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}