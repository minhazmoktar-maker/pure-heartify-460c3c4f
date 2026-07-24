// Owner-only page to mint a magic-link admin review token.
// Route: /admin/mint-review-token — bypasses AdminRoute AAL2 by design,
// but the RPC itself is gated by is_owner(auth.uid()) server-side.
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useRole } from "@/hooks/useRole";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Copy, KeyRound } from "lucide-react";
import SEO from "@/components/SEO";

export default function AdminMintReviewToken() {
  const { user, loading: authLoading } = useAuth();
  const { isOwner, loading: roleLoading } = useRole();
  const [ttl, setTtl] = useState(720);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);

  if (authLoading || roleLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login?next=/admin/mint-review-token" replace />;
  if (!isOwner) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center text-muted-foreground">
        Platform owners only.
      </div>
    );
  }

  const mint = async () => {
    setBusy(true);
    setUrl(null);
    try {
      const { data, error } = await supabase.rpc("mint_admin_review_token", {
        _purpose: "channel_pipeline",
        _ttl_hours: ttl,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row?.token) throw new Error("No token returned");
      const link = `${window.location.origin}/review/${row.token}`;
      setUrl(link);
      setExpires(row.expires_at);
      toast.success("Magic link minted");
    } catch (e) {
      toast.error(`Failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="min-h-dvh bg-background p-6">
      <SEO title="Mint review token — Heartify" description="Owner-only admin review token minter." path="/admin/mint-review-token" />
      <div className="max-w-xl mx-auto space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Mint admin review magic link
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Generates a one-off URL for the channel review queue that bypasses AAL2/MFA. Treat like a password.
            </p>
            <div className="space-y-2">
              <Label htmlFor="ttl">TTL (hours, max 2160)</Label>
              <Input
                id="ttl"
                type="number"
                min={1}
                max={2160}
                value={ttl}
                onChange={(e) => setTtl(Math.max(1, Math.min(2160, Number(e.target.value) || 1)))}
              />
            </div>
            <Button onClick={mint} disabled={busy} className="w-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Generate link
            </Button>
            {url && (
              <div className="space-y-2 pt-4 border-t">
                <Label>Magic link</Label>
                <div className="flex gap-2">
                  <Input readOnly value={url} className="font-mono text-xs" />
                  <Button size="icon" variant="outline" onClick={copy} aria-label="Copy">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {expires && (
                  <p className="text-xs text-muted-foreground">
                    Expires: {new Date(expires).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
