import { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Award, Flame, BookOpen, CircleDot, ListChecks, Sparkles, Trophy, Lock, Share2 } from "lucide-react";
import { Link } from "react-router-dom";
import StreakCard from "@/components/StreakCard";
import BadgeShelf from "@/components/BadgeShelf";
import StatCard from "@/components/StatCard";
import ReferralCard from "@/components/ReferralCard";
import WeeklyRecapCard from "@/components/WeeklyRecapCard";
import Leaderboard from "@/components/Leaderboard";
import { InvitePrompt, shouldShowInvitePrompt } from "@/components/InvitePrompt";
import { GiftDialog } from "@/components/GiftDialog";
import { useStreak } from "@/hooks/useStreak";
import { supabase } from "@/integrations/supabase/client";
import { getBadge } from "@/data/badges";
import { shareContent } from "@/lib/share";
import { track } from "@/lib/analytics";
import { toast } from "sonner";


type Stats = {
  salahStreak: number;
  salahOnTime30: number;
  dhikrTotal: number;
  dhikrStreak: number;
  surahsRead: number;
  adhkarDays: number;
};

function readSalahStats(): { streak: number; onTime30: number } {
  try {
    const raw = JSON.parse(localStorage.getItem("heartify.salah.tracker.v1") || "{}");
    const today = new Date();
    let streak = 0, broke = false, onTime30 = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today); d.setDate(today.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const rec = raw[key] || {};
      const prayers = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
      let complete = true;
      for (const p of prayers) {
        const s = rec[p];
        if (s === "on_time") onTime30++;
        if (!s || s === "none") complete = false;
      }
      if (!broke && complete) streak++; else broke = true;
    }
    return { streak, onTime30 };
  } catch { return { streak: 0, onTime30: 0 }; }
}

function readDhikrStats(): { total: number; streak: number } {
  try {
    const raw = JSON.parse(localStorage.getItem("heartify.dhikr.v1") || "null");
    if (!raw) return { total: 0, streak: 0 };
    return { total: raw.lifetime || 0, streak: raw.streak || 0 };
  } catch { return { total: 0, streak: 0 }; }
}

function readQuranStats(): { surahsRead: number } {
  try {
    const raw = JSON.parse(localStorage.getItem("heartify.quran.progress.v1") || "null");
    if (!raw) return { surahsRead: 0 };
    return { surahsRead: (raw.completed || []).length };
  } catch { return { surahsRead: 0 }; }
}

function readAdhkarDays(): number {
  try {
    const raw = JSON.parse(localStorage.getItem("heartify.adhkar.v1") || "null");
    return raw?.completedDays?.length || 0;
  } catch { return 0; }
}

type Achievement = {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  target: number;
  current: (s: Stats) => number;
  tier: "bronze" | "silver" | "gold";
  link?: string;
};

const ACHIEVEMENTS: Achievement[] = [
  { id: "salah-3", title: "Getting Started", description: "3-day salah streak", icon: ListChecks, target: 3, current: (s) => s.salahStreak, tier: "bronze", link: "/salah" },
  { id: "salah-7", title: "One Full Week", description: "7-day salah streak", icon: ListChecks, target: 7, current: (s) => s.salahStreak, tier: "silver", link: "/salah" },
  { id: "salah-30", title: "Consistent Servant", description: "30-day salah streak", icon: Trophy, target: 30, current: (s) => s.salahStreak, tier: "gold", link: "/salah" },
  { id: "ontime-50", title: "Answering the Call", description: "50 on-time prayers in 30 days", icon: Flame, target: 50, current: (s) => s.salahOnTime30, tier: "silver", link: "/salah" },
  { id: "dhikr-1k", title: "Remembering Allah", description: "1,000 lifetime dhikr", icon: CircleDot, target: 1000, current: (s) => s.dhikrTotal, tier: "bronze", link: "/dhikr" },
  { id: "dhikr-10k", title: "Rich Tongue", description: "10,000 lifetime dhikr", icon: CircleDot, target: 10000, current: (s) => s.dhikrTotal, tier: "silver", link: "/dhikr" },
  { id: "dhikr-100k", title: "Constant Remembrance", description: "100,000 lifetime dhikr", icon: Sparkles, target: 100000, current: (s) => s.dhikrTotal, tier: "gold", link: "/dhikr" },
  { id: "dhikr-streak-7", title: "Daily Dhikr", description: "7-day dhikr streak", icon: Flame, target: 7, current: (s) => s.dhikrStreak, tier: "bronze", link: "/dhikr" },
  { id: "quran-1", title: "First Surah", description: "Read your first surah", icon: BookOpen, target: 1, current: (s) => s.surahsRead, tier: "bronze", link: "/quran" },
  { id: "quran-10", title: "Ten Surahs", description: "Read 10 surahs", icon: BookOpen, target: 10, current: (s) => s.surahsRead, tier: "silver", link: "/quran" },
  { id: "quran-114", title: "Khatm al-Quran", description: "Read all 114 surahs", icon: Trophy, target: 114, current: (s) => s.surahsRead, tier: "gold", link: "/quran" },
  { id: "adhkar-7", title: "Morning & Evening", description: "7 days of adhkar", icon: Sparkles, target: 7, current: (s) => s.adhkarDays, tier: "bronze", link: "/adhkar" },
  { id: "adhkar-30", title: "Fortress of the Muslim", description: "30 days of adhkar", icon: Trophy, target: 30, current: (s) => s.adhkarDays, tier: "silver", link: "/adhkar" },
];

