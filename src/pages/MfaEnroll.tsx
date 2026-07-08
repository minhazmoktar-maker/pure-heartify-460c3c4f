import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { ShieldCheck, KeyRound, Loader2 } from "lucide-react";

/**
 * TOTP MFA enrollment + verification.
 *
 * - Any signed-in user may enroll (recommended for all).
 * - Admins are REQUIRED to enroll and to sign in with AAL2 to reach any
 *   /admin/* or /owner route (enforced client-side by `useRequireAdminMfa`
 *   and server-side by RLS policies that gate on the `has_role`+`aal` claim).
 */
export default function MfaEnroll() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [enrolled, setEnrolled] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/login"); return; }
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (verified) { setEnrolled(true); setLoading(false); return; }
      const staleFactors = data?.totp?.filter((f) => f.status !== "verified") ?? [];
      for (const factor of staleFactors) {
        await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data: enroll, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: "Heartify TOTP" });
      if (error) { toast({ title: "Enrollment failed", description: error.message, variant: "destructive" }); setLoading(false); return; }
      setFactorId(enroll.id);
      setQr(enroll.totp.qr_code);
      setSecret(enroll.totp.secret);
      setLoading(false);
    })();
  }, [user, authLoading, navigate]);

  const verify = async () => {
    if (!factorId || code.length < 6) return;
    setBusy(true);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
    if (cErr) { toast({ title: "Challenge failed", description: cErr.message, variant: "destructive" }); setBusy(false); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    setBusy(false);
    if (error) { toast({ title: "Invalid code", description: error.message, variant: "destructive" }); return; }
    toast({ title: "MFA enabled", description: "Two-factor authentication is now active." });
    setEnrolled(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-xl px-4 py-8">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-heading text-2xl font-bold">Two-factor authentication</h1>
        </div>

        {authLoading || loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : enrolled ? (
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">TOTP is enabled on your account. You'll be prompted for a 6-digit code on every sign-in.</p>
            <Button className="mt-4" onClick={() => navigate("/profile")}>Back to profile</Button>
          </Card>
        ) : (
          <Card className="p-6 space-y-4">
            <p className="text-sm text-muted-foreground">Scan this QR code with an authenticator app (1Password, Google Authenticator, Authy) or enter the secret manually.</p>
            {qr && <img src={qr} alt="TOTP QR code" className="mx-auto h-56 w-56 rounded-lg border border-border bg-white p-2" />}
            {secret && (
              <div className="rounded-lg border border-border bg-muted p-3 text-center font-mono text-xs break-all">{secret}</div>
            )}
            <div className="flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-muted-foreground" />
              <Input aria-label="Authenticator code" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
              <Button onClick={verify} disabled={busy || code.length < 6}>{busy ? "Verifying..." : "Verify"}</Button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
