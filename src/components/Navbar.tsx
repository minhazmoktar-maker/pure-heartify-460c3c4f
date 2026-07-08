import { Search, Menu, Bell, User, LogOut, Moon, Sun, ShieldCheck, Home, Heart, Clock, Flame, ListMusic, Settings, ShieldAlert } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import NotificationsBell from "@/components/NotificationsBell";
import SuggestContentDialog from "@/components/SuggestContentDialog";

const Navbar = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    supabase.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1800px] items-center justify-between gap-4 px-4 md:px-6">
        {/* Left */}
        {/* Left */}
        <div className="flex items-center gap-3">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open navigation menu"
                className="rounded-lg p-2 hover:bg-secondary transition-colors"
              >
                <Menu className="h-5 w-5 text-foreground" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
              <nav className="mt-6 flex flex-col gap-1">
                {[
                  { to: "/", label: "Home", icon: Home },
                  { to: "/channels", label: "Trusted channels", icon: ShieldCheck },
                  { to: "/profile?tab=favorites", label: "Favorites", icon: Heart },
                  { to: "/profile?tab=history", label: "Watch history", icon: Clock },
                  { to: "/profile?tab=streak", label: "Daily dose & streak", icon: Flame },
                  { to: "/profile?tab=interests", label: "My interests", icon: ListMusic },
                  { to: "/profile", label: "Profile & settings", icon: Settings },
                ].map(({ to, label, icon: Icon }) => (
                  <SheetClose asChild key={to}>
                    <Link to={to} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      {label}
                    </Link>
                  </SheetClose>
                ))}
                {isAdmin && (
                  <>
                    <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Admin</div>
                    {[
                      { to: "/admin/review", label: "Review candidates" },
                      { to: "/admin/console", label: "Admin console" },
                      { to: "/admin/audit", label: "Audit log" },
                      { to: "/admin/moderation", label: "Moderation" },
                    ].map((l) => (
                      <SheetClose asChild key={l.to}>
                        <Link to={l.to} className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-secondary">
                          <ShieldAlert className="h-4 w-4 text-primary" />
                          {l.label}
                        </Link>
                      </SheetClose>
                    ))}
                  </>
                )}
              </nav>
            </SheetContent>
          </Sheet>
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">H</span>
            </div>
            <span className="hidden font-heading text-xl font-bold text-foreground sm:block">
              Halal<span className="text-[hsl(var(--gold))]">Tube</span>
            </span>
          </Link>
        </div>

        {/* Center — Search */}
        <div className="flex max-w-xl flex-1 items-center">
          <form onSubmit={handleSearch} className="relative flex w-full">
            <input
              type="text"
              placeholder="Search halal content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 w-full rounded-l-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            <button type="submit" className="flex h-10 items-center justify-center rounded-r-full border border-l-0 border-border bg-secondary px-5 hover:bg-muted transition-colors">
              <Search className="h-4 w-4 text-foreground" />
            </button>
          </form>
        </div>

        {/* Right */}
        <div className="flex items-center gap-1">
          <Link
            to="/channels"
            className="hidden items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary md:flex"
            title="Browse trusted channels"
          >
            <ShieldCheck className="h-4 w-4 text-primary" />
            Channels
          </Link>
          <button
            onClick={toggleTheme}
            className="rounded-full p-2 hover:bg-secondary transition-colors"
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? <Sun className="h-5 w-5 text-foreground" /> : <Moon className="h-5 w-5 text-foreground" />}
          </button>
          {user ? (
            <>
              <NotificationsBell isAdmin={isAdmin} />
              <button
                onClick={signOut}
                className="rounded-full p-2 hover:bg-secondary transition-colors"
                title="Sign out"
              >
                <LogOut className="h-5 w-5 text-foreground" />
              </button>
              <Link
                to="/profile"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary transition-colors hover:opacity-90"
                title="Profile"
              >
                <span className="text-xs font-bold text-primary-foreground">
                  {user.email?.charAt(0).toUpperCase() ?? "U"}
                </span>
              </Link>
            </>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90"
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
