import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ShieldCheck, ShieldAlert, Loader2, Trash2, Smartphone, KeyRound, Fingerprint } from "lucide-react";

type Factor = {
  id: string;
  factor_type: string;
  friendly_name?: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const TYPE_META: Record<string, { label: string; Icon: any }> = {
  totp:     { label: "Authenticator app (TOTP)", Icon: KeyRound },
  phone:    { label: "SMS", Icon: Smartphone },
  webauthn: { label: "Security key / passkey", Icon: Fingerprint },
};

export default function MfaStatusCard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [factors, setFactors] = useState<Factor[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) {
      toast.error("Could not load MFA factors", { description: error.message });
      setLoading(false);
      return;
    }
    const all: Factor[] = [
      ...((data?.totp as Factor[]) ?? []),
      ...(((data as any)?.phone as Factor[]) ?? []),
    ];
    setFactors(all);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const unenroll = async (id: string) => {
    setBusyId(id);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: id });
    setBusyId(null);
    if (error) return toast.error("Could not remove factor", { description: error.message });
    toast.success("Factor removed");
    load();
  };

  const verified = factors.filter(f => f.status === "verified");
  const pending = factors.filter(f => f.status !== "verified");

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {verified.length > 0
            ? <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
            : <ShieldAlert className="h-5 w-5 text-destructive mt-0.5" />}
          <div>
            <h3 className="text-sm font-semibold">Two-factor authentication</h3>
            <p className="text-micro text-muted-foreground">
              {verified.length > 0
                ? `${verified.length} factor${verified.length > 1 ? "s" : ""} active`
                : "No verified factors — recommended for all admins"}
            </p>
          </div>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/mfa-enroll")}>
          {verified.length > 0 ? "Add factor" : "Enroll"}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : factors.length === 0 ? (
        <p className="mt-3 text-micro text-muted-foreground">No factors enrolled yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {[...verified, ...pending].map(f => {
            const meta = TYPE_META[f.factor_type] ?? { label: f.factor_type, Icon: KeyRound };
            const Icon = meta.Icon;
            return (
              <li key={f.id} className="flex items-center justify-between rounded border p-2 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <div className="truncate font-medium">{f.friendly_name || meta.label}</div>
                    <div className="text-micro text-muted-foreground">
                      {meta.label} · updated {new Date(f.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={f.status === "verified" ? "secondary" : "outline"}>{f.status}</Badge>
                  <Button size="sm" variant="ghost" disabled={busyId === f.id} onClick={() => unenroll(f.id)}>
                    {busyId === f.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
