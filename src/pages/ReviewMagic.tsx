// Magic-link admin review page. Route: /review/:token
// No AdminRoute/2FA wrapper — token from URL is the sole gate. The edge
// function validates the token on every request and logs usage.
import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, XCircle, ExternalLink, ArrowUpRight, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import SEO from "@/components/SEO";

const FN_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-review`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type Candidate = {
  id: string;
  youtube_channel_id: string;
  title: string;
  handle: string | null;
  description: string | null;
  category: string | null;
  language_detected: string | null;
  subscriber_count: number | null;
  risk_score: number | null;
  tier: string | null;
  confidence: number | null;
  moderation_summary: Record<string, unknown> | null;
  tier_reason: string[] | null;
};

export default function ReviewMagic() {
  const { token = "" } = useParams();
  const [items, setItems] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: Candidate[] = [];
      const pageSize = 500;
      let offset = 0;
      let totalCount = 0;
      // Paginate through the entire pending queue so every candidate is visible.
      while (true) {
        const res = await fetch(
          `${FN_URL}?op=queue&token=${encodeURIComponent(token)}&limit=${pageSize}&offset=${offset}`,
          { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } },
        );
        const body = await res.json();
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        const batch: Candidate[] = body.items ?? [];
        all.push(...batch);
        totalCount = body.total ?? all.length;
        setExpiresAt(body.session?.expires_at ?? null);
        setItems([...all]);
        setTotal(totalCount);
        if (batch.length < pageSize || all.length >= totalCount) break;
        offset += pageSize;
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  async function act(id: string, action: "approve" | "reject" | "escalate") {
    setBusyId(id);
    try {
      const res = await fetch(`${FN_URL}?op=action&token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: ANON, Authorization: `Bearer ${ANON}` },
        body: JSON.stringify({ id, action }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
      toast.success(`${action} · ${id.slice(0, 6)}`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="h-5 w-5" /> Link invalid or expired
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{error}</p>
            <p>Ask the platform owner to mint a new review link.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Channel review" description="Magic-link channel moderation" path="/review" />
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">Channel Review Queue</h1>
          <p className="text-xs text-muted-foreground">
            {items.length}{total > items.length ? ` / ${total}` : ""} pending{loading ? " · loading…" : ""} · {expiresAt ? `link expires ${new Date(expiresAt).toLocaleString()}` : ""}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
        </Button>
      </header>

      <main className="max-w-3xl mx-auto p-4 space-y-3">
        {loading && items.length === 0 && (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}
        {!loading && items.length === 0 && (
          <p className="text-center text-muted-foreground py-12">Queue is empty. Nothing to review.</p>
        )}

        {items.map((c) => (
          <Card key={c.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{c.title}</CardTitle>
                  <div className="text-xs text-muted-foreground flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    {c.handle && <span>{c.handle}</span>}
                    <span className={c.subscriber_count == null ? "italic opacity-70" : "font-medium"}>
                      {c.subscriber_count != null ? `${c.subscriber_count.toLocaleString()} subs` : "subs: unresolved"}
                    </span>
                    {c.language_detected && <span>lang: {c.language_detected}</span>}
                    {c.category && <span>{c.category}</span>}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <Badge
                    variant={
                      c.tier === "S" || c.tier === "A" ? "default"
                      : c.tier === "B" ? "secondary"
                      : c.tier === "C" ? "outline"
                      : "destructive"
                    }
                  >
                    Tier {c.tier ?? "?"}
                  </Badge>
                  {c.subscriber_count != null && (
                    <Badge variant="outline" className="tabular-nums">
                      {c.subscriber_count >= 1_000_000
                        ? `${(c.subscriber_count / 1_000_000).toFixed(1)}M subs`
                        : c.subscriber_count >= 1_000
                        ? `${(c.subscriber_count / 1_000).toFixed(1)}K subs`
                        : `${c.subscriber_count} subs`}
                    </Badge>
                  )}
                  {c.risk_score != null && (
                    <Badge variant={c.risk_score >= 70 ? "destructive" : c.risk_score >= 50 ? "secondary" : "outline"}>
                      risk {c.risk_score}
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {c.description && (
                <p className="text-sm text-muted-foreground line-clamp-3">{c.description}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <Button asChild variant="outline" size="sm">
                  <a
                    href={`https://www.youtube.com/channel/${c.youtube_channel_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> View on YouTube
                  </a>
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busyId === c.id}
                  onClick={() => act(c.id, "reject")}
                >
                  <XCircle className="h-4 w-4 mr-1" /> Reject
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={busyId === c.id}
                  onClick={() => act(c.id, "escalate")}
                >
                  <ArrowUpRight className="h-4 w-4 mr-1" /> Escalate
                </Button>
                <Button
                  size="sm"
                  disabled={busyId === c.id}
                  onClick={() => act(c.id, "approve")}
                >
                  {busyId === c.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <><CheckCircle2 className="h-4 w-4 mr-1" /> Approve</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </main>
    </div>
  );
}
