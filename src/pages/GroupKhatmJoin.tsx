import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
      await supabase
        .from("khatm_group_members")
        .upsert({ group_id: g.id, user_id: user.id, role: "member" });
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

  return (
    <div className="min-h-dvh bg-background">
      <SEO title="Join a Khatm circle" description="Join a group Quran completion." path={`/khatm/join/${code ?? ""}`} />
      <Navbar />
      <main className="container mx-auto max-w-md px-4 py-16">
        <Card className="p-6 text-center space-y-4">
          {state === "working" && <Loader2 className="mx-auto h-6 w-6 animate-spin" />}
          {state === "notfound" && (
            <>
              <h1 className="text-lg font-semibold">Invite not found</h1>
              <p className="text-sm text-muted-foreground">
                That invite code isn't valid. Ask the organiser for a new link.
              </p>
              <Button asChild variant="outline">
                <Link to="/khatm/groups">Browse groups</Link>
              </Button>
            </>
          )}
          {state === "idle" && !user && (
            <>
              <h1 className="text-lg font-semibold">Sign in to join</h1>
              <p className="text-sm text-muted-foreground">
                Create an account or sign in to reserve your Juz.
              </p>
              <Button asChild>
                <Link
                  to={`/signup?next=${encodeURIComponent(`/khatm/join/${code}`)}`}
                >
                  Continue
                </Link>
              </Button>
            </>
          )}
          {state === "done" && groupId && (
            <Button asChild>
              <Link to={`/khatm/group/${groupId}`}>Open group</Link>
            </Button>
          )}
        </Card>
      </main>
    </div>
  );
}
