import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarDays, Clock, Flame, Heart, Sparkles, CalendarX } from "lucide-react";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";

interface PublicRecap {
  handle: string;
  display_name: string | null;
  week_start: string;
  minutes_watched: number;
  favorites_added: number;
  dhikr_count: number;
  juz_completed: number;
  streak_length: number;
}

export default function PublicWeeklyRecap() {
  const { handle = "", week = "" } = useParams<{ handle: string; week: string }>();
  const [recap, setRecap] = useState<PublicRecap | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!handle || !week) return;
      const { data, error } = await supabase.rpc("get_public_weekly_recap", {
        _handle: handle,
        _week_start: week,
      });
      if (cancelled) return;
      if (error || !data) setNotFound(true);
      else setRecap(data as unknown as PublicRecap);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [handle, week]);

  const label = useMemo(() => recap?.display_name || `@${handle}`, [recap, handle]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <PageSkeleton variant="detail" className="max-w-lg" />
      </div>
    );
  }

  if (notFound || !recap) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Recap not found — Heartify" description="This weekly recap link is not available." path={`/w/${handle}/${week}`} />
        <main className="container mx-auto max-w-lg px-4 py-16">
          <EmptyState
            icon={CalendarX}
            title="Recap not found"
            description="This weekly recap link may have expired, or the member doesn't have a public handle yet."
            actionLabel="Go home"
            actionHref="/"
          />
        </main>
      </div>
    );
  }

  const weekLabel = new Date(recap.week_start).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${label}'s Heartify week — ${recap.streak_length}-day streak`}
        description={`${recap.minutes_watched} min watched · ${recap.dhikr_count} dhikr · ${recap.juz_completed} juz. See your own weekly recap on Heartify.`}
        path={`/w/${handle}/${week}`}
      />
      <main className="container mx-auto max-w-lg px-4 py-12 space-y-6">
        <header className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1 justify-center">
            <CalendarDays className="h-3.5 w-3.5" /> Week of {weekLabel}
          </p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {label}'s Heartify week
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <Link to={`/u/${recap.handle}`} className="hover:underline">@{recap.handle}</Link>
          </p>
        </header>

        <Card className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat icon={Clock} label="Minutes" value={recap.minutes_watched} />
            <Stat icon={Heart} label="Favorites" value={recap.favorites_added} />
            <Stat icon={Sparkles} label="Dhikr" value={recap.dhikr_count} />
            <Stat icon={BookOpen} label="Juz" value={recap.juz_completed} />
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            <span>
              Current streak: <span className="font-semibold text-foreground tabular-nums">{recap.streak_length}</span> days
            </span>
          </div>

          <Button asChild className="w-full">
            <Link to="/achievements">Get your own weekly recap</Link>
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Track your minutes, dhikr, and streak — every week, automatically.
          </p>
        </Card>
      </main>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 px-3 py-2 text-center">
      <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="mt-0.5 text-lg font-semibold tabular-nums">{value.toLocaleString()}</div>
    </div>
  );
}
