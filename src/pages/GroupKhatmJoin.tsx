import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BookOpen, LogIn, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import PageSkeleton from "@/components/PageSkeleton";
import EmptyState from "@/components/EmptyState";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

/**
 * Deep-link join page: /khatm/join/:code
 * Signed in → auto-add membership and forward to the group.
 * Signed out → show sign-in CTA that returns here after auth.
 */
export default function GroupKhatmJoin() {
  const { code } = useParams<{ code: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<"idle" | "working" | "notfound" | "done">("idle");
  const [groupId, setGroupId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!code) return;
      setState("working");
      const { data: g } = await supabase
        .from("khatm_groups")
        .select("id,name")
        .eq("invite_code", code.toLowerCase())
        .maybeSingle();
      if (!g) {
        setState("notfound");
        return;
      }
      setGroupId(g.id);
      if (!user) {
        setState("idle");
        return;
      }
      const { error: joinErr } = await supabase.rpc("join_khatm_group", {
        _group_id: g.id,
        _invite_code: code,
      });
      if (joinErr) {
        toast.error(joinErr.message);
        setState("notfound");
        return;
      }
      await supabase.from("khatm_events").insert({
        group_id: g.id,
        user_id: user.id,
        kind: "member_joined",
        data: { via: "invite_link" },
      });
      void track("khatm_group_joined_via_link", { group_id: g.id, code });
      toast.success(`Joined ${g.name}`);
      setState("done");
      navigate(`/khatm/group/${g.id}`, { replace: true });
    })();
  }, [code, user, navigate]);

  if (state === "working") {
    return (
      <div className="min-h-dvh bg-background">
        <SEO title="Joining Khatm circle…" description="One moment while we reserve your seat." path={`/khatm/join/${code ?? ""}`} />
        <Navbar />
        <PageSkeleton variant="default" className="max-w-md" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Join a Khatm circle" description="Join a group Quran completion." path={`/khatm/join/${code ?? ""}`} />
      <Navbar />
      <main className="container mx-auto max-w-md px-4 py-16">
        {state === "notfound" && (
          <EmptyState
            icon={BookOpen}
            title="Invite not found"
            description="That invite code isn't valid or has been retired. Ask the organiser for a fresh link, or explore public circles."
            actionLabel="Browse groups"
            actionHref="/khatm/groups"
          />
        )}
        {state === "idle" && !user && (
          <EmptyState
            icon={LogIn}
            title="Sign in to reserve your Juz"
            description="Create an account or sign in to claim a Juz. We'll bring you right back to this circle."
            actionLabel="Continue"
            actionHref={`/signup?next=${encodeURIComponent(`/khatm/join/${code}`)}`}
          />
        )}
        {state === "done" && groupId && (
          <EmptyState
            icon={Users}
            title="You're in the circle"
            description="Open the group to pick your Juz and start reciting."
            actionLabel="Open group"
            actionHref={`/khatm/group/${groupId}`}
          />
        )}
      </main>
    </div>
  );
}
