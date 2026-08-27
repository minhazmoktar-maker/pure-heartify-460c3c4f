import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import PageHeader from "@/components/PageHeader";

type RankFlag = {
  key: string;
  enabled: boolean;
  value: number;
  min_value: number;
  max_value: number;
  description: string | null;
  updated_at: string;
};

const GROUPS: Record<string, string> = {
  exploration_rate: "Exploration",
  exploration_temperature: "Exploration",
  fatigue_detection: "Fatigue",
  fatigue_penalty_weight: "Fatigue",
  personalization_mix: "Personalization",
  semantic_dedup: "Deduplication",
};

/** Boolean-style knobs: value is only ever 0 or 1. */
const TOGGLE_ONLY = new Set(["fatigue_detection", "semantic_dedup"]);

export default function AdminFeedFlags() {
  const [flags, setFlags] = useState<RankFlag[]>([]);
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data, error } = await supabase
      .from("feed_ranking_flags")
      .select("key,enabled,value,min_value,max_value,description,updated_at")
      .order("key");
    if (error) toast({ title: error.message, variant: "destructive" });
    const rows = ((data ?? []) as unknown as RankFlag[]).map((r) => ({
      ...r,
      value: Number(r.value),
      min_value: Number(r.min_value),
      max_value: Number(r.max_value),
    }));
    setFlags(rows);
    setDraft(Object.fromEntries(rows.map((r) => [r.key, r.value])));
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function persist(key: string, patch: Partial<RankFlag>) {
    setSaving(key);
    const { error } = await supabase.from("feed_ranking_flags").update(patch).eq("key", key);
    setSaving(null);
    if (error) toast({ title: error.message, variant: "destructive" });
    else {
      toast({ title: `${key} updated`, description: "Live within 60s (server cache TTL)." });
      load();
    }
  }

  const grouped = flags.reduce<Record<string, RankFlag[]>>((acc, f) => {
    const g = GROUPS[f.key] ?? "Other";
    (acc[g] ??= []).push(f);
    return acc;
  }, {});

  return (
    <>
      <SEO
        path="/admin/feed-flags"
        title="Feed ranking flags — Heartify"
        description="Runtime knobs for exploration, fatigue detection, personalization mix and semantic dedup."
      />
      <PageHeader
        title="Feed ranking flags"
        subtitle="Runtime knobs, evaluated server-side on every feed request. Cached 60s."
        backHref="/admin"
      />
      <div className="container mx-auto max-w-3xl px-4 pb-16 space-y-5">
        {loading && <Card className="p-5 text-sm text-muted-foreground">Loading…</Card>}

        {Object.entries(grouped).map(([group, rows]) => (
          <Card key={group} className="p-5 space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {group}
            </h2>
            {rows.map((f) => {
              const isToggle = TOGGLE_ONLY.has(f.key);
              const val = draft[f.key] ?? f.value;
              const dirty = !isToggle && Math.abs(val - f.value) > 1e-9;
              return (
                <div key={f.key} className="space-y-2 border-t border-border/60 pt-4 first:border-0 first:pt-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-medium">{f.key}</code>
                        {!f.enabled && <Badge variant="outline">off</Badge>}
                      </div>
                      {f.description && (
                        <p className="mt-1 text-xs text-muted-foreground">{f.description}</p>
                      )}
                    </div>
                    <Switch
                      aria-label={`Enable ${f.key}`}
                      checked={f.enabled}
                      disabled={saving === f.key}
                      onCheckedChange={(enabled) =>
                        persist(f.key, isToggle ? { enabled, value: enabled ? 1 : 0 } : { enabled })
                      }
                    />
                  </div>

                  {!isToggle && (
                    <div className="flex items-center gap-4">
                      <Slider
                        aria-label={`${f.key} value`}
                        className="flex-1"
                        min={f.min_value}
                        max={f.max_value}
                        step={(f.max_value - f.min_value) / 100}
                        value={[val]}
                        onValueChange={([v]) => setDraft((d) => ({ ...d, [f.key]: v }))}
                      />
                      <span className="w-16 shrink-0 text-right font-mono text-sm tabular-nums">
                        {val.toFixed(2)}
                      </span>
                      <Button
                        size="sm"
                        variant={dirty ? "default" : "outline"}
                        disabled={!dirty || saving === f.key}
                        onClick={() => persist(f.key, { value: Number(val.toFixed(4)) })}
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </Card>
        ))}

        <Card className="p-5 text-xs text-muted-foreground space-y-1">
          <p>
            Turning a knob off falls back to the shipped default behaviour for that stage, not to
            zero — the feed never depends on this table being reachable.
          </p>
          <p>
            Changes take effect within 60 seconds on every edge isolate. Verify impact at{" "}
            <a className="underline" href="/admin/feed-diversity">/admin/feed-diversity</a> and{" "}
            <a className="underline" href="/admin/feed-ab">/admin/feed-ab</a>.
          </p>
        </Card>
      </div>
    </>
  );
}
