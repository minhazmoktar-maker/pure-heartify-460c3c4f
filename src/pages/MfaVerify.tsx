import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { ShieldCheck, Loader2 } from "lucide-react";

/**
 * MFA challenge screen used mid-sign-in when the account has TOTP enrolled.
 * Renders when supabase.auth.mfa.getAuthenticatorAssuranceLevel() returns
 * currentLevel < nextLevel (i.e. user needs to step up to aal2).
 */
export default function MfaVerify() {
  const navigate = useNavigate();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const verified = data?.totp?.find((f) => f.status === "verified");
      if (!verified) { navigate("/"); return; }
      setFactorId(verified.id);
      setLoading(false);
    })();
  }, [navigate]);

  const verify = async () => {
    if (!factorId || code.length < 6) return;
    setBusy(true);
    const { data: challenge, error: cErr } = await supabase.auth.mfa.challenge({ factorId });
    if (cErr) { toast({ title: "Challenge failed", description: cErr.message, variant: "destructive" }); setBusy(false); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code });
    setBusy(false);
    if (error) { toast({ title: "Invalid code", description: error.message, variant: "destructive" }); return; }
    navigate("/");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-primary" />
          <h1 className="font-heading text-xl font-bold">Verify it's you</h1>
        </div>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">Enter the 6-digit code from your authenticator app.</p>
            <Input inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="123456" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))} />
            <Button className="w-full" onClick={verify} disabled={busy || code.length < 6}>{busy ? "Verifying..." : "Continue"}</Button>
          </>
        )}
      </Card>
    </div>
  );
}
