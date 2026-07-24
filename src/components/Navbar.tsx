import { Menu, Search, Sparkles, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { hasUnseenChangelog } from "@/data/changelog";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import NotificationsBell from "@/components/NotificationsBell";
import { useRole } from "@/hooks/useRole";
import { useScrolled } from "@/hooks/useScrolled";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import Logomark from "@/components/Logomark";
import { cn } from "@/lib/utils";
import { MAIN_NAV_ITEMS, ADMIN_NAV_ITEMS, type NavItem } from "@/config/nav";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFilter, setMenuFilter] = useState("");
  const [unseenChangelog, setUnseenChangelog] = useState(false);
  const { user } = useAuth();
  const { isAdmin, isOwner } = useRole();
  const scrolled = useScrolled(8);


  useEffect(() => { setUnseenChangelog(hasUnseenChangelog()); }, []);
  useEffect(() => { if (!menuOpen) setMenuFilter(""); }, [menuOpen]);



  return (
    <nav
      className={cn(
        "sticky top-0 z-50 border-b backdrop-blur-xl transition-[height,background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        scrolled
          ? "border-border/60 bg-card/95 shadow-[0_4px_20px_-12px_hsl(var(--foreground)/0.25)]"
          : "border-border/40 bg-card/70",
      )}
    >
      <div
        className={cn(
          "mx-auto flex max-w-[1800px] items-center justify-between gap-4 px-4 md:px-6 transition-[height] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
          scrolled ? "h-14" : "h-16",
        )}
      >
        {/* Left */}
        {/* Left */}
        <div className="flex items-center gap-3">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open navigation menu"
                className="tap-target rounded-card hover:bg-secondary transition-colors hidden md:inline-flex"
              >
                <Menu className="h-5 w-5 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[85vw] max-w-sm sm:w-80 flex flex-col p-0">
              <SheetHeader className="px-6 pt-6 pb-3 shrink-0 space-y-3">
                <SheetTitle>Menu</SheetTitle>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <input
                    type="search"
                    inputMode="search"
                    enterKeyHint="search"
                    autoComplete="off"
                    value={menuFilter}
                    onChange={(e) => setMenuFilter(e.target.value)}
                    placeholder="Filter menu..."
                    aria-label="Filter menu"
                    className="h-10 w-full rounded-pill border border-border bg-background pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  />
                </div>
              </SheetHeader>
              <nav className="flex-1 overflow-y-auto overscroll-contain px-6 pb-6 flex flex-col gap-1">
                {(() => {
                  const q = menuFilter.trim().toLowerCase();
                  const items: NavItem[] = [
                    ...MAIN_NAV_ITEMS,
                    { to: "/changelog", label: unseenChangelog ? "What's new •" : "What's new", icon: Sparkles },
                  ];
                  const filtered = q ? items.filter((i) => i.label.toLowerCase().includes(q)) : items;
                  if (filtered.length === 0) {
                    return (
                      <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matches for "{menuFilter}"</p>
                    );
                  }
                  return filtered.map(({ to, label, icon: Icon }) => (
                    <SheetClose asChild key={to}>
                      <Link to={to} className="flex min-h-11 items-center gap-3 rounded-card px-3 py-2 text-sm hover:bg-secondary">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {label}
                      </Link>
                    </SheetClose>
                  ));
                })()}
                {isAdmin && !menuFilter && (
                  <>
                    <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Admin</div>
                    {ADMIN_NAV_ITEMS.filter((l) => (l.owner ? isOwner : true)).map((l) => {
                      const Icon = l.icon ?? ShieldAlert;
                      return (
                        <SheetClose asChild key={l.to}>
                          <Link to={l.to} className="flex min-h-11 items-center gap-3 rounded-card px-3 py-2 text-sm hover:bg-secondary">
                            <Icon className="h-4 w-4 text-primary" />
                            {l.label}
                          </Link>
                        </SheetClose>
                      );
                    })}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2" aria-label="Heartify — home">
            <Logomark size={32} />
            <span className="hidden font-heading text-heading font-bold text-foreground sm:block">
              Heartify
            </span>
          </Link>
        </div>

        {/* Center — Search (desktop/tablet) */}
        <div className="hidden max-w-xl flex-1 items-center md:flex">
          <SearchAutocomplete placeholder="Search halal content..." />
        </div>

        {/* Spacer on mobile so right cluster hugs the edge */}
        <div className="flex-1 md:hidden" aria-hidden />

        {/* Right — logo · search · avatar (3-target rule). Locale/theme live in Profile → Preferences. */}
        <div className="flex items-center gap-1">
          <Link
            to="/search"
            aria-label="Search"
            title="Search"
            className="tap-target rounded-pill hover:bg-secondary transition-colors md:hidden"
          >
            <Search className="h-5 w-5 text-foreground" />
          </Link>
          {user ? (
            <>
              <NotificationsBell isAdmin={isAdmin} />
              <Link
                to="/profile"
                aria-label="View profile and settings"
                className="flex h-8 w-8 items-center justify-center rounded-pill bg-primary transition-colors hover:opacity-90"
                title="Profile"
              >
                <span className="text-micro font-bold text-primary-foreground">
                  {user.email?.charAt(0).toUpperCase() ?? "U"}
                </span>
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="inline-flex items-center whitespace-nowrap rounded-pill px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary"
            >
              Sign in
            </Link>
          )}
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
