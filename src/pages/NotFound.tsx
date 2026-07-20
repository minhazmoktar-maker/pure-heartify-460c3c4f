import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, BookOpen, Sunrise, Compass, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import EmptyIllustration from "@/components/EmptyIllustration";

const SUGGESTIONS = [
  { to: "/", label: "Home", desc: "Your Today shape", Icon: Home },
  { to: "/quran", label: "Quran", desc: "Read, listen, memorise", Icon: BookOpen },
  { to: "/prayer", label: "Prayer", desc: "Next salah & qibla", Icon: Sunrise },
];

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) console.debug("[404]", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEO
        title="Page not found — Heartify"
        description="This page has moved or never existed. Return to Heartify to keep exploring halal content."
        path="/404"
      />
      <Navbar />
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 pt-10 pb-16 text-center md:pt-20">
        <EmptyIllustration variant="not-found" className="mb-6" />
        <p className="text-micro font-semibold uppercase tracking-widest text-primary">
          404 · Page not found
        </p>
        <h1 className="mt-2 font-heading text-title md:text-display font-semibold text-foreground">
          We couldn't find that page
        </h1>
        <p className="mt-3 max-w-md text-sm text-muted-foreground">
          The link may have moved or the page never existed. Try one of these
          instead — or head back to your Home feed.
        </p>

        <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
          {SUGGESTIONS.map(({ to, label, desc, Icon }) => (
            <Link
              key={to}
              to={to}
              className="group flex flex-col items-start gap-2 rounded-card border border-border bg-card p-4 text-left transition-colors hover:border-primary/60 hover:bg-accent/10"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-pill bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" aria-hidden />
              </span>
              <span className="font-heading text-heading text-foreground">{label}</span>
              <span className="text-micro text-muted-foreground">{desc}</span>
              <span className="mt-1 inline-flex items-center gap-1 text-micro font-semibold text-primary transition-transform group-hover:translate-x-0.5">
                Open <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>

        <Link
          to="/search"
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <Compass className="h-4 w-4" /> Or search Heartify
        </Link>
      </main>
    </div>
  );
};

export default NotFound;
