import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";

type Flag = {
  key: string;
  enabled: boolean;
  kill_switch: boolean;
  rollout_percent: number;
  cohort_id: string | null;
  description: string | null;
};

type Cohort = { id: string; key: string; name: string };

export default function AdminFeatureFlags() {
  const [flags, setFlags] = useState<Flag[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [newKey, setNewKey] = useState("");

  async function load() {
    const [{ data: f }, { data: c }] = await Promise.all([
      supabase.from("feature_flags").select("*").order("key"),
      supabase.from("user_cohorts").select("id,key,name").order("name"),
    ]);
    setFlags((f as Flag[]) ?? []);
    setCohorts((c as Cohort[]) ?? []);
  }
  useEffect(() => { load(); }, []);

  async function update(key: string, patch: Partial<Flag>) {
    const { error } = await supabase.from("feature_flags").update(patch).eq("key", key);
    if (error) toast({ title: error.message, variant: "destructive" });
    else load();
  }

  async function create() {
    if (!newKey) return;
    const { error } = await supabase.from("feature_flags").insert([{ key: newKey, enabled: false, rollout_percent: 0 }]);
    if (error) toast({ title: error.message, variant: "destructive" });
    else { setNewKey(""); load(); }
  }

  return (
    <>
      <SEO path="/admin/feature-flags" title="Feature flags — Heartify" description="Percentage rollout, cohort targeting, and kill-switch controls." />
      <PageHeader title="Feature flags" subtitle="%, cohort, kill-switch — evaluated server-side per user." backHref="/admin" />
      <div className="container mx-auto max-w-6xl px-4 pb-16 space-y-6">
        <Card className="p-5">
          <div className="flex gap-3">
            <Input placeholder="new.flag.key" value={newKey} onChange={(e) => setNewKey(e.target.value)} />
            <Button onClick={create}>Create</Button>
          </div>
        </Card>

        <Card className="p-5">
          <table className="w-full text-sm">
            <thead className="text-micro text-muted-foreground">
              <tr>
                <th className="text-left py-2">Key</th>
                <th className="text-center">Enabled</th>
                <th className="text-center">Kill</th>
                <th className="text-center">Rollout %</th>
                <th className="text-left">Cohort</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.key} className="border-t border-border">
                  <td className="py-2 font-mono text-micro">{f.key}</td>
                  <td className="text-center">
                    <Switch checked={f.enabled} onCheckedChange={(v) => update(f.key, { enabled: v })} />
                  </td>
                  <td className="text-center">
                    <Switch checked={f.kill_switch} onCheckedChange={(v) => update(f.key, { kill_switch: v })} />
                  </td>
                  <td className="text-center">
                    <Input type="number" min={0} max={100} defaultValue={f.rollout_percent} className="w-20 mx-auto"
                      onBlur={(e) => {
                        const v = Math.max(0, Math.min(100, parseInt(e.target.value || "0", 10)));
                        if (v !== f.rollout_percent) update(f.key, { rollout_percent: v });
                      }} />
                  </td>
                  <td>
                    <Select value={f.cohort_id ?? "none"} onValueChange={(v) => update(f.key, { cohort_id: v === "none" ? null : v })}>
                      <SelectTrigger className="w-48"><SelectValue placeholder="No cohort" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Everyone</SelectItem>
                        {cohorts.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {flags.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No flags yet.</td></tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </>
  );
}
