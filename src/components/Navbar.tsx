import { Search, Menu, User, LogOut, Moon, Sun, ShieldCheck, Home, Heart, Clock, Flame, ListMusic, Settings, ShieldAlert, Crown, Compass, BookOpen, CircleDot, Sunrise, Calculator, CalendarDays, Sparkles, MapPin, BookText, ListChecks, Award, Target, Bell, LineChart, BookMarked, MoonStar, Milestone, GraduationCap, HandCoins, Scroll, Download } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";
import { hasUnseenChangelog } from "@/data/changelog";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import NotificationsBell from "@/components/NotificationsBell";
import SuggestContentDialog from "@/components/SuggestContentDialog";
import UpgradeCTA from "@/components/UpgradeCTA";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useRole } from "@/hooks/useRole";
import { useScrolled } from "@/hooks/useScrolled";
import SearchAutocomplete from "@/components/SearchAutocomplete";
import { cn } from "@/lib/utils";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuFilter, setMenuFilter] = useState("");
  const [unseenChangelog, setUnseenChangelog] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isAdmin, isOwner } = useRole();
  const scrolled = useScrolled(8);
  const { enabled: kidsOn, toggle: toggleKids } = useKidsMode();

  useEffect(() => { setUnseenChangelog(hasUnseenChangelog()); }, []);
  useEffect(() => { if (!menuOpen) setMenuFilter(""); }, [menuOpen]);


  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

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
                className="tap-target rounded-card hover:bg-secondary transition-colors"
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
                  const items = [
                    { to: "/", label: "Home", icon: Home },
                    { to: "/today", label: "Today (Daily Dose)", icon: Sunrise },
                    { to: "/prayer", label: "Prayer & Qibla", icon: Compass },
                    { to: "/quran", label: "Quran reader", icon: BookOpen },
                    { to: "/khatm", label: "Khatm tracker", icon: BookMarked },
                    { to: "/bookmarks", label: "Bookmarks", icon: BookMarked },
                    { to: "/dhikr", label: "Dhikr & Tasbih", icon: CircleDot },
                    { to: "/adhkar", label: "Adhkar & Duas", icon: Sunrise },
                    { to: "/zakat", label: "Zakat calculator", icon: Calculator },
                    { to: "/hijri", label: "Hijri calendar", icon: CalendarDays },
                    { to: "/names", label: "99 Names of Allah", icon: Sparkles },
                    { to: "/mosques", label: "Mosque finder", icon: MapPin },
                    { to: "/hadith", label: "Hadith library", icon: BookText },
                    { to: "/seerah", label: "Seerah timeline", icon: Milestone },
                    { to: "/learn", label: "Learning paths", icon: GraduationCap },
                    { to: "/wird", label: "Wird builder", icon: CircleDot },
                    { to: "/sadaqah", label: "Sadaqah tracker", icon: HandCoins },
                    { to: "/wasiyyah", label: "Wasiyyah (will)", icon: Scroll },
                    { to: "/ramadan", label: "Ramadan planner", icon: Moon },
                    { to: "/salah", label: "Salah tracker", icon: ListChecks },
                    { to: "/fasting", label: "Fasting tracker", icon: MoonStar },
                    { to: "/achievements", label: "Achievements", icon: Award },
                    { to: "/challenges", label: "Daily challenges", icon: Target },
                    { to: "/reminders", label: "Habit reminders", icon: Bell },
                    { to: "/recap", label: "Weekly recap", icon: LineChart },
                    { to: "/journal", label: "Journal (Niyyah)", icon: BookMarked },
                    { to: "/channels", label: "Trusted channels", icon: ShieldCheck },
                    { to: "/profile?tab=favorites", label: "Favorites", icon: Heart },
                    { to: "/profile?tab=history", label: "Watch history", icon: Clock },
                    { to: "/profile?tab=streak", label: "Daily dose & streak", icon: Flame },
                    { to: "/profile?tab=interests", label: "My interests", icon: ListMusic },
                    { to: "/offline", label: "Offline downloads", icon: Download },
                    { to: "/profile", label: "Profile & settings", icon: Settings },
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
                    {[
                      ...(isOwner ? [{ to: "/admin/users", label: "Users, roles & entitlements", icon: Crown }] : []),
                      { to: "/admin/moderation", label: "Moderation" },
                      { to: "/admin/viral", label: "Viral & flags" },
                      { to: "/admin/console", label: "Admin console" },
                      { to: "/admin/audit", label: "Audit log" },
                    ].map((l) => {
                      const Icon = "icon" in l && l.icon ? l.icon : ShieldAlert;
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
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-card bg-primary">
              <span className="text-sm font-bold text-primary-foreground">H</span>
            </div>
            <span className="hidden font-heading text-heading font-bold text-foreground sm:block">
              Halal<span className="text-[hsl(var(--gold))]">Tube</span>
            </span>
          </Link>
        </div>

        {/* Center — Search (desktop/tablet) */}
        <div className="hidden max-w-xl flex-1 items-center md:flex">
          <SearchAutocomplete placeholder="Search halal content..." />
        </div>

        {/* Spacer on mobile so right cluster hugs the edge */}
        <div className="flex-1 md:hidden" aria-hidden />

        {/* Right */}
        <div className="flex items-center gap-1">
          <Link
            to="/search"
            aria-label="Search"
            title="Search"
            className="tap-target rounded-pill hover:bg-secondary transition-colors md:hidden"
          >
            <Search className="h-5 w-5 text-foreground" />
          </Link>
          <Link
            to="/channels"
            className="hidden items-center gap-1.5 rounded-pill px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary md:flex"
            title="Browse trusted channels"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            Channels
          </Link>
          <LanguageSwitcher />
          <button
            onClick={toggleKids}
            aria-pressed={kidsOn}
            aria-label={kidsOn ? "Turn Kids mode off" : "Turn Kids mode on"}
            title={kidsOn ? "Kids mode ON — safe content only" : "Kids mode OFF"}
            className={`tap-target rounded-pill transition-colors ${kidsOn ? "bg-primary/15 text-primary" : "hover:bg-secondary"}`}
          >
            <Baby className="h-5 w-5" />
          </button>
          <button
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="tap-target rounded-pill hover:bg-secondary transition-colors hidden sm:inline-flex"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
          </button>
          <UpgradeCTA compact className="hidden sm:inline-flex" />
          {user ? (
            <>
              <SuggestContentDialog />
              <NotificationsBell isAdmin={isAdmin} />
              <button
                onClick={signOut}
                aria-label="Sign out"
                className="tap-target rounded-pill hover:bg-secondary transition-colors hidden sm:inline-flex"
                title="Sign out"
              >
                <LogOut className="h-5 w-5 text-foreground" />
              </button>
              <Link
                to="/profile"
                aria-label="Open profile"
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
              className="flex items-center gap-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
            >
              <User className="h-4 w-4" />
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
