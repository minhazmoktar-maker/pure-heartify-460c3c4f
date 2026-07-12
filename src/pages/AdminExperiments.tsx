import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";

type Experiment = {
  id: string;
  key: string;
  name: string;
  status: "draft" | "running" | "paused" | "completed" | "archived";
  traffic_allocation: number;
  primary_metric: string | null;
  started_at: string | null;
  ended_at: string | null;
};

type Result = {
  experiment_id: string;
  experiment_key: string;
  variant_key: string;
  exposures: number;
  unique_users: number;
};

export default function AdminExperiments() {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [results, setResults] = useState<Result[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newName, setNewName] = useState("");
  const [newVariants, setNewVariants] = useState("control:0.5,treatment:0.5");

  async function load() {
    const [{ data: exps }, { data: res }] = await Promise.all([
      supabase.from("experiments").select("*").order("created_at", { ascending: false }),
      supabase.from("admin_experiment_results").select("*"),
    ]);
    setExperiments((exps as Experiment[]) ?? []);
    setResults((res as Result[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create() {
    if (!newKey || !newName) return;
    const { data, error } = await supabase.from("experiments").insert([{
      key: newKey, name: newName, status: "draft" as const,
    }]).select().single();
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    const parts = newVariants.split(",").map((p) => {
      const [k, w] = p.trim().split(":");
      return { experiment_id: data.id, key: k, weight: parseFloat(w ?? "0.5"), is_control: k === "control" };
    });
    await supabase.from("experiment_variants").insert(parts);
    setNewKey(""); setNewName(""); setNewVariants("control:0.5,treatment:0.5");
    toast({ title: "Experiment created" });
    load();
  }

  async function setStatus(id: string, status: Experiment["status"]) {
    const patch: Partial<Experiment> = { status };
    if (status === "running") patch.started_at = new Date().toISOString();
    if (status === "completed" || status === "archived") patch.ended_at = new Date().toISOString();
    const { error } = await supabase.from("experiments").update(patch).eq("id", id);
    if (error) toast({ title: error.message, variant: "destructive" });
    else load();
  }

  return (
    <>
      <SEO path="/admin/experiments" title="Experiments — Heartify" description="Manage A/B experiments." />
      <PageHeader title="Experiments" subtitle="A/B tests with sticky assignment, exposures, and guardrails." backHref="/admin" />
      <div className="container mx-auto max-w-6xl px-4 pb-16 space-y-8">
        <Card className="p-5">
          <h2 className="text-base font-semibold mb-4">New experiment</h2>
          <div className="grid gap-3 md:grid-cols-4">
            <Input placeholder="key (e.g. onboarding_v2)" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <Input placeholder="Human name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <Input placeholder="control:0.5,treatment:0.5" value={newVariants} onChange={(e) => setNewVariants(e.target.value)} />
            <Button onClick={create}>Create</Button>
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold mb-4">All experiments</h2>
          <div className="space-y-3">
            {experiments.map((e) => {
              const rs = results.filter((r) => r.experiment_id === e.id);
              return (
                <div key={e.id} className="rounded-lg border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-semibold">{e.name} <span className="text-xs text-muted-foreground">({e.key})</span></div>
                      <div className="text-xs text-muted-foreground">Status: {e.status} · Traffic: {(e.traffic_allocation * 100).toFixed(0)}%</div>
                    </div>
                    <div className="flex gap-2">
                      <Select value={e.status} onValueChange={(v) => setStatus(e.id, v as Experiment["status"])}>
                        <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft</SelectItem>
                          <SelectItem value="running">Running</SelectItem>
                          <SelectItem value="paused">Paused</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="archived">Archived</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {rs.length > 0 && (
                    <table className="mt-3 w-full text-sm">
                      <thead className="text-xs text-muted-foreground"><tr><th className="text-left">Variant</th><th className="text-right">Exposures</th><th className="text-right">Unique users</th></tr></thead>
                      <tbody>
                        {rs.map((r) => (
                          <tr key={r.variant_key} className="border-t border-border">
                            <td className="py-1">{r.variant_key}</td>
                            <td className="py-1 text-right tabular-nums">{r.exposures.toLocaleString()}</td>
                            <td className="py-1 text-right tabular-nums">{r.unique_users.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
            {experiments.length === 0 && <p className="text-sm text-muted-foreground">No experiments yet.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}
