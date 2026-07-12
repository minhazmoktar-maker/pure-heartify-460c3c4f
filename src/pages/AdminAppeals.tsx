import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import PageHeader from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import type { Appeal } from "@/hooks/useAppeals";
import { useToast } from "@/hooks/use-toast";

const BADGE: Record<Appeal["status"], string> = {
  open: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  approved: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  denied: "bg-red-500/15 text-red-700 dark:text-red-300",
  withdrawn: "bg-muted text-muted-foreground",
};

export default function AdminAppeals() {
  const [rows, setRows] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("appeals")
      .select("*")
      .order("status", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) toast({ title: error.message, variant: "destructive" });
    setRows((data ?? []) as Appeal[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const resolve = async (id: string, status: "approved" | "denied", resolution: string): Promise<void> => {
    const { error } = await supabase.from("appeals").update({ status, resolution }).eq("id", id);
    if (error) {
      toast({ title: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Appeal ${status}` });
    await load();
  };

  return (
    <>
      <PageHeader title="Appeals" subtitle="Review and resolve user appeals." />
      <div className="container mx-auto max-w-5xl px-4 pb-16">
        {loading ? (
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : (
          <ul className="space-y-4">
            {rows.map((a) => (
              <AppealCard key={a.id} appeal={a} onResolve={resolve} />
            ))}
            {rows.length === 0 && <p className="text-sm text-muted-foreground">No appeals.</p>}
          </ul>
        )}
      </div>
    </>
  );
}

function AppealCard({ appeal, onResolve }: { appeal: Appeal; onResolve: (id: string, status: "approved" | "denied", resolution: string) => Promise<void> }) {
  const [resolution, setResolution] = useState(appeal.resolution ?? "");
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium capitalize">{appeal.subject_kind} · {appeal.subject_ref}</p>
          <p className="text-xs text-muted-foreground">
            User {appeal.user_id.slice(0, 8)}… · {formatDistanceToNow(new Date(appeal.created_at), { addSuffix: true })}
          </p>
        </div>
        <Badge className={BADGE[appeal.status]}>{appeal.status}</Badge>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm">{appeal.reason}</p>
      {appeal.status === "open" && (
        <div className="mt-4 space-y-2">
          <Textarea
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            placeholder="Explain the decision to the user (they will see this)."
            rows={2}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="destructive" disabled={resolution.trim().length < 5} onClick={() => onResolve(appeal.id, "denied", resolution)}>
              Deny
            </Button>
            <Button size="sm" disabled={resolution.trim().length < 5} onClick={() => onResolve(appeal.id, "approved", resolution)}>
              Approve
            </Button>
          </div>
        </div>
      )}
      {appeal.resolution && appeal.status !== "open" && (
        <p className="mt-3 border-t border-border pt-3 text-sm">
          <span className="font-medium">Reviewer note:</span> {appeal.resolution}
        </p>
      )}
    </li>
  );
}
