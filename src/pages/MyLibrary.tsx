import { Link } from "react-router-dom";
import { ListMusic, Clock, Heart, Download, ShieldCheck, Bookmark, PlayCircle, ChevronRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { useAuth } from "@/contexts/AuthContext";

type Tile = {
  to: string;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
};

const TILES: Tile[] = [
  { to: "/profile?tab=continue", label: "Continue watching", hint: "Pick up where you left off", icon: PlayCircle },
  { to: "/playlists", label: "Playlists", hint: "Your saved collections", icon: ListMusic },
  { to: "/channels", label: "Subscriptions", hint: "Channels you trust", icon: ShieldCheck },
  { to: "/profile?tab=history", label: "History", hint: "Everything you've watched", icon: Clock },
  { to: "/profile?tab=favorites", label: "Favorites", hint: "Videos you loved", icon: Heart },
  { to: "/bookmarks", label: "Bookmarked ayahs", hint: "Verses you saved", icon: Bookmark },
  { to: "/offline", label: "Downloads", hint: "Offline audio & recitations", icon: Download },
];

export default function MyLibrary() {
  const { user } = useAuth();

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title="Library — Heartify"
        description="Your subscriptions, playlists, watch history, downloads, and saved content — all in one place."
        path="/me"
      />
      <Navbar />
      <main id="main" className="mx-auto max-w-[1200px] px-4 py-6 md:px-6 md:py-10">
        <header className="mb-6">
          <h1 className="font-heading text-3xl font-bold text-foreground md:text-4xl">Library</h1>
          <p className="mt-1 text-sm text-muted-foreground md:text-base">
            Everything you've saved, followed, and watched.
          </p>
        </header>

        {!user && (
          <div className="mb-6 rounded-card border border-border/60 bg-card/80 p-4">
            <p className="text-sm text-foreground">
              <Link to="/login" className="font-semibold text-primary underline-offset-2 hover:underline">Sign in</Link>{" "}
              to save playlists, follow channels, and pick up where you left off.
            </p>
          </div>
        )}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {TILES.map(({ to, label, hint, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="group flex min-h-[76px] items-center gap-3 rounded-card border border-border/60 bg-card/80 p-4 transition-colors hover:border-primary/50 hover:bg-card focus-visible:border-primary focus-visible:outline-none"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-foreground">{label}</div>
                  <div className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}
