/**
 * Single source of truth for global navigation.
 *
 * Heartify has ONE identity: halal-first video & content discovery.
 * `MAIN_NAV_ITEMS` = the 8 spine-adjacent shortcuts. Everything else
 * (supporting Islamic tools) lives in `MORE_NAV_ITEMS`, surfaced via
 * Profile → More and the searchable menu sheet.
 *
 * Consumed by:
 *  - `src/components/Navbar.tsx` (menu sheet + admin section)
 *  - `src/components/profile/MoreGrid.tsx` (More grid on Profile)
 *  - `src/components/BottomTabBar.tsx` (via `SPINES` in `@/lib/navigation`)
 *  - navigation tests (deep-link + coverage guarantees)
 *
 * Rules:
 *  - Every `to` MUST resolve to a route declared in `src/App.tsx`.
 *  - Do not add tracking, hooks, or JSX here — this file is pure data.
 *  - Icons are `lucide-react` components; keep imports narrow.
 */
import {
  Home,
  Compass,
  Library,
  Settings,
  ShieldAlert,
  Crown,
  BookOpen,
  CircleDot,
  Sunrise,
  Calculator,
  CalendarDays,
  Sparkles,
  MapPin,
  BookText,
  ListChecks,
  Award,
  Target,
  Bell,
  LineChart,
  BookMarked,
  MoonStar,
  Milestone,
  GraduationCap,
  HandCoins,
  Scroll,
  Download,
  ShieldCheck,
  Moon,
  Radio,
  ListMusic,
  Heart,
  Clock,
  Flame,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Show only when the user is an admin. */
  admin?: boolean;
  /** Show only when the user is the owner. */
  owner?: boolean;
};

/**
 * Primary shortcuts — the 8 items that reinforce the halal-video spine.
 * Kept intentionally small so the menu never feels like a directory.
 */
export const MAIN_NAV_ITEMS: readonly NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/explore", label: "Explore", icon: Compass },
  { to: "/me", label: "Library", icon: Library },
  { to: "/today", label: "Today's Dose", icon: Sunrise },
  { to: "/listen", label: "Reciters & Scholars", icon: Radio },
  { to: "/channels", label: "Trusted channels", icon: ShieldCheck },
  { to: "/trust", label: "Trust & moderation", icon: ShieldCheck },
  { to: "/profile", label: "Profile & settings", icon: Settings },
];

/**
 * Supporting Islamic tools — reachable in one tap via Profile → More
 * and via the searchable menu sheet. They complement the video spine
 * without competing for tab real-estate.
 */
export const MORE_NAV_ITEMS: readonly NavItem[] = [
  { to: "/quran", label: "Quran reader", icon: BookOpen },
  { to: "/khatm", label: "Khatm tracker", icon: BookMarked },
  { to: "/prayer", label: "Prayer & Qibla", icon: Compass },
  { to: "/dhikr", label: "Dhikr & Tasbih", icon: CircleDot },
  { to: "/adhkar", label: "Adhkar & Duas", icon: Sunrise },
  { to: "/wird", label: "Wird builder", icon: CircleDot },
  { to: "/journal", label: "Journal (Niyyah)", icon: BookMarked },
  { to: "/bookmarks", label: "Bookmarks", icon: BookMarked },
  { to: "/zakat", label: "Zakat calculator", icon: Calculator },
  { to: "/sadaqah", label: "Sadaqah tracker", icon: HandCoins },
  { to: "/wasiyyah", label: "Wasiyyah (will)", icon: Scroll },
  { to: "/hijri", label: "Hijri calendar", icon: CalendarDays },
  { to: "/ramadan", label: "Ramadan planner", icon: Moon },
  { to: "/salah", label: "Salah tracker", icon: ListChecks },
  { to: "/fasting", label: "Fasting tracker", icon: MoonStar },
  { to: "/names", label: "99 Names of Allah", icon: Sparkles },
  { to: "/mosques", label: "Mosque finder", icon: MapPin },
  { to: "/hadith", label: "Hadith library", icon: BookText },
  { to: "/seerah", label: "Seerah timeline", icon: Milestone },
  { to: "/learn", label: "Learning paths", icon: GraduationCap },
  { to: "/achievements", label: "Achievements", icon: Award },
  { to: "/challenges", label: "Daily challenges", icon: Target },
  { to: "/reminders", label: "Habit reminders", icon: Bell },
  { to: "/recap", label: "Weekly recap", icon: LineChart },
  { to: "/playlists", label: "Playlists", icon: ListMusic },
  { to: "/profile?tab=favorites", label: "Favorites", icon: Heart },
  { to: "/profile?tab=history", label: "Watch history", icon: Clock },
  { to: "/profile?tab=streak", label: "Streak", icon: Flame },
  { to: "/offline", label: "Offline downloads", icon: Download },
];

/** Everything reachable from the menu (used by the filter sheet). */
export const ALL_NAV_ITEMS: readonly NavItem[] = [
  ...MAIN_NAV_ITEMS,
  ...MORE_NAV_ITEMS,
];

/** Admin-only section. `/admin/users` is gated to owners only. */
export const ADMIN_NAV_ITEMS: readonly NavItem[] = [
  { to: "/admin/users", label: "Users, roles & entitlements", icon: Crown, owner: true },
  { to: "/admin/moderation", label: "Moderation", icon: ShieldAlert, admin: true },
  { to: "/admin/viral", label: "Viral & flags", icon: ShieldAlert, admin: true },
  { to: "/admin/console", label: "Admin console", icon: ShieldAlert, admin: true },
  { to: "/admin/audit", label: "Audit log", icon: ShieldAlert, admin: true },
];

/** Extract the plain pathname portion (strip query/hash) — for route validation. */
export const navPath = (item: Pick<NavItem, "to">) => item.to.split("?")[0].split("#")[0];
