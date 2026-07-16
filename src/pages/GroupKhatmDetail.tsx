import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, Copy, Check, Share2, Loader2, CheckCircle2, Circle, Sparkles, Users, BookOpen } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { formatDistanceToNow } from "date-fns";

interface Group {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  intention: string | null;
  invite_code: string;
  is_public: boolean;
  completed_at: string | null;
  created_at: string;
}

interface Claim {
  juz_number: number;
  user_id: string;
  claimed_at: string;
  completed_at: string | null;
}

interface Member {
  user_id: string;
  role: string;
}

interface EventRow {
  id: string;
  user_id: string | null;
  kind: string;
  data: Record<string, unknown>;
  created_at: string;
}

export default function GroupKhatmDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: g }, { data: c }, { data: m }, { data: ev }] = await Promise.all([
      supabase.from("khatm_groups").select("*").eq("id", id).maybeSingle(),
      supabase.from("khatm_juz_claims").select("juz_number,user_id,claimed_at,completed_at").eq("group_id", id),
      supabase.from("khatm_group_members").select("user_id,role").eq("group_id", id),
      supabase
        .from("khatm_events")
        .select("id,user_id,kind,data,created_at")
        .eq("group_id", id)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);
    setGroup((g as Group) ?? null);
    setClaims((c ?? []) as Claim[]);
    setMembers((m ?? []) as Member[]);
    setEvents((ev ?? []) as EventRow[]);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
    if (!id) return;
    const ch = supabase
      .channel(`khatm:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "khatm_juz_claims", filter: `group_id=eq.${id}` },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "khatm_events", filter: `group_id=eq.${id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [id, load]);

  const isMember = useMemo(
    () => !!user && members.some((m) => m.user_id === user.id),
    [members, user],
  );

  const claimsByJuz = useMemo(() => {
    const map = new Map<number, Claim>();
    claims.forEach((c) => map.set(c.juz_number, c));
    return map;
  }, [claims]);

  const completedCount = claims.filter((c) => c.completed_at).length;
  const pct = (completedCount / 30) * 100;

  const shareUrl = group
    ? `${window.location.origin}/k/${group.id}?c=${group.invite_code}`
    : "";

  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      track("khatm_invite_copied", { group_id: id });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  };

  const nativeShare = async () => {
    if (!group) return;
    track("khatm_invite_shared", { group_id: id });
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join our Khatm: ${group.name}`,
          text: `Join our group Quran completion — 30 juz split among ${members.length || 30} people.`,
          url: shareUrl,
        });
        return;
      } catch {
        /* cancelled */
      }
    }
    void copyShare();
  };

  const join = async () => {
    if (!user || !id) {
      toast.error("Please sign in first");
      return;
    }
    const { error } = await supabase.from("khatm_group_members").insert({
      group_id: id,
      user_id: user.id,
      role: "member",
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("khatm_events").insert({
      group_id: id,
      user_id: user.id,
      kind: "member_joined",
      data: {},
    });
    void track("khatm_group_joined", { group_id: id });
    toast.success("You joined the Khatm");
    await load();
  };

  const claim = async (juz: number) => {
    if (!id) return;
    setBusy(juz);
    const { error } = await supabase.rpc("claim_juz", { _group_id: id, _juz: juz });
    setBusy(null);
    if (error) {
      toast.error(error.message === "juz_taken" ? "That Juz is already claimed" : error.message);
      return;
    }
    void track("khatm_juz_claimed", { group_id: id, juz });
    toast.success(`You claimed Juz ${juz}`);
  };

  const complete = async (juz: number) => {
    if (!id) return;
    setBusy(juz);
    const { error } = await supabase.rpc("complete_juz", { _group_id: id, _juz: juz });
    setBusy(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    void track("khatm_juz_completed", { group_id: id, juz });
    toast.success(`Juz ${juz} marked complete`);
  };

  const release = async (juz: number) => {
    if (!id) return;
    setBusy(juz);
    const { error } = await supabase
      .from("khatm_juz_claims")
      .delete()
      .eq("group_id", id)
      .eq("juz_number", juz)
      .is("completed_at", null);
    setBusy(null);
    if (error) toast.error(error.message);
    else toast("Released back to the group");
  };

  if (loading) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <PageSkeleton variant="detail" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-dvh bg-background">
        <Navbar />
        <main className="container mx-auto max-w-2xl px-4 py-12">
          <EmptyState
            icon={BookOpen}
            title="Group not found"
            description="This Khatm group is private, no longer available, or you don't have access. Explore public circles below."
            actionLabel="Browse groups"
            actionHref="/khatm/groups"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO title={`${group.name} — Group Khatm`} description={group.description ?? "Group Quran completion"} path={`/khatm/group/${group.id}`} />
      <Navbar />
      <main className="container mx-auto max-w-3xl px-4 py-6 space-y-5">
        <Link
          to="/khatm/groups"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> All groups
        </Link>

        <Card className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-heading font-bold text-foreground">{group.name}</h1>
              {group.description && (
                <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
              )}
              {group.intention && (
                <p className="mt-2 text-sm italic text-primary/80">
                  Intention: {group.intention}
                </p>
              )}
            </div>
            {group.completed_at && (
              <span className="heartify-chip heartify-chip--primary">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Completed
              </span>
            )}
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between text-micro text-muted-foreground">
              <span>Progress</span>
              <span className="tabular-nums">{completedCount}/30 Juz · {members.length} members</span>
            </div>
            <Progress value={pct} aria-label="Group Khatm progress" />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {!isMember && user && (
              <Button size="sm" onClick={join}>
                Join this Khatm
              </Button>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={copyShare}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied" : "Copy invite"}
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={nativeShare}>
              <Share2 className="h-4 w-4" aria-hidden /> Share
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Choose your Juz</h2>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-10 gap-2" role="grid" aria-label="Juz grid">
            {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => {
              const c = claimsByJuz.get(n);
              const mine = c && user && c.user_id === user.id;
              const done = !!c?.completed_at;
              const taken = !!c && !mine;
              return (
                <button
                  key={n}
                  disabled={busy === n || (taken && !done) || !user}
                  onClick={() => {
                    if (!c) void claim(n);
                    else if (mine && !done) void complete(n);
                  }}
                  aria-label={
                    done
                      ? `Juz ${n} completed`
                      : mine
                        ? `Juz ${n} claimed by you — tap to mark complete`
                        : taken
                          ? `Juz ${n} claimed by another member`
                          : `Juz ${n} available — tap to claim`
                  }
                  className={`relative aspect-square rounded-card border text-sm font-medium tabular-nums transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
                    done
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : mine
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : taken
                          ? "border-border bg-muted/40 text-muted-foreground cursor-not-allowed"
                          : "border-border hover:border-primary/60 hover:bg-primary/5"
                  }`}
                >
                  {busy === n ? (
                    <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <span>{n}</span>
                      {done && <CheckCircle2 className="absolute right-0.5 top-0.5 h-3 w-3" aria-hidden />}
                      {mine && !done && <Circle className="absolute right-0.5 top-0.5 h-3 w-3 fill-current" aria-hidden />}
                    </>
                  )}
                </button>
              );
            })}
          </div>
          {isMember && (
            <p className="mt-3 text-micro text-muted-foreground">
              Tap an empty Juz to claim it. Tap your claimed Juz to mark complete. Long-press or use the
              release action below to give it back.
            </p>
          )}
          {isMember && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {claims
                .filter((c) => user && c.user_id === user.id && !c.completed_at)
                .map((c) => (
                  <Button
                    key={c.juz_number}
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-micro"
                    onClick={() => release(c.juz_number)}
                  >
                    Release Juz {c.juz_number}
                  </Button>
                ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden /> Activity
          </h2>
          {events.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No activity yet"
              description="Be the first to claim a Juz — every reservation shows up here for the whole circle."
              tone="muted"
              className="border-none bg-transparent py-6"
            />
          ) : (
            <ul className="space-y-2 text-sm">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-2">
                  <span className="text-muted-foreground">
                    {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                  </span>
                  <span className="text-foreground">
                    {e.kind === "juz_claimed" && `A member claimed Juz ${(e.data as { juz?: number }).juz}`}
                    {e.kind === "juz_completed" && `Juz ${(e.data as { juz?: number }).juz} completed`}
                    {e.kind === "member_joined" && `A new member joined`}
                    {e.kind === "group_completed" && `🎉 Khatm complete — jazakumullahu khayran`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
