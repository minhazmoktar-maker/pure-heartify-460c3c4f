/**
 * Single source of truth for global navigation.
 *
 * Consumed by:
 *  - `src/components/Navbar.tsx` (menu sheet + admin section)
 *  - `src/components/BottomTabBar.tsx` (primary spine — imported as PRIMARY_TABS)
 *  - navigation tests (deep-link + coverage guarantees)
 *
 * Rules:
 *  - Every `to` MUST resolve to a route declared in `src/App.tsx`.
 *  - Do not add tracking, hooks, or JSX here — this file is pure data.
 *  - Icons are `lucide-react` components; keep imports narrow.
 */
import {
  Home,
  Heart,
  Clock,
  Flame,
  ListMusic,
  Settings,
  ShieldAlert,
  Crown,
  Compass,
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

/** Primary menu items shown in the Navbar sheet, in display order. */
export const MAIN_NAV_ITEMS: readonly NavItem[] = [
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
  // `/changelog` is appended dynamically by Navbar to reflect unseen state.
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
