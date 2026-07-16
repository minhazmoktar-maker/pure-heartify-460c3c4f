import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail, Loader2 } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function VerifyEmail() {
  const { user, loading } = useAuth();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const t = setTimeout(() => setCooldown(cooldown - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.email_confirmed_at) return <Navigate to="/" replace />;

  const resend = async () => {
    if (!user.email) return;
    setSending(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    setSending(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Verification email sent.");
      setCooldown(60);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <SEO title="Verify your email — Heartify" description="Verify your email to continue." path="/verify-email" />
      <div className="w-full max-w-md rounded-card border border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-pill bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h1 className="mt-4 text-heading font-semibold text-foreground">Verify your email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a link to <span className="font-medium text-foreground">{user.email}</span>. Click it to
          finish setting up your account.
        </p>
        <button
          onClick={resend}
          disabled={sending || cooldown > 0}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-card bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {sending && <Loader2 className="h-4 w-4 animate-spin" />}
          {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend verification email"}
        </button>
        <button
          onClick={signOut}
          className="mt-3 w-full rounded-card border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent/10"
        >
          Sign in with a different account
        </button>
      </div>
    </div>
  );
}
