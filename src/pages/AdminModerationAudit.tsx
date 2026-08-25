/**
 * /admin/moderation-audit — why is each video clean, flagged, or unchecked?
 *
 * Every serving decision on Heartify is a halal-floor decision, so it has to be
 * auditable: which rules fired, which machine signals produced them, how
 * confident the classifier was, and when each step happened. This page is the
 * human-readable view of `public.moderation_audit()`.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Loader2, RefreshCcw, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import SEO from "@/components/SEO";
import { usePermissions } from "@/hooks/usePermissions";

type State = "all" | "clean" | "flagged" | "unchecked";

interface AuditRow {
  video_id: string;
  title: string | null;
  channel_title: string | null;
  category: string | null;
  content_language: string | null;
  serving_state: string;
  servable: boolean;
  policy_rules: string[];
  moderation_state: string | null;
  moderation_stage: string | null;
  moderation_provider: string | null;
  moderation_confidence: number | null;
  moderation_risk: number | null;
  moderation_reasoning: string | null;
  visual_flags: string[];
  visual_confidence: number | null;
  halal_score: number | null;
  is_trusted_channel: boolean;
  hidden_reason: string | null;
  ingested_at: string | null;
  visual_checked_at: string | null;
  moderation_updated_at: string | null;
  embed_checked_at: string | null;
}

interface AuditPayload {
  generated_at: string;
  counts: { clean: number; flagged: number; unchecked: number; total: number };
  rows: AuditRow[];
  error?: string;
}

const STATES: { key: State; label: string }[] = [
  { key: "all", label: "All" },
  { key: "clean", label: "Clean" },
  { key: "flagged", label: "Flagged" },
  { key: "unchecked", label: "Unchecked" },
];

const PAGE = 25;

function ts(v: string | null) {
  if (!v) return "—";
  return new Date(v).toLocaleString();
}

function StateBadge({ state, servable }: { state: string; servable: boolean }) {
  if (state === "clean") {
    return (
      <Badge variant="outline" className="gap-1 text-[10px]">
        <ShieldCheck className="h-3 w-3" />
        {servable ? "clean · served" : "clean · withheld"}
      </Badge>
    );
  }
  if (state === "flagged") {
    return (
      <Badge variant="destructive" className="gap-1 text-[10px]">
        <ShieldAlert className="h-3 w-3" /> flagged · never served
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1 text-[10px]">
      <ShieldQuestion className="h-3 w-3" /> unchecked · never served
    </Badge>
  );
}

export default function AdminModerationAudit() {
  const { hasMinRole } = usePermissions();
  const isAdmin = hasMinRole("admin") || hasMinRole("owner");
  const [state, setState] = useState<State>("flagged");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<AuditPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: res, error: err } = await supabase.rpc("moderation_audit", {
      p_state: state,
      p_search: query || null,
      p_limit: PAGE,
      p_offset: page * PAGE,
    });
    if (err) setError(err.message);
    else setData(res as unknown as AuditPayload);
    setLoading(false);
  }, [state, query, page]);

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin, load]);

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The moderation audit trail is restricted.
        </p>
      </main>
    );
  }

  const counts = data?.counts;
  const rows = data?.rows ?? [];

  return (
    <main className="mx-auto max-w-4xl px-4 pb-24 pt-6">
      <SEO
        title="Moderation audit — Heartify admin"
        description="Why each video is clean, flagged, or unchecked: policy rules, signals and timestamps."
        path="/admin/moderation-audit"
        noBreadcrumbs
      />

      <div className="mb-4">
        <h1 className="text-xl font-semibold">Moderation audit</h1>
        <p className="text-sm text-muted-foreground">
          Every serving decision, with the policy rules and timestamps behind it. Only{" "}
          <strong>clean</strong> videos are ever served.
        </p>
      </div>

      {counts && (
        <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Clean", value: counts.clean },
            { label: "Flagged", value: counts.flagged },
            { label: "Unchecked", value: counts.unchecked },
            { label: "Total", value: counts.total },
          ].map((c) => (
            <Card key={c.label}>
              <CardContent className="p-3">
                <p className="text-xs text-muted-foreground">{c.label}</p>
                <p className="text-lg font-semibold tabular-nums">{c.value.toLocaleString()}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {STATES.map((s) => (
          <Button
            key={s.key}
            size="sm"
            variant={s.key === state ? "default" : "outline"}
            onClick={() => {
              setState(s.key);
              setPage(0);
            }}
          >
            {s.label}
          </Button>
        ))}
        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(0);
            setQuery(search.trim());
          }}
        >
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Video ID, title or channel"
            className="h-9 w-56"
            aria-label="Search moderation audit"
          />
          <Button size="sm" type="submit" variant="secondary">
            Search
          </Button>
          <Button
            size="icon"
            variant="outline"
            type="button"
            onClick={() => void load()}
            aria-label="Refresh"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="h-4 w-4" />
            )}
          </Button>
        </form>
      </div>

      {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
      {data?.error && <p className="mb-4 text-sm text-destructive">{data.error}</p>}

      <div className="space-y-3">
        {rows.map((r) => (
          <Card key={r.video_id}>
            <CardHeader className="pb-2">
              <CardTitle className="flex flex-wrap items-center gap-2 text-sm">
                <span className="line-clamp-1 flex-1">{r.title ?? r.video_id}</span>
                <StateBadge state={r.serving_state} servable={r.servable} />
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {r.channel_title ?? "unknown channel"} · {r.category ?? "uncategorized"} ·{" "}
                {r.content_language ?? "lang?"} · <code>{r.video_id}</code>
                {r.is_trusted_channel && " · trusted channel"}
              </p>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div>
                <p className="mb-1 font-medium">Policy rules that fired</p>
                {r.policy_rules?.length ? (
                  <ul className="list-inside list-disc space-y-0.5 text-muted-foreground">
                    {r.policy_rules.map((rule, i) => (
                      <li key={i}>{rule}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">
                    None — passed the halal floor with no rule violations.
                  </p>
                )}
              </div>

              {r.moderation_reasoning && (
                <div>
                  <p className="mb-1 font-medium">Reviewer / model reasoning</p>
                  <p className="text-muted-foreground">{r.moderation_reasoning}</p>
                </div>
              )}

              <div className="grid gap-x-4 gap-y-1 sm:grid-cols-2">
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Halal score</span>
                  <span className="tabular-nums">{r.halal_score ?? "—"}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Visual confidence</span>
                  <span className="tabular-nums">{r.visual_confidence ?? "—"}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Model confidence</span>
                  <span className="tabular-nums">{r.moderation_confidence ?? "—"}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Risk</span>
                  <span className="tabular-nums">{r.moderation_risk ?? "—"}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Stage / provider</span>
                  <span>
                    {r.moderation_stage ?? "—"} · {r.moderation_provider ?? "—"}
                  </span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Decision state</span>
                  <span>{r.moderation_state ?? "—"}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Ingested</span>
                  <span>{ts(r.ingested_at)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Visual sweep</span>
                  <span>{ts(r.visual_checked_at)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Moderation updated</span>
                  <span>{ts(r.moderation_updated_at)}</span>
                </p>
                <p className="flex justify-between">
                  <span className="text-muted-foreground">Embed checked</span>
                  <span>{ts(r.embed_checked_at)}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {!loading && rows.length === 0 && (
          <p className="text-sm text-muted-foreground">No videos match this filter.</p>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          disabled={page === 0 || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">Page {page + 1}</span>
        <Button
          size="sm"
          variant="outline"
          disabled={rows.length < PAGE || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </main>
  );
}
