import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";

import SEO from "@/components/SEO";

interface InviteRow {
  id: string;
  household_id: string;
  invited_email: string;
  status: string;
  expires_at: string;
}

/**
 * `/plus/join?token=...` — accept a family-seat invite.
 * - Signed-out: prompts login, preserving the token.
 * - Wrong-email: shows the invite target so the user knows which account to use.
 * - Success: joins the household and redirects to `/plus`.
 */
export default function PlusInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<
    { kind: "loading" }
    | { kind: "invalid"; msg: string }
    | { kind: "ready"; invite: InviteRow }
    | { kind: "done" }
  >({ kind: "loading" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!token) { setState({ kind: "invalid", msg: "This invite link is missing its token." }); return; }
    if (authLoading) return;
    if (!user) return; // wait for sign-in
    (async () => {
      const { data, error } = await supabase
        .from("plus_seat_invites")
        .select("id, household_id, invited_email, status, expires_at")
        .eq("token", token)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setState({ kind: "invalid", msg: "We couldn't find this invite. Ask the sender for a fresh link." });
        return;
      }
      if (data.status !== "pending") {
        setState({ kind: "invalid", msg: `This invite is ${data.status}.` });
        return;
      }
      if (new Date(data.expires_at).getTime() <= Date.now()) {
        setState({ kind: "invalid", msg: "This invite has expired. Ask the sender for a fresh link." });
        return;
      }
      setState({ kind: "ready", invite: data as InviteRow });
    })();
    return () => { cancelled = true; };
  }, [token, authLoading, user]);

  async function accept() {
    if (state.kind !== "ready" || !user) return;
    setBusy(true);
    const { error: memberErr } = await supabase
      .from("plus_household_members")
      .insert({ household_id: state.invite.household_id, user_id: user.id, role: "member" });
    if (memberErr) {
      setBusy(false);
      toast.error(memberErr.message.includes("full") ? "This household is full." : memberErr.message);
      return;
    }
    await supabase
      .from("plus_seat_invites")
      .update({ status: "accepted", accepted_by: user.id, accepted_at: new Date().toISOString() })
      .eq("id", state.invite.id);
    setBusy(false);
    setState({ kind: "done" });
    toast.success("You joined the household");
    setTimeout(() => navigate("/plus"), 1200);
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Accept Heartify+ Family invite"
        description="Join a Heartify+ family household."
        path="/plus/join"
      />
      <Navbar />
      <main className="mx-auto max-w-lg px-4 py-16">
        <h1 className="font-heading text-2xl font-bold text-foreground">Family invite</h1>

        {state.kind === "loading" || authLoading ? (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking your invite…
          </div>
        ) : !user ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              Sign in with the email your family sent the invite to, then this page will let you join.
            </p>
            <Button asChild className="mt-4">
              <Link to={`/login?next=${encodeURIComponent(`/plus/join?token=${token}`)}`}>Sign in</Link>
            </Button>
          </div>
        ) : state.kind === "invalid" ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" /> <span className="font-semibold">Invite unavailable</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{state.msg}</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/plus">Back to Heartify+</Link></Button>
          </div>
        ) : state.kind === "done" ? (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-primary">
              <CheckCircle2 className="h-5 w-5" /> <span className="font-semibold">Welcome to the household</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Redirecting you to Heartify+…</p>
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">
              You've been invited to join a Heartify+ family household. This invite was sent to{" "}
              <span className="font-medium text-foreground">{state.invite.invited_email}</span>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Signed in as {user.email}. If this isn't the invited address, sign out and back in with the right account.
            </p>
            <div className="mt-4 flex gap-2">
              <Button onClick={accept} disabled={busy}>
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Accept and join
              </Button>
              <Button variant="ghost" asChild><Link to="/plus">Not now</Link></Button>
            </div>
          </div>
        )}
      </main>
      
    </div>
  );
}
