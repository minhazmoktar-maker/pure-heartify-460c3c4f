import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { BookOpen, CheckCircle2, Users, Link2Off } from "lucide-react";

interface PublicKhatm {
  id: string;
  name: string;
  description: string | null;
  intention: string | null;
  invite_code: string;
  is_public: boolean;
  target_completion_at: string | null;
  completed_at: string | null;
  juz_claimed: number;
  juz_completed: number;
  member_count: number;
}

export default function PublicKhatmGroup() {
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const code = params.get("c") ?? undefined;
  const [group, setGroup] = useState<PublicKhatm | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      const { data, error } = await supabase.rpc("get_public_khatm_group", { _id: id, _code: code ?? null });
      if (cancelled) return;
      if (error || !data) setNotFound(true);
      else setGroup(data as unknown as PublicKhatm);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id, code]);

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <PageSkeleton variant="detail" className="max-w-lg" />
      </div>
    );
  }

  if (notFound || !group) {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Group not found — Heartify" description="This Khatm group link is not available." path={`/k/${id}`} />
        <main className="container mx-auto max-w-lg px-4 py-16">
          <EmptyState
            icon={Link2Off}
            title="Group not found"
            description="This link may be private or the invite code is missing. Browse public circles to join one that's open."
            actionLabel="Explore groups"
            actionHref="/khatm/groups"
          />
        </main>
      </div>
    );
  }

  const pct = Math.round((group.juz_completed / 30) * 100);
  const joinTarget = `/khatm/join/${group.invite_code}`;

  return (
    <div className="min-h-dvh bg-background">
      <SEO
        title={`${group.name} — Group Khatm on Heartify`}
        description={`${group.juz_completed}/30 juz completed by ${group.member_count} reciters. Join and claim a juz.`}
        path={`/k/${group.id}`}
      />
      <main className="container mx-auto max-w-lg px-4 py-12 space-y-6">
        <header className="text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Group Khatm</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">{group.name}</h1>
          {group.intention && (
            <p className="mt-2 text-sm text-muted-foreground italic">Intention: {group.intention}</p>
          )}
          {group.description && (
            <p className="mt-2 text-sm text-muted-foreground">{group.description}</p>
          )}
        </header>

        <Card className="p-6 space-y-5">
          <div>
            <div className="flex items-center justify-between text-sm text-foreground mb-1">
              <span className="inline-flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-primary" /> Progress
              </span>
              <span className="font-semibold">{group.juz_completed}/30 juz</span>
            </div>
            <Progress value={pct} />
            <div className="mt-1 text-xs text-muted-foreground">
              {group.juz_claimed} claimed · {group.juz_completed} completed
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <Users className="h-5 w-5 mx-auto text-primary" />
              <div className="mt-1 text-2xl font-bold text-foreground">{group.member_count}</div>
              <div className="text-xs text-muted-foreground">Reciters</div>
            </div>
            <div>
              <CheckCircle2 className={`h-5 w-5 mx-auto ${group.completed_at ? "text-emerald-500" : "text-muted-foreground"}`} />
              <div className="mt-1 text-2xl font-bold text-foreground">{pct}%</div>
              <div className="text-xs text-muted-foreground">
                {group.completed_at ? "Completed 🎉" : "In progress"}
              </div>
            </div>
          </div>

          {!group.completed_at && (
            <Button asChild className="w-full">
              <Link to={joinTarget}>Join & claim a juz</Link>
            </Button>
          )}
          <p className="text-xs text-center text-muted-foreground">
            You'll be asked to sign in first. Every juz counts toward one shared completion.
          </p>
        </Card>
      </main>
    </div>
  );
}
