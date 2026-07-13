import { useState } from "react";
import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Gift, CheckCircle2 } from "lucide-react";

const ERROR_MAP: Record<string, string> = {
  auth_required: "Sign in to redeem a code.",
  invalid_code: "That code doesn't look right.",
  not_found: "We couldn't find that code.",
  already_redeemed: "This code has already been used.",
  expired: "This code has expired.",
};

export default function Redeem() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<{ months: number } | null>(null);

  const redeem = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      // Types regen after migration approval; call safely in the meantime.
      const { data, error } = await (supabase as any).rpc("redeem_gift_code", {
        p_code: code.trim(),
      });
      if (error) {
        const key = (error.message || "").split(/\s+/).pop() ?? "";
        toast.error(ERROR_MAP[key] ?? "Redemption failed. Please try again.");
      } else if (data?.ok) {
        setSuccess({ months: data.months });
        toast.success(`Added ${data.months} month${data.months === 1 ? "" : "s"} of Heartify Plus 🌿`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO
        path="/redeem"
        title="Redeem a gift code — Heartify Plus"
        description="Enter your Heartify Plus gift code to unlock months of premium features."
      />
      <Navbar />
      <PageHeader title="Redeem a gift" subtitle="Enter your Heartify Plus code" />
      <div className="container mx-auto max-w-md px-4 pb-16">
        {!user ? (
          <div className="rounded-lg border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">
              <Link to="/login?redirect=/redeem" className="text-primary underline">
                Sign in
              </Link>{" "}
              to redeem your gift code.
            </p>
          </div>
        ) : success ? (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="text-lg font-semibold">Redeemed — jazakAllah khair</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {success.months} month{success.months === 1 ? "" : "s"} of Heartify Plus is now active on your account.
            </p>
            <Button asChild className="mt-4">
              <Link to="/plus">Explore Plus</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-border bg-card p-6">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Gift className="h-4 w-4 text-primary" /> Enter the code from your gift or invite email.
            </div>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={64}
              className="font-mono tracking-widest"
            />
            <Button className="w-full" disabled={loading || code.trim().length < 4} onClick={redeem}>
              {loading ? "Redeeming…" : "Redeem"}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