const TIER_STYLES = {
  bronze: "border-amber-600/40 bg-amber-950/10 text-amber-500",
  silver: "border-slate-400/40 bg-slate-500/10 text-slate-400",
  gold: "border-yellow-400/50 bg-yellow-500/10 text-yellow-500",
};

export default function Achievements() {
  const [stats, setStats] = useState<Stats>({
    salahStreak: 0, salahOnTime30: 0, dhikrTotal: 0, dhikrStreak: 0, surahsRead: 0, adhkarDays: 0,
  });
  const streak = useStreak();
  const [invitePromptOpen, setInvitePromptOpen] = useState(false);
  const [inviteTrigger, setInviteTrigger] = useState<string>("streak_milestone");
  const [handle, setHandle] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      const { data } = await supabase.from("profiles").select("handle").eq("id", user.id).maybeSingle();
      if (mounted && data?.handle) setHandle(data.handle);
    })();
    return () => { mounted = false; };
  }, []);

  const onShareBadge = async (badgeId: string) => {
    const meta = getBadge(badgeId);
    if (!meta) return;
    if (!handle) {
      toast.info("Set a public handle in your Profile to share badges.");
      return;
    }
    await shareContent({
      kind: "badge_earned",
      refId: badgeId,
      title: `I unlocked ${meta.title} on Heartify`,
      text: `${meta.emoji} ${meta.title} — ${meta.description}`,
      url: `${window.location.origin}/b/${handle}/${badgeId}`,
    });
    await track("badge.share_clicked", { badge_id: badgeId });
  };

  useEffect(() => {
    const s = readSalahStats();
    const d = readDhikrStats();
    const q = readQuranStats();
    setStats({
      salahStreak: s.streak,
      salahOnTime30: s.onTime30,
      dhikrTotal: d.total,
      dhikrStreak: d.streak,
      surahsRead: q.surahsRead,
      adhkarDays: readAdhkarDays(),
    });
  }, []);

  useEffect(() => {
    if (streak.loading || streak.milestones.length === 0) return;
    const latest = streak.milestones[streak.milestones.length - 1];
    const trigger = `streak_milestone_${latest}`;
    if (shouldShowInvitePrompt(trigger)) {
      setInviteTrigger(trigger);
      setInvitePromptOpen(true);
    }
  }, [streak.loading, streak.milestones]);

  const enriched = useMemo(() => ACHIEVEMENTS.map((a) => {
    const current = a.current(stats);
    const unlocked = current >= a.target;
    const pct = Math.min(100, Math.round((current / a.target) * 100));
    return { ...a, current, unlocked, pct };
  }), [stats]);

  const unlockedCount = enriched.filter(a => a.unlocked).length;

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Achievements — Heartify" description="Earn badges for consistency in salah, dhikr, Quran, and adhkar. Track your spiritual milestones." path="/achievements" />
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8 md:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-title font-bold"><Award className="h-7 w-7 text-primary" />Achievements</h1>
            <p className="mt-1 text-muted-foreground">Milestones for salah, dhikr, Quran, and adhkar consistency.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-pill border bg-card px-4 py-2 text-sm">
              <span className="font-bold text-primary">{unlockedCount}</span>
              <span className="text-muted-foreground"> / {enriched.length} unlocked</span>
            </div>
            <GiftDialog freezesAvailable={streak.freezes} />
          </div>
        </header>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Unlocked" value={unlockedCount} icon={Trophy} tone="primary" />
          <StatCard label="Salah streak" value={stats.salahStreak} icon={Flame} hint="days" />
          <StatCard label="Dhikr total" value={stats.dhikrTotal.toLocaleString()} icon={CircleDot} />
          <StatCard label="Surahs read" value={stats.surahsRead} icon={BookOpen} />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <StreakCard />
          <WeeklyRecapCard />
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <ReferralCard />
          <Leaderboard scope="global" />
        </div>

        <div className="mb-6">
          <BadgeShelf />
        </div>

        <InvitePrompt
          trigger={inviteTrigger}
          open={invitePromptOpen}
          onOpenChange={setInvitePromptOpen}
          headline={`You hit a ${streak.current}-day streak! 🎉`}
          body="Invite a friend to build a habit together — you both earn rewards when they join."
        />


        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">

          {enriched.map((a) => {
            const Icon = a.icon;
            const card = (
              <Card className={`h-full transition ${a.unlocked ? TIER_STYLES[a.tier] : "opacity-80"}`}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                  <div className="flex items-center gap-2">
                    {a.unlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                    <CardTitle className="text-base">{a.title}</CardTitle>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase">{a.tier}</Badge>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-micro text-muted-foreground">{a.description}</p>
                  <Progress value={a.pct} className="h-2" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-micro font-mono">
                      {a.current.toLocaleString()} / {a.target.toLocaleString()}
                    </p>
                    {a.unlocked && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-micro"
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onShareBadge(a.id); }}
                        aria-label={`Share ${a.title}`}
                      >
                        <Share2 className="h-3 w-3 mr-1" /> Share
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
            return a.link ? (
              <Link key={a.id} to={a.link} aria-label={`${a.title} — go to related page`}>{card}</Link>
            ) : (
              <div key={a.id}>{card}</div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          Progress reads from your local activity (salah tracker, dhikr counter, Quran reader, adhkar).
        </p>
      </main>
    </div>
  );
}
